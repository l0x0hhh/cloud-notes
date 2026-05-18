package handler

import (
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

	req.Username = strings.TrimSpace(req.Username)
	req.Password = strings.TrimSpace(req.Password)
	if req.Username == "" || req.Password == "" {
		c.JSON(400, gin.H{"error": "用户名或密码不能为空"})
		return
	}

	if len(req.Username) > 255 {
		c.JSON(400, gin.H{"error": "用户名过长"})
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

	req.Username = strings.TrimSpace(req.Username)
	req.Password = strings.TrimSpace(req.Password)
	if req.Username == "" || req.Password == "" {
		c.JSON(400, gin.H{"error": "用户名或密码不能为空"})
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
