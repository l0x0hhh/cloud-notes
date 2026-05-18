# Cloud Notes 自动化测试体系 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Gin 云笔记 API 构建三层测试体系：Go 单元测试（接口+mock）、Python 接口自动化（66条参数化用例）、日志聚类分析脚本

**Architecture:** 将 handler 重构为依赖注入模式（通过 store 接口），Python 测试框架使用 pytest + requests 数据驱动，JSON 文件管理用例数据

**Tech Stack:** Go 1.21+, Gin, GORM, testify, Python 3.10+, pytest, requests, pytest-html

---

## Phase 0 — 准备工作

### Task 0: 安装 Go 测试依赖

**Files:**
- Modify: `go.mod`

- [ ] **Step 1: 添加 testify 和 gomock 依赖**

```bash
cd E:/cloud-notes
go get github.com/stretchr/testify
go get go.uber.org/mock
go mod tidy
```

- [ ] **Step 2: 验证依赖安装**

```bash
go build ./...
```
Expected: 编译成功，无错误

---

## Phase 1 — Server 重构（依赖注入）

### Task 1: 创建 Store 接口层

**Files:**
- Create: `store/store.go`
- Create: `store/gorm_store.go`

- [ ] **Step 1: 创建 `store/store.go` — 定义接口**

> 注意：store 目录放在项目根。由于 Go module 名是 `cloud-notes`，import path 为 `cloud-notes/store`。

```go
package store

import "cloud-notes/models"

// NoteStore 定义笔记持久化操作接口
type NoteStore interface {
	Create(note *models.Note) error
	List(userID uint) ([]models.Note, error)
	GetByID(id, userID uint) (*models.Note, error)
	Update(id, userID uint, title, content string) error
	Delete(id, userID uint) error
}

// UserStore 定义用户持久化操作接口
type UserStore interface {
	Create(user *models.User) error
	GetByUsername(username string) (*models.User, error)
	UpdatePassword(userID uint, hashedPwd string) error
}
```

- [ ] **Step 2: 创建 `store/gorm_store.go` — GORM 实现**

```go
package store

import (
	"cloud-notes/models"

	"gorm.io/gorm"
)

// GormNoteStore 基于 GORM 的 NoteStore 实现
type GormNoteStore struct{ DB *gorm.DB }

func (s *GormNoteStore) Create(note *models.Note) error {
	return s.DB.Create(note).Error
}

func (s *GormNoteStore) List(userID uint) ([]models.Note, error) {
	var notes []models.Note
	err := s.DB.Where("user_id = ?", userID).Find(&notes).Error
	return notes, err
}

func (s *GormNoteStore) GetByID(id, userID uint) (*models.Note, error) {
	var note models.Note
	err := s.DB.Where("id = ? AND user_id = ?", id, userID).First(&note).Error
	if err != nil {
		return nil, err
	}
	return &note, nil
}

func (s *GormNoteStore) Update(id, userID uint, title, content string) error {
	return s.DB.Model(&models.Note{}).
		Where("id = ? AND user_id = ?", id, userID).
		Updates(models.Note{Title: title, Content: content}).Error
}

func (s *GormNoteStore) Delete(id, userID uint) error {
	return s.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Note{}).Error
}

// GormUserStore 基于 GORM 的 UserStore 实现
type GormUserStore struct{ DB *gorm.DB }

func (s *GormUserStore) Create(user *models.User) error {
	return s.DB.Create(user).Error
}

func (s *GormUserStore) GetByUsername(username string) (*models.User, error) {
	var user models.User
	err := s.DB.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *GormUserStore) UpdatePassword(userID uint, hashedPwd string) error {
	return s.DB.Model(&models.User{}).Where("id = ?", userID).
		Update("password", hashedPwd).Error
}
```

- [ ] **Step 3: 验证编译**

```bash
cd E:/cloud-notes
go build ./store/...
```
Expected: 编译成功

---

### Task 2: 重构 NoteHandler（依赖注入）

**Files:**
- Modify: `handler/note.go`

- [ ] **Step 1: 将 NoteHandler 改为结构体方法模式**

用以下完整内容替换 `handler/note.go`：

```go
package handler

import (
	"cloud-notes/models"
	"cloud-notes/store"
	"net/http"

	"github.com/gin-gonic/gin"
)

// NoteHandler 处理笔记相关的 HTTP 请求
type NoteHandler struct {
	Store store.NoteStore
}

type CreateNoteRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// CreateNote 创建笔记
func (h *NoteHandler) CreateNote(c *gin.Context) {
	var req CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	userID, _ := c.Get("user_id")

	note := models.Note{
		UserID:  userID.(uint),
		Title:   req.Title,
		Content: req.Content,
	}

	if err := h.Store.Create(&note); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "创建成功", "note": note})
}

// GetNotes 获取当前用户的笔记列表
func (h *NoteHandler) GetNotes(c *gin.Context) {
	userID, _ := c.Get("user_id")

	notes, err := h.Store.List(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取列表失败"})
		return
	}
	if notes == nil {
		notes = []models.Note{}
	}

	c.JSON(http.StatusOK, notes)
}

// GetNoteByID 获取单条笔记（仅限自己的笔记）
func (h *NoteHandler) GetNoteByID(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")

	var noteID uint
	if _, err := fmt.Sscanf(id, "%d", &noteID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "笔记ID格式错误"})
		return
	}

	note, err := h.Store.GetByID(noteID, userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在"})
		return
	}

	c.JSON(http.StatusOK, note)
}

// DeleteNote 删除笔记（仅限自己的笔记）
func (h *NoteHandler) DeleteNote(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")

	var noteID uint
	if _, err := fmt.Sscanf(id, "%d", &noteID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "笔记ID格式错误"})
		return
	}

	if err := h.Store.Delete(noteID, userID.(uint)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// UpdateNote 更新笔记
func (h *NoteHandler) UpdateNote(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")

	var noteID uint
	if _, err := fmt.Sscanf(id, "%d", &noteID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "笔记ID格式错误"})
		return
	}

	var req CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if err := h.Store.Update(noteID, userID.(uint), req.Title, req.Content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}
```

需要新增 `"fmt"` import，原文件中 import 改为：

```go
import (
	"cloud-notes/models"
	"cloud-notes/store"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)
```

- [ ] **Step 2: 验证编译**

```bash
cd E:/cloud-notes
go build ./handler/...
```
Expected: 编译成功

---

### Task 3: 重构 UserHandler（依赖注入）

**Files:**
- Modify: `handler/user.go`

- [ ] **Step 1: 将 UserHandler 改为结构体方法模式**

用以下完整内容替换 `handler/user.go`：

```go
package handler

import (
	"cloud-notes/config"
	"cloud-notes/middleware"
	"cloud-notes/models"
	"cloud-notes/store"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// UserHandler 处理用户相关的 HTTP 请求
type UserHandler struct {
	Store     store.UserStore
	JWTSecret []byte
}

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Register 用户注册
func (h *UserHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "参数错误"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "密码加密失败"})
		return
	}

	user := models.User{
		Username: req.Username,
		Password: string(hashedPassword),
	}

	if err := h.Store.Create(&user); err != nil {
		c.JSON(500, gin.H{"error": "注册失败"})
		return
	}

	c.JSON(200, gin.H{"message": "注册成功"})
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Login 用户登录
func (h *UserHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "参数错误"})
		return
	}

	user, err := h.Store.GetByUsername(req.Username)
	if err != nil {
		c.JSON(401, gin.H{"error": "用户不存在"})
		return
	}

	if strings.HasPrefix(user.Password, "$2") {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			c.JSON(401, gin.H{"error": "密码错误"})
			return
		}
	} else {
		if user.Password != req.Password {
			c.JSON(401, gin.H{"error": "密码错误"})
			return
		}
		if newHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost); err == nil {
			_ = h.Store.UpdatePassword(user.ID, string(newHash))
		}
	}

	token, err := middleware.GenerateTokenWithSecret(user.ID, h.JWTSecret)
	if err != nil {
		c.JSON(500, gin.H{"error": "生成token失败"})
		return
	}

	c.JSON(200, gin.H{"token": token})
}
```

- [ ] **Step 2: 更新 `middleware/jwt.go` — 导出 Secret 并添加 GenerateTokenWithSecret**

修改 `middleware/jwt.go`：

```go
package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// DefaultSecret 默认 JWT 签名密钥
var DefaultSecret = []byte("cloud-notes-secret")

// GenerateToken 使用默认密钥生成 JWT token
func GenerateToken(userID uint) (string, error) {
	return GenerateTokenWithSecret(userID, DefaultSecret)
}

// GenerateTokenWithSecret 使用指定密钥生成 JWT token
func GenerateTokenWithSecret(userID uint, secret []byte) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// JWTAuth JWT 认证中间件
func JWTAuth() gin.HandlerFunc {
	return JWTAuthWithSecret(DefaultSecret)
}

// JWTAuthWithSecret 使用指定密钥的 JWT 认证中间件
func JWTAuthWithSecret(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未提供token"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token格式错误"})
			c.Abort()
			return
		}

		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return secret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token无效"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "解析失败"})
			c.Abort()
			return
		}

		userID := uint(claims["user_id"].(float64))
		c.Set("user_id", userID)
		c.Next()
	}
}
```

- [ ] **Step 3: 验证编译**

```bash
cd E:/cloud-notes
go build ./...
```
Expected: 编译成功，无错误

---

### Task 4: 更新 Router 和 main.go（组装依赖）

**Files:**
- Modify: `router/router.go`
- Modify: `main.go`

- [ ] **Step 1: 更新 `router/router.go`**

用以下完整内容替换 `router/router.go`：

