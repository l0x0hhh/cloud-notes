package router

import (
	"cloud-notes/handler"
	"cloud-notes/middleware"
	"cloud-notes/store"
	"net/http/pprof"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRouter 组装路由，接受依赖注入
func SetupRouter(noteStore store.NoteStore, userStore store.UserStore, jwtSecret []byte) *gin.Engine {
	r := gin.Default()

	// pprof 性能分析端点
	pprofGroup := r.Group("/debug/pprof")
	{
		pprofGroup.GET("/", gin.WrapF(pprof.Index))
		pprofGroup.GET("/cmdline", gin.WrapF(pprof.Cmdline))
		pprofGroup.GET("/profile", gin.WrapF(pprof.Profile))
		pprofGroup.POST("/symbol", gin.WrapF(pprof.Symbol))
		pprofGroup.GET("/symbol", gin.WrapF(pprof.Symbol))
		pprofGroup.GET("/trace", gin.WrapF(pprof.Trace))
		pprofGroup.GET("/allocs", gin.WrapH(pprof.Handler("allocs")))
		pprofGroup.GET("/block", gin.WrapH(pprof.Handler("block")))
		pprofGroup.GET("/goroutine", gin.WrapH(pprof.Handler("goroutine")))
		pprofGroup.GET("/heap", gin.WrapH(pprof.Handler("heap")))
		pprofGroup.GET("/mutex", gin.WrapH(pprof.Handler("mutex")))
		pprofGroup.GET("/threadcreate", gin.WrapH(pprof.Handler("threadcreate")))
	}

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
