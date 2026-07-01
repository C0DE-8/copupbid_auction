import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function AdminRoute() {
  const loc = useLocation();
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();

  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: loc.pathname }} />;
  }

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