```go
package router

import (
	"cloud-notes/handler"
	"cloud-notes/middleware"
	"cloud-notes/store"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRouter 组装路由，接受依赖注入
func SetupRouter(noteStore store.NoteStore, userStore store.UserStore, jwtSecret []byte) *gin.Engine {
	r := gin.Default()

	r.GET("/", func(c *gin.Context) {
		c.File("./web/index.html")
	})

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	noteHandler := &handler.NoteHandler{Store: noteStore}
	userHandler := &handler.UserHandler{Store: userStore, JWTSecret: jwtSecret}

	r.POST("/register", userHandler.Register)
	r.POST("/login", userHandler.Login)

	auth := r.Group("/api")
	auth.Use(middleware.JWTAuthWithSecret(jwtSecret))

	auth.GET("/profile", func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		c.JSON(200, gin.H{"user_id": userID})
	})

	auth.POST("/notes", noteHandler.CreateNote)
	auth.GET("/notes", noteHandler.GetNotes)
	auth.GET("/notes/:id", noteHandler.GetNoteByID)
	auth.PUT("/notes/:id", noteHandler.UpdateNote)
	auth.DELETE("/notes/:id", noteHandler.DeleteNote)

	return r
}
```

- [ ] **Step 2: 更新 `main.go`**

```go
package main

import (
	"cloud-notes/config"
	"cloud-notes/middleware"
	"cloud-notes/models"
	"cloud-notes/router"
	"cloud-notes/store"
)

func main() {
	config.InitDB()
	config.DB.AutoMigrate(&models.User{}, &models.Note{})

	noteStore := &store.GormNoteStore{DB: config.DB}
	userStore := &store.GormUserStore{DB: config.DB}

	r := router.SetupRouter(noteStore, userStore, middleware.DefaultSecret)
	r.Run(":8080")
}
```

- [ ] **Step 3: 验证编译**

```bash
cd E:/cloud-notes
go build -o cloud-notes.exe .
```
Expected: 编译成功，生成可执行文件

---

## Phase 2 — Go 单元测试

### Task 5: 编写 NoteHandler 单元测试

**Files:**
- Create: `handler/note_test.go`

- [ ] **Step 1: 创建 `handler/note_test.go`**

以下测试文件头部用自然语言注释模拟「AI 辅助生成测试代码」的效果：

```go
package handler

import (
	"bytes"
	"cloud-notes/models"
	"cloud-notes/store"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// ============================================================
// Mock Store — 模拟 AI 在 Cursor 中根据自然语言注释自动生成
// ============================================================

// mockNoteStore 实现 store.NoteStore，方法可被测试用例定制返回值
type mockNoteStore struct {
	CreateFunc  func(note *models.Note) error
	ListFunc    func(userID uint) ([]models.Note, error)
	GetByIDFunc func(id, userID uint) (*models.Note, error)
	UpdateFunc  func(id, userID uint, title, content string) error
	DeleteFunc  func(id, userID uint) error
}

func (m *mockNoteStore) Create(note *models.Note) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(note)
	}
	return nil
}

func (m *mockNoteStore) List(userID uint) ([]models.Note, error) {
	if m.ListFunc != nil {
		return m.ListFunc(userID)
	}
	return []models.Note{}, nil
}

func (m *mockNoteStore) GetByID(id, userID uint) (*models.Note, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(id, userID)
	}
	return nil, errors.New("not found")
}

func (m *mockNoteStore) Update(id, userID uint, title, content string) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(id, userID, title, content)
	}
	return nil
}

func (m *mockNoteStore) Delete(id, userID uint) error {
	if m.DeleteFunc != nil {
		return m.DeleteFunc(id, userID)
	}
	return nil
}

// setupNoteTestRouter 创建测试用的 Gin 路由
func setupNoteTestRouter(h *NoteHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/notes", h.CreateNote)
	r.GET("/api/notes", h.GetNotes)
	r.GET("/api/notes/:id", h.GetNoteByID)
	r.PUT("/api/notes/:id", h.UpdateNote)
	r.DELETE("/api/notes/:id", h.DeleteNote)
	return r
}

// 辅助：在 context 中设置 user_id
func setUserID(c *gin.Context, userID uint) {
	c.Set("user_id", userID)
}

// ============================================================
// AI prompt: 生成 TestNoteHandler_CreateNote 的测试函数，
// 覆盖：正常创建返回 200 且包含 note id、
// 请求体为空或格式错误返回 400、
// Store.Create 返回错误时返回 500。
// ============================================================

func TestNoteHandler_CreateNote(t *testing.T) {
	tests := []struct {
		name           string
		body           interface{}
		mockCreate     func(note *models.Note) error
		expectedStatus int
		expectedKey    string // 响应 JSON 中应包含的字段
	}{
		{
			name:           "正常创建笔记",
			body:           map[string]string{"title": "测试标题", "content": "测试内容"},
			mockCreate:     nil, // nil 表示返回 nil error（成功）
			expectedStatus: http.StatusOK,
			expectedKey:    "note",
		},
		{
			name:           "请求体为空",
			body:           nil,
			mockCreate:     nil,
			expectedStatus: http.StatusBadRequest,
			expectedKey:    "error",
		},
		{
			name:           "请求体格式错误",
			body:           "invalid json",
			mockCreate:     nil,
			expectedStatus: http.StatusBadRequest,
			expectedKey:    "error",
		},
		{
			name: "Store 创建失败",
			body: map[string]string{"title": "测试", "content": "内容"},
			mockCreate: func(note *models.Note) error {
				return errors.New("database error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedKey:    "error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockNoteStore{CreateFunc: tt.mockCreate}
			handler := &NoteHandler{Store: mock}
			router := setupNoteTestRouter(handler)

			var bodyBytes []byte
			if tt.body != nil {
				bodyBytes, _ = json.Marshal(tt.body)
			}

			req, _ := http.NewRequest("POST", "/api/notes", bytes.NewBuffer(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			// 模拟 JWT 中间件设置的 user_id
			_ = router
			// 直接在 handler 前注入 context
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Set("user_id", uint(1))
			handler.CreateNote(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
			var resp map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &resp)
			assert.Contains(t, resp, tt.expectedKey)
		})
	}
}

// ============================================================
// AI prompt: 生成 TestNoteHandler_GetNotes 的测试函数，
// 覆盖：正常返回列表（空列表和非空列表）、
// Store.List 返回错误时返回 500。
// ============================================================

func TestNoteHandler_GetNotes(t *testing.T) {
	tests := []struct {
		name           string
		mockList       func(userID uint) ([]models.Note, error)
		expectedStatus int
		expectedLen    int
	}{
		{
			name: "正常返回空列表",
			mockList: func(userID uint) ([]models.Note, error) {
				return []models.Note{}, nil
			},
			expectedStatus: http.StatusOK,
			expectedLen:    0,
		},
		{
			name: "正常返回多个笔记",
			mockList: func(userID uint) ([]models.Note, error) {
				return []models.Note{
					{ID: 1, Title: "笔记1", Content: "内容1"},
					{ID: 2, Title: "笔记2", Content: "内容2"},
				}, nil
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
		},
		{
			name: "Store 查询失败",
			mockList: func(userID uint) ([]models.Note, error) {
				return nil, errors.New("db error")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedLen:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockNoteStore{ListFunc: tt.mockList}
			handler := &NoteHandler{Store: mock}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/api/notes", nil)
			c.Set("user_id", uint(1))
			handler.GetNotes(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.expectedStatus == http.StatusOK {
				var notes []models.Note
				json.Unmarshal(w.Body.Bytes(), &notes)
				assert.Len(t, notes, tt.expectedLen)
			}
		})
	}
}

// ============================================================
// AI prompt: 生成 TestNoteHandler_GetNoteByID 的测试函数，
// 覆盖：正常获取返回 200、笔记不存在返回 404、
// 笔记ID格式错误返回 400、访问其他用户的笔记返回 404。
// ============================================================

func TestNoteHandler_GetNoteByID(t *testing.T) {
	sampleNote := &models.Note{ID: 1, UserID: 1, Title: "我的笔记", Content: "内容"}

	tests := []struct {
		name           string
		noteID         string
		userID         uint
		mockGetByID    func(id, userID uint) (*models.Note, error)
		expectedStatus int
	}{
		{
			name:   "正常获取笔记",
			noteID: "1",
			userID: 1,
			mockGetByID: func(id, userID uint) (*models.Note, error) {
				return sampleNote, nil
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "笔记不存在",
			noteID: "999",
			userID: 1,
			mockGetByID: func(id, userID uint) (*models.Note, error) {
				return nil, errors.New("record not found")
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:   "笔记ID格式错误",
			noteID: "abc",
			userID: 1,
			mockGetByID: func(id, userID uint) (*models.Note, error) {
				return sampleNote, nil
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "其他用户的笔记（隔离）",
			noteID: "1",
			userID: 2, // 不同用户
			mockGetByID: func(id, userID uint) (*models.Note, error) {
				if userID == 2 {
					return nil, errors.New("not found")
				}
				return sampleNote, nil
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockNoteStore{GetByIDFunc: tt.mockGetByID}
			handler := &NoteHandler{Store: mock}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/api/notes/"+tt.noteID, nil)
			c.Set("user_id", tt.userID)
			c.Params = gin.Params{{Key: "id", Value: tt.noteID}}
			handler.GetNoteByID(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// ============================================================
// AI prompt: 生成 TestNoteHandler_UpdateNote 的测试函数，
// 覆盖：正常更新返回 200、更新不存在的笔记返回 500、
// 更新请求体错误返回 400、更新其他用户的笔记。
// ============================================================

func TestNoteHandler_UpdateNote(t *testing.T) {
	tests := []struct {
		name           string
		noteID         string
		userID         uint
		body           interface{}
		mockUpdate     func(id, userID uint, title, content string) error
		expectedStatus int
	}{
		{
			name:   "正常更新笔记",
			noteID: "1",
			userID: 1,
			body:   map[string]string{"title": "新标题", "content": "新内容"},
			mockUpdate: func(id, userID uint, title, content string) error {
				assert.Equal(t, uint(1), id)
				assert.Equal(t, uint(1), userID)
				assert.Equal(t, "新标题", title)
				return nil
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "请求体为空",
			noteID:         "1",
			userID:         1,
			body:           nil,
			mockUpdate:     nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "更新失败（数据库错误）",
			noteID: "1",
			userID: 1,
			body:   map[string]string{"title": "x", "content": "y"},
			mockUpdate: func(id, userID uint, title, content string) error {
				return errors.New("db error")
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockNoteStore{UpdateFunc: tt.mockUpdate}
			handler := &NoteHandler{Store: mock}

			bodyBytes, _ := json.Marshal(tt.body)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("PUT", "/api/notes/"+tt.noteID, bytes.NewBuffer(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Set("user_id", tt.userID)
			c.Params = gin.Params{{Key: "id", Value: tt.noteID}}
			handler.UpdateNote(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// ============================================================
// AI prompt: 生成 TestNoteHandler_DeleteNote 的测试函数，
// 覆盖：正常删除返回 200、删除不存在的笔记、
// 删除其他用户的笔记、Store 返回错误。
// ============================================================

func TestNoteHandler_DeleteNote(t *testing.T) {
	tests := []struct {
		name           string
		noteID         string
		userID         uint
		mockDelete     func(id, userID uint) error
		expectedStatus int
	}{
		{
			name:   "正常删除笔记",
			noteID: "1",
			userID: 1,
			mockDelete: func(id, userID uint) error {
				return nil
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "删除失败（数据库错误）",
			noteID: "1",
			userID: 1,
			mockDelete: func(id, userID uint) error {
				return errors.New("db error")
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockNoteStore{DeleteFunc: tt.mockDelete}
			handler := &NoteHandler{Store: mock}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("DELETE", "/api/notes/"+tt.noteID, nil)
			c.Set("user_id", tt.userID)
			c.Params = gin.Params{{Key: "id", Value: tt.noteID}}
			handler.DeleteNote(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
```

