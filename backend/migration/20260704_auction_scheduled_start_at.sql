-- Optional admin schedule for moving an auction from pending to hold.
-- It does not start live bidding; admin still starts active auctions manually.

ALTER TABLE `auctions`
  ADD COLUMN `scheduled_start_at` datetime NULL AFTER `shop_category_id`,
  ADD KEY `idx_auctions_scheduled_start` (`scheduled_start_at`);
