-- Adds super-admin / limited-admin permissions.
-- Existing admin accounts become super admins so current behavior is preserved.

ALTER TABLE `users`
  ADD COLUMN `admin_scope` enum('super','limited') NOT NULL DEFAULT 'limited' AFTER `role`;

UPDATE `users`
SET `admin_scope` = 'super'
WHERE `role` = 'admin';

CREATE TABLE IF NOT EXISTS `admin_permissions` (
  `user_id` int(11) NOT NULL,
  `permission_key` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`, `permission_key`),
  KEY `idx_admin_permissions_permission` (`permission_key`),
  CONSTRAINT `fk_admin_permissions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
