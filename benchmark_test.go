package main

import (
	"bytes"
	"cloud-notes/config"
	"cloud-notes/handler"
	"cloud-notes/middleware"
	"cloud-notes/models"
	"cloud-notes/store"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// 用于基准测试的 mock store（内存实现，消除 DB 噪声看纯 handler 性能）
type benchNoteStore struct {
	notes  []models.Note
	nextID uint
}

func (s *benchNoteStore) Create(note *models.Note) error {
	s.nextID++
	note.ID = s.nextID
	s.notes = append(s.notes, *note)
	return nil
}

func (s *benchNoteStore) List(userID uint) ([]models.Note, error) {
	var result []models.Note
	for _, n := range s.notes {
		if n.UserID == userID {
			result = append(result, n)
		}
	}
	return result, nil
}

func (s *benchNoteStore) GetByID(id, userID uint) (*models.Note, error) {
	for _, n := range s.notes {
		if n.ID == id && n.UserID == userID {
			return &n, nil
		}
	}
	return nil, fmt.Errorf("not found")
}

func (s *benchNoteStore) Update(id, userID uint, title, content string) error {
	return nil
}

func (s *benchNoteStore) Delete(id, userID uint) error {
	return nil
}

type benchUserStore struct{}

func (s *benchUserStore) Create(user *models.User) error { return nil }
func (s *benchUserStore) GetByUsername(username string) (*models.User, error) {
	return &models.User{ID: 1, Username: username, Password: "$2a$10$dummy"}, nil
}
func (s *benchUserStore) UpdatePassword(userID uint, hashedPwd string) error { return nil }

func setupBenchRouter() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	noteHandler := &handler.NoteHandler{Store: &benchNoteStore{}}
	userHandler := &handler.UserHandler{Store: &benchUserStore{}, JWTSecret: middleware.DefaultSecret}

	r.POST("/register", userHandler.Register)
	r.POST("/login", userHandler.Login)

	auth := r.Group("/api")
	auth.Use(middleware.JWTAuthWithSecret(middleware.DefaultSecret))
	auth.POST("/notes", noteHandler.CreateNote)
	auth.GET("/notes", noteHandler.GetNotes)
	return r
}

// ============================================================
// HTTP Handler 基准测试
// ============================================================

func BenchmarkRegister(b *testing.B) {
	r := setupBenchRouter()
	body, _ := json.Marshal(map[string]string{"username": "test", "password": "pass"})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/register", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
	}
}

func BenchmarkLogin(b *testing.B) {
	r := setupBenchRouter()
	body, _ := json.Marshal(map[string]string{"username": "test", "password": "pass"})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
	}
}

func BenchmarkCreateNote(b *testing.B) {
	r := setupBenchRouter()
	token, _ := middleware.GenerateToken(1)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		body := []byte(fmt.Sprintf(`{"title":"t%d","content":"c%d"}`, i, i))
		req := httptest.NewRequest("POST", "/api/notes", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
	}
}

func BenchmarkListNotes(b *testing.B) {
	r := setupBenchRouter()
	token, _ := middleware.GenerateToken(1)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/api/notes", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
	}
}

// ============================================================
// 模拟并发压测 (通过 b.RunParallel)
// ============================================================

func BenchmarkRegisterParallel(b *testing.B) {
	r := setupBenchRouter()
	body, _ := json.Marshal(map[string]string{"username": "test", "password": "pass"})

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			req := httptest.NewRequest("POST", "/register", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
		}
	})
}

func BenchmarkCreateNoteParallel(b *testing.B) {
	r := setupBenchRouter()
	token, _ := middleware.GenerateToken(1)
	counter := 0

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			counter++
			body := []byte(fmt.Sprintf(`{"title":"t%d","content":"c%d"}`, counter, counter))
			req := httptest.NewRequest("POST", "/api/notes", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
		}
	})
}

// goos: windows 下跳过需要 DB 的测试
var _ = config.DB
var _ = store.GormNoteStore{}
