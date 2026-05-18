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
