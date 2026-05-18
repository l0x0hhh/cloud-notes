# Cloud Notes — 自动化测试体系设计

## 概述

为 Gin 云笔记 API 服务构建三层自动化测试体系：
1. **Go 单元测试** — 接口+mock 驱动，展示 AI 辅助生成模式
2. **Python 接口自动化测试** — 数据驱动，60+ 参数化用例
3. **日志聚类分析脚本** — LLM 辅助的 StackTrace 分类（实验性）

## Track 1 — Server 重构与 Go 单元测试

### 架构变更

将 handler 从包级函数重构为依赖注入模式：

```
server/
├── store/
│   ├── store.go          # NoteStore、UserStore 接口定义
│   └── gorm_store.go     # GORM 实现
├── handler/
│   ├── user.go           # UserHandler struct，注入 UserStore
│   ├── note.go           # NoteHandler struct，注入 NoteStore
│   ├── user_test.go      # 单元测试（AI 辅助风格）
│   └── note_test.go      # 单元测试（gomock + testify）
├── middleware/jwt.go     # 不变
├── router/router.go      # SetupRouter 组装依赖
└── main.go               # 初始化 store → handler → router
```

### Store 接口

- `NoteStore`: Create / List / GetByID / Update / Delete
- `UserStore`: Create / GetByUsername / UpdatePassword

### 测试策略

- 使用 `testify/assert` 做断言，`gomock` 生成 mock
- 每个 `_test.go` 文件顶部用中文自然语言注释模拟 AI prompt，然后给出由 prompt 生成的测试代码
- 覆盖：正常流程、依赖返回错误、边界参数、空值等

## Track 2 — Python 接口自动化测试

### 目录结构

```
tests/api/
├── conftest.py              # Fixtures: base_url, token, 用户管理
├── data/
│   ├── auth_cases.json      # 鉴权测试数据
│   ├── notes_cases.json     # CRUD 测试数据
│   └── boundary_cases.json  # 边界值测试数据
├── test_auth.py             # 22 条鉴权用例
├── test_notes_crud.py       # 28 条 CRUD 用例
├── test_boundary_text.py    # 16 条边界文本用例
├── requirements.txt
└── pytest.ini
```

### 用例分布（共 66 条）

**test_auth.py（22 条）：**
- 注册：缺少 username、缺少 password、正常注册、重复注册
- 登录：用户不存在、密码错误、正常登录、缺少参数
- Token 鉴权：无 Token、空 Token、错误 Token、过期 Token、篡改 Token、Bearer 格式错误（无空格、多余空格）、Token 仅 Bearer 无值

**test_notes_crud.py（28 条）：**
- 正常流程：创建→获取列表→获取详情→更新→删除→验证已删除
- 异常操作：更新不存在的笔记、删除不存在的笔记、获取不存在的笔记、删除后再次获取/更新/删除
- 跨用户隔离：用户 A 无法访问用户 B 的笔记（各种操作）
- 参数校验：缺少 title、缺少 content、title 类型错误

**test_boundary_text.py（16 条）：**
- 空内容、单字符、1KB、10KB、100KB、1MB、3MB、5MB（精确边界）
- 5MB+1 字节（应拒绝或处理）、超长标题
- 特殊字符：XSS payload、SQL 注入 payload、Unicode 全字符集、emoji、换行符大量

### 数据驱动

JSON 文件存储测试数据，conftest.py 提供 `load_test_data()` helper，测试函数通过 `@pytest.mark.parametrize` 加载。

### 配置

pytest.ini 配置 HTML 报告、日志级别、默认标记。

## Track 3 — 日志聚类分析（实验性）

单文件 Python 脚本 `scripts/log_cluster.py`：
- 读取 JSON 格式的结构化错误日志
- 调用 LLM API 对 stack trace 做向量嵌入
- 使用 KMeans 聚类分组
- 输出每个聚类的摘要和典型样本
- 标注为实验性功能，需配置 API key

## 环境与依赖

- Go 1.21+（gomock、testify）
- Python 3.10+（pytest、requests、pytest-html）
- MySQL 8.0+（服务运行）
- Makefile 统一入口：启动服务、安装依赖、运行全部测试