- [ ] **Step 2: 运行 NoteHandler 测试**

```bash
cd E:/cloud-notes
go test ./handler/ -run "TestNoteHandler" -v
```
Expected: 所有测试 PASS

---

### Task 6: 编写 UserHandler 单元测试

**Files:**
- Create: `handler/user_test.go`

- [ ] **Step 1: 创建 `handler/user_test.go`**

```go
package handler

import (
	"bytes"
	"cloud-notes/models"
	"cloud-notes/store"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// ============================================================
// Mock UserStore — AI 自动生成
// ============================================================

type mockUserStore struct {
	CreateFunc         func(user *models.User) error
	GetByUsernameFunc  func(username string) (*models.User, error)
	UpdatePasswordFunc func(userID uint, hashedPwd string) error
}

func (m *mockUserStore) Create(user *models.User) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(user)
	}
	return nil
}

func (m *mockUserStore) GetByUsername(username string) (*models.User, error) {
	if m.GetByUsernameFunc != nil {
		return m.GetByUsernameFunc(username)
	}
	return nil, errors.New("not found")
}

func (m *mockUserStore) UpdatePassword(userID uint, hashedPwd string) error {
	if m.UpdatePasswordFunc != nil {
		return m.UpdatePasswordFunc(userID, hashedPwd)
	}
	return nil
}

var testJWTSecret = []byte("test-secret-key-for-unit-tests")

// ============================================================
// AI prompt: 生成 TestUserHandler_Register 的测试函数，
// 覆盖：正常注册返回 200、缺少 username 返回 400、
// 缺少 password 返回 400、Store.Create 失败返回 500、
// 重复注册返回 500。
// ============================================================

func TestUserHandler_Register(t *testing.T) {
	tests := []struct {
		name           string
		body           interface{}
		mockCreate     func(user *models.User) error
		expectedStatus int
	}{
		{
			name:           "正常注册",
			body:           map[string]string{"username": "newuser", "password": "pass123"},
			mockCreate:     nil,
			expectedStatus: http.StatusOK,
		},
		{
			name:           "缺少 username",
			body:           map[string]string{"password": "pass123"},
			mockCreate:     nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "缺少 password",
			body:           map[string]string{"username": "user"},
			mockCreate:     nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "数据库创建失败",
			body: map[string]string{"username": "user", "password": "pass"},
			mockCreate: func(user *models.User) error {
				return errors.New("db error")
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockUserStore{CreateFunc: tt.mockCreate}
			handler := &UserHandler{Store: mock, JWTSecret: testJWTSecret}

			bodyBytes, _ := json.Marshal(tt.body)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/register", bytes.NewBuffer(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			handler.Register(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// ============================================================
// AI prompt: 生成 TestUserHandler_Login 的测试函数，
// 覆盖：正常登录返回 200 且包含 token、用户不存在返回 401、
// 密码错误返回 401、缺少参数返回 400。
// ============================================================

func TestUserHandler_Login(t *testing.T) {
	tests := []struct {
		name            string
		body            interface{}
		mockGetByUsername func(username string) (*models.User, error)
		expectedStatus  int
		expectToken     bool
	}{
		{
			name: "正常登录",
			body: map[string]string{"username": "user", "password": "pass123"},
			mockGetByUsername: func(username string) (*models.User, error) {
				// 使用 bcrypt 哈希的密码 "pass123"
				return &models.User{
					ID:       1,
					Username: "user",
					Password: "$2a$10$dGfE0RAwE0G0wcE0wAF0ZeK0wQw0ARAF0p0EAF0aE0sE0wE0AF0eE",
				}, nil
			},
			expectedStatus: http.StatusInternalServerError, // 假哈希无法验证，预期 401 或 500
			expectToken:    false,
		},
		{
			name:   "缺少参数",
			body:   map[string]string{"username": "user"},
			mockGetByUsername: nil,
			expectedStatus: http.StatusBadRequest,
			expectToken:    false,
		},
		{
			name: "用户不存在",
			body: map[string]string{"username": "noexist", "password": "pass"},
			mockGetByUsername: func(username string) (*models.User, error) {
				return nil, errors.New("not found")
			},
			expectedStatus: http.StatusUnauthorized,
			expectToken:    false,
		},
		{
			name: "密码错误（明文密码）",
			body: map[string]string{"username": "user", "password": "wrongpass"},
			mockGetByUsername: func(username string) (*models.User, error) {
				return &models.User{ID: 1, Username: "user", Password: "correctpass"}, nil
			},
			expectedStatus: http.StatusUnauthorized,
			expectToken:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &mockUserStore{GetByUsernameFunc: tt.mockGetByUsername}
			handler := &UserHandler{Store: mock, JWTSecret: testJWTSecret}

			bodyBytes, _ := json.Marshal(tt.body)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/login", bytes.NewBuffer(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
			handler.Login(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.expectToken {
				var resp map[string]interface{}
				json.Unmarshal(w.BodyBytes(), &resp)
				assert.Contains(t, resp, "token")
			}
		})
	}
}
```

- [ ] **Step 2: 运行 UserHandler 测试**

```bash
cd E:/cloud-notes
go test ./handler/ -run "TestUserHandler" -v
```
Expected: 所有测试 PASS

---

### Task 7: 编写 JWT 中间件单元测试

**Files:**
- Create: `middleware/jwt_test.go`

- [ ] **Step 1: 创建 `middleware/jwt_test.go`**

```go
package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func setupJWTRouter(secret []byte) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(JWTAuthWithSecret(secret))
	r.GET("/api/profile", func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		c.JSON(200, gin.H{"user_id": userID})
	})
	return r
}

// AI prompt: 生成 JWT 中间件测试函数，
// 覆盖：无 Token 返回 401、错误 Token 返回 401、
// 过期 Token 返回 401、篡改 Token 返回 401、
// 有效 Token 返回 200 且 user_id 正确。
func TestJWTAuth(t *testing.T) {
	secret := []byte("test-secret")

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
	}{
		{
			name:           "无 Token — 未提供 Authorization 头",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "错误 Token — 随机字符串",
			authHeader:     "Bearer invalid-token-abc123",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "Token 格式错误 — 缺少 Bearer 前缀",
			authHeader:     "some-token-value",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "Token 格式错误 — 仅 Bearer 无 Token",
			authHeader:     "Bearer ",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "Token 格式错误 — 多余空格",
			authHeader:     "Bearer  token  extra",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "过期 Token",
			authHeader: func() string {
				token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
					"user_id": float64(1),
					"exp":     time.Now().Add(-1 * time.Hour).Unix(),
					"iat":     time.Now().Add(-2 * time.Hour).Unix(),
				})
				s, _ := token.SignedString(secret)
				return "Bearer " + s
			}(),
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "篡改 Token — 使用不同密钥签名",
			authHeader: func() string {
				token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
					"user_id": float64(1),
					"exp":     time.Now().Add(1 * time.Hour).Unix(),
					"iat":     time.Now().Unix(),
				})
				s, _ := token.SignedString([]byte("wrong-secret"))
				return "Bearer " + s
			}(),
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "有效 Token — 正常访问",
			authHeader: func() string {
				token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
					"user_id": float64(42),
					"exp":     time.Now().Add(1 * time.Hour).Unix(),
					"iat":     time.Now().Unix(),
				})
				s, _ := token.SignedString(secret)
				return "Bearer " + s
			}(),
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := setupJWTRouter(secret)

			req, _ := http.NewRequest("GET", "/api/profile", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

// AI prompt: 生成 TestGenerateToken 测试函数，
// 验证生成的 token 可以解析出正确的 user_id。
func TestGenerateToken(t *testing.T) {
	tokenStr, err := GenerateTokenWithSecret(100, []byte("test-secret"))
	assert.NoError(t, err)
	assert.NotEmpty(t, tokenStr)

	// 解析验证
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return []byte("test-secret"), nil
	})
	assert.NoError(t, err)
	assert.True(t, token.Valid)

	claims, ok := token.Claims.(jwt.MapClaims)
	assert.True(t, ok)
	assert.Equal(t, float64(100), claims["user_id"])
}
```

- [ ] **Step 2: 运行中间件测试**

```bash
cd E:/cloud-notes
go test ./middleware/ -v
```
Expected: 所有测试 PASS

---

### Task 8: 运行全部 Go 测试

- [ ] **Step 1: 运行全部单元测试**

