#!/bin/bash
# pprof 性能采样脚本 — 在压测期间采集 CPU/内存 profile
# 用法: ./collect_pprof.sh [host] [port]

set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-8080}"
BASE="http://${HOST}:${PORT}"
PROFILE_DIR="scripts/benchmark/profiles"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$PROFILE_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }

# ============================================================
# 采集 30s CPU profile（在压测期间运行）
# ============================================================
collect_cpu() {
    local name="${1:-cpu}"
    local duration="${2:-30}"
    local output="${PROFILE_DIR}/${name}_${TIMESTAMP}.pprof"

    log "采集 CPU profile (${duration}s) → ${output}"
    curl -s -o "$output" "${BASE}/debug/pprof/profile?seconds=${duration}"
    log "CPU profile 已保存: ${output} (文件大小: $(wc -c < "$output") bytes)"
}

# ============================================================
# 采集 heap profile
# ============================================================
collect_heap() {
    local output="${PROFILE_DIR}/heap_${TIMESTAMP}.pprof"

    log "采集 heap profile → ${output}"
    curl -s -o "$output" "${BASE}/debug/pprof/heap"
    log "Heap profile 已保存: ${output}"
}

# ============================================================
# 采集 goroutine profile
# ============================================================
collect_goroutine() {
    local output="${PROFILE_DIR}/goroutine_${TIMESTAMP}.pprof"

    log "采集 goroutine profile → ${output}"
    curl -s -o "$output" "${BASE}/debug/pprof/goroutine?debug=1"
    log "Goroutine profile 已保存: ${output}"
}

# ============================================================
# 采集 mutex profile (需要预先启用)
# ============================================================
collect_mutex() {
    local output="${PROFILE_DIR}/mutex_${TIMESTAMP}.pprof"

    log "采集 mutex profile → ${output}"
    curl -s -o "$output" "${BASE}/debug/pprof/mutex"
    log "Mutex profile 已保存: ${output}"
}

# ============================================================
# 采集 allocs profile
# ============================================================
collect_allocs() {
    local output="${PROFILE_DIR}/allocs_${TIMESTAMP}.pprof"

    log "采集 allocs profile → ${output}"
    curl -s -o "$output" "${BASE}/debug/pprof/allocs"
    log "Allocs profile 已保存: ${output}"
}

# ============================================================
# 主流程
# ============================================================
main() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║   cloud-notes pprof 性能采样            ║"
    echo "╚══════════════════════════════════════════╝"

    # 检查服务是否运行
    if ! curl -s --connect-timeout 3 "${BASE}/" > /dev/null 2>&1; then
        echo -e "${RED}错误: 无法连接 ${BASE}${NC}"
        exit 1
    fi

    log "开始并行采集..."

    # 后台采集 CPU（30 秒，此时应该同时运行 wrk）
    collect_cpu "cpu_30s" 30 &
    CPU_PID=$!

    sleep 2

    # 采集 heap
    collect_heap

    # 采集 goroutine
    collect_goroutine

    # 采集 allocs
    collect_allocs

    # 等待 CPU profile 完成
    wait $CPU_PID

    log "所有 profile 采集完成!"
    echo ""
    log "分析命令:"
    echo "  go tool pprof ${PROFILE_DIR}/cpu_30s_${TIMESTAMP}.pprof"
    echo "  go tool pprof -http=:9090 ${PROFILE_DIR}/cpu_30s_${TIMESTAMP}.pprof"
    echo ""
    echo "  # 对比两个 profile (优化前后):"
    echo "  go tool pprof -base=${PROFILE_DIR}/cpu_before.pprof ${PROFILE_DIR}/cpu_after.pprof"
}

main
