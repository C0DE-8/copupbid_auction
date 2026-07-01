// middleware/auth.js (CommonJS)
const jwt = require("jsonwebtoken");
const { pool } = require("../db");

/**
 * Authenticate requests using a Bearer JWT.
 * - Verifies token with JWT_SECRET
 * - Loads user from DB and ensures not blocked & verified
 * - Attaches minimal user object to req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing Bearer token" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Safer than falling back to a hardcoded default
      return res.status(500).json({ message: "Server misconfigured: JWT_SECRET is missing" });
    }

    // Verify token & extract payload
    const payload = jwt.verify(token, secret); // { userId, role, iat, exp }

    // Fetch user and validate status
    const [rows] = await pool.query(
      "SELECT id, email, username, role, is_verified, is_blocked, created_at FROM users WHERE id = ? LIMIT 1",
      [payload.userId]
    );
    const user = rows[0];
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }
    if (!user.is_verified) {
      return res.status(403).json({ message: "Account not verified" });
    }
    if (user.is_blocked) {
      return res.status(403).json({ message: "Account is blocked" });
    }

    // Attach minimal user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      is_verified: user.is_verified,
      is_blocked: user.is_blocked,
      created_at: user.created_at,
    };

    return next();
  } catch (error) {
    console.error("Authentication Error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    return res.status(500).json({ message: "Auth error" });
  }
};

/**
 * Require admin role (role column in users table).
 * - Assumes authenticateToken already ran and set req.user
 */
const authenticateAdmin = (req, res, next) => {
  try {
    if (req.user && req.user.role === "admin") {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
  } catch (err) {
    console.error("Admin Auth Error:", err);
    return res.status(500).json({ message: "Auth error" });
  }
};

/**
 * Global error handler (optional).
 * Place AFTER your routes: app.use(errorHandlingMiddleware)
 */
const errorHandlingMiddleware = (err, req, res, next) => {
  console.error("Error Middleware:", err);

  if (err && err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired. Please log in again." });
  }
  if (err && err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }

  return res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  errorHandlingMiddleware,
};