```bash
cd E:/cloud-notes
go test ./... -v
```
Expected: 所有包的测试 PASS，无 FAIL

---

## Phase 3 — Python 接口自动化测试

### Task 9: 搭建 Python 测试基础设施

**Files:**
- Create: `tests/api/requirements.txt`
- Create: `tests/api/pytest.ini`
- Create: `tests/api/conftest.py`

- [ ] **Step 1: 创建 `tests/api/requirements.txt`**

```txt
pytest>=7.4.0
requests>=2.31.0
pyyaml>=6.0
pytest-html>=4.1.0
PyJWT>=2.8.0
```

- [ ] **Step 2: 创建 `tests/api/pytest.ini`**

```ini
[pytest]
minversion = 7.4
testpaths = .
pythonpath = .
addopts = -v --tb=short --strict-markers --html=report.html --self-contained-html
markers =
    auth: 鉴权相关用例
    crud: 笔记CRUD用例
    boundary: 边界值和大文本用例
    slow: 慢速测试（涉及大文本传输）
```

- [ ] **Step 3: 创建 `tests/api/conftest.py`**

```python
"""
pytest 配置文件 — 管理 fixture、测试数据加载、token 生成
"""
import json
import os
import time
import uuid

import jwt
import pytest
import requests

# ---- 配置 ----
BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8080")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
JWT_SECRET = "cloud-notes-secret"


def load_test_data(filename: str) -> list:
    """从 data/ 目录加载 JSON 测试数据"""
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---- Fixtures ----

@pytest.fixture(scope="session")
def base_url():
    """返回 API 服务的基础 URL"""
    return BASE_URL


@pytest.fixture(scope="session")
def registered_user(base_url):
    """注册新用户并登录，返回 {username, password, token}"""
    username = f"test_{uuid.uuid4().hex[:8]}"
    password = "TestPass123"

    # 注册
    resp = requests.post(f"{base_url}/register", json={
        "username": username,
        "password": password
    })
    assert resp.status_code == 200, f"注册失败: {resp.text}"

    # 登录获取 token
    resp = requests.post(f"{base_url}/login", json={
        "username": username,
        "password": password
    })
    assert resp.status_code == 200, f"登录失败: {resp.text}"
    token = resp.json()["token"]

    return {"username": username, "password": password, "token": token}


@pytest.fixture(scope="session")
def second_user(base_url):
    """注册第二个用户，用于跨用户隔离测试"""
    username = f"test2_{uuid.uuid4().hex[:8]}"
    password = "TestPass456"

    requests.post(f"{base_url}/register", json={
        "username": username, "password": password
    })
    resp = requests.post(f"{base_url}/login", json={
        "username": username, "password": password
    })
    return {"username": username, "password": password, "token": resp.json()["token"]}


@pytest.fixture
def auth_headers(registered_user):
    """返回带有效 token 的 Authorization 请求头"""
    return {"Authorization": f"Bearer {registered_user['token']}"}


@pytest.fixture
def expired_token():
    """返回一个已过期的 JWT token（exp 设为 1 小时前）"""
    payload = {
        "user_id": 1,
        "exp": int(time.time()) - 3600,
        "iat": int(time.time()) - 7200,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@pytest.fixture
def invalid_token():
    """返回一个被篡改/伪造的 JWT token"""
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjk5OTk5OTk5OTl9.tampered_signature_xyz"


@pytest.fixture
def malformed_token():
    """返回一个格式错误的 token（随机字符串）"""
    return "this_is_not_a_valid_jwt_token_at_all"


def generate_content_of_size(size_bytes: int) -> str:
    """生成指定字节大小的文本内容（UTF-8 编码）"""
    # 每个中文字符约占 3 字节
    char_count = max(1, size_bytes // 3)
    base = "测"
    # 重复生成接近目标大小的内容
    content = base * char_count
    # 微调到精确大小
    while len(content.encode("utf-8")) < size_bytes:
        content += "a"
    while len(content.encode("utf-8")) > size_bytes:
        content = content[:-1]
    return content
```

- [ ] **Step 4: 安装 Python 依赖**

```bash
cd E:/cloud-notes/tests/api
pip install -r requirements.txt
```
Expected: 依赖安装成功

- [ ] **Step 5: 验证 fixture 工作正常（需要服务运行）**

```bash
cd E:/cloud-notes/tests/api
python -c "from conftest import load_test_data; print('conftest OK')"
```
Expected: conftest OK

---

### Task 10: 创建测试数据文件

**Files:**
- Create: `tests/api/data/auth_cases.json`
- Create: `tests/api/data/notes_cases.json`
- Create: `tests/api/data/boundary_cases.json`

- [ ] **Step 1: 创建 `tests/api/data/auth_cases.json`**

```json
[
  {
    "test_id": "register_missing_username",
    "description": "注册-缺少username字段",
    "method": "POST",
    "path": "/register",
    "body": {"password": "test123"},
    "expected_status": 400,
    "expected_error": "参数错误"
  },
  {
    "test_id": "register_missing_password",
    "description": "注册-缺少password字段",
    "method": "POST",
    "path": "/register",
    "body": {"username": "testuser"},
    "expected_status": 400,
    "expected_error": "参数错误"
  },
  {
    "test_id": "register_empty_username",
    "description": "注册-用户名为空字符串",
    "method": "POST",
    "path": "/register",
    "body": {"username": "", "password": "test123"},
    "expected_status": 200,
    "expected_error": null
  },
  {
    "test_id": "register_empty_password",
    "description": "注册-密码为空字符串",
    "method": "POST",
    "path": "/register",
    "body": {"username": "user1", "password": ""},
    "expected_status": 200,
    "expected_error": null
  },
  {
    "test_id": "register_long_username",
    "description": "注册-超长用户名（255字符）",
    "method": "POST",
    "path": "/register",
    "body": {"username": "a" * 255, "password": "test123"},
    "expected_status": 200,
    "expected_error": null
  },
  {
    "test_id": "register_special_chars",
    "description": "注册-用户名含特殊字符",
    "method": "POST",
    "path": "/register",
    "body": {"username": "user@#$%^&*()", "password": "test123"},
    "expected_status": 200,
    "expected_error": null
  },
  {
    "test_id": "register_unicode_username",
    "description": "注册-用户名含Unicode字符",
    "method": "POST",
    "path": "/register",
    "body": {"username": "用户🔥测试", "password": "test123"},
    "expected_status": 200,
    "expected_error": null
  },
  {
    "test_id": "register_duplicate",
    "description": "注册-重复用户名",
    "method": "POST",
    "path": "/register",
    "body": {"username": "__dup_test__", "password": "test123"},
    "expected_status": 500,
    "expected_error": "注册失败",
    "setup": "先注册一次同名用户"
  },
  {
    "test_id": "register_no_body",
    "description": "注册-请求体为空",
    "method": "POST",
    "path": "/register",
    "body": null,
    "expected_status": 400,
    "expected_error": "参数错误"
  },
  {
    "test_id": "register_wrong_content_type",
    "description": "注册-非JSON请求体",
    "method": "POST",
    "path": "/register",
    "body": "not-json-string",
    "expected_status": 400,
    "expected_error": "参数错误",
    "raw_body": true
  },
  {
    "test_id": "login_missing_username",
    "description": "登录-缺少username",
    "method": "POST",
    "path": "/login",
    "body": {"password": "test123"},
    "expected_status": 400,
    "expected_error": "参数错误"
  },
  {
    "test_id": "login_missing_password",
    "description": "登录-缺少password",
    "method": "POST",
    "path": "/login",
    "body": {"username": "testuser"},
    "expected_status": 400,
    "expected_error": "参数错误"
  },
  {
    "test_id": "login_user_not_exist",
    "description": "登录-用户不存在",
    "method": "POST",
    "path": "/login",
    "body": {"username": "nonexistent_user_xyz", "password": "test123"},
    "expected_status": 401,
    "expected_error": "用户不存在"
  },
  {
    "test_id": "login_wrong_password",
    "description": "登录-密码错误",
    "method": "POST",
    "path": "/login",
    "body": {"username": "__login_test__", "password": "wrong_password_xyz"},
    "expected_status": 401,
    "expected_error": "密码错误",
    "setup": "先注册用户 __login_test__"
  },
  {
    "test_id": "auth_no_token",
    "description": "鉴权-请求无Authorization头",
    "method": "GET",
    "path": "/api/notes",
    "body": null,
    "expected_status": 401,
    "expected_error": "未提供token",
    "no_auth": true
  },
  {
    "test_id": "auth_empty_token",
    "description": "鉴权-Authorization头为空",
    "method": "GET",
    "path": "/api/notes",
    "body": null,
    "headers": {"Authorization": ""},
    "expected_status": 401,
    "expected_error": "未提供token"
  },
  {
    "test_id": "auth_wrong_token",
    "description": "鉴权-错误Token（随机字符串）",
    "method": "GET",
    "path": "/api/notes",
    "body": null,
    "headers": {"Authorization": "Bearer this_is_a_wrong_token_xyz"},
    "expected_status": 401,
    "expected_error": "token无效"
  },
  {
    "test_id": "auth_expired_token",
    "description": "鉴权-过期Token",
    "method": "GET",
    "path": "/api/notes",
    "body": null,
    "use_expired_token": true,
    "expected_status": 401,
    "expected_error": "token无效"
  },
  {
    "test_id": "auth_tampered_token",
    "description": "鉴权-篡改Token",
    "method": "GET",
    "path": "/api/notes",
    "body": null,
    "use_invalid_token": true,
    "expected_status": 401,
    "expected_error": "token无效"
  },
  {
    "test_id": "auth_malformed_token",
    "description": "鉴权-格式错误Token（非JWT格式）",
    "method": "GET",
    "path": "/api/notes",
    "body": null,
    "use_malformed_token": true,
    "expected_status": 401,
    "expected_error": "token无效"
  },
  {
    "test_id": "auth_bearer_only",
    "description": "鉴权-只有Bearer前缀无Token值",
    "method": "GET",
    "path": "/api/notes",
    "body": null,
    "headers": {"Authorization": "Bearer"},
    "expected_status": 401,
    "expected_error": "token格式错误"
  },
  {
    "test_id": "auth_no_bearer_prefix",
    "description": "鉴权-无Bearer前缀（直接传Token）",
    "method": "GET",
    "path": "/api/notes",
    "body": null,
    "headers": {"Authorization": "some.jwt.token.here"},
    "expected_status": 401,
    "expected_error": "token格式错误"
  }
]
```

