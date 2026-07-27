-- CopUp live shop seed data.
-- 24 products total: 6 products in each shop category.
-- Upload/copy the matching files in backend/uploads to live uploads.
-- Run after a production backup.

START TRANSACTION;

INSERT INTO `categories` (`name`, `created_at`)
SELECT 'Fashion/looks', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Fashion/looks');

INSERT INTO `categories` (`name`, `created_at`)
SELECT 'Food/stuff', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Food/stuff');

INSERT INTO `categories` (`name`, `created_at`)
SELECT 'Gadgets/Electronics', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Gadgets/Electronics');

INSERT INTO `categories` (`name`, `created_at`)
SELECT 'Others/Utilities', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Others/Utilities');

CREATE TEMPORARY TABLE `seed_products` (
  `category_name` varchar(120) NOT NULL,
  `name` varchar(160) NOT NULL,
  `short_description` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `vendor_name` varchar(120) NOT NULL,
  `stock_status` enum('in_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
  `shipping_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_eta` varchar(80) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `cash_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `auction_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `allow_cash` tinyint(1) NOT NULL DEFAULT 1,
  `allow_auction` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO `seed_products`
(`category_name`, `name`, `short_description`, `description`, `vendor_name`, `stock_status`, `shipping_cost`, `delivery_eta`, `image_path`, `is_featured`, `cash_price`, `auction_price`, `allow_cash`, `allow_auction`)
VALUES
('Gadgets/Electronics', 'Apple iPhone 15 128GB', 'USB-C iPhone with bright display, strong camera, and all-day battery for everyday use.', 'Apple iPhone 15 is a polished everyday smartphone for customers who want a modern iPhone experience with USB-C charging, a bright display, dependable performance, and a capable camera for photos, videos, business chats, and social media.', 'CopUp Tech', 'in_stock', 2500.00, '2-4 days', '/uploads/seed-iphone-15.jpg', 1, 820000.00, 250.00, 1, 1),
('Gadgets/Electronics', 'Apple iPhone 16 128GB', 'Newer-generation iPhone for creators, students, business users, and daily productivity.', 'Apple iPhone 16 is a premium smartphone option for customers who want fast performance, a refined camera experience, dependable battery life, smooth apps, and a clean iOS experience for work and entertainment.', 'CopUp Tech', 'in_stock', 2500.00, '2-4 days', '/uploads/seed-iphone-16.jpg', 1, 980000.00, 300.00, 1, 1),
('Gadgets/Electronics', 'Apple iPhone 17 256GB', 'Latest-generation iPhone option with roomy storage for apps, photos, video, and work files.', 'Apple iPhone 17 is listed as a high-demand premium phone for customers who want a current iPhone model, larger storage, smooth everyday performance, and a strong camera experience for content, business, and personal use.', 'CopUp Tech', 'in_stock', 3000.00, '3-5 days', '/uploads/seed-iphone-17.jpg', 1, 1250000.00, 380.00, 1, 1),
('Gadgets/Electronics', 'Samsung Galaxy A55 5G 256GB', '5G Android phone with AMOLED display, strong battery, and generous storage.', 'Samsung Galaxy A55 5G is a balanced Android smartphone for customers who need a large smooth display, capable cameras, secure software, strong battery life, and enough storage for apps, photos, videos, and documents.', 'CopUp Tech', 'in_stock', 2200.00, '2-4 days', '/uploads/seed-galaxy-a55.jpg', 1, 560000.00, 180.00, 1, 1),
('Gadgets/Electronics', 'Oraimo FreePods 4 Wireless Earbuds', 'Wireless earbuds with charging case for music, calls, workouts, and daily movement.', 'Oraimo FreePods 4 are lightweight true wireless earbuds for customers who need clear calls, easy pairing, portable charging, and comfortable listening during commuting, workouts, work, and school.', 'CopUp Tech', 'in_stock', 800.00, '1-3 days', '/uploads/seed-oraimo-freepods-4.jpg', 0, 42000.00, 20.00, 1, 1),
('Gadgets/Electronics', 'Anker 20,000mAh Power Bank', 'High-capacity portable charger for phones, earbuds, tablets, and travel backup power.', 'A 20,000mAh class power bank is useful for customers who move around all day and need backup power for phones, wireless earbuds, tablets, and other USB-powered devices during work, school, or travel.', 'CopUp Tech', 'in_stock', 1000.00, '1-3 days', '/uploads/seed-anker-20000-power-bank.jpg', 0, 76000.00, 35.00, 1, 1),

('Fashion/looks', 'Classic White Sneakers', 'Clean low-top sneakers for casual, school, weekend, and smart-casual outfits.', 'Classic white sneakers are an easy wardrobe staple that pairs well with denim, chinos, joggers, skirts, dresses, and relaxed weekend outfits. A practical style item for daily movement and simple looks.', 'CopUp Fashion', 'in_stock', 1200.00, '2-4 days', '/uploads/seed-white-sneakers.jpg', 1, 48000.00, 20.00, 1, 1),
('Fashion/looks', 'Unisex Oversized Hoodie', 'Soft relaxed hoodie with front pocket for streetwear, travel, campus, and cool evenings.', 'A comfortable oversized hoodie for layering over T-shirts and pairing with jeans, shorts, or joggers. It works for casual errands, campus wear, travel days, and relaxed streetwear styling.', 'CopUp Fashion', 'in_stock', 1200.00, '2-4 days', '/uploads/seed-oversized-hoodie.jpg', 1, 39000.00, 18.00, 1, 1),
('Fashion/looks', 'Women''s Crossbody Handbag', 'Structured everyday handbag with adjustable strap and practical compartments.', 'A compact crossbody handbag for workdays, errands, events, and travel. It keeps daily essentials organized while adding a neat finished look to casual and smart outfits.', 'CopUp Fashion', 'in_stock', 1000.00, '2-4 days', '/uploads/seed-crossbody-handbag.jpg', 1, 42000.00, 18.00, 1, 1),
('Fashion/looks', 'Men''s Slim Fit Chino Trousers', 'Tapered cotton-blend chinos for office, church, dates, and clean casual looks.', 'Slim fit chinos give a neat shape without feeling too tight. They pair easily with polos, shirts, sneakers, or loafers and suit customers building a clean everyday wardrobe.', 'CopUp Fashion', 'in_stock', 1000.00, '2-4 days', '/uploads/seed-mens-chino-trousers.jpg', 0, 36000.00, 15.00, 1, 1),
('Fashion/looks', 'Aviator Sunglasses', 'UV400 aviator-style sunglasses with a lightweight metal-frame look.', 'Aviator sunglasses are a simple style upgrade for driving, outdoor events, travel, beach days, and finishing casual outfits. The shape is familiar, versatile, and easy to wear.', 'CopUp Fashion', 'in_stock', 600.00, '1-3 days', '/uploads/seed-aviator-sunglasses.jpg', 0, 18000.00, 8.00, 1, 1),
('Fashion/looks', 'Leather Strap Wristwatch', 'Minimal analog wristwatch with leather-style strap for office, gifting, and daily wear.', 'A clean everyday wristwatch with a simple dial and leather-style strap. It is suitable for office outfits, dates, church, casual wear, and gifting.', 'CopUp Fashion', 'in_stock', 800.00, '1-3 days', '/uploads/seed-leather-watch.jpg', 0, 28000.00, 12.00, 1, 1),

('Food/stuff', 'Golden Penny Spaghetti 500g Pack', 'Dry spaghetti pack for jollof pasta, stir-fry, quick meals, and home cooking.', 'A pantry staple for homes, hostels, students, and small kitchens. Spaghetti cooks quickly and works with stew, tomato sauce, vegetables, sardines, egg sauce, or chicken.', 'CopUp Grocery', 'in_stock', 400.00, '1-2 days', '/uploads/seed-golden-penny-spaghetti.jpg', 1, 1800.00, 4.00, 1, 1),
('Food/stuff', 'Indomie Chicken Noodles Carton', 'Carton of instant noodles for quick snacks, breakfasts, and student meals.', 'A convenient carton of chicken-flavour instant noodles for families, offices, shops, and hostels. Useful when customers need fast meals without complicated preparation.', 'CopUp Grocery', 'in_stock', 1200.00, '1-2 days', '/uploads/seed-indomie-carton.jpg', 1, 10500.00, 12.00, 1, 1),
('Food/stuff', 'Peak Full Cream Milk Powder 400g', 'Creamy milk powder for tea, pap, cereal, custard, oats, and baking.', 'Peak full cream milk powder is a familiar household grocery item for breakfast and drinks. It can be used in tea, oats, cereal, pap, custard, and simple baking.', 'CopUp Grocery', 'in_stock', 500.00, '1-2 days', '/uploads/seed-peak-milk-400g.jpg', 0, 6200.00, 8.00, 1, 1),
('Food/stuff', 'Milo Chocolate Drink 400g', 'Chocolate malt beverage powder for hot or cold breakfast drinks.', 'Milo is a popular chocolate malt drink for families, students, and office snack corners. It can be served hot or cold and pairs well with milk.', 'CopUp Grocery', 'in_stock', 500.00, '1-2 days', '/uploads/seed-milo-400g.jpg', 0, 7200.00, 9.00, 1, 1),
('Food/stuff', 'Basmati Rice 5kg Bag', 'Long-grain aromatic rice for jollof rice, fried rice, white rice, and special meals.', 'A 5kg basmati rice bag for family cooking and meal prep. The long grains are suitable for everyday meals and special occasions when customers want fluffy rice.', 'CopUp Grocery', 'in_stock', 1000.00, '1-3 days', '/uploads/seed-basmati-rice-5kg.jpg', 1, 28500.00, 18.00, 1, 1),
('Food/stuff', 'Power Oil 3L Vegetable Oil', 'Everyday cooking oil for frying, stew, soup, jollof, and home kitchens.', 'A practical 3-litre vegetable oil pack for customers restocking basic kitchen items. Useful for frying, soups, stew, sauces, and regular home cooking.', 'CopUp Grocery', 'in_stock', 800.00, '1-2 days', '/uploads/seed-power-oil-3l.jpg', 0, 13200.00, 12.00, 1, 1),

('Others/Utilities', 'Rechargeable LED Desk Lamp', 'Adjustable rechargeable lamp for studying, remote work, bedside reading, and outages.', 'A useful LED desk lamp for students, remote workers, salons, and bedside reading. The rechargeable battery helps during power cuts, and the adjustable neck makes it easy to aim light.', 'CopUp Utility', 'in_stock', 800.00, '1-3 days', '/uploads/seed-led-desk-lamp.jpg', 1, 22000.00, 12.00, 1, 1),
('Others/Utilities', 'Stainless Steel Vacuum Flask 1L', 'Insulated flask for hot tea, cold drinks, office desks, school, and travel.', 'A durable 1-litre vacuum flask that helps keep drinks hot or cold for longer. Practical for commuters, drivers, students, gym users, and office desks.', 'CopUp Utility', 'in_stock', 700.00, '1-3 days', '/uploads/seed-vacuum-flask-1l.jpg', 0, 14500.00, 8.00, 1, 1),
('Others/Utilities', 'Non-Stick Frying Pan 28cm', 'Everyday non-stick pan for eggs, pancakes, stir-fry, and light frying.', 'A 28cm non-stick frying pan for home kitchens and quick meals. It helps reduce sticking when used correctly and makes cleanup easier after cooking.', 'CopUp Utility', 'in_stock', 1000.00, '1-3 days', '/uploads/seed-nonstick-frying-pan.jpg', 1, 26000.00, 14.00, 1, 1),
('Others/Utilities', 'Digital Kitchen Scale', 'Compact kitchen scale for baking, meal prep, portion control, and small sellers.', 'A simple digital scale for measuring ingredients, food portions, small packaged goods, and home business items. Useful for kitchens and sellers who need consistency.', 'CopUp Utility', 'in_stock', 700.00, '1-3 days', '/uploads/seed-digital-kitchen-scale.jpg', 0, 18000.00, 9.00, 1, 1),
('Others/Utilities', 'Travel Organizer Pouch Set', 'Packing cube and pouch set for clothes, toiletries, makeup, cables, and documents.', 'A travel organizer set for keeping bags and suitcases tidy. Customers can separate clothes, toiletries, skincare, chargers, and travel documents without mixing everything together.', 'CopUp Utility', 'in_stock', 600.00, '1-3 days', '/uploads/seed-travel-organizer-pouches.jpg', 0, 15000.00, 8.00, 1, 1),
('Others/Utilities', 'Tool Kit 46-Piece Household Set', 'Compact household tool kit for assembly, basic repairs, and emergency fixes.', 'A compact tool kit for renters, students, small offices, and first apartments. It covers basic screw tightening, small repairs, furniture assembly, and simple maintenance jobs.', 'CopUp Utility', 'in_stock', 1000.00, '1-3 days', '/uploads/seed-household-tool-kit.jpg', 1, 34000.00, 16.00, 1, 1);

INSERT INTO `products`
(`name`, `short_description`, `description`, `vendor_name`, `stock_status`, `shipping_cost`, `delivery_eta`, `image_path`, `is_featured`, `cash_price`, `auction_price`, `created_at`, `allow_cash`, `allow_auction`)
SELECT
  sp.`name`, sp.`short_description`, sp.`description`, sp.`vendor_name`,
  sp.`stock_status`, sp.`shipping_cost`, sp.`delivery_eta`, sp.`image_path`,
  sp.`is_featured`, sp.`cash_price`, sp.`auction_price`, NOW(),
  sp.`allow_cash`, sp.`allow_auction`
FROM `seed_products` sp
WHERE NOT EXISTS (
  SELECT 1 FROM `products` p
  WHERE p.`name` = sp.`name`
    AND p.`vendor_name` = sp.`vendor_name`
);

INSERT IGNORE INTO `product_categories` (`product_id`, `category_id`)
SELECT p.`id`, c.`id`
FROM `seed_products` sp
JOIN `products` p
  ON p.`name` = sp.`name`
 AND p.`vendor_name` = sp.`vendor_name`
JOIN `categories` c
  ON c.`name` = sp.`category_name`;

CREATE TEMPORARY TABLE `seed_product_images` (
  `product_name` varchar(160) NOT NULL,
  `vendor_name` varchar(120) NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=Memory;

INSERT INTO `seed_product_images` (`product_name`, `vendor_name`, `image_path`, `sort_order`)
SELECT `name`, `vendor_name`, REPLACE(`image_path`, '.jpg', '-gallery-1.jpg'), 0 FROM `seed_products`
UNION ALL
SELECT `name`, `vendor_name`, REPLACE(`image_path`, '.jpg', '-gallery-2.jpg'), 1 FROM `seed_products`;

INSERT INTO `product_images` (`product_id`, `image_path`, `sort_order`, `created_at`)
SELECT p.`id`, spi.`image_path`, spi.`sort_order`, NOW()
FROM `seed_product_images` spi
JOIN `products` p
  ON p.`name` = spi.`product_name`
 AND p.`vendor_name` = spi.`vendor_name`
WHERE NOT EXISTS (
  SELECT 1 FROM `product_images` pi
  WHERE pi.`product_id` = p.`id`
    AND pi.`image_path` = spi.`image_path`
);

DROP TEMPORARY TABLE `seed_product_images`;
DROP TEMPORARY TABLE `seed_products`;

COMMIT;
