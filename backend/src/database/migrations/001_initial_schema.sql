-- Users tablosu
CREATE DATABASE IF NOT EXISTS mail_management;
USE mail_management;

CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    otp_secret VARCHAR(255) NULL,
    otp_enabled TINYINT(1) NOT NULL DEFAULT 0,
    recovery_code VARCHAR(32) NULL,
    last_activity DATETIME NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_id INT,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    updated_id INT,
    img_src LONGTEXT,
    reset_token VARCHAR(36) NULL,
    reset_token_expires DATETIME NULL
);


-- MailAccounts tablosu
USE mail_management;

CREATE TABLE IF NOT EXISTS MailAccounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry DATETIME,
    account_type ENUM('gmail', 'outlook') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

use mail_management;
CREATE TABLE IF NOT EXISTS MailLogs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'unread',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES MailAccounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kullanıcı giriş aktivitelerini kaydetmek için tablo oluştur
CREATE TABLE IF NOT EXISTS UserLoginActivities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    login_time DATETIME NOT NULL,
    success TINYINT(1) NOT NULL DEFAULT 0,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- OTP ve kurtarma kodu ile ilgili aktiviteleri kaydetmek için tablo oluştur
CREATE TABLE IF NOT EXISTS UserOtpActivities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_time DATETIME NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'otp_setup', 'otp_verify', 'recovery_code_generate', 'recovery_code_use' gibi
    success TINYINT(1) NOT NULL DEFAULT 0,
    ip_address VARCHAR(45) NULL,
    details TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- SystemMail tablosu - sistem tarafından otomatik e-posta göndermek için kullanılacak
CREATE TABLE IF NOT EXISTS SystemMail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
); 