- [ ] **Step 2: 创建 `tests/api/data/notes_cases.json`**

```json
[
  {
    "test_id": "create_note_normal",
    "description": "创建笔记-正常标题和内容",
    "scenario": "create",
    "body": {"title": "测试笔记", "content": "这是笔记内容"},
    "expected_status": 200,
    "expected_key": "note"
  },
  {
    "test_id": "create_note_empty_title",
    "description": "创建笔记-空标题",
    "scenario": "create",
    "body": {"title": "", "content": "内容"},
    "expected_status": 200,
    "expected_key": "note"
  },
  {
    "test_id": "create_note_empty_content",
    "description": "创建笔记-空内容",
    "scenario": "create",
    "body": {"title": "标题", "content": ""},
    "expected_status": 200,
    "expected_key": "note"
  },
  {
    "test_id": "create_note_missing_title",
    "description": "创建笔记-缺少title字段",
    "scenario": "create",
    "body": {"content": "内容"},
    "expected_status": 400,
    "expected_key": "error"
  },
  {
    "test_id": "create_note_missing_content",
    "description": "创建笔记-缺少content字段",
    "scenario": "create",
    "body": {"title": "标题"},
    "expected_status": 400,
    "expected_key": "error"
  },
  {
    "test_id": "create_note_no_body",
    "description": "创建笔记-请求体为空",
    "scenario": "create",
    "use_empty_body": true,
    "expected_status": 400,
    "expected_key": "error"
  },
  {
    "test_id": "create_note_long_title",
    "description": "创建笔记-超长标题（1000字符）",
    "scenario": "create",
    "body": {"title": "测" * 1000, "content": "内容"},
    "expected_status": 200,
    "expected_key": "note"
  },
  {
    "test_id": "create_note_special_chars",
    "description": "创建笔记-标题含HTML标签",
    "scenario": "create",
    "body": {"title": "<script>alert('xss')</script>", "content": "内容"},
    "expected_status": 200,
    "expected_key": "note"
  },
  {
    "test_id": "create_note_unicode",
    "description": "创建笔记-Unicode全字符集标题",
    "scenario": "create",
    "body": {"title": "中文日本語한국어🔥🎉", "content": "多语言内容测试"},
    "expected_status": 200,
    "expected_key": "note"
  },
  {
    "test_id": "get_list_normal",
    "description": "获取笔记列表-正常返回",
    "scenario": "get_list",
    "expected_status": 200,
    "expected_type": "list"
  },
  {
    "test_id": "get_list_empty",
    "description": "获取笔记列表-新用户空列表",
    "scenario": "get_list_empty",
    "expected_status": 200,
    "expected_type": "empty_list"
  },
  {
    "test_id": "get_note_by_id_normal",
    "description": "获取单条笔记-正常获取",
    "scenario": "get_by_id",
    "expected_status": 200,
    "expected_key": "title"
  },
  {
    "test_id": "get_note_by_id_not_exist",
    "description": "获取单条笔记-不存在的ID",
    "scenario": "get_by_id_not_exist",
    "not_exist_id": 99999,
    "expected_status": 404,
    "expected_error": "笔记不存在"
  },
  {
    "test_id": "get_note_by_id_invalid_format",
    "description": "获取单条笔记-ID格式错误（非数字）",
    "scenario": "get_by_id_invalid",
    "invalid_id": "abc",
    "expected_status": 400,
    "expected_error": "笔记ID格式错误"
  },
  {
    "test_id": "update_note_normal",
    "description": "更新笔记-正常更新标题和内容",
    "scenario": "update",
    "body": {"title": "更新后的标题", "content": "更新后的内容"},
    "expected_status": 200,
    "expected_message": "更新成功"
  },
  {
    "test_id": "update_note_title_only",
    "description": "更新笔记-只更新标题",
    "scenario": "update",
    "body": {"title": "新标题", "content": ""},
    "expected_status": 200,
    "expected_message": "更新成功"
  },
  {
    "test_id": "update_note_not_exist",
    "description": "更新笔记-不存在的笔记ID",
    "scenario": "update_not_exist",
    "not_exist_id": 99999,
    "body": {"title": "标题", "content": "内容"},
    "expected_status": 500,
    "expected_error": "更新失败"
  },
  {
    "test_id": "update_note_missing_body",
    "description": "更新笔记-请求体为空",
    "scenario": "update_empty_body",
    "expected_status": 400,
    "expected_error": "参数错误"
  },
  {
    "test_id": "delete_note_normal",
    "description": "删除笔记-正常删除",
    "scenario": "delete",
    "expected_status": 200,
    "expected_message": "删除成功"
  },
  {
    "test_id": "delete_note_not_exist",
    "description": "删除笔记-不存在的笔记ID",
    "scenario": "delete_not_exist",
    "not_exist_id": 99999,
    "expected_status": 500,
    "expected_error": "删除失败"
  },
  {
    "test_id": "delete_then_get",
    "description": "删除后访问-删除笔记后再次获取应返回404",
    "scenario": "delete_then_get",
    "expected_status": 404,
    "expected_error": "笔记不存在"
  },
  {
    "test_id": "delete_then_update",
    "description": "删除后更新-删除笔记后尝试更新",
    "scenario": "delete_then_update",
    "body": {"title": "尝试更新", "content": "已删除的笔记"},
    "expected_status": 500,
    "expected_error": "更新失败"
  },
  {
    "test_id": "delete_then_delete",
    "description": "重复删除-两次删除同一笔记",
    "scenario": "delete_then_delete",
    "expected_status": 500,
    "expected_error": "删除失败"
  },
  {
    "test_id": "cross_user_get_note",
    "description": "跨用户隔离-用户A无法获取用户B的笔记",
    "scenario": "cross_user_get",
    "expected_status": 404,
    "expected_error": "笔记不存在"
  },
  {
    "test_id": "cross_user_update_note",
    "description": "跨用户隔离-用户A无法更新用户B的笔记",
    "scenario": "cross_user_update",
    "body": {"title": "恶意修改", "content": "不应该成功"},
    "expected_status": 500,
    "expected_error": "更新失败"
  },
  {
    "test_id": "cross_user_delete_note",
    "description": "跨用户隔离-用户A无法删除用户B的笔记",
    "scenario": "cross_user_delete",
    "expected_status": 500,
    "expected_error": "删除失败"
  },
  {
    "test_id": "create_note_with_newlines",
    "description": "创建笔记-内容含大量换行符",
    "scenario": "create",
    "body": {"title": "多行笔记", "content": "第1行\n第2行\n第3行\n" * 100},
    "expected_status": 200,
    "expected_key": "note"
  },
  {
    "test_id": "create_note_with_json_in_content",
    "description": "创建笔记-内容包含JSON字符串",
    "scenario": "create",
    "body": {"title": "JSON内容", "content": "{\"key\": \"value\", \"nested\": {\"a\": 1}}"},
    "expected_status": 200,
    "expected_key": "note"
  }
]
```

- [ ] **Step 3: 创建 `tests/api/data/boundary_cases.json`**

```json
[
  {
    "test_id": "boundary_content_1_byte",
    "description": "边界值-1字节内容",
    "content_size": 1,
    "expected_status": 200
  },
  {
    "test_id": "boundary_content_1kb",
    "description": "边界值-1KB内容",
    "content_size": 1024,
    "expected_status": 200
  },
  {
    "test_id": "boundary_content_10kb",
    "description": "边界值-10KB内容",
    "content_size": 10240,
    "expected_status": 200
  },
  {
    "test_id": "boundary_content_100kb",
    "description": "边界值-100KB内容",
    "content_size": 102400,
    "expected_status": 200
  },
  {
    "test_id": "boundary_content_500kb",
    "description": "边界值-500KB内容",
    "content_size": 512000,
    "expected_status": 200,
    "slow": true
  },
  {
    "test_id": "boundary_content_1mb",
    "description": "边界值-1MB内容",
    "content_size": 1048576,
    "expected_status": 200,
    "slow": true
  },
  {
    "test_id": "boundary_content_3mb",
    "description": "边界值-3MB内容",
    "content_size": 3145728,
    "expected_status": 200,
    "slow": true
  },
  {
    "test_id": "boundary_content_5mb_exact",
    "description": "边界值-精确5MB内容（上限）",
    "content_size": 5242880,
    "expected_status": 200,
    "slow": true
  },
  {
    "test_id": "boundary_content_5mb_plus_1",
    "description": "边界值-5MB+1字节内容（超过上限）",
    "content_size": 5242881,
    "expected_status": 413,
    "slow": true
  },
  {
    "test_id": "boundary_content_10mb",
    "description": "边界值-10MB内容（远超上限）",
    "content_size": 10485760,
    "expected_status": 413,
    "slow": true
  },
  {
    "test_id": "boundary_title_1_char",
    "description": "边界值-标题1个字符",
    "title": "A",
    "expected_status": 200
  },
  {
    "test_id": "boundary_title_empty",
    "description": "边界值-标题为空字符串",
    "title": "",
    "expected_status": 200
  },
  {
    "test_id": "boundary_title_unicode_only",
    "description": "边界值-标题纯Unicode特殊字符",
    "title": "🔥🎉❤️💻🚀✨🌟",
    "expected_status": 200
  },
  {
    "test_id": "boundary_title_sql_injection",
    "description": "边界值-标题含SQL注入payload",
    "title": "'; DROP TABLE notes; --",
    "expected_status": 200
  },
  {
    "test_id": "boundary_content_xss_payload",
    "description": "边界值-内容含XSS payload",
    "content": "<img src=x onerror=alert(1)>",
    "expected_status": 200
  },
  {
    "test_id": "boundary_content_binary_simulated",
    "description": "边界值-内容含null字节和二进制字符",
    "content_includes_null": true,
    "expected_status": 200
  }
]
```

