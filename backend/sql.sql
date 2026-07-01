CREATE TABLE IF NOT EXISTS demo_users (
  id VARCHAR(50) PRIMARY KEY,      
  username VARCHAR(100) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  avatar VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure consistent collation for string fields
ALTER TABLE demo_users MODIFY id VARCHAR(64)
  COLLATE utf8mb4_unicode_ci;
