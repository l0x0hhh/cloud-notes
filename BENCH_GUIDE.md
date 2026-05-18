# 压测 + pprof

## 装 hey

```powershell
go install github.com/rakyll/hey@latest
```

## 启动服务

```powershell
go run main.go
```

## 一键压测

另开一个终端：

```powershell
.\scripts\benchmark\run_hey.ps1
```

跑完 5 个接口，自动采集 pprof。

## 看 QPS

脚本跑完最后会打印 QPS 汇总，或者手动查结果文件里的 `Requests/sec`。

## 看 pprof

```powershell
# 命令行看 top 20 热点
go tool pprof -top scripts\benchmark\profiles\cpu_hey.pprof

# 浏览器看火焰图
go tool pprof -http=:9090 scripts\benchmark\profiles\cpu_hey.pprof
```

## 手动跑单个接口

```powershell
# 注册
~/go/bin/hey -n 1000 -c 50 -m POST -H "Content-Type: application/json" `
  -d '{"username":"test","password":"123"}' `
  http://localhost:8080/register

# 查询笔记（先拿到 token）
~/go/bin/hey -n 5000 -c 200 `
  -H "Authorization: Bearer 你的token" `
  http://localhost:8080/api/notes
```