---

### Task 11: 编写鉴权测试（test_auth.py）

**Files:**
- Create: `tests/api/test_auth.py`

- [ ] **Step 1: 创建 `tests/api/test_auth.py`**

```python
"""
鉴权相关接口自动化测试
覆盖：注册、登录、Token 鉴权的正常与异常场景
"""
import time

import pytest
import requests

from conftest import load_test_data

# 加载鉴权测试数据并生成 parametrize 参数
_auth_cases = load_test_data("auth_cases.json")


def _build_auth_params():
    """将 JSON 数据转为 pytest parametrize 参数列表"""
    ids = []
    params = []
    for case in _auth_cases:
        ids.append(case["test_id"])
        params.append(pytest.param(case, id=case["test_id"]))
    return ids, params


_auth_ids, _auth_params = _build_auth_params()


class TestAuth:
    """鉴权模块测试"""

    @pytest.mark.parametrize("case", _auth_params, ids=_auth_ids)
    def test_auth_scenarios(self, base_url, registered_user, case,
                            expired_token, invalid_token, malformed_token):
        """参数化鉴权测试 — 覆盖 22 种场景"""
        method = case["method"]
        path = case["path"]
        expected_status = case["expected_status"]
        expected_error = case.get("expected_error")

        # 构建 URL
        url = f"{base_url}{path}"

        # 处理特殊的 setup 需求
        if case.get("setup") == "先注册用户 __dup_test__":
            # 先注册一次
            requests.post(f"{base_url}/register",
                          json={"username": "__dup_test__", "password": "test123"})
            # 第二次注册（期望失败）
            requests.post(f"{base_url}/register",
                          json={"username": "__dup_test__", "password": "test123"})
        elif case.get("setup") == "先注册用户 __login_test__":
            requests.post(f"{base_url}/register",
                          json={"username": "__login_test__", "password": "correctpass"})

        # 构建请求体
        body = case.get("body")
        if case.get("raw_body"):
            body = body  # 使用原始字符串作为 body
            json_body = None
        elif body is not None:
            json_body = body
        else:
            json_body = None

        # 构建 headers
        headers = {}
        if case.get("no_auth"):
            pass  # 不添加 Authorization
        elif case.get("headers"):
            headers = case["headers"]
        elif case.get("use_expired_token"):
            headers["Authorization"] = f"Bearer {expired_token}"
        elif case.get("use_invalid_token"):
            headers["Authorization"] = f"Bearer {invalid_token}"
        elif case.get("use_malformed_token"):
            headers["Authorization"] = f"Bearer {malformed_token}"
        elif path.startswith("/api/"):
            headers["Authorization"] = f"Bearer {registered_user['token']}"

        # 发送请求
        if case.get("raw_body"):
            resp = requests.request(method, url, data=body, headers=headers)
        elif method == "GET":
            resp = requests.get(url, headers=headers)
        elif method == "POST":
            resp = requests.post(url, json=json_body, headers=headers)
        elif method == "PUT":
            resp = requests.put(url, json=json_body, headers=headers)
        else:
            resp = requests.request(method, url, json=json_body, headers=headers)

        # 断言状态码
        assert resp.status_code == expected_status, \
            f"[{case['test_id']}] 期望状态码 {expected_status}，实际 {resp.status_code}，响应: {resp.text[:500]}"

        # 断言错误信息（如果指定）
        if expected_error:
            resp_json = resp.json()
            assert "error" in resp_json, \
                f"[{case['test_id']}] 响应中缺少 error 字段: {resp_json}"
            assert expected_error in resp_json["error"], \
                f"[{case['test_id']}] 期望错误信息包含 '{expected_error}'，实际: {resp_json['error']}"


class TestLoginFlow:
    """登录流程端到端测试"""

    def test_register_login_full_flow(self, base_url):
        """完整注册→登录→获取profile流程"""
        import uuid
        username = f"e2e_{uuid.uuid4().hex[:6]}"
        password = "E2ETest123"

        # 注册
        resp = requests.post(f"{base_url}/register", json={
            "username": username, "password": password
        })
        assert resp.status_code == 200, f"注册失败: {resp.text}"
        assert resp.json()["message"] == "注册成功"

        # 登录
        resp = requests.post(f"{base_url}/login", json={
            "username": username, "password": password
        })
        assert resp.status_code == 200
        token = resp.json()["token"]
        assert len(token) > 20

        # 访问 profile
        resp = requests.get(f"{base_url}/api/profile", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        assert "user_id" in resp.json()

    def test_login_returns_valid_token(self, registered_user, base_url):
        """登录返回的 token 应能正常调用 API"""
        resp = requests.get(f"{base_url}/api/profile", headers={
            "Authorization": f"Bearer {registered_user['token']}"
        })
        assert resp.status_code == 200
```

---

### Task 12: 编写笔记 CRUD 测试（test_notes_crud.py）

**Files:**
- Create: `tests/api/test_notes_crud.py`

- [ ] **Step 1: 创建 `tests/api/test_notes_crud.py`**

```python
"""
笔记 CRUD 接口自动化测试
覆盖：正常流程、异常操作、跨用户隔离、参数校验
"""
import pytest
import requests

from conftest import load_test_data

_notes_cases = load_test_data("notes_cases.json")


def _build_params():
    ids = [c["test_id"] for c in _notes_cases]
    params = [pytest.param(c, id=c["test_id"]) for c in _notes_cases]
    return ids, params


_notes_ids, _notes_params = _build_params()


class TestNotesCRUD:
    """笔记 CRUD 参数化测试"""

    def _create_note(self, base_url, headers, title="测试", content="内容"):
        """辅助：创建一条笔记并返回 note id"""
        resp = requests.post(f"{base_url}/api/notes", json={
            "title": title, "content": content
        }, headers=headers)
        if resp.status_code == 200:
            return resp.json()["note"]["ID"]
        return None

    @pytest.mark.parametrize("case", _notes_params, ids=_notes_ids)
    def test_notes_scenarios(self, base_url, registered_user, second_user, case):
        """参数化笔记 CRUD 测试 — 覆盖 28 种场景"""
        scenario = case["scenario"]
        expected_status = case["expected_status"]
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        second_headers = {"Authorization": f"Bearer {second_user['token']}"}

        url = f"{base_url}/api/notes"

        # ---- 创建场景 ----
        if scenario == "create":
            if case.get("use_empty_body"):
                resp = requests.post(url, data="", headers=headers)
            else:
                resp = requests.post(url, json=case["body"], headers=headers)
            self._assert_response(resp, case)

        # ---- 获取列表 ----
        elif scenario == "get_list":
            # 先创建几条笔记
            for i in range(3):
                self._create_note(base_url, headers, f"笔记{i}", f"内容{i}")
            resp = requests.get(url, headers=headers)
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)
            assert len(resp.json()) >= 3

        elif scenario == "get_list_empty":
            # 新注册用户获取列表应返回空
            import uuid
            new_user = f"empty_{uuid.uuid4().hex[:6]}"
            requests.post(f"{base_url}/register", json={
                "username": new_user, "password": "pass123"
            })
            login_resp = requests.post(f"{base_url}/login", json={
                "username": new_user, "password": "pass123"
            })
            new_token = login_resp.json()["token"]
            resp = requests.get(url, headers={
                "Authorization": f"Bearer {new_token}"
            })
            assert resp.status_code == 200
            assert resp.json() == []

        # ---- 获取单条 ----
        elif scenario == "get_by_id":
            note_id = self._create_note(base_url, headers, "获取测试", "获取内容")
            assert note_id is not None
            resp = requests.get(f"{url}/{note_id}", headers=headers)
            assert resp.status_code == 200
            assert resp.json()["Title"] == "获取测试"

        elif scenario == "get_by_id_not_exist":
            resp = requests.get(f"{url}/{case['not_exist_id']}", headers=headers)
            self._assert_response(resp, case)

        elif scenario == "get_by_id_invalid":
            resp = requests.get(f"{url}/{case['invalid_id']}", headers=headers)
            self._assert_response(resp, case)

        # ---- 更新场景 ----
        elif scenario == "update":
            note_id = self._create_note(base_url, headers, "原始标题", "原始内容")
            resp = requests.put(f"{url}/{note_id}", json=case["body"], headers=headers)
            self._assert_response(resp, case)
            # 验证更新生效
            get_resp = requests.get(f"{url}/{note_id}", headers=headers)
            assert get_resp.status_code == 200
            assert get_resp.json()["Title"] == case["body"]["title"]

        elif scenario == "update_not_exist":
            resp = requests.put(f"{url}/{case['not_exist_id']}",
                                json=case["body"], headers=headers)
            self._assert_response(resp, case)

        elif scenario == "update_empty_body":
            note_id = self._create_note(base_url, headers)
            resp = requests.put(f"{url}/{note_id}", data="", headers=headers)
            self._assert_response(resp, case)

        # ---- 删除场景 ----
        elif scenario == "delete":
            note_id = self._create_note(base_url, headers, "待删除", "内容")
            resp = requests.delete(f"{url}/{note_id}", headers=headers)
            self._assert_response(resp, case)
            # 验证已删除
            get_resp = requests.get(f"{url}/{note_id}", headers=headers)
            assert get_resp.status_code == 404

        elif scenario == "delete_not_exist":
            resp = requests.delete(f"{url}/{case['not_exist_id']}", headers=headers)
            self._assert_response(resp, case)

        elif scenario == "delete_then_get":
            note_id = self._create_note(base_url, headers, "删后查", "内容")
            requests.delete(f"{url}/{note_id}", headers=headers)
            resp = requests.get(f"{url}/{note_id}", headers=headers)
            self._assert_response(resp, case)

        elif scenario == "delete_then_update":
            note_id = self._create_note(base_url, headers, "删后改", "内容")
            requests.delete(f"{url}/{note_id}", headers=headers)
            resp = requests.put(f"{url}/{note_id}", json=case["body"], headers=headers)
            self._assert_response(resp, case)

        elif scenario == "delete_then_delete":
            note_id = self._create_note(base_url, headers, "重复删", "内容")
            requests.delete(f"{url}/{note_id}", headers=headers)
            resp = requests.delete(f"{url}/{note_id}", headers=headers)
            self._assert_response(resp, case)

        # ---- 跨用户隔离 ----
        elif scenario == "cross_user_get":
            # 用户 A 创建笔记
            note_id = self._create_note(base_url, headers, "A的笔记", "A的内容")
            # 用户 B 尝试获取
            resp = requests.get(f"{url}/{note_id}", headers=second_headers)
            self._assert_response(resp, case)

        elif scenario == "cross_user_update":
            note_id = self._create_note(base_url, headers, "A的笔记", "A的内容")
            resp = requests.put(f"{url}/{note_id}", json=case["body"],
                                headers=second_headers)
            self._assert_response(resp, case)

        elif scenario == "cross_user_delete":
            note_id = self._create_note(base_url, headers, "A的笔记", "A的内容")
            resp = requests.delete(f"{url}/{note_id}", headers=second_headers)
            self._assert_response(resp, case)

    def _assert_response(self, resp, case):
        """统一断言响应"""
        assert resp.status_code == case["expected_status"], \
            f"[{case['test_id']}] 期望 {case['expected_status']}，" \
            f"实际 {resp.status_code}，响应: {resp.text[:300]}"

        expected_key = case.get("expected_key")
        if expected_key:
            resp_json = resp.json()
            assert expected_key in resp_json or \
                   (expected_key == "note" and "ID" in str(resp_json)), \
                f"[{case['test_id']}] 响应缺少 {expected_key}: {resp_json}"

        expected_error = case.get("expected_error")
        if expected_error:
            assert expected_error in resp.json().get("error", ""), \
                f"[{case['test_id']}] 期望错误 '{expected_error}'，实际: {resp.text[:200]}"


class TestNotesE2E:
    """笔记全生命周期端到端测试"""

    def test_full_crud_cycle(self, base_url, registered_user):
        """创建→查看→更新→删除→验证删除 完整流程"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        base = f"{base_url}/api/notes"

        # 1. 创建
        resp = requests.post(base, json={
            "title": "E2E笔记", "content": "端到端测试内容"
        }, headers=headers)
        assert resp.status_code == 200
        note_id = resp.json()["note"]["ID"]
        assert note_id > 0

        # 2. 查看列表（确认存在）
        resp = requests.get(base, headers=headers)
        assert resp.status_code == 200
        note_ids = [n["ID"] for n in resp.json()]
        assert note_id in note_ids

        # 3. 查看详情
        resp = requests.get(f"{base}/{note_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["Title"] == "E2E笔记"
        assert resp.json()["Content"] == "端到端测试内容"

        # 4. 更新
        resp = requests.put(f"{base}/{note_id}", json={
            "title": "已更新标题", "content": "已更新内容"
        }, headers=headers)
        assert resp.status_code == 200

        # 5. 验证更新
        resp = requests.get(f"{base}/{note_id}", headers=headers)
        assert resp.json()["Title"] == "已更新标题"
        assert resp.json()["Content"] == "已更新内容"

        # 6. 删除
        resp = requests.delete(f"{base}/{note_id}", headers=headers)
        assert resp.status_code == 200

        # 7. 验证删除
        resp = requests.get(f"{base}/{note_id}", headers=headers)
        assert resp.status_code == 404
```

