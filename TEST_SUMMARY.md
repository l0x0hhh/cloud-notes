# Cloud Notes 测试总结

## 测试体系概览

项目包含两层测试：

| 层级 | 语言/框架 | 是否依赖外部服务 | 用例数 | 运行方式 |
|---|---|---|---|---|
| Go 单元测试 | Go + testify | 否（纯 Mock） | 25+ | `go test ./... -v` |
| Python API 测试 | Python + pytest | 是（需要 MySQL + 后端运行） | 66 场景 | `pytest -v` |

---

## 一、Go 单元测试

**不依赖数据库和后端运行**，使用 mock store 模拟数据层，可随时执行。

### 运行

```powershell
cd E:\cloud-notes
go test ./... -v
```

### 覆盖内容

#### middleware/jwt_test.go — JWT 中间件测试

`TestJWTAuth` — 8 个子用例，覆盖所有鉴权路径：

| 用例 | 预期 |
|---|---|
| 无 Authorization 头 | 401 `未提供token` |
| 错误 Token（随机字符串） | 401 `token无效` |
| 缺少 Bearer 前缀 | 401 `token格式错误` |
| 仅 Bearer 无 Token 值 | 401 `token格式错误` |
| Authorization 头含多余空格（3 部分） | 401 `token格式错误` |
| 过期 Token（exp 在过去） | 401 `token无效` |
| 篡改 Token（不同密钥签名） | 401 `token无效` |
| 有效 Token | 200 + 正确 user_id |

`TestGenerateToken` — 3 个子用例：正常生成/解析、错误密钥验证失败、DefaultSecret 一致性。

#### handler/user_test.go — 用户 Handler 测试

`TestUserHandler_Register` — 3 个子用例：

| 用例 | 预期 |
|---|---|
| 正常注册（username + password） | 200 |
| 请求体为空 | 400 `参数错误` |
| 数据库创建失败（Mock 返回 error） | 500 |

`TestUserHandler_Login` — 6 个子用例，覆盖 bcrypt 密码/明文密码兼容两种路径：

| 用例 | 预期 |
|---|---|
| 正常登录（bcrypt 密码） | 200 + 返回 token |
| 正常登录（明文密码兼容模式） | 200 + 返回 token |
| 请求体为空 | 400 |
| 用户不存在 | 401 |
| 密码错误（明文密码） | 401 |
| 密码错误（bcrypt 密码） | 401 |

#### handler/note_test.go — 笔记 Handler 测试

| 测试函数 | 子用例数 | 覆盖场景 |
|---|---|---|
| `TestNoteHandler_CreateNote` | 4 | 正常创建 / 空请求体 / 非法 JSON / Store 失败 |
| `TestNoteHandler_GetNotes` | 3 | 空列表 / 多笔记列表 / Store 查询失败 |
| `TestNoteHandler_GetNoteByID` | 4 | 正常获取 / 不存在 404 / ID 格式错误 400 / 跨用户隔离 |
| `TestNoteHandler_UpdateNote` | 3 | 正常更新 / 空请求体 / Store 失败 |
| `TestNoteHandler_DeleteNote` | 2 | 正常删除 / Store 失败 |

---

## 二、Python API 测试

**需要后端和 MySQL 都在运行**。通过真实 HTTP 请求验证完整链路。

### 前置条件

1. MySQL 运行中，`cloud_notes` 数据库已创建
2. 后端运行中：`go run main.go`（监听 `localhost:8080`）
3. Python 虚拟环境已安装依赖

### 运行

```powershell
# 终端 1 — 启动后端
cd E:\cloud-notes
go run main.go

# 终端 2 — 运行测试
cd E:\cloud-notes
.\.venv\Scripts\activate
cd tests\api
pip install -r requirements.txt     # 仅首次
pytest -v --html=report.html --self-contained-html
```

### 分组运行

```powershell
pytest -v -m auth                 # 仅鉴权（22 场景）
pytest -v -m crud                 # 仅 CRUD（28 场景）
pytest -v -m boundary             # 仅边界值（不含慢速大文本）
pytest -v -m slow                 # 仅慢速大文本
pytest -v -m "not slow"           # 跳过慢速测试
$env:API_BASE_URL="http://其他地址:8080"   # 指定 API 地址
pytest -v
```

