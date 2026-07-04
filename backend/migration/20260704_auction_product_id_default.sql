-- Allow admin-created standalone auctions to omit a linked shop product.
-- The existing app uses auctions created directly by admin as well as
-- auctions generated from waitlist products. product_id = 0 means standalone.

ALTER TABLE `auctions`
  MODIFY `product_id` bigint(20) UNSIGNED NOT NULL DEFAULT 0;
