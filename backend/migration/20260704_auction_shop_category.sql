-- Adds the shop category relationship used by admin auction setup.
-- This keeps auctions.category as the auction type (cash/product/coupon).

ALTER TABLE `auctions`
  ADD COLUMN `shop_category_id` int(11) NULL AFTER `product_id`,
  ADD KEY `idx_auctions_shop_category` (`shop_category_id`);

ALTER TABLE `auctions`
  ADD CONSTRAINT `fk_auctions_shop_category`
  FOREIGN KEY (`shop_category_id`) REFERENCES `categories` (`id`)
  ON DELETE SET NULL;
