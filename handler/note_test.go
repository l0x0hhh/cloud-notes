package handler

import (
	"bytes"
	"cloud-notes/models"
	"encoding/json"
	"errors"
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
		expectedKey    string
	}{
		{
			name:           "正常创建笔记",
			body:           map[string]string{"title": "测试标题", "content": "测试内容"},
			mockCreate:     nil,
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

			var bodyBytes []byte
			if tt.body != nil {
				bodyBytes, _ = json.Marshal(tt.body)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/api/notes", bytes.NewBuffer(bodyBytes))
			c.Request.Header.Set("Content-Type", "application/json")
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
				assert.Equal(t, uint(1), id)
				assert.Equal(t, uint(1), userID)
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
			name:   "访问其他用户的笔记（隔离）",
			noteID: "1",
			userID: 2,
			mockGetByID: func(id, userID uint) (*models.Note, error) {
				return nil, errors.New("not found")
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
// 覆盖：正常更新返回 200、更新请求体错误返回 400、
// Store 返回错误时返回 500。
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
				assert.Equal(t, "新内容", content)
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
			name:   "Store 更新失败",
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

			var bodyBytes []byte
			if tt.body != nil {
				bodyBytes, _ = json.Marshal(tt.body)
			}
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
// 覆盖：正常删除返回 200、Store 返回错误返回 500。
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
			name:   "Store 删除失败",
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
