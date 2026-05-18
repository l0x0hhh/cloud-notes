package handler

import (
	"cloud-notes/models"
	"cloud-notes/store"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func getUserID(c *gin.Context) (uint, bool) {
	raw, ok := c.Get("user_id")
	if !ok {
		return 0, false
	}
	uid, ok := raw.(uint)
	return uid, ok
}

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

	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	note := models.Note{
		UserID:  userID,
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
	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	notes, err := h.Store.List(userID)
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
	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	var noteID uint
	if _, err := fmt.Sscanf(id, "%d", &noteID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "笔记ID格式错误"})
		return
	}

	note, err := h.Store.GetByID(noteID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在"})
		return
	}

	c.JSON(http.StatusOK, note)
}

// DeleteNote 删除笔记（仅限自己的笔记）
func (h *NoteHandler) DeleteNote(c *gin.Context) {
	id := c.Param("id")
	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

	var noteID uint
	if _, err := fmt.Sscanf(id, "%d", &noteID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "笔记ID格式错误"})
		return
	}

	if err := h.Store.Delete(noteID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// UpdateNote 更新笔记
func (h *NoteHandler) UpdateNote(c *gin.Context) {
	id := c.Param("id")
	userID, ok := getUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
		return
	}

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

	if err := h.Store.Update(noteID, userID, req.Title, req.Content); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "更新成功"})
}