### 测试覆盖详情

#### test_auth.py — 鉴权测试（22 个场景）

| 类别 | 场景数 | 典型用例 |
|---|---|---|
| 注册-异常参数 | 5 | 缺少 username/password、空请求体、非 JSON body |
| 注册-边界值 | 4 | 空用户名、空密码、255 字符超长用户名、特殊字符、Unicode |
| 注册-重复 | 1 | 重复用户名注册返回 500 |
| 登录-异常 | 4 | 缺少字段、用户不存在、密码错误 |
| Token 鉴权 | 7 | 无头、空头、错误 token、过期、篡改、格式错误、缺前缀 |
| 端到端 | 1 | 注册 → 登录 → 访问 `/api/profile` 完整流程 |

#### test_notes_crud.py — 笔记 CRUD 测试（28 个场景）

| 类别 | 场景数 | 典型用例 |
|---|---|---|
| 创建笔记 | 8 | 正常、空标题、空内容、缺少字段、空 body、超长标题、HTML/Unicode |
| 获取列表 | 2 | 多笔记列表、新用户空列表 |
| 获取详情 | 3 | 正常获取、不存在 404、非法 ID 格式 400 |
| 更新笔记 | 4 | 正常更新、只更新标题、不存在笔记、空 body |
| 删除笔记 | 3 | 正常删除、删除不存在的笔记 |
| 删除后操作 | 3 | 删后查（404）、删后改（500）、重复删（500） |
| 跨用户隔离 | 3 | 用户 A 无法获取/修改/删除用户 B 的笔记 |
| 端到端 | 1 | 创建→列表→详情→更新→删除 完整生命周期 |

#### test_boundary_text.py — 边界值测试（16 个场景）

| 类别 | 场景数 | 具体内容 |
|---|---|---|
| 内容大小递增 | 8 | 1B, 1KB, 10KB, 100KB, 500KB, 1MB, 3MB, 5MB（精确上限） |
| 超大拒绝 | 2 | 5MB+1B, 10MB（期望 413） |
| 标题边界 | 3 | 1 字符、空字符串、纯 Unicode emoji |
| 安全 payload | 2 | SQL 注入标题、XSS payload 内容 |
| 二进制 | 1 | null 字节嵌入内容 |
| 往返校验 | 1 | 0→1→100→1000→10000 字节内容写入后读取，逐字节对比 |
| 5MB 精确校验 | 1 | 精确 5242880 字节写入后完整读取对比 |

### 测试报告

运行后 `tests/api/report.html` 自动生成可视化 HTML 报告，包含：
- 环境信息（Python 版本、平台）
- 通过/失败/跳过统计
- 每个用例的执行时间
- 失败用例的详细错误和堆栈

---

## 三、旧版 Python 测试（tests/ 目录）

简化版测试，使用 YAML 数据驱动，`conftest.py` 中 fixture 自动登录获取 token。

```powershell
cd E:\cloud-notes\tests
..\.venv\Scripts\pip install pyyaml requests pytest
..\.venv\Scripts\python -m pytest -v
```

| 文件 | 内容 |
|---|---|
| `test_login.py` | 参数化登录测试（成功/失败各 1 例，数据来自 `data/test_data.yaml`） |
| `test_note.py` | 创建笔记 + 获取列表（2 例） |

---

## 四、快速验证清单

确认项目可用的最小步骤：

```powershell
# 1. Go 单元测试（无需任何外部服务）
cd E:\cloud-notes
go test ./... -v
# 期望：全部 PASS

# 2. 创建数据库（MySQL 需运行）
# mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cloud_notes CHARACTER SET utf8mb4"

# 3. 启动后端
go run main.go
# 期望：输出 "数据库连接成功!" 然后监听 :8080

# 4. Python API 测试（新终端）
.\.venv\Scripts\activate
cd tests\api
pytest -v -m "not slow" --html=report.html --self-contained-html
# 期望：auth + crud + boundary 共约 50+ 用例 PASS
```
