-- Make the primary CopUpBid admin account a full super admin.
-- Run this on live if admin@copupbid.com is landing on the limited management page.

UPDATE `users`
SET
  `role` = 'admin',
  `admin_scope` = 'super',
  `is_verified` = 1,
  `updated_at` = CURRENT_TIMESTAMP
WHERE LOWER(`email`) = 'admin@copupbid.com';

DELETE ap
FROM `admin_permissions` ap
JOIN `users` u ON u.`id` = ap.`user_id`
WHERE LOWER(u.`email`) = 'admin@copupbid.com';
