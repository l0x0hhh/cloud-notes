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

// ============================================================
// AI prompt: 生成 JWT 中间件测试函数，
// 覆盖：无 Token 返回 401、错误 Token 返回 401、
// 过期 Token 返回 401、篡改 Token 返回 401、
// Token 格式错误返回 401、有效 Token 返回 200 且 user_id 正确。
// ============================================================

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
			name:           "Token 格式错误 — 仅 Bearer 无 Token 值",
			authHeader:     "Bearer",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "Token 格式错误 — 多余空格（3部分）",
			authHeader:     "Bearer token extra",
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

// ============================================================
// AI prompt: 生成 TestGenerateToken 测试函数，
// 验证生成的 token 可以解析出正确的 user_id，
// 以及使用不同密钥签名的 token 解析失败。
// ============================================================

func TestGenerateToken(t *testing.T) {
	secret := []byte("test-secret")

	t.Run("正常生成并解析 token", func(t *testing.T) {
		tokenStr, err := GenerateTokenWithSecret(100, secret)
		assert.NoError(t, err)
		assert.NotEmpty(t, tokenStr)

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return secret, nil
		})
		assert.NoError(t, err)
		assert.True(t, token.Valid)

		claims, ok := token.Claims.(jwt.MapClaims)
		assert.True(t, ok)
		assert.Equal(t, float64(100), claims["user_id"])
	})

	t.Run("使用错误密钥解析 token 应失败", func(t *testing.T) {
		tokenStr, err := GenerateTokenWithSecret(200, secret)
		assert.NoError(t, err)

		_, err = jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return []byte("wrong-secret"), nil
		})
		assert.Error(t, err)
	})

	t.Run("DefaultSecret 生成 token 可用 DefaultSecret 解析", func(t *testing.T) {
		tokenStr, err := GenerateToken(42)
		assert.NoError(t, err)
		assert.NotEmpty(t, tokenStr)

		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return DefaultSecret, nil
		})
		assert.NoError(t, err)
		assert.True(t, token.Valid)
	})
}
