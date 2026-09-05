# Cloud Notes API 测试指南 (Windows)

---

## 目录结构

```
tests/api/
├── conftest.py              # pytest 配置、fixture、工具函数
├── pytest.ini               # pytest 运行配置
├── requirements.txt         # Python 依赖
├── test_auth.py             # 鉴权测试（注册、登录、Token）
├── test_notes_crud.py       # 笔记 CRUD 测试
├── test_boundary_text.py    # 边界值和大文本测试
├── data/
│   ├── auth_cases.json      # 鉴权测试用例数据（22 个场景）
│   ├── notes_cases.json     # 笔记 CRUD 测试用例数据（28 个场景）
│   └── boundary_cases.json  # 边界值测试用例数据（16 个场景）
└── test_readme.md           # 本文件
```

---

## 前置条件

### 1. MySQL 数据库运行中

确保 MySQL 服务已启动，并创建好数据库：

```sql
CREATE DATABASE cloud_notes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

默认连接：`root:root@127.0.0.1:3306/cloud_notes`

如果密码不同，修改 `E:\AIstudy\project\cloud-notes\config\db.go` 中的 DSN 字符串。

### 2. Go 后端运行中

打开一个新的 PowerShell 终端，在项目根目录启动后端：

```powershell
cd E:\AIstudy\project\cloud-notes
go run main.go
```

后端默认监听 `http://localhost:8080`，测试脚本会向这个地址发请求。

### 3. Python 环境

项目使用 [uv](https://docs.astral.sh/uv/) 管理 Python 虚拟环境和依赖（确保 uv 已安装，Python ≥ 3.10）。

如果项目还没有虚拟环境：

```powershell
cd E:\AIstudy\project\cloud-notes
uv venv
.\.venv\Scripts\activate
```

---

## 安装测试依赖

```powershell
# 激活虚拟环境
cd E:\AIstudy\project\cloud-notes
.\.venv\Scripts\activate

# 安装依赖
uv pip install -r tests\api\requirements.txt
```

依赖说明：

| 包 | 用途 |
|---|---|
| `pytest>=7.4.0` | 测试框架 |
| `requests>=2.31.0` | HTTP 请求库 |
| `pyyaml>=6.0` | YAML 数据解析 |
| `pytest-html>=4.1.0` | 生成 HTML 测试报告 |
| `PyJWT>=2.8.0` | JWT token 编解码 |

---

## 运行测试

### 运行全部测试

```powershell
cd E:\AIstudy\project\cloud-notes\tests\api
pytest -v --html=report.html --self-contained-html
```

### 按标记分组运行

```powershell
# 仅鉴权测试（22 个场景）
pytest -v -m auth --html=report.html --self-contained-html

# 仅 CRUD 测试（28 个场景）
pytest -v -m crud --html=report.html --self-contained-html

# 仅边界值测试（16 个场景，不含慢速大文本）
pytest -v -m boundary --html=report.html --self-contained-html

# 仅慢速大文本测试（5MB 往返、超大拒绝）
pytest -v -m slow --html=report.html --self-contained-html
```

### 运行单个测试文件

```powershell
pytest test_auth.py -v
pytest test_notes_crud.py -v
pytest test_boundary_text.py -v
```

### 跳过慢速测试

```powershell
pytest -v -m "not slow" --html=report.html --self-contained-html
```

慢速测试涉及 5MB 内容传输，如果网络/机器较慢可以跳过。

### 自定义 API 地址

```powershell
$env:API_BASE_URL="http://192.168.1.100:8080"
pytest -v --html=report.html --self-contained-html
```

### 设置超时时间

```powershell
$env:REQUESTS_TIMEOUT="60"
pytest -v --html=report.html --self-contained-html
```

---

## Go 单元测试

Go 层的单元测试不依赖数据库和后端运行，可以随时执行：

```powershell
cd E:\AIstudy\project\cloud-notes
go test ./... -v
```

---

## 测试覆盖说明

### 鉴权测试 (`test_auth.py`) — 22 个场景

| 类别 | 内容 |
|------|------|
| 注册 | 缺少字段、空值、特殊字符、弱密码、重复注册 |
| 登录 | 正常登录、错误密码、不存在用户、空字段 |
| Token | 有效 token、过期 token、被篡改 token、格式错误、缺失 Authorization 头 |
| 端到端 | 注册→登录→访问受保护接口的完整流程 |

### 笔记 CRUD 测试 (`test_notes_crud.py`) — 28 个场景

| 类别 | 内容 |
|------|------|
| 创建 | 正常、空标题、空内容、仅标题、缺失字段、空请求体 |
| 列表 | 多笔记列表、空列表 |
| 详情 | 正常获取、不存在的 ID、非法 ID 格式 |
| 更新 | 正常更新、不存在的笔记、空请求体 |
| 删除 | 正常删除、删除不存在的笔记、删除后查、删除后改、重复删除 |
| 跨用户隔离 | 用户 A 无法获取/修改/删除用户 B 的笔记 |
| 端到端 | 创建→列表→详情→更新→删除 完整生命周期 |

### 边界值测试 (`test_boundary_text.py`) — 16 个场景

| 类别 | 内容 |
|------|------|
| 内容大小 | 0 字节、1 字节、1KB、10KB、100KB、500KB、1MB、5MB |
| 超大拒绝 | 超过 5MB 的内容应返回错误 |
| 特殊内容 | 嵌入 null 字节、特殊 Unicode 字符 |
| 往返验证 | 0→1→100→1000→10000 字节的内容写入后读取，确保数据一致 |
| 精确边界 | 精确 5MB (5242880 字节) 的完整往返校验 |

---

## 测试报告

运行测试后，`tests/api/` 下会生成 `report.html`。

在文件资源管理器中双击打开即可看到带样式的可视化报告，包含：
- 通过/失败/跳过的统计
- 每个用例的执行时间
- 失败用例的详细错误信息和堆栈

---

## 常见问题

### 1. 测试全部失败，报 Connection Refused

后端没启动。确认 `go run main.go` 在另一个终端跑着，并且 MySQL 也跑着。

### 2. 部分测试失败，提示 "数据库连接失败"

MySQL 没启动，或者数据库 `cloud_notes` 还没创建。

### 3. `pip install` 报权限错误

确保已激活虚拟环境（`.\.venv\Scripts\activate`），不要在系统 Python 里装。

### 4. 慢速测试超时

5MB 内容测试默认等待 60 秒，如果还是超时可以调大：

```powershell
$env:REQUESTS_TIMEOUT="120"
pytest -v -m slow
```

### 5. `pytest` 命令找不到

虚拟环境没激活，或者依赖没安装。

```powershell
.\.venv\Scripts\activate
pip install -r requirements.txt
```

---

## 完整启动→测试流程（速查）

```powershell
# 终端 1：启动 MySQL（如果没在跑）
# 确保 cloud_notes 数据库已创建

# 终端 2：启动后端
cd E:\AIstudy\project\cloud-notes
go run main.go

# 终端 3：运行测试
cd E:\AIstudy\project\cloud-notes
.\.venv\Scripts\activate
cd tests\api
pytest -v --html=report.html --self-contained-html
```
