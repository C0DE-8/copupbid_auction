// src/lib/api.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/**
 * ✅ Base URL for images (uploads)
 * - If your API is: http://localhost:4000/api
 * - Then image base becomes: http://localhost:4000
 *
 * You can override with: VITE_IMAGE_URL=http://localhost:4000
 */
export const IMAGE_BASE =
  import.meta.env.VITE_IMAGE_URL ||
  String(API_BASE).replace(/\/api\/?$/i, "");

/** ✅ Build a safe absolute image URL from backend paths */
export function imgUrl(p) {
  if (!p) return "";
  const s = String(p).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;

  // "/uploads/..." -> "http://host/uploads/..."
  if (s.startsWith("/")) return `${IMAGE_BASE}${s}`;

  // "uploads/..." -> "http://host/uploads/..."
  return `${IMAGE_BASE}/${s}`;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: "application/json",
  },
});

// 🔐 Automatically attach Bearer token to every request
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized request — token may be missing or expired");
      // optionally:
      // localStorage.removeItem("token");
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);