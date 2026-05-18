#!/bin/bash
# wrk 压测脚本 — 对 cloud-notes API 进行并发压力测试
# 用法: ./run_benchmarks.sh [host] [port]
# 示例: ./run_benchmarks.sh localhost 8080

set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-8080}"
BASE="http://${HOST}:${PORT}"
RESULT_DIR="scripts/benchmark/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULT_FILE="${RESULT_DIR}/bench_${TIMESTAMP}.txt"

mkdir -p "$RESULT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# ============================================================
# 检查依赖
# ============================================================
check_deps() {
    log "检查依赖..."
    if ! command -v wrk &> /dev/null; then
        echo -e "${RED}错误: wrk 未安装${NC}"
        echo "安装方法:"
        echo "  macOS:   brew install wrk"
        echo "  Ubuntu:  sudo apt-get install wrk"
        echo "  Windows: choco install wrk 或从源码编译 https://github.com/wg/wrk"
        exit 1
    fi
    if ! command -v curl &> /dev/null; then
        echo "错误: curl 未安装"
        exit 1
    fi
    log "依赖检查通过"
}

# ============================================================
# 检查服务是否运行
# ============================================================
check_server() {
    log "检查服务 ${BASE}..."
    if curl -s -o /dev/null -w "%{http_code}" "${BASE}/" | grep -q "200"; then
        log "服务运行正常"
    else
        warn "服务可能未启动，尝试连接..."
        if ! curl -s --connect-timeout 3 "${BASE}/" > /dev/null 2>&1; then
            echo -e "${RED}错误: 无法连接 ${BASE}，请先启动服务${NC}"
            exit 1
        fi
    fi
}

# ============================================================
# 预热 + 获取测试 Token
# ============================================================
warmup() {
    log "预热: 注册测试用户并获取 token..."

    # 注册测试用户
    curl -s -X POST "${BASE}/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"bench_user\",\"password\":\"bench123\"}" > /dev/null 2>&1 || true

    # 登录获取 token
    TOKEN=$(curl -s -X POST "${BASE}/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"bench_user\",\"password\":\"bench123\"}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$TOKEN" ]; then
        echo -e "${RED}错误: 无法获取 token${NC}"
        exit 1
    fi
    echo "$TOKEN" > /tmp/bench_token.txt
    log "Token 已获取"
}

# ============================================================
# 运行单次压测
# ============================================================
run_bench() {
    local name="$1"
    local method="$2"
    local url="$3"
    local body="$4"
    local threads="$5"
    local connections="$6"
    local duration="$7"

    echo ""
    echo "========================================"
    echo "  压测: $name"
    echo "  线程: $threads | 连接: $connections | 时长: ${duration}s"
    echo "========================================"

    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        wrk -t"$threads" -c"$connections" -d"${duration}s" \
            -s scripts/benchmark/wrk_post.lua \
            --latency \
            "${url}" 2>&1 | tee -a "$RESULT_FILE"
    else
        wrk -t"$threads" -c"$connections" -d"${duration}s" \
            --latency \
            "${url}" 2>&1 | tee -a "$RESULT_FILE"
    fi
}

# ============================================================
# 主流程
# ============================================================
main() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║   cloud-notes API 压力测试              ║"
    echo "║   目标: ${BASE}                  ║"
    echo "╚══════════════════════════════════════════╝"

    check_deps
    check_server
    warmup

    TOKEN=$(cat /tmp/bench_token.txt)

    {
        echo "=========================================="
        echo " cloud-notes wrk 压测报告"
        echo " 时间: $(date)"
        echo " 目标: ${BASE}"
        echo "=========================================="
        echo ""
    } > "$RESULT_FILE"

    # ---- 注册接口压测 ----
    run_bench "POST /register (轻载)" \
        "POST" "${BASE}/register" \
        '{"username":"user_XXX","password":"pass123"}' \
        2 10 15

    run_bench "POST /register (中载)" \
        "POST" "${BASE}/register" \
        '{"username":"user_XXX","password":"pass123"}' \
        4 50 15

    run_bench "POST /register (重载)" \
        "POST" "${BASE}/register" \
        '{"username":"user_XXX","password":"pass123"}' \
        8 200 15

    # ---- 登录接口压测 ----
    run_bench "POST /login (中载)" \
        "POST" "${BASE}/login" \
        '{"username":"bench_user","password":"bench123"}' \
        4 50 15

    # ---- 创建笔记压测 (需认证) ----
    log "创建笔记压测 (使用 token)..."
    echo ""
    echo "========================================"
    echo "  压测: POST /api/notes (中载)"
    echo "  线程: 4 | 连接: 50 | 时长: 15s"
    echo "========================================"
    wrk -t4 -c50 -d15s \
        -s scripts/benchmark/wrk_create_note.lua \
        --latency \
        "${BASE}" 2>&1 | tee -a "$RESULT_FILE"

    # ---- 获取笔记列表压测 ----
    echo ""
    echo "========================================"
    echo "  压测: GET /api/notes (中载)"
    echo "  线程: 4 | 连接: 50 | 时长: 15s"
    echo "========================================"
    wrk -t4 -c50 -d15s \
        -H "Authorization: Bearer ${TOKEN}" \
        --latency \
        "${BASE}/api/notes" 2>&1 | tee -a "$RESULT_FILE"

    # ---- 高并发创建笔记压测 ----
    log "高并发创建笔记 (可能触发死锁)..."
    echo ""
    echo "========================================"
    echo "  压测: POST /api/notes (重载)"
    echo "  线程: 8 | 连接: 200 | 时长: 15s"
    echo "========================================"
    wrk -t8 -c200 -d15s \
        -s scripts/benchmark/wrk_create_note.lua \
        --latency \
        "${BASE}" 2>&1 | tee -a "$RESULT_FILE"

    log "压测完成! 结果保存至: ${RESULT_FILE}"
    echo ""
    echo "======= QPS 汇总 ======="
    grep -E "Requests/sec|QPS|压测:" "$RESULT_FILE" | head -30
}

main
