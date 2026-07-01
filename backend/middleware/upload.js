// middleware/upload.js
"use strict";

const fs = require("fs");
const path = require("path");
const multer = require("multer");

/** Directory where files will be stored */
const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

/** Build a safe, unique filename while preserving a sensible extension */
function buildFilename(file) {
  const ts = Date.now();
  const rand = Math.round(Math.random() * 1e9);

  // Try to keep original extension; fallback from mimetype if missing
  let ext = (path.extname(file.originalname || "") || "").toLowerCase();
  if (!ext) {
    switch (file.mimetype) {
      case "image/jpeg":
      case "image/jpg":
        ext = ".jpg"; break;
      case "image/png":
        ext = ".png"; break;
      case "image/webp":
        ext = ".webp"; break;
      case "image/gif":
        ext = ".gif"; break;
      default:
        ext = "";
    }
  }

  const base =
    (String(file.originalname || "file")
      .replace(/\.[^.]+$/, "")         // strip ext
      .replace(/[^a-zA-Z0-9_-]/g, "")  // safe chars only
      .slice(0, 20)) || "file";

  return `${base}-${ts}-${rand}${ext}`;
}

/** Multer storage */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, buildFilename(file)),
});

/** Allow only common image mimetypes */
const imageMimes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function fileFilter(req, file, cb) {
  if (imageMimes.has(file.mimetype)) return cb(null, true);
  return cb(new Error("Only image files are allowed"), false);
}

/** Multer instance */
const maxMb = Number(process.env.MAX_UPLOAD_MB || 60);
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024 },
});

/**
 * Build an absolute URL for a stored path like "/uploads/xxxx.png" or "uploads/xxxx.png".
 * Usage: absUrl(req, imagePath)
 */
function absUrl(req, p) {
  if (!p) return null;
  const base = `${req.protocol}://${req.get("host")}`;
  // normalize: ensure it has one leading slash relative to site root
  const rel = p.startsWith("/") ? p : `/${p}`;
  return `${base}${rel}`;
}

module.exports = {
  upload,
  absUrl,
  uploadsDir,      // optional export (handy if you need it)
};
