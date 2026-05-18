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
	result := s.DB.Model(&models.Note{}).
		Where("id = ? AND user_id = ?", id, userID).
		Updates(models.Note{Title: title, Content: content})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *GormNoteStore) Delete(id, userID uint) error {
	result := s.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Note{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
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
