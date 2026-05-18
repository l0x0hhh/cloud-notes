package models

import "time"

type Note struct {
	ID        uint `gorm:"primaryKey"`
	UserID    uint `gorm:"index:idx_user_note,priority:1;index:idx_user_id"` // 单列索引+复合索引前缀
	Title     string
	Content   string
	CreatedAt time.Time
}
