package config

import (
	"fmt"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	dsn := "root:root@tcp(127.0.0.1:3306)/cloud_notes?charset=utf8mb4&parseTime=True&loc=Local"

	log.Println("正在连接数据库:", dsn)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("错误详情: %T %v\n", err, err)
		panic(fmt.Sprintf("数据库连接失败: %v\n请确保:\n1. MySQL 正在运行\n2. 用户名/密码正确 (root:root)\n3. 数据库 'cloud_notes' 已创建\n错误: %v", err, err))
	}

	// 配置连接池 — 高并发压测关键
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(100) // 最大打开连接数
	sqlDB.SetMaxIdleConns(25)  // 最大空闲连接数
	sqlDB.SetConnMaxLifetime(0) // 连接不因时间过期

	log.Println("数据库连接成功!")
	DB = db
}