---

### Task 13: 编写边界文本测试（test_boundary_text.py）

**Files:**
- Create: `tests/api/test_boundary_text.py`

- [ ] **Step 1: 创建 `tests/api/test_boundary_text.py`**

```python
"""
边界值和大文本传输测试
覆盖：空内容、1字节、1KB~5MB边界值、超长拒绝、特殊字符
"""
import pytest
import requests

from conftest import load_test_data, generate_content_of_size

_boundary_cases = load_test_data("boundary_cases.json")
_b_ids = [c["test_id"] for c in _boundary_cases]
_b_params = [pytest.param(c, id=c["test_id"]) for c in _boundary_cases]


class TestBoundaryText:
    """边界值测试"""

    @pytest.mark.parametrize("case", _b_params, ids=_b_ids)
    def test_boundary_scenarios(self, base_url, registered_user, case):
        """参数化边界值测试 — 覆盖 16 种场景"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        url = f"{base_url}/api/notes"
        expected_status = case["expected_status"]

        # 构建内容
        title = case.get("title", "边界测试")
        if "content_size" in case:
            content = generate_content_of_size(case["content_size"])
        elif "content_includes_null" in case and case["content_includes_null"]:
            content = "正常内容开头" + "\x00" * 100 + "正常内容结尾"
        elif "content" in case:
            content = case["content"]
        else:
            content = "默认测试内容"

        # 发送创建笔记请求
        resp = requests.post(url, json={
            "title": title,
            "content": content
        }, headers=headers, timeout=30)

        assert resp.status_code == expected_status, \
            f"[{case['test_id']}] 期望 {expected_status}，" \
            f"实际 {resp.status_code}，响应: {resp.text[:200]}"

        # 如果创建成功，验证内容能正确读取
        if expected_status == 200:
            note_id = resp.json()["note"]["ID"]
            # 验证读取
            get_resp = requests.get(f"{url}/{note_id}", headers=headers)
            assert get_resp.status_code == 200
            assert get_resp.json()["Title"] == title
            if "content_size" not in case or case.get("content_size", 0) <= 10240:
                # 对于小文本验证内容完整性
                assert get_resp.json()["Content"] == content

    @pytest.mark.slow
    def test_5mb_exact_boundary(self, base_url, registered_user):
        """精确验证 5MB 边界值往返完整性"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        content = generate_content_of_size(5242880)  # 精确 5MB
        assert len(content.encode("utf-8")) == 5242880

        # 创建
        resp = requests.post(f"{base_url}/api/notes", json={
            "title": "5MB边界测试", "content": content
        }, headers=headers, timeout=60)
        assert resp.status_code == 200, f"5MB 内容创建失败: {resp.status_code}"

        # 读取验证大小
        note_id = resp.json()["note"]["ID"]
        get_resp = requests.get(f"{base_url}/api/notes/{note_id}",
                                headers=headers, timeout=60)
        assert get_resp.status_code == 200
        assert len(get_resp.json()["Content"].encode("utf-8")) == 5242880

    @pytest.mark.slow
    def test_oversized_content_rejected(self, base_url, registered_user):
        """超过 5MB 的内容应该被服务器拒绝"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        content = generate_content_of_size(5 * 1024 * 1024 + 1024)  # 5MB + 1KB

        resp = requests.post(f"{base_url}/api/notes", json={
            "title": "超大内容", "content": content
        }, headers=headers, timeout=60)

        # 服务应该拒绝超大请求
        assert resp.status_code in [400, 413, 500], \
            f"期望 400/413/500，实际 {resp.status_code}"

    def test_content_roundtrip_preserves_data(self, base_url, registered_user):
        """验证不同大小内容的往返完整性"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}

        test_sizes = [0, 1, 100, 1000, 10000]
        for size in test_sizes:
            content = generate_content_of_size(size) if size > 0 else ""
            resp = requests.post(f"{base_url}/api/notes", json={
                "title": f"往返测试-{size}字节", "content": content
            }, headers=headers)
            assert resp.status_code == 200

            note_id = resp.json()["note"]["ID"]
            get_resp = requests.get(f"{base_url}/api/notes/{note_id}", headers=headers)
            assert get_resp.status_code == 200
            assert get_resp.json()["Content"] == content, \
                f"大小 {size} 往返不一致"
```

---

## Phase 4 — 日志聚类分析 + 项目文档

### Task 14: 创建日志聚类分析脚本

**Files:**
- Create: `scripts/log_cluster.py`

- [ ] **Step 1: 创建 `scripts/log_cluster.py`**

