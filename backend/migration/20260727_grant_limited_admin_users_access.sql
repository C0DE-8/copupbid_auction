-- Grant Admin Users management access to a limited admin.
-- Replace the email below with the limited admin account that should manage users.

SET @limited_admin_email = 'replace-with-admin-email@example.com';

UPDATE `users`
SET
  `role` = 'admin',
  `admin_scope` = 'limited',
  `is_verified` = 1,
  `updated_at` = CURRENT_TIMESTAMP
WHERE LOWER(`email`) = LOWER(@limited_admin_email);

INSERT IGNORE INTO `admin_permissions` (`user_id`, `permission_key`)
SELECT `id`, 'users'
FROM `users`
WHERE LOWER(`email`) = LOWER(@limited_admin_email)
  AND `role` = 'admin'
  AND `admin_scope` = 'limited';

SELECT
  u.`id`,
  u.`email`,
  u.`role`,
  u.`admin_scope`,
  GROUP_CONCAT(ap.`permission_key` ORDER BY ap.`permission_key`) AS permissions
FROM `users` u
LEFT JOIN `admin_permissions` ap ON ap.`user_id` = u.`id`
WHERE LOWER(u.`email`) = LOWER(@limited_admin_email)
GROUP BY u.`id`, u.`email`, u.`role`, u.`admin_scope`;
