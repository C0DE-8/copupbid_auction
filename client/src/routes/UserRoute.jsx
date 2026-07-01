import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function UserRoute() {
  const loc = useLocation();
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "user").toLowerCase();

  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: loc.pathname }} />;
  }

  // user-only route
  if (role === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <Outlet />;
}
