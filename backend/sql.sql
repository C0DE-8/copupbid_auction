CREATE TABLE IF NOT EXISTS demo_users (
  id VARCHAR(50) PRIMARY KEY,      
  username VARCHAR(100) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  avatar VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- heist.winner_id must accept strings like "cop_..."
ALTER TABLE heist
  MODIFY COLUMN winner_id VARCHAR(64) NULL;

-- IMPORTANT: heist_participants.user_id must ALSO accept "cop_..."
ALTER TABLE heist_participants
  MODIFY COLUMN user_id VARCHAR(64) NOT NULL;

-- Ensure consistent collation for string fields
ALTER TABLE heist MODIFY winner_id VARCHAR(64)
  COLLATE utf8mb4_unicode_ci;

ALTER TABLE demo_users MODIFY id VARCHAR(64)
  COLLATE utf8mb4_unicode_ci;
