-- Remove obsolete Heist database objects after the platform moved to auction + ecommerce only.
-- Intended for the CopUpBid MariaDB schema exported in backend/copup.sql.
-- Review backups before running in production.

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `heist_affiliate_user_progress`;
DROP TABLE IF EXISTS `heist_affiliates`;
DROP TABLE IF EXISTS `heist_attempts`;
DROP TABLE IF EXISTS `heist_cart`;
DROP TABLE IF EXISTS `heist_order_items`;
DROP TABLE IF EXISTS `heist_orders`;
DROP TABLE IF EXISTS `heist_participants`;
DROP TABLE IF EXISTS `heist`;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- Remove old Heist waitlist rows, then restrict waitlist mode to the remaining auction flow.
DELETE FROM `bids_waitlist` WHERE `mode` = 'heist';
ALTER TABLE `bids_waitlist`
  MODIFY COLUMN `mode` ENUM('auction') NOT NULL;

-- Remove product columns that supported the removed Heist purchase mode.
ALTER TABLE `products`
  DROP COLUMN IF EXISTS `heist_price`,
  DROP COLUMN IF EXISTS `allow_heist`;
