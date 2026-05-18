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