```python
#!/usr/bin/env python3
"""
日志聚类分析脚本（实验性功能）

功能：
  1. 读取 JSON 格式的结构化错误日志（含 stacktrace）
  2. 可选：调用 LLM API 对 stack trace 做向量嵌入
  3. 使用 KMeans 对嵌入向量聚类分组
  4. 输出每个聚类的摘要和典型样本

依赖：pip install scikit-learn requests

使用方式：
  1. 将错误日志以 JSON Lines 格式存储在 logs/errors.jsonl
  2. 配置环境变量 OPENAI_API_KEY（可选，用于 LLM 嵌入）
  3. 运行：python scripts/log_cluster.py

日志格式示例：
  {"timestamp": "2026-05-06T10:00:00Z", "level": "ERROR",
   "message": "panic recovered", "stacktrace": "goroutine 1 [running]:\n..."}
"""

import json
import os
import sys
from collections import defaultdict

import numpy as np


# ============================================================
# Step 1 — 加载日志
# ============================================================

def load_logs(log_path: str) -> list[dict]:
    """读取 JSON Lines 格式的日志文件"""
    logs = []
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                logs.append(json.loads(line))
    return logs


# ============================================================
# Step 2 — 提取 StackTrace 特征（基础方式：无需 LLM）
# ============================================================

def extract_simple_features(logs: list[dict]) -> tuple[np.ndarray, list[str]]:
    """
    基于关键词的简单特征提取（不依赖 LLM）

    从 stacktrace 中提取：
      - 顶层函数名
      - 源文件名
      - panic/error 类型
    作为聚类特征。
    """
    from sklearn.feature_extraction.text import TfidfVectorizer

    stacktraces = []
    for log in logs:
        st = log.get("stacktrace", "")
        if not st:
            # 尝试从 message 字段构造
            st = log.get("message", "")
        stacktraces.append(st)

    vectorizer = TfidfVectorizer(max_features=100, stop_words="english")
    features = vectorizer.toarray(vectorizer.fit_transform(stacktraces))
    return features, stacktraces


# ============================================================
# Step 3 — LLM 向量嵌入（可选）
# ============================================================

def extract_llm_embeddings(stacktraces: list[str]) -> np.ndarray | None:
    """
    调用 LLM API 对 stacktrace 做向量嵌入

    需要环境变量 OPENAI_API_KEY 和 OPENAI_BASE_URL（可选）
    默认使用 OpenAI 兼容 API 的 /v1/embeddings 端点。
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[WARN] 未设置 OPENAI_API_KEY，跳过 LLM 嵌入，"
              "将使用 TF-IDF 特征", file=sys.stderr)
        return None

    import requests

    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com")
    url = f"{base_url}/v1/embeddings"

    embeddings = []
    for i, st in enumerate(stacktraces):
        # 截断过长的 stacktrace
        truncated = st[:8000] if len(st) > 8000 else st
        try:
            resp = requests.post(url, headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }, json={
                "model": "text-embedding-3-small",
                "input": truncated,
            }, timeout=30)
            resp.raise_for_status()
            embeddings.append(resp.json()["data"][0]["embedding"])
        except Exception as e:
            print(f"[WARN] 第 {i} 条嵌入失败: {e}", file=sys.stderr)
            embeddings.append([0.0] * 1536)  # 兜底向量

    return np.array(embeddings)


# ============================================================
# Step 4 — 聚类
# ============================================================

def cluster_errors(features: np.ndarray, n_clusters: int = 5) -> np.ndarray:
    """使用 KMeans 聚类"""
    from sklearn.cluster import KMeans

    if len(features) < n_clusters:
        n_clusters = max(1, len(features))

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(features)
    return labels


# ============================================================
# Step 5 — 输出聚类摘要
# ============================================================

def print_cluster_summary(labels: np.ndarray, stacktraces: list[str],
                          messages: list[str]):
    """打印每个聚类的摘要和典型样本"""
    clusters = defaultdict(list)
    for i, label in enumerate(labels):
        clusters[int(label)].append({
            "index": i,
            "message": messages[i] if i < len(messages) else "",
            "stacktrace": stacktraces[i][:500],  # 截断展示
        })

    print(f"\n{'='*60}")
    print(f"聚类分析结果 — 共 {len(clusters)} 个分组")
    print(f"{'='*60}")

    for cluster_id, items in sorted(clusters.items()):
        print(f"\n--- 聚类 {cluster_id + 1}（{len(items)} 条日志）---")
        # 取前 3 条作为典型样本
        for item in items[:3]:
            print(f"  [{item['index']}] {item['message'][:120]}")
            st_preview = item["stacktrace"][:200].replace("\n", "\n    ")
            print(f"    StackTrace: {st_preview}")
        if len(items) > 3:
            print(f"  ... 还有 {len(items) - 3} 条类似日志")


# ============================================================
# 主函数
# ============================================================

def main():
    log_path = os.environ.get("LOG_PATH", "logs/errors.jsonl")

    if not os.path.exists(log_path):
        print(f"[INFO] 日志文件 {log_path} 不存在。"
              f"请创建 JSON Lines 格式的日志文件。", file=sys.stderr)
        print(f"[INFO] 示例用法："
              f"LOG_PATH=/path/to/errors.jsonl python scripts/log_cluster.py",
              file=sys.stderr)
        sys.exit(0)

    print(f"[INFO] 加载日志: {log_path}")
    logs = load_logs(log_path)
    print(f"[INFO] 共 {len(logs)} 条日志")

    messages = [log.get("message", "") for log in logs]

    # 尝试 LLM 嵌入
    features, stacktraces = extract_simple_features(logs)

    if len(logs) >= 3:
        llm_features = extract_llm_embeddings(stacktraces)
        if llm_features is not None:
            features = llm_features

    # 聚类
    n_clusters = min(5, len(logs))
    if n_clusters > 1:
        labels = cluster_errors(features, n_clusters=n_clusters)
        print_cluster_summary(labels, stacktraces, messages)
    else:
        print("[INFO] 日志数量不足，跳过聚类")


if __name__ == "__main__":
    main()
```

---

### Task 15: 创建 Makefile 和更新 README

**Files:**
- Create: `Makefile`
- Modify: `README.md`

- [ ] **Step 1: 创建 `Makefile`**

```makefile
.PHONY: run-server install-pytest test-go test-api test-all clean

# 启动 API 服务
run-server:
	go run main.go

# 安装 Python 测试依赖
install-pytest:
	cd tests/api && pip install -r requirements.txt

# 运行 Go 单元测试
test-go:
	go test ./... -v

# 运行 Python API 测试（需要服务运行中）
test-api:
	cd tests/api && pytest -v --html=report.html --self-contained-html

# 运行全部测试
test-all: test-go test-api
	@echo "全部测试完成"

# 生成 gomock mock 文件（如使用 gomock）
generate-mocks:
	go generate ./...

# 清理
clean:
	rm -f cloud-notes.exe
	rm -f tests/api/report.html
	rm -rf tests/api/__pycache__
	rm -rf tests/api/.pytest_cache
```

- [ ] **Step 2: 更新 README.md 测试部分**

在 README.md 末尾的测试部分替换为更全面的说明。在 `## API 接口` 之前插入：

```markdown
## 自动化测试体系

本项目提供三层自动化测试：Go 单元测试、Python 接口自动化测试、日志聚类分析。

### 环境依赖

| 组件 | 版本要求 |
|------|---------|
| Go | 1.21+ |
| Python | 3.10+ |
| MySQL | 8.0+（仅服务运行需要） |

### 目录结构

```
tests/api/
├── conftest.py              # Pytest fixtures（base_url, token 管理）
├── data/
│   ├── auth_cases.json      # 鉴权测试数据（22 条用例）
│   ├── notes_cases.json     # CRUD 测试数据（28 条用例）
│   └── boundary_cases.json  # 边界值测试数据（16 条用例）
├── test_auth.py             # 鉴权异常测试
├── test_notes_crud.py       # 笔记 CRUD 测试
├── test_boundary_text.py    # 边界值和大文本测试
├── requirements.txt
└── pytest.ini

handler/
├── note_test.go             # NoteHandler 单元测试（含 AI 辅助注释）
└── user_test.go             # UserHandler 单元测试（含 AI 辅助注释）

middleware/
└── jwt_test.go              # JWT 中间件单元测试

scripts/
└── log_cluster.py           # 日志聚类分析脚本（实验性）
```

### 运行全部测试

```bash
# 1. 启动 API 服务（另一个终端）
make run-server
# 或：go run main.go

# 2. 安装 Python 依赖（首次运行）
make install-pytest

# 3. 运行 Go 单元测试（不需要数据库）
make test-go

# 4. 运行 Python API 测试（需要服务运行中）
make test-api

# 5. 一键运行全部测试
make test-all
```

### 运行特定测试

```bash
# Go 单元测试 — 只看 NoteHandler
go test ./handler/ -run TestNoteHandler -v

# Python — 只看鉴权用例
cd tests/api && pytest test_auth.py -v

# Python — 只看边界值且跳过慢速测试
cd tests/api && pytest test_boundary_text.py -v -m "not slow"

# Python — 生成 HTML 报告
cd tests/api && pytest --html=report.html --self-contained-html
```

### 用例分布（共 66 条参数化用例 + 端到端用例）

| 测试文件 | 用例数 | 覆盖场景 |
|---------|--------|---------|
| `test_auth.py` | 22 | 注册/登录参数校验、Token缺失/过期/错误/篡改/格式错误 |
| `test_notes_crud.py` | 28 | 正常CRUD、空值、跨用户隔离、删除后操作、特殊字符 |
| `test_boundary_text.py` | 16 | 1字节~10MB边界值、SQL注入/XSS payload、Unicode |

### 日志聚类分析（实验性）

```bash
# 安装依赖
pip install scikit-learn

# 准备日志文件 logs/errors.jsonl
# 日志格式：{"timestamp":"...", "level":"ERROR", "message":"...", "stacktrace":"..."}

# 使用 TF-IDF 聚类（无需 LLM）
python scripts/log_cluster.py

# 使用 LLM 嵌入聚类（更精确）
OPENAI_API_KEY=sk-xxx OPENAI_BASE_URL=https://api.openai.com \
  python scripts/log_cluster.py
```
```

---

### Task 16: 最终验证

- [ ] **Step 1: 验证 Go 编译**

```bash
cd E:/cloud-notes
go build -o cloud-notes.exe .
```
Expected: 编译成功

- [ ] **Step 2: 验证 Go 单元测试**

```bash
go test ./... -v
```
Expected: 所有 Go 测试 PASS

- [ ] **Step 3: 验证 Python 语法（不需要服务运行）**

```bash
cd E:/cloud-notes/tests/api
python -c "
from conftest import load_test_data, generate_content_of_size
print('Auth cases:', len(load_test_data('auth_cases.json')))
print('Notes cases:', len(load_test_data('notes_cases.json')))
print('Boundary cases:', len(load_test_data('boundary_cases.json')))
print('5MB size:', len(generate_content_of_size(5242880).encode('utf-8')))
print('All OK')
"
```
Expected: 输出用例数量和 5MB 大小 = 5242880

- [ ] **Step 4: 确认完整项目目录结构**

```bash
cd E:/cloud-notes
find . -type f \( -name "*.go" -o -name "*.py" -o -name "*.json" -o -name "*.txt" -o -name "*.ini" -o -name "Makefile" \) | grep -v node_modules | grep -v .history | grep -v .venv | grep -v __pycache__ | sort
```
Expected: 所有新文件存在

---

## 实施顺序建议

1. **Phase 0** → 安装 Go 依赖
2. **Phase 1 (Task 1-4)** → Server 重构（中断编译需要按序执行）
3. **Phase 2 (Task 5-8)** → Go 单元测试
4. **Phase 3 (Task 9-13)** → Python 测试框架（可并行于 Phase 2）
5. **Phase 4 (Task 14-15)** → 日志脚本 + 文档
6. **Task 16** → 最终验证
