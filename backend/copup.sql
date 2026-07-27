-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jul 27, 2026 at 07:30 PM
-- Server version: 11.4.12-MariaDB-cll-lve
-- PHP Version: 8.4.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `copucznc_copupbid`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_permissions`
--

CREATE TABLE `admin_permissions` (
  `user_id` int(11) NOT NULL,
  `permission_key` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_referrals`
--

CREATE TABLE `affiliate_referrals` (
  `id` int(11) NOT NULL,
  `auction_id` int(11) NOT NULL,
  `referrer_id` int(11) NOT NULL,
  `referred_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_user_progress`
--

CREATE TABLE `affiliate_user_progress` (
  `auction_id` int(11) NOT NULL,
  `affiliate_user_id` int(11) NOT NULL,
  `referred_users` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auctions`
--

CREATE TABLE `auctions` (
  `id` int(11) NOT NULL,
  `name` varchar(160) NOT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `entry_bid_points` int(11) NOT NULL DEFAULT 0,
  `minimum_users` int(11) NOT NULL DEFAULT 1,
  `category` enum('cash','product','coupon') NOT NULL,
  `status` enum('pending','hold','active','completed','cancelled') NOT NULL DEFAULT 'pending',
  `current_bid_amount` int(11) NOT NULL DEFAULT 0,
  `final_price` int(11) NOT NULL DEFAULT 0,
  `highest_bidder` int(11) DEFAULT NULL,
  `current_bidder` int(11) DEFAULT NULL,
  `winner_id` int(11) DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `shop_category_id` int(11) DEFAULT NULL,
  `scheduled_start_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auctions`
--

INSERT INTO `auctions` (`id`, `name`, `description`, `image`, `entry_bid_points`, `minimum_users`, `category`, `status`, `current_bid_amount`, `final_price`, `highest_bidder`, `current_bidder`, `winner_id`, `end_date`, `created_by`, `product_id`, `shop_category_id`, `scheduled_start_at`, `created_at`, `updated_at`) VALUES
(2, 'iPhone 14 Pro', 'Brand new, sealed.', '/uploads/1756940865095_chatgpt-image-aug-27,-2025,-04_39_00-pm.png', 1, 1, 'product', 'completed', 55, 55, 2, 2, 2, '2025-11-27 05:50:30', 1, 0, NULL, NULL, '2025-09-03 23:07:45', '2025-11-27 13:54:20'),
(3, 'iPhone 16 Pro', 'Brand new, sealed.', '/uploads/1756940883775_chatgpt-image-aug-27,-2025,-04_45_01-pm.png', 1, 1, 'product', 'completed', 5, 5, 2, 2, 2, '2026-07-04 10:34:21', 1, 0, NULL, NULL, '2025-09-03 23:08:03', '2026-07-04 17:34:22'),
(4, 'iPhone 17 Pro', 'Brand new, sealed.', '/uploads/1756940888249_chatgpt-image-aug-27,-2025,-04_45_01-pm.png', 1, 1, 'product', 'hold', 0, 0, NULL, NULL, NULL, NULL, 1, 0, NULL, NULL, '2025-09-03 23:08:08', '2025-11-27 13:54:20'),
(5, 'iPhone 11 Pro', 'Brand new, sealed.', '/uploads/1756940893049_chatgpt-image-aug-27,-2025,-04_45_01-pm.png', 1, 1, 'product', 'completed', 5, 5, 2, 2, 2, '2025-09-03 17:01:07', 1, 0, NULL, NULL, '2025-09-03 23:08:13', '2025-09-04 23:53:30'),
(6, 'copup', 'noted', '/uploads/1757399339802_chatgpt-image-aug-9,-2025,-11_49_10-am.png', 1, 1, 'cash', 'pending', 0, 0, NULL, NULL, NULL, NULL, 1, 0, NULL, NULL, '2025-09-09 06:29:00', NULL),
(8, 'Product 1 — Auction', 'Created from waitlist', NULL, 200, 1, 'product', 'completed', 5, 5, 2, 2, 2, '2026-07-04 11:43:39', 1, 0, NULL, NULL, '2025-11-04 22:55:22', '2026-07-04 18:43:39'),
(9, 'iphone flash p', 'the phone information', '/uploads/1771627597310_5.jpeg', 2, 5, 'product', 'pending', 0, 0, NULL, NULL, NULL, NULL, 1, 3, NULL, NULL, '2025-11-19 02:13:38', '2026-02-20 22:46:37'),
(10, 'Men\'s Short Sleeved Long Pants 2-in-1 Set - Black', 'Breaking conventions, unwilling to play the role of a \"conservative\", with the strengths of being less prone to pilling, good moisture absorption, less static electricity, and less prone to pilling. Comfortable to wear, easy to wash, bright in color, beautiful and generous in appearance, and resistant to wrinkles\r\n\r\n ', '/uploads/1783184562716_men\'s-short.jpg', 10, 1, 'product', 'hold', 0, 0, NULL, NULL, NULL, NULL, 1, 0, NULL, NULL, '2026-07-04 17:02:42', '2026-07-04 17:22:58'),
(11, 'Men\'s Short', 'Breaking conventions, unwilling to play the role of a \"conservative\", with the strengths of being less prone to pilling, good moisture absorption, less static electricity, and less prone to pilling. Comfortable to wear, easy to wash, bright in color, beautiful and generous in appearance, and resistant to wrinkles\r\n\r\n \r\n\r\nNotes:\r\nDue to the light and screen setting difference, the items color may be slightly different from the pictures.\r\nPlease allow slight dimension difference due to different manual measurement.\r\n\r\nWord of mouth:\r\nOur store updates promotional activities every day. Please pay more attention to our store.\r\nWe control the quality of our products during transportation to ensure that they are delivered to you with the best quality.\r\nThe products of Jihua Xiaodian are safely and free of charge delivered by JUMIA EXPRESS. If you have any questions, please call JUMIA EXPRESS.', '/uploads/1783186274734_men\'s-short3.jpg', 10, 1, 'product', 'pending', 0, 0, NULL, NULL, NULL, NULL, 1, 9, 2, NULL, '2026-07-04 17:31:14', NULL),
(12, 'Mobile Phone', 'Notes: After receiving the product, please charge it for 1 hour before turning it on for use.\r\n???? Product Overview\r\nThe MKTEL M51 is a rugged, feature phone engineered for reliability and longevity. Designed with a durable build and essential functionality, this device is perfect for users who prioritize long battery life, clear communication, and practical utility tools over complex smartphone features.\r\n\r\n???? Power & Charging\r\nLong-Lasting 2500mAh Battery: Experience extended usage with the high-capacity 2500mAh battery, providing hours of talk time and days of standby, perfect for travelers and heavy users who need reliable power on the go.\r\nModern Type-C Charging Port: Equipped with a convenient Type-C interface for faster data transfer and a reversible plug design, eliminating the hassle of incorrect insertion and ensuring quick, easy charging.\r\n???? Global Connectivity\r\nDual SIM & Quad Band Connectivity: Stay connected globally with Dual SIM Dual Standby functionality and support for Quad Band GSM networks (850/900/1800/1900 MHz), offering stable signal reception for calls, messages, and roaming in various regions.\r\n???? Multimedia & Audio\r\nEnhanced Multimedia Experience: Features a 1.77-inch clear display for comfortable viewing, combined with a high-fidelity Φ20 speaker for immersive audio, ensuring crisp sound for music and hands-free calls.\r\n???? Utility & Entertainment\r\nEssential Utility Tools: Includes a powerful LED flashlight for illumination in dark environments and pre-installed classic games like Snake and Tetris for instant entertainment during downtime.', '/uploads/1783188501733_mobile-phone-2.jpg', 10, 1, 'product', 'hold', 0, 0, NULL, NULL, NULL, NULL, 1, 8, 1, '2026-07-05 11:07:00', '2026-07-04 18:08:21', '2026-07-05 15:07:03');

-- --------------------------------------------------------

--
-- Table structure for table `auction_affiliates`
--

CREATE TABLE `auction_affiliates` (
  `auction_id` int(11) NOT NULL,
  `target_users` int(11) NOT NULL,
  `reward_bid_points` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auction_bid_points`
--

CREATE TABLE `auction_bid_points` (
  `auction_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bid_points` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `auction_bid_points`
--

INSERT INTO `auction_bid_points` (`auction_id`, `user_id`, `bid_points`, `updated_at`) VALUES
(2, 2, 170, '2025-11-27 13:50:15'),
(2, 7, 25, '2025-11-27 13:40:11'),
(2, 8, 135, '2025-11-27 13:41:39'),
(3, 2, 5, '2026-07-04 17:29:21'),
(5, 2, 5, '2025-09-03 23:56:07'),
(8, 2, 5, '2026-07-04 18:38:39');

-- --------------------------------------------------------

--
-- Table structure for table `auction_orders`
--

CREATE TABLE `auction_orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `address` text NOT NULL,
  `phone` varchar(32) NOT NULL,
  `order_status` enum('processing','packed','shipped','in_transit','delivered','cancelled') NOT NULL DEFAULT 'processing',
  `tracking_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `shipped_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auction_order_items`
--

CREATE TABLE `auction_order_items` (
  `id` int(11) NOT NULL,
  `auction_order_id` int(11) NOT NULL,
  `auction_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auction_participants`
--

CREATE TABLE `auction_participants` (
  `auction_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `auction_participants`
--

INSERT INTO `auction_participants` (`auction_id`, `user_id`, `joined_at`) VALUES
(2, 2, '2025-11-27 13:37:32'),
(2, 7, '2025-11-27 13:36:39'),
(2, 8, '2025-11-27 13:39:49'),
(3, 2, '2025-11-27 12:07:16'),
(4, 2, '2025-11-27 12:07:28'),
(5, 2, '2025-09-03 23:18:14'),
(8, 2, '2026-07-04 18:34:27'),
(9, 2, '2025-11-27 12:15:00'),
(10, 2, '2026-07-04 17:22:49');

-- --------------------------------------------------------

--
-- Table structure for table `banners`
--

CREATE TABLE `banners` (
  `id` int(11) NOT NULL,
  `action_name` varchar(120) NOT NULL,
  `action_url` varchar(500) NOT NULL,
  `image_path` varchar(500) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `banners`
--

INSERT INTO `banners` (`id`, `action_name`, `action_url`, `image_path`, `is_active`, `sort_order`, `created_at`) VALUES
(1, 'Yes It’s Auction', 'https://copupbid.com/auctions', '/home/copucznc/z-copup-backend/uploads/1783224010983_img_4926.jpeg', 1, 0, '2026-02-25 08:39:04'),
(2, 'Bid little win big', 'https://copupbid.com/auctions', '/home/copucznc/z-copup-backend/uploads/1783223766448_img_4925.jpeg', 1, 0, '2026-02-25 08:57:11'),
(3, 'Sweet Deals', 'https://copupbid.com/shop?deal=featured#shop-featured', '/home/copucznc/z-copup-backend/uploads/1783246053323_img_4928.jpeg', 1, 0, '2026-07-05 06:07:33');

-- --------------------------------------------------------

--
-- Table structure for table `bidshop`
--

CREATE TABLE `bidshop` (
  `id` int(11) NOT NULL,
  `bid_points` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bidshop`
--

INSERT INTO `bidshop` (`id`, `bid_points`, `price`, `image`, `user_id`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 200, 1000.00, '/uploads/1756563268693_chatgpt-image-aug-27,-2025,-04_52_27-pm.png', 1, 1, '2025-08-30 14:14:28', '2025-08-30 14:14:28'),
(3, 100, 500.00, '/uploads/1756563285525_chatgpt-image-aug-27,-2025,-04_52_27-pm.png', 1, 1, '2025-08-30 14:14:45', '2025-08-30 14:14:45');

-- --------------------------------------------------------

--
-- Table structure for table `bids_waitlist`
--

CREATE TABLE `bids_waitlist` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `mode` enum('auction') NOT NULL,
  `bid_locked` decimal(12,2) NOT NULL,
  `status` enum('queued','in_progress','won','fulfilled','cancelled') NOT NULL DEFAULT 'queued',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `active_key` varchar(64) GENERATED ALWAYS AS (case when `status` in ('queued','in_progress') then concat(`user_id`,'-',`product_id`) else NULL end) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cart`
--

CREATE TABLE `cart` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `auction_id` int(11) NOT NULL,
  `price` int(11) NOT NULL DEFAULT 0,
  `status` enum('unpaid','paid','shipped','fulfilled','cancelled') NOT NULL DEFAULT 'unpaid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cart`
--

INSERT INTO `cart` (`id`, `user_id`, `auction_id`, `price`, `status`, `created_at`) VALUES
(2, 2, 5, 5, 'paid', '2025-09-04 23:53:30'),
(3, 2, 2, 55, 'paid', '2025-11-27 13:54:20'),
(4, 2, 3, 5, 'paid', '2026-07-04 17:34:22'),
(5, 2, 8, 5, 'paid', '2026-07-04 18:43:39');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(120) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `created_at`) VALUES
(1, 'gadgets/electronics', '2025-11-04 16:25:08'),
(2, 'Fashion/looks', '2025-11-04 16:25:34'),
(4, 'Food/stuff', '2025-11-06 15:04:29'),
(5, 'Others/Utilities', '2025-11-06 15:04:50');

-- --------------------------------------------------------

--
-- Table structure for table `coin_purchases`
--

CREATE TABLE `coin_purchases` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `coins` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `proof_image` varchar(255) NOT NULL,
  `user_note` varchar(255) DEFAULT NULL,
  `admin_note` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `coin_purchases`
--

INSERT INTO `coin_purchases` (`id`, `user_id`, `coins`, `unit_price`, `total_price`, `proof_image`, `user_note`, `admin_note`, `status`, `approved_at`, `created_at`, `updated_at`) VALUES
(3, 7, 1, 100.00, 100.00, '/uploads/ChatGPTImageAug27202-1756571783569-963145706.png', 'fee', 'done', 'approved', '2025-09-09 07:46:05', '2025-08-30 16:36:23', '2025-09-09 07:46:05'),
(4, 7, 1, 100.00, 100.00, '/uploads/30527210-1db5-41c1-a-1756572232910-928986960.jpg', NULL, 're send', 'rejected', NULL, '2025-08-30 16:43:53', '2025-09-09 07:50:11'),
(5, 7, 10, 100.00, 1000.00, '/uploads/ChatGPTImageAug27202-1756574621926-202029588.png', 'fee asap', NULL, 'pending', NULL, '2025-08-30 17:23:42', '2025-08-30 17:23:42'),
(6, 2, 20, 210.00, 4200.00, '/uploads/2-1772065216800-596969899.jpeg', '20 coin', NULL, 'pending', NULL, '2026-02-26 00:20:16', '2026-02-26 00:20:16');

-- --------------------------------------------------------

--
-- Table structure for table `coin_rate`
--

CREATE TABLE `coin_rate` (
  `id` int(11) NOT NULL,
  `unit` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `coin_rate`
--

INSERT INTO `coin_rate` (`id`, `unit`, `price`, `currency`, `updated_at`) VALUES
(1, 1, 210.00, 'NGN', '2025-12-29 17:50:21');

-- --------------------------------------------------------

--
-- Table structure for table `copup_topups`
--

CREATE TABLE `copup_topups` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tx_ref` varchar(191) NOT NULL,
  `flw_tx_id` varchar(191) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `copup_coin` int(11) NOT NULL,
  `status` enum('pending','successful','failed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `copup_topups`
--

INSERT INTO `copup_topups` (`id`, `user_id`, `tx_ref`, `flw_tx_id`, `amount`, `currency`, `copup_coin`, `status`, `created_at`) VALUES
(1, 2, 'COPUP-2-1763765184603', '9811006', 10.00, 'USD', 150, 'successful', '2025-11-21 22:46:25'),
(2, 2, 'COPUP-2-1763765407147', '9811008', 1.00, 'USD', 15, 'successful', '2025-11-21 22:50:08'),
(3, 2, 'COPUP-2-1763766450625', '9811032', 1.00, 'USD', 10, 'successful', '2025-11-21 23:07:31'),
(4, 2, 'COPUP-2-1763768274680', '9811061', 1.00, 'USD', 10, 'successful', '2025-11-21 23:37:55'),
(5, 2, 'COPUP-2-1763768419375', '9811064', 1.00, 'USD', 11, 'successful', '2025-11-21 23:40:19'),
(6, 2, 'COPUP-2-1763769250752', '', 1.00, 'USD', 0, 'pending', '2025-11-21 23:54:11'),
(7, 2, 'COPUP-2-1763769294539', '9811071', 1.00, 'USD', 11, 'successful', '2025-11-21 23:54:55'),
(8, 2, 'COPUP-2-1767027007153', '', 25.00, 'USD', 0, 'pending', '2025-12-29 16:50:08'),
(9, 2, 'COPUP-2-1767028605246', '', 25.00, 'NGN', 0, 'pending', '2025-12-29 17:16:47'),
(10, 2, 'COPUP-2-1767029607463', '', 1500.00, 'NGN', 0, 'pending', '2025-12-29 17:33:27'),
(11, 2, 'COPUP-2-1767029659407', '9898936', 1000.00, 'NGN', 7, 'successful', '2025-12-29 17:34:19'),
(12, 2, 'COPUP-2-1767030128083', '9898944', 1000.00, 'NGN', 5, 'successful', '2025-12-29 17:42:08'),
(13, 2, 'COPUP-2-1767030413793', '9898950', 1000.00, 'NGN', 4, 'successful', '2025-12-29 17:46:53'),
(14, 2, 'COPUP-2-1767031812377', '', 210.00, 'NGN', 0, 'pending', '2025-12-29 18:10:12'),
(15, 2, 'COPUP-2-1772059454738', '', 1.00, 'NGN', 0, 'failed', '2026-02-25 22:44:14'),
(16, 2, 'COPUP-2-1772059822864', '', 420.00, 'NGN', 0, 'pending', '2026-02-25 22:50:22'),
(17, 2, 'COPUP-2-1772060526043', '', 420.00, 'NGN', 0, 'failed', '2026-02-25 23:02:06'),
(18, 2, 'COPUP-2-1772061182195', '', 210.00, 'NGN', 0, 'pending', '2026-02-25 23:13:02'),
(19, 2, 'COPUP-2-1772061749555', '', 210.00, 'NGN', 0, 'pending', '2026-02-25 23:22:29'),
(20, 2, 'COPUP-2-1772061754205', '', 210.00, 'NGN', 0, 'pending', '2026-02-25 23:22:34'),
(21, 2, 'COPUP-2-1772061785389', '', 210.00, 'NGN', 0, 'failed', '2026-02-25 23:23:05'),
(22, 2, 'COPUP-2-1772061972603', '', 210.00, 'NGN', 0, 'failed', '2026-02-25 23:26:12'),
(23, 2, 'COPUP-2-1772062331689', '', 210.00, 'NGN', 0, 'failed', '2026-02-25 23:32:11'),
(24, 2, 'COPUP-2-1772063180309', '', 210.00, 'NGN', 0, 'failed', '2026-02-25 23:46:20'),
(25, 2, 'COPUP-2-1772063453920', '10043180', 210.00, 'NGN', 1, 'successful', '2026-02-25 23:50:53'),
(26, 2, 'COPUP-2-1772064392096', '10043196', 42000.00, 'NGN', 200, 'successful', '2026-02-26 00:06:32'),
(27, 2, 'COPUP-2-1772064496162', '10043198', 2100.00, 'NGN', 10, 'successful', '2026-02-26 00:08:16');

-- --------------------------------------------------------

--
-- Table structure for table `demo_users`
--

CREATE TABLE `demo_users` (
  `id` varchar(50) NOT NULL,
  `username` varchar(100) NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `demo_users`
--

INSERT INTO `demo_users` (`id`, `username`, `full_name`, `avatar`, `created_at`) VALUES
('cop_1', 'cop001', 'Cop Player 1', NULL, '2025-12-31 14:30:05'),
('cop_10', 'cop010', 'Cop Player 10', NULL, '2025-12-31 14:30:37'),
('cop_11', 'cop011', 'Cop Player 11', NULL, '2025-12-31 14:30:37'),
('cop_12', 'cop012', 'Cop Player 12', NULL, '2025-12-31 14:30:37'),
('cop_13', 'cop013', 'Cop Player 13', NULL, '2025-12-31 14:30:37'),
('cop_14', 'cop014', 'Cop Player 14', NULL, '2025-12-31 14:30:37'),
('cop_15', 'cop015', 'Cop Player 15', NULL, '2025-12-31 14:30:37'),
('cop_16', 'cop016', 'Cop Player 16', NULL, '2025-12-31 14:30:37'),
('cop_17', 'cop017', 'Cop Player 17', NULL, '2025-12-31 14:30:37'),
('cop_1767184423829', 'one', 'one man', 'uploads/user-rave-faq-1767184423797-319169232.jpeg', '2025-12-31 12:33:43'),
('cop_1767184461310', 'Deku1', 'Hero man', 'uploads/hero-1767184776348-507671992.jpg', '2025-12-31 12:34:21'),
('cop_18', 'cop018', 'Cop Player 18', NULL, '2025-12-31 14:30:37'),
('cop_19', 'cop019', 'Cop Player 19', NULL, '2025-12-31 14:30:37'),
('cop_2', 'cop002', 'Cop Player 2', NULL, '2025-12-31 14:30:05'),
('cop_20', 'cop020', 'Cop Player 20', NULL, '2025-12-31 14:30:37'),
('cop_21', 'cop021', 'Cop Player 21', NULL, '2025-12-31 14:30:37'),
('cop_22', 'cop022', 'Cop Player 22', NULL, '2025-12-31 14:30:37'),
('cop_23', 'cop023', 'Cop Player 23', NULL, '2025-12-31 14:30:37'),
('cop_24', 'cop024', 'Cop Player 24', NULL, '2025-12-31 14:30:37'),
('cop_25', 'cop025', 'Cop Player 25', NULL, '2025-12-31 14:30:37'),
('cop_26', 'cop026', 'Cop Player 26', NULL, '2025-12-31 14:30:37'),
('cop_27', 'cop027', 'Cop Player 27', NULL, '2025-12-31 14:30:37'),
('cop_28', 'cop028', 'Cop Player 28', NULL, '2025-12-31 14:30:37'),
('cop_29', 'cop029', 'Cop Player 29', NULL, '2025-12-31 14:30:37'),
('cop_3', 'cop003', 'Cop Player 3', NULL, '2025-12-31 14:30:05'),
('cop_30', 'cop030', 'Cop Player 30', NULL, '2025-12-31 14:30:37'),
('cop_4', 'cop004', 'Cop Player 4', NULL, '2025-12-31 14:30:05'),
('cop_5', 'cop005', 'Cop Player 5', NULL, '2025-12-31 14:30:05'),
('cop_6', 'cop006', 'Cop Player 6', NULL, '2025-12-31 14:30:37'),
('cop_7', 'cop007', 'Cop Player 7', NULL, '2025-12-31 14:30:37'),
('cop_8', 'cop008', 'Cop Player 8', NULL, '2025-12-31 14:30:37'),
('cop_9', 'cop009', 'Cop Player 9', NULL, '2025-12-31 14:30:37');

-- --------------------------------------------------------

--
-- Table structure for table `otps`
--

CREATE TABLE `otps` (
  `email` varchar(190) NOT NULL,
  `otp` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `otps`
--

INSERT INTO `otps` (`email`, `otp`, `expires_at`, `created_at`) VALUES
('kingben2681@gmail.com', 211722, '2026-07-26 06:14:26', '2026-07-26 09:52:39');

-- --------------------------------------------------------

--
-- Table structure for table `payouts`
--

CREATE TABLE `payouts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bid_points` int(11) NOT NULL,
  `account_name` varchar(190) NOT NULL,
  `account_number` varchar(64) NOT NULL,
  `bank_name` varchar(190) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `admin_note` varchar(255) DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payouts`
--

INSERT INTO `payouts` (`id`, `user_id`, `bid_points`, `account_name`, `account_number`, `bank_name`, `status`, `admin_note`, `processed_by`, `created_at`, `updated_at`) VALUES
(3, 2, 25, 'Ada Lovelace', '0123456789', 'GTBank', 'rejected', NULL, NULL, '2025-09-05 20:33:28', '2025-09-09 07:58:48'),
(4, 2, 50, 'samuel', '1234567890', 'OPay', 'pending', NULL, NULL, '2026-02-26 11:22:15', '2026-02-26 11:22:15');

-- --------------------------------------------------------

--
-- Table structure for table `pay_account`
--

CREATE TABLE `pay_account` (
  `id` int(11) NOT NULL,
  `bank_name` varchar(120) NOT NULL,
  `account_name` varchar(120) NOT NULL,
  `account_number` varchar(40) NOT NULL,
  `currency` varchar(16) NOT NULL DEFAULT 'NGN',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pay_account`
--

INSERT INTO `pay_account` (`id`, `bank_name`, `account_name`, `account_number`, `currency`, `is_active`, `notes`, `updated_by`, `updated_at`) VALUES
(1, 'Access Bank', 'Copupbid Limited', '0123456789', 'NGN', 1, 'Main settlement account', 1, '2025-08-30 17:07:07');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(160) NOT NULL,
  `short_description` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `vendor_name` varchar(120) NOT NULL DEFAULT 'CopUp',
  `stock_status` enum('in_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
  `shipping_cost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `delivery_eta` varchar(80) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `cash_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `auction_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `allow_cash` tinyint(1) NOT NULL DEFAULT 1,
  `allow_auction` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `short_description`, `description`, `vendor_name`, `stock_status`, `shipping_cost`, `delivery_eta`, `image_path`, `is_featured`, `cash_price`, `auction_price`, `created_at`, `allow_cash`, `allow_auction`, `updated_at`) VALUES
(7, 'Smartphones', 'OUKITEL C26 Smartphones Android 16, 4GB RAM/128GB ROM, 6.63”HD+, 5150mAh Battery, Gemini AI Android Phones, 13MP+5MP Camera Smart Phone, Reverse Charging, 4G Dual SIM,Fingerprint,BT5.0,Face ID,GPS,Blue', 'Note：Same box design for all colors of one model. Actual phone color stated on back label of package！！！\r\n \r\nLaunched in January 2026, the OUKITEL C26 is a practical daily-use smartphone with Android 16.0 pre-installed—ensuring smooth multi-tasking and user-friendly new features.\r\n \r\nPowered by Unisoc T615 (T7250) CPU + G57 GPU, it delivers stable performance for browsing, video watching, and multi-app use without lag.\r\n \r\nKey highlights: Gemini AI (voice control, real-time translation for study/travel) and reverse charging (emergency power for earbuds/smartwatches).\r\n \r\nPlus, 5150mAh all-day battery, 6.63\" HD display, 13MP+5MP cameras, 185g lightweight body (4 colors), and 0.3s side fingerprint unlock—ideal for students, commuters, and value seekers.\r\n      Brand & Model      	      OUKITEL C26      \r\n      Processor	      Unisoc T615 (T7250) + G57 GPU (1Core@850MHz)\r\n      AI Assistant	      Gemini AI (Voice Control, Real-Time Translation, Photo Editing)\r\n      Display	      6.63\" HD (576*1280 Resolution)\r\n      Camera	      Rear: 13MP / Front: 5MP\r\n      Battery & Charging    	      5150mAh Capacity + 5V2A Charging + Reverse Charging\r\n      Operating System	      Android 16.0\r\n      Unlock Method	      Side Fingerprint Sensor & Face ID\r\n      Special Functions	      Gemini AI, Reverse Charging, Multi-Tasking, Low-Light Photography      \r\n      Weight	      185g (Single Phone)', 'CopUp', 'in_stock', 1000.00, '3', '/uploads/1783177820121_smartphones.jpg', 0, 1000.00, 40.00, '2026-07-04 15:10:20', 1, 1, NULL),
(8, 'Mobile Phone', 'MKTEL M51 Gray Mobile Phone 1.77 inch Screen 2500mAh Battery Type-C Dual SIM', 'Notes: After receiving the product, please charge it for 1 hour before turning it on for use.\r\n???? Product Overview\r\nThe MKTEL M51 is a rugged, feature phone engineered for reliability and longevity. Designed with a durable build and essential functionality, this device is perfect for users who prioritize long battery life, clear communication, and practical utility tools over complex smartphone features.\r\n\r\n???? Power & Charging\r\nLong-Lasting 2500mAh Battery: Experience extended usage with the high-capacity 2500mAh battery, providing hours of talk time and days of standby, perfect for travelers and heavy users who need reliable power on the go.\r\nModern Type-C Charging Port: Equipped with a convenient Type-C interface for faster data transfer and a reversible plug design, eliminating the hassle of incorrect insertion and ensuring quick, easy charging.\r\n???? Global Connectivity\r\nDual SIM & Quad Band Connectivity: Stay connected globally with Dual SIM Dual Standby functionality and support for Quad Band GSM networks (850/900/1800/1900 MHz), offering stable signal reception for calls, messages, and roaming in various regions.\r\n???? Multimedia & Audio\r\nEnhanced Multimedia Experience: Features a 1.77-inch clear display for comfortable viewing, combined with a high-fidelity Φ20 speaker for immersive audio, ensuring crisp sound for music and hands-free calls.\r\n???? Utility & Entertainment\r\nEssential Utility Tools: Includes a powerful LED flashlight for illumination in dark environments and pre-installed classic games like Snake and Tetris for instant entertainment during downtime.', 'CopUp', 'in_stock', 10.00, '2', '/uploads/1783178168657_mobile-phone-.jpg', 0, 90.00, 10.00, '2026-07-04 15:16:08', 1, 1, NULL),
(9, 'Men\'s Short', 'Men\'s Short Sleeved Long Pants 2-in-1 Set - Black', 'Breaking conventions, unwilling to play the role of a \"conservative\", with the strengths of being less prone to pilling, good moisture absorption, less static electricity, and less prone to pilling. Comfortable to wear, easy to wash, bright in color, beautiful and generous in appearance, and resistant to wrinkles\r\n\r\n \r\n\r\nNotes:\r\nDue to the light and screen setting difference, the items color may be slightly different from the pictures.\r\nPlease allow slight dimension difference due to different manual measurement.\r\n\r\nWord of mouth:\r\nOur store updates promotional activities every day. Please pay more attention to our store.\r\nWe control the quality of our products during transportation to ensure that they are delivered to you with the best quality.\r\nThe products of Jihua Xiaodian are safely and free of charge delivered by JUMIA EXPRESS. If you have any questions, please call JUMIA EXPRESS.', 'Mja', 'in_stock', 10.00, '3', '/uploads/1783178980441_men\'s-short.jpg', 1, 100.00, 10.00, '2026-07-04 15:29:40', 1, 1, '2026-07-04 15:34:53'),
(10, 'Apple iPhone 15 128GB', 'USB-C iPhone with bright display, strong camera, and all-day battery for everyday use.', 'Apple iPhone 15 is a polished everyday smartphone for customers who want a modern iPhone experience with USB-C charging, a bright display, dependable performance, and a capable camera for photos, videos, business chats, and social media.', 'CopUp Tech', 'in_stock', 2500.00, '2-4 days', '/uploads/seed-iphone-15.jpg', 1, 820000.00, 250.00, '2026-07-27 22:58:23', 1, 1, NULL),
(11, 'Apple iPhone 16 128GB', 'Newer-generation iPhone for creators, students, business users, and daily productivity.', 'Apple iPhone 16 is a premium smartphone option for customers who want fast performance, a refined camera experience, dependable battery life, smooth apps, and a clean iOS experience for work and entertainment.', 'CopUp Tech', 'in_stock', 2500.00, '2-4 days', '/uploads/seed-iphone-16.jpg', 1, 980000.00, 300.00, '2026-07-27 22:58:23', 1, 1, NULL),
(12, 'Apple iPhone 17 256GB', 'Latest-generation iPhone option with roomy storage for apps, photos, video, and work files.', 'Apple iPhone 17 is listed as a high-demand premium phone for customers who want a current iPhone model, larger storage, smooth everyday performance, and a strong camera experience for content, business, and personal use.', 'CopUp Tech', 'in_stock', 3000.00, '3-5 days', '/uploads/seed-iphone-17.jpg', 1, 1250000.00, 380.00, '2026-07-27 22:58:23', 1, 1, NULL),
(13, 'Samsung Galaxy A55 5G 256GB', '5G Android phone with AMOLED display, strong battery, and generous storage.', 'Samsung Galaxy A55 5G is a balanced Android smartphone for customers who need a large smooth display, capable cameras, secure software, strong battery life, and enough storage for apps, photos, videos, and documents.', 'CopUp Tech', 'in_stock', 2200.00, '2-4 days', '/uploads/seed-galaxy-a55.jpg', 1, 560000.00, 180.00, '2026-07-27 22:58:23', 1, 1, NULL),
(14, 'Oraimo FreePods 4 Wireless Earbuds', 'Wireless earbuds with charging case for music, calls, workouts, and daily movement.', 'Oraimo FreePods 4 are lightweight true wireless earbuds for customers who need clear calls, easy pairing, portable charging, and comfortable listening during commuting, workouts, work, and school.', 'CopUp Tech', 'in_stock', 800.00, '1-3 days', '/uploads/seed-oraimo-freepods-4.jpg', 0, 42000.00, 20.00, '2026-07-27 22:58:23', 1, 1, NULL),
(15, 'Anker 20,000mAh Power Bank', 'High-capacity portable charger for phones, earbuds, tablets, and travel backup power.', 'A 20,000mAh class power bank is useful for customers who move around all day and need backup power for phones, wireless earbuds, tablets, and other USB-powered devices during work, school, or travel.', 'CopUp Tech', 'in_stock', 1000.00, '1-3 days', '/uploads/seed-anker-20000-power-bank.jpg', 0, 76000.00, 35.00, '2026-07-27 22:58:23', 1, 1, NULL),
(16, 'Classic White Sneakers', 'Clean low-top sneakers for casual, school, weekend, and smart-casual outfits.', 'Classic white sneakers are an easy wardrobe staple that pairs well with denim, chinos, joggers, skirts, dresses, and relaxed weekend outfits. A practical style item for daily movement and simple looks.', 'CopUp Fashion', 'in_stock', 1200.00, '2-4 days', '/uploads/seed-white-sneakers.jpg', 1, 48000.00, 20.00, '2026-07-27 22:58:23', 1, 1, NULL),
(17, 'Unisex Oversized Hoodie', 'Soft relaxed hoodie with front pocket for streetwear, travel, campus, and cool evenings.', 'A comfortable oversized hoodie for layering over T-shirts and pairing with jeans, shorts, or joggers. It works for casual errands, campus wear, travel days, and relaxed streetwear styling.', 'CopUp Fashion', 'in_stock', 1200.00, '2-4 days', '/uploads/seed-oversized-hoodie.jpg', 1, 39000.00, 18.00, '2026-07-27 22:58:23', 1, 1, NULL),
(18, 'Women\'s Crossbody Handbag', 'Structured everyday handbag with adjustable strap and practical compartments.', 'A compact crossbody handbag for workdays, errands, events, and travel. It keeps daily essentials organized while adding a neat finished look to casual and smart outfits.', 'CopUp Fashion', 'in_stock', 1000.00, '2-4 days', '/uploads/seed-crossbody-handbag.jpg', 1, 42000.00, 18.00, '2026-07-27 22:58:23', 1, 1, NULL),
(19, 'Men\'s Slim Fit Chino Trousers', 'Tapered cotton-blend chinos for office, church, dates, and clean casual looks.', 'Slim fit chinos give a neat shape without feeling too tight. They pair easily with polos, shirts, sneakers, or loafers and suit customers building a clean everyday wardrobe.', 'CopUp Fashion', 'in_stock', 1000.00, '2-4 days', '/uploads/seed-mens-chino-trousers.jpg', 0, 36000.00, 15.00, '2026-07-27 22:58:23', 1, 1, NULL),
(20, 'Aviator Sunglasses', 'UV400 aviator-style sunglasses with a lightweight metal-frame look.', 'Aviator sunglasses are a simple style upgrade for driving, outdoor events, travel, beach days, and finishing casual outfits. The shape is familiar, versatile, and easy to wear.', 'CopUp Fashion', 'in_stock', 600.00, '1-3 days', '/uploads/seed-aviator-sunglasses.jpg', 0, 18000.00, 8.00, '2026-07-27 22:58:23', 1, 1, NULL),
(21, 'Leather Strap Wristwatch', 'Minimal analog wristwatch with leather-style strap for office, gifting, and daily wear.', 'A clean everyday wristwatch with a simple dial and leather-style strap. It is suitable for office outfits, dates, church, casual wear, and gifting.', 'CopUp Fashion', 'in_stock', 800.00, '1-3 days', '/uploads/seed-leather-watch.jpg', 0, 28000.00, 12.00, '2026-07-27 22:58:23', 1, 1, NULL),
(22, 'Golden Penny Spaghetti 500g Pack', 'Dry spaghetti pack for jollof pasta, stir-fry, quick meals, and home cooking.', 'A pantry staple for homes, hostels, students, and small kitchens. Spaghetti cooks quickly and works with stew, tomato sauce, vegetables, sardines, egg sauce, or chicken.', 'CopUp Grocery', 'in_stock', 400.00, '1-2 days', '/uploads/seed-golden-penny-spaghetti.jpg', 1, 1800.00, 4.00, '2026-07-27 22:58:23', 1, 1, NULL),
(23, 'Indomie Chicken Noodles Carton', 'Carton of instant noodles for quick snacks, breakfasts, and student meals.', 'A convenient carton of chicken-flavour instant noodles for families, offices, shops, and hostels. Useful when customers need fast meals without complicated preparation.', 'CopUp Grocery', 'in_stock', 1200.00, '1-2 days', '/uploads/seed-indomie-carton.jpg', 1, 10500.00, 12.00, '2026-07-27 22:58:23', 1, 1, NULL),
(24, 'Peak Full Cream Milk Powder 400g', 'Creamy milk powder for tea, pap, cereal, custard, oats, and baking.', 'Peak full cream milk powder is a familiar household grocery item for breakfast and drinks. It can be used in tea, oats, cereal, pap, custard, and simple baking.', 'CopUp Grocery', 'in_stock', 500.00, '1-2 days', '/uploads/seed-peak-milk-400g.jpg', 0, 6200.00, 8.00, '2026-07-27 22:58:23', 1, 1, NULL),
(25, 'Milo Chocolate Drink 400g', 'Chocolate malt beverage powder for hot or cold breakfast drinks.', 'Milo is a popular chocolate malt drink for families, students, and office snack corners. It can be served hot or cold and pairs well with milk.', 'CopUp Grocery', 'in_stock', 500.00, '1-2 days', '/uploads/seed-milo-400g.jpg', 0, 7200.00, 9.00, '2026-07-27 22:58:23', 1, 1, NULL),
(26, 'Basmati Rice 5kg Bag', 'Long-grain aromatic rice for jollof rice, fried rice, white rice, and special meals.', 'A 5kg basmati rice bag for family cooking and meal prep. The long grains are suitable for everyday meals and special occasions when customers want fluffy rice.', 'CopUp Grocery', 'in_stock', 1000.00, '1-3 days', '/uploads/seed-basmati-rice-5kg.jpg', 1, 28500.00, 18.00, '2026-07-27 22:58:23', 1, 1, NULL),
(27, 'Power Oil 3L Vegetable Oil', 'Everyday cooking oil for frying, stew, soup, jollof, and home kitchens.', 'A practical 3-litre vegetable oil pack for customers restocking basic kitchen items. Useful for frying, soups, stew, sauces, and regular home cooking.', 'CopUp Grocery', 'in_stock', 800.00, '1-2 days', '/uploads/seed-power-oil-3l.jpg', 0, 13200.00, 12.00, '2026-07-27 22:58:23', 1, 1, NULL),
(28, 'Rechargeable LED Desk Lamp', 'Adjustable rechargeable lamp for studying, remote work, bedside reading, and outages.', 'A useful LED desk lamp for students, remote workers, salons, and bedside reading. The rechargeable battery helps during power cuts, and the adjustable neck makes it easy to aim light.', 'CopUp Utility', 'in_stock', 800.00, '1-3 days', '/uploads/seed-led-desk-lamp.jpg', 1, 22000.00, 12.00, '2026-07-27 22:58:23', 1, 1, NULL),
(29, 'Stainless Steel Vacuum Flask 1L', 'Insulated flask for hot tea, cold drinks, office desks, school, and travel.', 'A durable 1-litre vacuum flask that helps keep drinks hot or cold for longer. Practical for commuters, drivers, students, gym users, and office desks.', 'CopUp Utility', 'in_stock', 700.00, '1-3 days', '/uploads/seed-vacuum-flask-1l.jpg', 0, 14500.00, 8.00, '2026-07-27 22:58:23', 1, 1, NULL),
(30, 'Non-Stick Frying Pan 28cm', 'Everyday non-stick pan for eggs, pancakes, stir-fry, and light frying.', 'A 28cm non-stick frying pan for home kitchens and quick meals. It helps reduce sticking when used correctly and makes cleanup easier after cooking.', 'CopUp Utility', 'in_stock', 1000.00, '1-3 days', '/uploads/seed-nonstick-frying-pan.jpg', 1, 26000.00, 14.00, '2026-07-27 22:58:23', 1, 1, NULL),
(31, 'Digital Kitchen Scale', 'Compact kitchen scale for baking, meal prep, portion control, and small sellers.', 'A simple digital scale for measuring ingredients, food portions, small packaged goods, and home business items. Useful for kitchens and sellers who need consistency.', 'CopUp Utility', 'in_stock', 700.00, '1-3 days', '/uploads/seed-digital-kitchen-scale.jpg', 0, 18000.00, 9.00, '2026-07-27 22:58:23', 1, 1, NULL),
(32, 'Travel Organizer Pouch Set', 'Packing cube and pouch set for clothes, toiletries, makeup, cables, and documents.', 'A travel organizer set for keeping bags and suitcases tidy. Customers can separate clothes, toiletries, skincare, chargers, and travel documents without mixing everything together.', 'CopUp Utility', 'in_stock', 600.00, '1-3 days', '/uploads/seed-travel-organizer-pouches.jpg', 0, 15000.00, 8.00, '2026-07-27 22:58:23', 1, 1, NULL),
(33, 'Tool Kit 46-Piece Household Set', 'Compact household tool kit for assembly, basic repairs, and emergency fixes.', 'A compact tool kit for renters, students, small offices, and first apartments. It covers basic screw tightening, small repairs, furniture assembly, and simple maintenance jobs.', 'CopUp Utility', 'in_stock', 1000.00, '1-3 days', '/uploads/seed-household-tool-kit.jpg', 1, 34000.00, 16.00, '2026-07-27 22:58:23', 1, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `product_categories`
--

CREATE TABLE `product_categories` (
  `product_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_categories`
--

INSERT INTO `product_categories` (`product_id`, `category_id`) VALUES
(7, 1),
(8, 1),
(10, 1),
(11, 1),
(12, 1),
(13, 1),
(14, 1),
(15, 1),
(9, 2),
(16, 2),
(17, 2),
(18, 2),
(19, 2),
(20, 2),
(21, 2),
(22, 4),
(23, 4),
(24, 4),
(25, 4),
(26, 4),
(27, 4),
(28, 5),
(29, 5),
(30, 5),
(31, 5),
(32, 5),
(33, 5);

-- --------------------------------------------------------

--
-- Table structure for table `product_favorites`
--

CREATE TABLE `product_favorites` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `image_path`, `sort_order`, `created_at`) VALUES
(5, 7, '/uploads/1783177820133_smartphones2.jpg', 0, '2026-07-04 15:10:20'),
(6, 7, '/uploads/1783177820146_smartphones3.jpg', 1, '2026-07-04 15:10:20'),
(7, 7, '/uploads/1783177820147_smartphones4.jpg', 2, '2026-07-04 15:10:20'),
(8, 8, '/uploads/1783178168662_mobile-phone-2.jpg', 0, '2026-07-04 15:16:08'),
(9, 8, '/uploads/1783178168667_mobile-phone-3.jpg', 1, '2026-07-04 15:16:08'),
(10, 9, '/uploads/1783178980450_men\'s-short2.jpg', 0, '2026-07-04 15:29:40'),
(11, 9, '/uploads/1783178980475_men\'s-short3.jpg', 1, '2026-07-04 15:29:40'),
(12, 10, '/uploads/seed-iphone-15-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(13, 11, '/uploads/seed-iphone-16-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(14, 12, '/uploads/seed-iphone-17-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(15, 13, '/uploads/seed-galaxy-a55-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(16, 14, '/uploads/seed-oraimo-freepods-4-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(17, 15, '/uploads/seed-anker-20000-power-bank-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(18, 16, '/uploads/seed-white-sneakers-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(19, 17, '/uploads/seed-oversized-hoodie-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(20, 18, '/uploads/seed-crossbody-handbag-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(21, 19, '/uploads/seed-mens-chino-trousers-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(22, 20, '/uploads/seed-aviator-sunglasses-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(23, 21, '/uploads/seed-leather-watch-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(24, 22, '/uploads/seed-golden-penny-spaghetti-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(25, 23, '/uploads/seed-indomie-carton-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(26, 24, '/uploads/seed-peak-milk-400g-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(27, 25, '/uploads/seed-milo-400g-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(28, 26, '/uploads/seed-basmati-rice-5kg-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(29, 27, '/uploads/seed-power-oil-3l-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(30, 28, '/uploads/seed-led-desk-lamp-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(31, 29, '/uploads/seed-vacuum-flask-1l-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(32, 30, '/uploads/seed-nonstick-frying-pan-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(33, 31, '/uploads/seed-digital-kitchen-scale-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(34, 32, '/uploads/seed-travel-organizer-pouches-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(35, 33, '/uploads/seed-household-tool-kit-gallery-1.jpg', 0, '2026-07-27 22:58:23'),
(36, 10, '/uploads/seed-iphone-15-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(37, 11, '/uploads/seed-iphone-16-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(38, 12, '/uploads/seed-iphone-17-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(39, 13, '/uploads/seed-galaxy-a55-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(40, 14, '/uploads/seed-oraimo-freepods-4-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(41, 15, '/uploads/seed-anker-20000-power-bank-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(42, 16, '/uploads/seed-white-sneakers-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(43, 17, '/uploads/seed-oversized-hoodie-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(44, 18, '/uploads/seed-crossbody-handbag-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(45, 19, '/uploads/seed-mens-chino-trousers-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(46, 20, '/uploads/seed-aviator-sunglasses-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(47, 21, '/uploads/seed-leather-watch-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(48, 22, '/uploads/seed-golden-penny-spaghetti-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(49, 23, '/uploads/seed-indomie-carton-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(50, 24, '/uploads/seed-peak-milk-400g-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(51, 25, '/uploads/seed-milo-400g-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(52, 26, '/uploads/seed-basmati-rice-5kg-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(53, 27, '/uploads/seed-power-oil-3l-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(54, 28, '/uploads/seed-led-desk-lamp-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(55, 29, '/uploads/seed-vacuum-flask-1l-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(56, 30, '/uploads/seed-nonstick-frying-pan-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(57, 31, '/uploads/seed-digital-kitchen-scale-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(58, 32, '/uploads/seed-travel-organizer-pouches-gallery-2.jpg', 1, '2026-07-27 22:58:23'),
(59, 33, '/uploads/seed-household-tool-kit-gallery-2.jpg', 1, '2026-07-27 22:58:23');

-- --------------------------------------------------------

--
-- Table structure for table `referrals`
--

CREATE TABLE `referrals` (
  `id` int(11) NOT NULL,
  `referrer_id` int(11) NOT NULL,
  `referred_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shop_cart_items`
--

CREATE TABLE `shop_cart_items` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `price` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `mode` enum('cash') NOT NULL DEFAULT 'cash',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shop_orders`
--

CREATE TABLE `shop_orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `customer_name` varchar(120) NOT NULL,
  `phone_number` varchar(40) NOT NULL,
  `address` text NOT NULL,
  `notes` text DEFAULT NULL,
  `subtotal` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `items_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `status` enum('pending','paid','processing','in_transit','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `tracking_number` varchar(120) DEFAULT NULL,
  `carrier` varchar(120) DEFAULT NULL,
  `expected_delivery` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shop_orders`
--

INSERT INTO `shop_orders` (`id`, `user_id`, `customer_name`, `phone_number`, `address`, `notes`, `subtotal`, `items_count`, `status`, `tracking_number`, `carrier`, `expected_delivery`, `created_at`, `updated_at`) VALUES
(1, 6, 'Livinus Imolele', '+2347025538268', '12, Market Road, Abraka, Delta State', 'Call before delivery', 1200, 1, 'in_transit', 'NG-DHL-99231', 'DHL', '2025-11-08 16:00:00', '2025-11-05 00:14:09', '2025-11-05 00:17:02');

-- --------------------------------------------------------

--
-- Table structure for table `shop_order_items`
--

CREATE TABLE `shop_order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `qty` int(10) UNSIGNED NOT NULL,
  `price` bigint(20) UNSIGNED NOT NULL,
  `subtotal` bigint(20) UNSIGNED NOT NULL,
  `mode` enum('cash') NOT NULL DEFAULT 'cash',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shop_order_items`
--

INSERT INTO `shop_order_items` (`id`, `order_id`, `product_id`, `product_name`, `qty`, `price`, `subtotal`, `mode`, `created_at`) VALUES
(1, 1, 1, 'iPhone 15 Pro', 1, 1200, 1200, 'cash', '2025-11-05 00:14:10');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `amount` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `sender_id`, `recipient_id`, `amount`, `created_at`) VALUES
(2, 7, 1, 10, '2025-08-30 17:15:39'),
(3, 2, 8, 60, '2026-03-01 00:04:43'),
(4, 2, 8, 93, '2026-03-01 00:05:59');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(190) NOT NULL,
  `username` varchar(100) NOT NULL,
  `full_name` varchar(160) DEFAULT NULL,
  `profile` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `pin` char(4) NOT NULL DEFAULT '0000',
  `bid_points` int(11) NOT NULL DEFAULT 0,
  `task_coin` int(11) NOT NULL DEFAULT 0,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `admin_scope` enum('super','limited') NOT NULL DEFAULT 'limited',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_blocked` tinyint(1) NOT NULL DEFAULT 0,
  `referral_code` varchar(32) DEFAULT NULL,
  `wallet_address` varchar(64) DEFAULT NULL,
  `game_id` varchar(32) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `username`, `full_name`, `profile`, `password_hash`, `pin`, `bid_points`, `task_coin`, `role`, `admin_scope`, `is_verified`, `is_blocked`, `referral_code`, `wallet_address`, `game_id`, `created_at`, `updated_at`) VALUES
(1, 'admin@copupbid.com', 'admin', 'one user', NULL, '$2b$12$fdWqjDpx5HfBy07mNRdQBeqJZRCQR.DdTv/QQejaS5vUbbTUgqvXC', '0000', 10, 0, 'admin', 'super', 1, 0, 'rdyb9o', 'copqy0FwMBB0wmnJ1v1hcz1', 'TVEA-23E7-HYWF', '2025-08-27 16:35:15', '2026-07-27 23:28:20'),
(2, '8amlight@gmail.com', 'potato', 'light habibi', 'uploads/IMG_0888-1783249702704-429708616.jpeg', '$2b$12$wYsy6lwp8SfWlv/pQreqhOWdzwBPRrNe7Se2YRoNaPT/N4JI51XNi', '0000', 46080, 0, 'user', 'limited', 1, 0, 'ylpg48', 'copio7DCqxF3UQ9F0W4z261', '3Z8G-GJSN-KDFB', '2025-08-27 16:56:37', '2026-07-05 11:08:22'),
(7, 'jossycode0@gmail.com', 'jay', 'dbill jay', NULL, '$2b$12$G70VFVOg9wow8H7BHGGNYe0ypHn5AExM.iNT.RnHY0nEswFUzVH0q', '0000', 60, 0, 'user', 'limited', 1, 0, '8gzacr', 'copDwaSf1gGaYaJdeSNhAcB', 'FT5M-32ZV-9RGB', '2025-08-30 15:37:41', '2025-11-27 13:54:20'),
(8, '8amjoker@gmail.com', 'joker', 'joker jay', NULL, '$2b$12$wYsy6lwp8SfWlv/pQreqhOWdzwBPRrNe7Se2YRoNaPT/N4JI51XNi', '0000', 104702, 0, 'user', 'limited', 1, 0, '8gzaco', 'copDwaSf1gGaYaJdeSNhAcc', 'FT5M-32ZV-9RGU', '2025-08-30 15:37:41', '2026-03-01 00:05:59'),
(9, 'Emmanueleunice014@gmail.com', 'Coco', 'Emmanuel Eunice', NULL, '$2b$12$Fy5JeDb5Tj/l0W21Y2PfnOIDnWkSQ5AQFBvFDw.ncx1uifUpHLOA.', '0000', 0, 0, 'user', 'limited', 1, 0, 'isj9v7', 'cop5gOkGwo6CZVqHEdajve6', 'X63G-KW3L-MWXR', '2026-07-26 09:50:53', NULL),
(10, 'benjaminisaac908@gmail.com', 'king Ben', 'Isaac Benjamin', NULL, '$2b$12$nKI5g/VNQ4JOXVn7NWhdSe9wPZ1KwnwqpEJF1a7mhEolO9XqUON6S', '0000', 0, 0, 'user', 'limited', 1, 0, 'vd6gp3', 'copdveMbqLBTgFtjMB75JtG', 'ZBLP-L5AC-6SG7', '2026-07-26 10:06:48', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_permissions`
--
ALTER TABLE `admin_permissions`
  ADD PRIMARY KEY (`user_id`,`permission_key`),
  ADD KEY `idx_admin_permissions_permission` (`permission_key`);

--
-- Indexes for table `affiliate_referrals`
--
ALTER TABLE `affiliate_referrals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_aff_ref_per_user` (`auction_id`,`referred_id`),
  ADD KEY `idx_aff_ref_referrer` (`referrer_id`),
  ADD KEY `fk_ar_referred` (`referred_id`);

--
-- Indexes for table `affiliate_user_progress`
--
ALTER TABLE `affiliate_user_progress`
  ADD PRIMARY KEY (`auction_id`,`affiliate_user_id`),
  ADD KEY `fk_aup_user` (`affiliate_user_id`);

--
-- Indexes for table `auctions`
--
ALTER TABLE `auctions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category` (`category`),
  ADD KEY `status` (`status`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_auction_status` (`status`),
  ADD KEY `idx_auction_enddate` (`end_date`),
  ADD KEY `idx_auction_highest` (`highest_bidder`),
  ADD KEY `idx_auction_current` (`current_bidder`),
  ADD KEY `idx_auction_winner` (`winner_id`),
  ADD KEY `idx_auctions_product` (`product_id`),
  ADD KEY `idx_auctions_shop_category` (`shop_category_id`),
  ADD KEY `idx_auctions_scheduled_start` (`scheduled_start_at`);

--
-- Indexes for table `auction_affiliates`
--
ALTER TABLE `auction_affiliates`
  ADD PRIMARY KEY (`auction_id`);

--
-- Indexes for table `auction_bid_points`
--
ALTER TABLE `auction_bid_points`
  ADD PRIMARY KEY (`auction_id`,`user_id`),
  ADD KEY `idx_abp_user` (`user_id`);

--
-- Indexes for table `auction_orders`
--
ALTER TABLE `auction_orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ao_user` (`user_id`),
  ADD KEY `idx_ao_status_created` (`order_status`,`created_at`);

--
-- Indexes for table `auction_order_items`
--
ALTER TABLE `auction_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aoi_order` (`auction_order_id`),
  ADD KEY `idx_aoi_auction` (`auction_id`);

--
-- Indexes for table `auction_participants`
--
ALTER TABLE `auction_participants`
  ADD PRIMARY KEY (`auction_id`,`user_id`),
  ADD KEY `idx_ap_user` (`user_id`);

--
-- Indexes for table `banners`
--
ALTER TABLE `banners`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bidshop`
--
ALTER TABLE `bidshop`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bidshop_user` (`user_id`);

--
-- Indexes for table `bids_waitlist`
--
ALTER TABLE `bids_waitlist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_active_key` (`active_key`),
  ADD KEY `idx_bids_waitlist_user` (`user_id`),
  ADD KEY `idx_bids_waitlist_product` (`product_id`),
  ADD KEY `idx_bids_waitlist_mode` (`mode`);

--
-- Indexes for table `cart`
--
ALTER TABLE `cart`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_cart_auction` (`auction_id`),
  ADD KEY `idx_cart_user` (`user_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `coin_purchases`
--
ALTER TABLE `coin_purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cp_user` (`user_id`),
  ADD KEY `idx_cp_status` (`status`);

--
-- Indexes for table `coin_rate`
--
ALTER TABLE `coin_rate`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `copup_topups`
--
ALTER TABLE `copup_topups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_txref` (`tx_ref`),
  ADD KEY `idx_user` (`user_id`);

--
-- Indexes for table `demo_users`
--
ALTER TABLE `demo_users`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `otps`
--
ALTER TABLE `otps`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `payouts`
--
ALTER TABLE `payouts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payout_user` (`user_id`);

--
-- Indexes for table `pay_account`
--
ALTER TABLE `pay_account`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pa_updated_by` (`updated_by`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_products_is_featured` (`is_featured`);

--
-- Indexes for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`product_id`,`category_id`),
  ADD KEY `fk_pc_category` (`category_id`);

--
-- Indexes for table `product_favorites`
--
ALTER TABLE `product_favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_product` (`user_id`,`product_id`),
  ADD KEY `idx_pf_user` (`user_id`),
  ADD KEY `idx_pf_product` (`product_id`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product_images_product_id` (`product_id`);

--
-- Indexes for table `referrals`
--
ALTER TABLE `referrals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `referrer_id` (`referrer_id`),
  ADD KEY `referred_id` (`referred_id`);

--
-- Indexes for table `shop_cart_items`
--
ALTER TABLE `shop_cart_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_shop_cart_items_user` (`user_id`),
  ADD KEY `idx_shop_cart_items_product` (`product_id`);

--
-- Indexes for table `shop_orders`
--
ALTER TABLE `shop_orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_orders_user` (`user_id`),
  ADD KEY `idx_orders_status` (`status`);

--
-- Indexes for table `shop_order_items`
--
ALTER TABLE `shop_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_items_order` (`order_id`),
  ADD KEY `idx_items_product` (`product_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tx_sender` (`sender_id`),
  ADD KEY `idx_tx_recipient` (`recipient_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `referral_code` (`referral_code`),
  ADD UNIQUE KEY `wallet_address` (`wallet_address`),
  ADD UNIQUE KEY `game_id` (`game_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `affiliate_referrals`
--
ALTER TABLE `affiliate_referrals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auctions`
--
ALTER TABLE `auctions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `auction_orders`
--
ALTER TABLE `auction_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `auction_order_items`
--
ALTER TABLE `auction_order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `banners`
--
ALTER TABLE `banners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `bidshop`
--
ALTER TABLE `bidshop`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `bids_waitlist`
--
ALTER TABLE `bids_waitlist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `cart`
--
ALTER TABLE `cart`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `coin_purchases`
--
ALTER TABLE `coin_purchases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `copup_topups`
--
ALTER TABLE `copup_topups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `payouts`
--
ALTER TABLE `payouts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `product_favorites`
--
ALTER TABLE `product_favorites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT for table `referrals`
--
ALTER TABLE `referrals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shop_cart_items`
--
ALTER TABLE `shop_cart_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `shop_orders`
--
ALTER TABLE `shop_orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `shop_order_items`
--
ALTER TABLE `shop_order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_permissions`
--
ALTER TABLE `admin_permissions`
  ADD CONSTRAINT `fk_admin_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `affiliate_referrals`
--
ALTER TABLE `affiliate_referrals`
  ADD CONSTRAINT `fk_ar_auction` FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ar_referred` FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ar_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `affiliate_user_progress`
--
ALTER TABLE `affiliate_user_progress`
  ADD CONSTRAINT `fk_aup_auction` FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_aup_user` FOREIGN KEY (`affiliate_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `auctions`
--
ALTER TABLE `auctions`
  ADD CONSTRAINT `fk_auctions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_auctions_current_bidder` FOREIGN KEY (`current_bidder`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_auctions_highest_bidder` FOREIGN KEY (`highest_bidder`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_auctions_shop_category` FOREIGN KEY (`shop_category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_auctions_winner` FOREIGN KEY (`winner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `auction_affiliates`
--
ALTER TABLE `auction_affiliates`
  ADD CONSTRAINT `fk_aa_auction` FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `auction_bid_points`
--
ALTER TABLE `auction_bid_points`
  ADD CONSTRAINT `fk_abp_auction` FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_abp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `auction_orders`
--
ALTER TABLE `auction_orders`
  ADD CONSTRAINT `fk_ao_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `auction_order_items`
--
ALTER TABLE `auction_order_items`
  ADD CONSTRAINT `fk_aoi_auction` FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_aoi_order` FOREIGN KEY (`auction_order_id`) REFERENCES `auction_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `auction_participants`
--
ALTER TABLE `auction_participants`
  ADD CONSTRAINT `fk_ap_auction` FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ap_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `bidshop`
--
ALTER TABLE `bidshop`
  ADD CONSTRAINT `fk_bidshop_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `bids_waitlist`
--
ALTER TABLE `bids_waitlist`
  ADD CONSTRAINT `fk_bids_waitlist__product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bids_waitlist__user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cart`
--
ALTER TABLE `cart`
  ADD CONSTRAINT `fk_cart_auction` FOREIGN KEY (`auction_id`) REFERENCES `auctions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `coin_purchases`
--
ALTER TABLE `coin_purchases`
  ADD CONSTRAINT `fk_cp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payouts`
--
ALTER TABLE `payouts`
  ADD CONSTRAINT `fk_payout_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pay_account`
--
ALTER TABLE `pay_account`
  ADD CONSTRAINT `fk_pa_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD CONSTRAINT `fk_pc_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pc_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_favorites`
--
ALTER TABLE `product_favorites`
  ADD CONSTRAINT `fk_pf_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pf_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `referrals`
--
ALTER TABLE `referrals`
  ADD CONSTRAINT `fk_referrals_referred` FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_referrals_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `shop_cart_items`
--
ALTER TABLE `shop_cart_items`
  ADD CONSTRAINT `fk_shop_cart_items__product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_shop_cart_items__user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `shop_order_items`
--
ALTER TABLE `shop_order_items`
  ADD CONSTRAINT `fk_items_order` FOREIGN KEY (`order_id`) REFERENCES `shop_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_tx_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tx_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
