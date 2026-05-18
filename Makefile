.PHONY: run-server install-pytest test-go test-api test-all clean bench bench-save bench-compare

# 启动 API 服务
run-server:
	go run main.go

# 安装 Python 测试依赖
install-pytest:
	cd tests/api && uv pip install -r requirements.txt

# 运行 Go 单元测试
test-go:
	go test ./... -v

# 运行 Python API 测试（需要服务运行中）
test-api:
	cd tests/api && pytest -v --html=report.html --self-contained-html

# 运行全部测试
test-all: test-go test-api
	@echo "全部测试完成"

# 运行 wrk 压测
bench:
	bash scripts/benchmark/run_benchmarks.sh

# 采集 pprof 性能数据（压测期间运行）
bench-save:
	bash scripts/benchmark/collect_pprof.sh

# 对比优化前后的 profile
bench-compare:
	@echo "对比优化前后的 CPU profile..."
	go tool pprof -base=scripts/benchmark/profiles/cpu_before.pprof scripts/benchmark/profiles/cpu_after.pprof

# 清理
clean:
	rm -f cloud-notes.exe
	rm -f tests/api/report.html
	rm -rf tests/api/__pycache__
	rm -rf tests/api/.pytest_cache
