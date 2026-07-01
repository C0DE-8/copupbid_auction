// routes/users.js (CommonJS)
const express = require("express");
const { pool } = require("../db");
const moment = require("moment-timezone");
const { authenticateToken } = require("../middleware/auth");
const { absUrl } = require('../middleware/upload');
const path = require("path");

const router = express.Router();


// get banners
router.get("/banner", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC`
    );

    const banners = rows.map(b => {
      // ✅ Extract only filename from stored full path
      const filename = path.basename(b.image_path);

      return {
        id: b.id,
        action_name: b.action_name,
        action_url: b.action_url,
        image_url: `${req.protocol}://${req.get("host")}/uploads/${filename}`
      };
    });

    res.json({ banners });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching banners" });
  }
});


/* =========================
   PRODUCT & CATEGORIES & FAVORITES
   ========================= */

// List products (PUBLIC) (optionally filter by categoryId)
router.get("/public/products", async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;

    if (categoryId && !Number.isFinite(categoryId)) {
      return res.status(400).json({ message: "Invalid categoryId" });
    }

    // If filtering by category, keep product rows unique
    // and still show categories (all categories) + gallery_count
    if (categoryId) {
      const [rows] = await pool.query(
        `
        SELECT
          p.id,
          p.name,
          p.short_description,
          p.description,
          p.vendor_name,
          p.stock_status,
          p.shipping_cost,
          p.delivery_eta,

          p.cash_price,
          p.auction_price,
          p.heist_price,

          p.image_path,
          p.created_at,

          GROUP_CONCAT(DISTINCT cAll.name ORDER BY cAll.name SEPARATOR ', ') AS categories,

          (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS gallery_count

        FROM products p
        JOIN product_categories pcFilter ON pcFilter.product_id = p.id
        LEFT JOIN product_categories pcAll ON pcAll.product_id = p.id
        LEFT JOIN categories cAll ON cAll.id = pcAll.category_id

        WHERE pcFilter.category_id = ?
        GROUP BY p.id
        ORDER BY p.name ASC
        `,
        [categoryId]
      );

      return res.json(
        rows.map((r) => ({
          ...r,
          image_url: absUrl(req, r.image_path),
        }))
      );
    }

    // Non-filtered list
    const [rows] = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.short_description,
        p.description,
        p.vendor_name,
        p.stock_status,
        p.shipping_cost,
        p.delivery_eta,

        p.cash_price,
        p.auction_price,
        p.heist_price,

        p.image_path,
        p.created_at,

        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS categories,

        (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS gallery_count

      FROM products p
      LEFT JOIN product_categories pc ON pc.product_id = p.id
      LEFT JOIN categories c ON c.id = pc.category_id
      GROUP BY p.id
      ORDER BY p.name ASC
    `);

    return res.json(
      rows.map((r) => ({
        ...r,
        image_url: absUrl(req, r.image_path),
      }))
    );
  } catch (err) {
    console.error("GET /public/products error:", err);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});
// Get single product by id (PUBLIC)
router.get("/public/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || !Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const [[product]] = await pool.query(
      `
      SELECT
        id,
        name,
        short_description,
        description,
        vendor_name,
        stock_status,
        shipping_cost,
        delivery_eta,

        cash_price,
        auction_price,
        heist_price,

        image_path,
        created_at
      FROM products
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!product) return res.status(404).json({ message: "Product not found" });

    const [cats] = await pool.query(
      `
      SELECT c.id, c.name
      FROM product_categories pc
      JOIN categories c ON c.id = pc.category_id
      WHERE pc.product_id = ?
      ORDER BY c.name ASC
      `,
      [id]
    );

    const [gallery] = await pool.query(
      `
      SELECT id, image_path, sort_order, created_at
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [id]
    );

    return res.json({
      ...product,
      image_url: absUrl(req, product.image_path),
      categories: cats,
      gallery: gallery.map((g) => ({
        ...g,
        image_url: absUrl(req, g.image_path),
      })),
    });
  } catch (err) {
    console.error("GET /public/products/:id error:", err);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});
// List categories
router.get('/public/categories', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, created_at FROM categories ORDER BY name ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /categories error:', err);
    return res.status(500).json({ message: 'Failed to fetch categories' });
  }
});
// List products in a category (explicit route)
router.get("/public/categories/:categoryId/products", async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);

    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.short_description,
         p.description,
         p.vendor_name,
         p.stock_status,
         p.shipping_cost,
         p.delivery_eta,

         p.cash_price,
         p.auction_price,
         p.heist_price,

         p.image_path,
         p.created_at,

         (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS gallery_count

       FROM product_categories pc
       JOIN products p ON p.id = pc.product_id
       WHERE pc.category_id = ?
       ORDER BY p.name ASC`,
      [categoryId]
    );

    return res.status(200).json(
      (Array.isArray(rows) ? rows : []).map(r => ({
        ...r,
        image_url: absUrl(req, r.image_path),
      }))
    );
  } catch (err) {
    console.error("GET /public/categories/:categoryId/products error:", err);
    return res.status(500).json({ message: "Failed to fetch products for category" });
  }
});
// List categories for a product (explicit route)
router.get('/public/products/:productId/categories', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.created_at
       FROM product_categories pc
       JOIN categories c ON c.id = pc.category_id
       WHERE pc.product_id = ?
       ORDER BY c.name ASC`,
      [productId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /products/:productId/categories error:', err);
    return res.status(500).json({ message: 'Failed to fetch categories for product' });
  }
});
// List ONLY featured products
router.get('/public/featured/products',
  async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
      if (categoryId && !Number.isFinite(categoryId)) {
        return res.status(400).json({ message: 'Invalid categoryId' });
      }

      if (categoryId) {
        const [rows] = await pool.query(
          `SELECT
             p.id,
             p.name,
             p.cash_price,
             p.auction_price,
             p.heist_price,
             p.image_path,
             p.is_featured,
             p.created_at,
             c.id   AS category_id,
             c.name AS category_name
           FROM products p
           JOIN product_categories pc ON pc.product_id = p.id
           JOIN categories c         ON c.id = pc.category_id
           WHERE pc.category_id = ? AND p.is_featured = 1
           ORDER BY p.name ASC`,
          [categoryId]
        );
        return res.json(rows.map(r => ({ ...r, image_url: absUrl(req, r.image_path) })));
      }

      const [rows] = await pool.query(
        `SELECT
           p.id,
           p.name,
           p.cash_price,
           p.auction_price,
           p.heist_price,
           p.image_path,
           p.is_featured,
           p.created_at,
           GROUP_CONCAT(c.name ORDER BY c.name SEPARATOR ', ') AS categories
         FROM products p
         LEFT JOIN product_categories pc ON pc.product_id = p.id
         LEFT JOIN categories c ON c.id = pc.category_id
         WHERE p.is_featured = 1
         GROUP BY p.id
         ORDER BY p.name ASC`
      );

      res.json(rows.map(r => ({ ...r, image_url: absUrl(req, r.image_path) })));
    } catch (err) {
      console.error('GET /products/featured error:', err);
      return res.status(500).json({ message: 'Failed to fetch featured products' });
    }
  }
);


module.exports = router;
