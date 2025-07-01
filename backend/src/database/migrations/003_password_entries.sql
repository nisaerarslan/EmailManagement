USE mail_management;

-- Password Entries table
CREATE TABLE IF NOT EXISTS PasswordEntries (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    encrypted_user_key TEXT NOT NULL,
    descriptions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_id INT NOT NULL,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    updated_id INT,
    UNIQUE(user_id, title),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
); 