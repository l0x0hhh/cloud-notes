# Cloud Notes 云笔记

一个全栈云笔记应用，支持用户注册/登录、笔记 CRUD、JWT 鉴权、跨用户数据隔离。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端框架 | Go + [Gin](https://github.com/gin-gonic/gin) |
| ORM | [GORM](https://gorm.io/) + MySQL |
| 鉴权 | JWT (HS256, 24h 过期) |
| 密码加密 | bcrypt |
| 前端 | React + Vite + TypeScript (web-app/) |
| Go 单元测试 | `testing` + [testify](https://github.com/stretchr/testify) |
| Python API 测试 | pytest + requests + PyJWT |

## 项目结构

```
cloud-notes/
├── main.go                  # 入口：初始化 DB、路由、启动服务
├── config/db.go             # MySQL 连接配置
├── models/
│   ├── user.go              # User 模型
│   └── note.go              # Note 模型
├── store/
│   ├── store.go             # NoteStore / UserStore 接口定义
│   └── gorm_store.go        # GORM 实现
├── handler/
│   ├── user.go              # 注册、登录
│   └── note.go              # 笔记 CRUD（创建/列表/详情/更新/删除）
├── middleware/
│   └── jwt.go               # JWT 生成与认证中间件
├── router/
│   └── router.go            # 路由组装 + CORS 配置
├── web-app/                 # React 前端（Vite + TypeScript）
├── tests/
│   └── api/                 # Python API 自动化测试（66 个场景）
├── scripts/
│   └── log_cluster.py       # 日志聚类分析脚本（实验性）
├── Makefile                 # 快捷命令
├── go.mod / go.sum
└── cloud-notes.exe          # 已编译的 Windows 可执行文件
```

## Windows 下快速开始

### 1. 环境要求

- **Go** ≥ 1.25（编译运行后端）
- **MySQL** 运行中（默认端口 3306）
- **Python** ≥ 3.10（运行 API 测试，可选）
- **Node.js** ≥ 16（运行前端，可选）

### 2. 创建数据库

用 MySQL 客户端执行：

```sql
CREATE DATABASE cloud_notes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

默认连接：`root:root@127.0.0.1:3306/cloud_notes`

> 如果你的 MySQL 用户名/密码不同，修改 `config/db.go` 第 14 行的 DSN 字符串。首次启动时 GORM 会自动建表。

### 3. 启动后端

```powershell
cd E:\AIstudy\project\cloud-notes

# 方式一：直接运行编译好的 exe
.\cloud-notes.exe

# 方式二：用 go run 启动
go run main.go

# 方式三：用 Makefile（需要安装 make）
make run-server
```

服务监听 `http://localhost:8080`，启动后访问根路径可以看到静态页面。

### 4. 启动前端（可选）

```powershell
cd E:\AIstudy\project\cloud-notes\web-app
npm install
npm run dev
```

前端开发服务器默认 `http://localhost:5173`，API 请求自动代理到后端 8080 端口。

### 5. 运行 Go 单元测试

Go 层的单元测试使用 mock store，**不依赖数据库和运行中的服务**：

```powershell
cd E:\AIstudy\project\cloud-notes
go test ./... -v
```

### 6. 运行 Python API 测试

需要**后端和 MySQL 都在运行**：

```powershell
cd E:\AIstudy\project\cloud-notes
.\.venv\Scripts\activate           # 激活虚拟环境
cd tests\api
pip install -r requirements.txt    # 首次安装依赖
pytest -v --html=report.html --self-contained-html
```

> 详细测试说明见 [TEST_SUMMARY.md](./TEST_SUMMARY.md)

## API 接口一览

### 公开接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/register` | 用户注册 `{username, password}` |
| POST | `/login` | 用户登录，返回 JWT token |

### 需鉴权接口（Header: `Authorization: Bearer <token>`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/profile` | 获取当前用户信息 |
| POST | `/api/notes` | 创建笔记 `{title, content}` |
| GET | `/api/notes` | 获取当前用户的笔记列表 |
| GET | `/api/notes/:id` | 获取单条笔记详情 |
| PUT | `/api/notes/:id` | 更新笔记 |
| DELETE | `/api/notes/:id` | 删除笔记 |

### 用 curl 快速验证

```powershell
# 注册
curl -X POST http://localhost:8080/register -H "Content-Type: application/json" -d "{\"username\":\"demo\",\"password\":\"123456\"}"

# 登录（保存返回的 token）
curl -X POST http://localhost:8080/login -H "Content-Type: application/json" -d "{\"username\":\"demo\",\"password\":\"123456\"}"

# 创建笔记（用上一步的 token 替换 <TOKEN>）
curl -X POST http://localhost:8080/api/notes -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d "{\"title\":\"我的笔记\",\"content\":\"Hello World\"}"

# 查看笔记列表
curl http://localhost:8080/api/notes -H "Authorization: Bearer <TOKEN>"
```

## 安全特性

- **密码加密**：bcrypt 哈希存储，不支持明文密码时自动升级
- **JWT 鉴权**：HS256 签名，24 小时过期，所有 `/api/*` 路由受保护
- **数据隔离**：所有笔记查询/更新/删除均约束 `user_id`，用户 A 无法访问用户 B 的笔记
- **参数校验**：对非法 JSON、缺失字段、异常 ID 格式做了防御性处理

## 注意事项

- `cloud-notes.exe` 是 Go 编译产物，可直接双击运行（需要 MySQL 在后台运行）
- JWT 密钥目前硬编码在 `middleware/jwt.go` 中，生产环境应通过环境变量注入
- 前端 `web-app/` 是独立工程，`npm run build` 后可将 `dist/` 复制到 `web/` 目录供后端静态托管
