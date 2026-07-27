import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function SuperAdminRoute() {
  const loc = useLocation();
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const adminScope = (localStorage.getItem("admin_scope") || "").toLowerCase();

  if (!token) return <Navigate to="/auth/login" replace state={{ from: loc.pathname }} />;
  if (role !== "admin") return <Navigate to="/" replace />;
  if (adminScope !== "super") return <Navigate to="/admin/management" replace />;

  return <Outlet />;
}
