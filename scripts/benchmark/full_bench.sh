#!/bin/bash
# 一键压测 + pprof 采样
# 用法: bash scripts/benchmark/full_bench.sh
# 前提: 1. MySQL 运行中  2. 数据库 cloud_notes 已创建

set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-8080}"
BASE="http://${HOST}:${PORT}"
PROFILE_DIR="scripts/benchmark/profiles"

mkdir -p "$PROFILE_DIR"

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }

log "=== 阶段 1: 启动服务 ==="
go build -o cloud-notes.exe . && ./cloud-notes.exe &
SERVER_PID=$!
sleep 3

log "=== 阶段 2: 预热 + 获取 Token ==="
curl -s -X POST "${BASE}/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"bench","password":"bench"}' > /dev/null 2>&1 || true

TOKEN=$(curl -s -X POST "${BASE}/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"bench","password":"bench"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "ERROR: 无法获取 token"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
log "Token 获取成功"

# 创建一些测试笔记
for i in $(seq 1 100); do
    curl -s -X POST "${BASE}/api/notes" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d "{\"title\":\"预热笔记${i}\",\"content\":\"预热内容\"}" > /dev/null 2>&1
done

log "=== 阶段 3: 开始 CPU profile 采样 (30s) ==="
curl -s -o "${PROFILE_DIR}/cpu_before.pprof" "${BASE}/debug/pprof/profile?seconds=30" &
PPROF_PID=$!
sleep 2

log "=== 阶段 4: 压测 注册接口 (4线程/50并发/25s) ==="
wrk -t4 -c50 -d25s \
    -s scripts/benchmark/wrk_post.lua \
    --latency \
    "${BASE}/register" 2>&1 | tee scripts/benchmark/results/register_before.txt

log "=== 阶段 5: 压测 创建笔记 (4线程/50并发/25s) ==="
wrk -t4 -c50 -d25s \
    -s scripts/benchmark/wrk_create_note.lua \
    --latency \
    "${BASE}" 2>&1 | tee scripts/benchmark/results/note_before.txt

log "=== 阶段 6: 压测 获取笔记列表 (8线程/200并发/25s) ==="
wrk -t8 -c200 -d25s \
    -H "Authorization: Bearer ${TOKEN}" \
    --latency \
    "${BASE}/api/notes" 2>&1 | tee scripts/benchmark/results/list_before.txt

wait $PPROF_PID 2>/dev/null || true

log "=== 阶段 7: 采集 heap profile ==="
curl -s -o "${PROFILE_DIR}/heap_before.pprof" "${BASE}/debug/pprof/heap"

log "=== 阶段 8: 采集 goroutine profile ==="
curl -s -o "${PROFILE_DIR}/goroutine_before.pprof" "${BASE}/debug/pprof/goroutine?debug=1"

log "=== 全部完成! ==="
echo ""
echo "======= 压测结果摘要 ======="
echo "--- 注册接口 ---"
grep -E "Requests/sec|Latency" scripts/benchmark/results/register_before.txt 2>/dev/null || echo "N/A"
echo ""
echo "--- 创建笔记 ---"
grep -E "Requests/sec|Latency" scripts/benchmark/results/note_before.txt 2>/dev/null || echo "N/A"
echo ""
echo "--- 获取列表 ---"
grep -E "Requests/sec|Latency" scripts/benchmark/results/list_before.txt 2>/dev/null || echo "N/A"
echo ""
echo "--- pprof 分析命令 ---"
echo "  go tool pprof ${PROFILE_DIR}/cpu_before.pprof"
echo "  go tool pprof -http=:9090 ${PROFILE_DIR}/cpu_before.pprof"

# 清理
kill $SERVER_PID 2>/dev/null || true
