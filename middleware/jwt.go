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

// JWTAuth JWT 认证中间件（使用默认密钥）
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

		raw, ok := claims["user_id"]
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token无效"})
			c.Abort()
			return
		}
		f, ok := raw.(float64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token无效"})
			c.Abort()
			return
		}
		c.Set("user_id", uint(f))
		c.Next()
	}
}
