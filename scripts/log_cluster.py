#!/usr/bin/env python3
"""
日志聚类分析脚本（实验性功能）

功能：
  1. 读取 JSON Lines 格式的结构化错误日志（含 stacktrace）
  2. 可选：调用 LLM API 对 stack trace 做向量嵌入
  3. 使用 KMeans 对嵌入向量聚类分组
  4. 输出每个聚类的摘要和典型样本

依赖：pip install scikit-learn requests

使用方式：
  python scripts/log_cluster.py
  LOG_PATH=logs/errors.jsonl OPENAI_API_KEY=sk-xxx python scripts/log_cluster.py

日志格式示例（JSON Lines）：
  {"timestamp": "2026-05-06T10:00:00Z", "level": "ERROR", "message": "panic recovered", "stacktrace": "goroutine 1 [running]:\n..."}
"""

import json
import os
import sys
from collections import defaultdict

import numpy as np


def load_logs(log_path: str) -> list:
    """读取 JSON Lines 格式的日志文件"""
    logs = []
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                logs.append(json.loads(line))
    return logs


def extract_simple_features(logs: list) -> tuple:
    """基于 TF-IDF 的简单特征提取（不依赖 LLM）"""
    from sklearn.feature_extraction.text import TfidfVectorizer

    stacktraces = []
    for log in logs:
        st = log.get("stacktrace", "")
        if not st:
            st = log.get("message", "")
        stacktraces.append(st)

    vectorizer = TfidfVectorizer(max_features=100, stop_words="english")
    features = vectorizer.fit_transform(stacktraces).toarray()
    return features, stacktraces


def extract_llm_embeddings(stacktraces: list) -> np.ndarray | None:
    """调用 LLM API 对 stacktrace 做向量嵌入（需要 OPENAI_API_KEY）"""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[WARN] 未设置 OPENAI_API_KEY，跳过 LLM 嵌入，将使用 TF-IDF 特征", file=sys.stderr)
        return None

    import requests

    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com")
    url = f"{base_url}/v1/embeddings"
    embeddings = []

    for i, st in enumerate(stacktraces):
        truncated = st[:8000] if len(st) > 8000 else st
        try:
            resp = requests.post(url, headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }, json={"model": "text-embedding-3-small", "input": truncated}, timeout=30)
            resp.raise_for_status()
            embeddings.append(resp.json()["data"][0]["embedding"])
        except Exception as e:
            print(f"[WARN] 第 {i} 条嵌入失败: {e}", file=sys.stderr)
            embeddings.append([0.0] * 1536)

    return np.array(embeddings)


def cluster_errors(features: np.ndarray, n_clusters: int = 5) -> np.ndarray:
    """使用 KMeans 聚类"""
    from sklearn.cluster import KMeans

    if len(features) < n_clusters:
        n_clusters = max(1, len(features))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    return kmeans.fit_predict(features)


def print_cluster_summary(labels: np.ndarray, stacktraces: list, messages: list):
    """打印每个聚类的摘要和典型样本"""
    clusters = defaultdict(list)
    for i, label in enumerate(labels):
        clusters[int(label)].append({
            "index": i,
            "message": messages[i] if i < len(messages) else "",
            "stacktrace": stacktraces[i][:500],
        })

    print(f"\n{'='*60}")
    print(f"聚类分析结果 — 共 {len(clusters)} 个分组")
    print(f"{'='*60}")

    for cluster_id, items in sorted(clusters.items()):
        print(f"\n--- 聚类 {cluster_id + 1}（{len(items)} 条日志）---")
        for item in items[:3]:
            print(f"  [{item['index']}] {item['message'][:120]}")
            st_preview = item["stacktrace"][:200].replace("\n", "\n    ")
            print(f"    StackTrace: {st_preview}")
        if len(items) > 3:
            print(f"  ... 还有 {len(items) - 3} 条类似日志")


def main():
    log_path = os.environ.get("LOG_PATH", "logs/errors.jsonl")
    if not os.path.exists(log_path):
        print(f"[INFO] 日志文件 {log_path} 不存在。请创建 JSON Lines 格式的日志文件。", file=sys.stderr)
        print(f"[INFO] 示例: LOG_PATH=/path/to/errors.jsonl python scripts/log_cluster.py", file=sys.stderr)
        sys.exit(0)

    print(f"[INFO] 加载日志: {log_path}")
    logs = load_logs(log_path)
    print(f"[INFO] 共 {len(logs)} 条日志")

    messages = [log.get("message", "") for log in logs]
    features, stacktraces = extract_simple_features(logs)

    if len(logs) >= 3:
        llm_features = extract_llm_embeddings(stacktraces)
        if llm_features is not None:
            features = llm_features

    n_clusters = min(5, len(logs))
    if n_clusters > 1:
        labels = cluster_errors(features, n_clusters=n_clusters)
        print_cluster_summary(labels, stacktraces, messages)
    else:
        print("[INFO] 日志数量不足，跳过聚类")


if __name__ == "__main__":
    main()
