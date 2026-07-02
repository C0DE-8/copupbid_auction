-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jul 02, 2026 at 11:23 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `copup`
--

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
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auctions`
--

INSERT INTO `auctions` (`id`, `name`, `description`, `image`, `entry_bid_points`, `minimum_users`, `category`, `status`, `current_bid_amount`, `final_price`, `highest_bidder`, `current_bidder`, `winner_id`, `end_date`, `created_by`, `product_id`, `created_at`, `updated_at`) VALUES
(1, 'iPhone 16 Pro', 'Brand new, sealed', '/uploads/1756315404040_chatgpt-image-aug-27,-2025,-06_46_52-am.png', 10, 1, 'product', 'completed', 60, 60, NULL, NULL, NULL, '2025-08-27 11:28:54', 1, 0, '2025-08-27 17:21:24', '2025-08-27 18:34:12'),
(2, 'iPhone 14 Pro', 'Brand new, sealed.', '/uploads/1756940865095_chatgpt-image-aug-27,-2025,-04_39_00-pm.png', 1, 1, 'product', 'completed', 55, 55, 2, 2, 2, '2025-11-27 05:50:30', 1, 0, '2025-09-03 23:07:45', '2025-11-27 13:54:20'),
(3, 'iPhone 16 Pro', 'Brand new, sealed.', '/uploads/1756940883775_chatgpt-image-aug-27,-2025,-04_45_01-pm.png', 1, 1, 'product', 'hold', 0, 0, NULL, NULL, NULL, NULL, 1, 0, '2025-09-03 23:08:03', '2025-11-27 13:54:20'),
(4, 'iPhone 17 Pro', 'Brand new, sealed.', '/uploads/1756940888249_chatgpt-image-aug-27,-2025,-04_45_01-pm.png', 1, 1, 'product', 'hold', 0, 0, NULL, NULL, NULL, NULL, 1, 0, '2025-09-03 23:08:08', '2025-11-27 13:54:20'),
(5, 'iPhone 11 Pro', 'Brand new, sealed.', '/uploads/1756940893049_chatgpt-image-aug-27,-2025,-04_45_01-pm.png', 1, 1, 'product', 'completed', 5, 5, 2, 2, 2, '2025-09-03 17:01:07', 1, 0, '2025-09-03 23:08:13', '2025-09-04 23:53:30'),
(6, 'copup', 'noted', '/uploads/1757399339802_chatgpt-image-aug-9,-2025,-11_49_10-am.png', 1, 1, 'cash', 'pending', 0, 0, NULL, NULL, NULL, NULL, 1, 0, '2025-09-09 06:29:00', NULL),
(8, 'Product 1 — Auction', 'Created from waitlist', NULL, 200, 1, 'product', 'hold', 0, 0, NULL, NULL, NULL, NULL, 1, 0, '2025-11-04 22:55:22', '2025-11-04 22:55:30'),
(9, 'iphone flash p', 'the phone information', '/uploads/1771627597310_5.jpeg', 2, 5, 'product', 'pending', 0, 0, NULL, NULL, NULL, NULL, 1, 3, '2025-11-19 02:13:38', '2026-02-20 22:46:37');

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
(1, 2, 180, '2025-08-27 18:22:22'),
(2, 2, 170, '2025-11-27 13:50:15'),
(2, 7, 25, '2025-11-27 13:40:11'),
(2, 8, 135, '2025-11-27 13:41:39'),
(5, 2, 5, '2025-09-03 23:56:07');

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
(1, 2, '2025-08-27 17:43:37'),
(2, 2, '2025-11-27 13:37:32'),
(2, 7, '2025-11-27 13:36:39'),
(2, 8, '2025-11-27 13:39:49'),
(3, 2, '2025-11-27 12:07:16'),
(4, 2, '2025-11-27 12:07:28'),
(5, 2, '2025-09-03 23:18:14'),
(9, 2, '2025-11-27 12:15:00');

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
(1, 'Hesit mode', 'http://localhost:5173/', '/Users/apple/Desktop/projects/copupbid/backend/uploads/1772037544490_1.jpeg', 1, 0, '2026-02-25 08:39:04'),
(2, 'banner2', 'http://localhost:5173/', '/Users/apple/Desktop/projects/copupbid/backend/uploads/1772038631339_5.jpeg', 1, 0, '2026-02-25 08:57:11');

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

--
-- Dumping data for table `bids_waitlist`
--

INSERT INTO `bids_waitlist` (`id`, `user_id`, `product_id`, `qty`, `mode`, `bid_locked`, `status`, `created_at`) VALUES
(42, 2, 1, 1, 'auction', 20.00, 'queued', '2026-02-21 10:00:40'),
(43, 2, 4, 1, 'auction', 20.00, 'queued', '2026-02-25 19:57:19');

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
(3, 2, 2, 55, 'paid', '2025-11-27 13:54:20');

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
(1, 'Electronics', '2025-11-04 16:25:08'),
(2, 'Clothing', '2025-11-04 16:25:34'),
(4, 'Food', '2025-11-06 15:04:29'),
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
(1, 'iPhone 15 Pro', NULL, NULL, 'CopUp', 'in_stock', 0.00, NULL, '/uploads/1762438499025_chatgpt-image-nov-1,-2025,-06_06_52-pm.png', 1, 100.00, 20.00, '2025-11-04 16:31:08', 0, 1, '2026-02-20 19:54:16'),
(2, 'Ledger Nano X', NULL, NULL, 'CopUp', 'in_stock', 0.00, NULL, '/uploads/1762437776448_chatgpt-image-nov-1,-2025,-04_58_39-pm.png', 0, 199.00, 170.00, '2025-11-04 16:35:14', 1, 1, '2026-02-20 19:54:09'),
(3, 'Top', 'short thiing about this item is that is shot', ';longtest hi there love hi there love hihihihi hih hi there love hi there love hi there love hi there love hihi hih hi there love hih hih', 'CopUp', 'in_stock', 0.00, NULL, '/uploads/1762437776448_chatgpt-image-nov-1,-2025,-04_58_39-pm.png', 0, 100.00, 20.00, '2025-11-06 14:02:56', 1, 1, '2026-02-20 20:17:48'),
(4, 'iPhone 11 Pro', NULL, NULL, 'CopUp', 'in_stock', 0.00, NULL, '/uploads/1762437952295_chatgpt-image-nov-1,-2025,-04_58_39-pm.png', 1, 100.00, 20.00, '2025-11-06 14:05:52', 1, 1, '2026-02-20 19:21:30'),
(5, 'iPhone 11 Pro (246 Gb)', NULL, NULL, 'CopUp', 'in_stock', 0.00, NULL, '/uploads/1762438039432_chatgpt-image-nov-1,-2025,-04_58_39-pm.png', 1, 100.00, 20.00, '2025-11-06 14:07:19', 1, 1, '2026-02-20 19:21:12');

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
(1, 1),
(2, 1),
(3, 2),
(4, 1),
(5, 1);

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

--
-- Dumping data for table `product_favorites`
--

INSERT INTO `product_favorites` (`id`, `user_id`, `product_id`, `created_at`) VALUES
(18, 2, 4, '2026-02-19 17:01:16'),
(24, 2, 3, '2026-02-19 17:44:15'),
(27, 2, 5, '2026-02-25 20:15:13');

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
(1, 3, '/uploads/1771614134968_photo_2026-02-17-11.48.47.jpeg', 0, '2026-02-20 19:02:15'),
(2, 3, '/uploads/1771614134992_photo_2026-02-17-11.48.52.jpeg', 1, '2026-02-20 19:02:15'),
(3, 3, '/uploads/1771614134992_photo_2026-02-17-12.28.52.jpeg', 2, '2026-02-20 19:02:15'),
(4, 3, '/uploads/1771614135033_1.jpeg', 3, '2026-02-20 19:02:15');

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

--
-- Dumping data for table `shop_cart_items`
--

INSERT INTO `shop_cart_items` (`id`, `user_id`, `product_id`, `qty`, `price`, `subtotal`, `mode`, `created_at`) VALUES
(6, 2, 4, 1, 100.00, 100.00, 'cash', '2026-02-21 02:20:40'),
(7, 2, 5, 1, 100.00, 100.00, 'cash', '2026-02-21 02:23:40'),
(8, 2, 5, 1, 100.00, 100.00, 'cash', '2026-02-21 02:23:46'),
(9, 2, 5, 1, 100.00, 100.00, 'cash', '2026-02-21 02:23:49'),
(10, 2, 2, 2, 199.00, 398.00, 'cash', '2026-02-21 03:25:46'),
(11, 2, 5, 1, 100.00, 100.00, 'cash', '2026-02-21 03:27:13'),
(12, 2, 5, 1, 100.00, 100.00, 'cash', '2026-02-21 10:01:06'),
(13, 2, 5, 1, 100.00, 100.00, 'cash', '2026-02-21 10:01:10'),
(14, 2, 4, 2, 100.00, 200.00, 'cash', '2026-02-25 19:57:32'),
(15, 2, 4, 1, 100.00, 100.00, 'cash', '2026-02-25 20:14:44'),
(16, 2, 3, 1, 100.00, 100.00, 'cash', '2026-02-25 20:14:53'),
(17, 2, 3, 1, 100.00, 100.00, 'cash', '2026-02-25 20:14:57'),
(18, 2, 3, 1, 100.00, 100.00, 'cash', '2026-02-25 20:15:00'),
(19, 2, 3, 2, 100.00, 200.00, 'cash', '2026-02-25 20:15:03');

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

INSERT INTO `users` (`id`, `email`, `username`, `full_name`, `profile`, `password_hash`, `pin`, `bid_points`, `task_coin`, `role`, `is_verified`, `is_blocked`, `referral_code`, `wallet_address`, `game_id`, `created_at`, `updated_at`) VALUES
(1, 'admin@copupbid.com', 'admin', 'one user', NULL, '$2b$12$fdWqjDpx5HfBy07mNRdQBeqJZRCQR.DdTv/QQejaS5vUbbTUgqvXC', '0000', 10, 0, 'admin', 1, 0, 'rdyb9o', 'copqy0FwMBB0wmnJ1v1hcz1', 'TVEA-23E7-HYWF', '2025-08-27 16:35:15', '2025-09-09 05:03:52'),
(2, '8amlight@gmail.com', 'potato', 'light habibi', 'uploads/user-rave-faq-1772051540676-695524335.jpeg', '$2b$12$wYsy6lwp8SfWlv/pQreqhOWdzwBPRrNe7Se2YRoNaPT/N4JI51XNi', '0000', 46300, 0, 'user', 1, 0, 'ylpg48', 'copio7DCqxF3UQ9F0W4z261', '3Z8G-GJSN-KDFB', '2025-08-27 16:56:37', '2026-03-01 00:05:59'),
(7, 'jossycode0@gmail.com', 'jay', 'dbill jay', NULL, '$2b$12$G70VFVOg9wow8H7BHGGNYe0ypHn5AExM.iNT.RnHY0nEswFUzVH0q', '0000', 60, 0, 'user', 1, 0, '8gzacr', 'copDwaSf1gGaYaJdeSNhAcB', 'FT5M-32ZV-9RGB', '2025-08-30 15:37:41', '2025-11-27 13:54:20'),
(8, '8amjoker@gmail.com', 'joker', 'joker jay', NULL, '$2b$12$wYsy6lwp8SfWlv/pQreqhOWdzwBPRrNe7Se2YRoNaPT/N4JI51XNi', '0000', 104702, 0, 'user', 1, 0, '8gzaco', 'copDwaSf1gGaYaJdeSNhAcc', 'FT5M-32ZV-9RGU', '2025-08-30 15:37:41', '2026-03-01 00:05:59');

--
-- Indexes for dumped tables
--

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
  ADD KEY `idx_auctions_product` (`product_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `product_favorites`
--
ALTER TABLE `product_favorites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

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
