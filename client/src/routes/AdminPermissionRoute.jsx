import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

function getStoredPermissions() {
  try {
    const raw = localStorage.getItem("admin_permissions");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AdminPermissionRoute({ permission }) {
  const loc = useLocation();
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const adminScope = (localStorage.getItem("admin_scope") || "").toLowerCase();
  const permissions = getStoredPermissions();

  if (!token) return <Navigate to="/auth/login" replace state={{ from: loc.pathname }} />;
  if (role !== "admin") return <Navigate to="/" replace />;
  if (adminScope === "super" || permissions.includes(permission)) return <Outlet />;

  return <Navigate to="/admin/management" replace />;
}
