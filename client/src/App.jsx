import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import CopUpBidShop from "./pages/CopUpBidShop/CopUpBidShop";

// Auth Pages
import Login from "./pages/Auth/Login/Login";
import Register from "./pages/Auth/Register/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword/ResetPassword";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";

// Protected Routes
import AdminRoute from "./routes/AdminRoute";
import UserRoute from "./routes/UserRoute";

// 404
import NotFound from "./pages/NotFound/NotFound";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminWaitlist from "./pages/admin/AdminWaitlist";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuction from "./pages/admin/AdminAuction";
import AdminAffilates from "./pages/admin/AdminAffilates";
import AdminPayout from "./pages/admin/AdminPayout";
import AdminControl from "./pages/admin/AdminControl";
import AdminCoins from "./pages/admin/AdminCoins";
import AdminPayAccount from "./pages/admin/AdminPayAccount";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminFavorites from "./pages/admin/AdminFavorites";
import AdminBanner from "./pages/admin/AdminBanner";
import Dashboard from "./pages/Dashboard/Dashboard";
import Profile from "./pages/Profile/Profile";
import Account from "./pages/Account/Account";
import PaymentResult from "./pages/PaymentResult/PaymentResult";
import Auctions from "./pages/Auctions/Auctions";
import ComingSoon from "./pages/ComingSoon/ComingSoon";
import Cart from "./pages/Cart/Cart";
import Trade from "./pages/Trade/Trade";
import Favorites from "./pages/Favorites/Favorites";
import Affiliate from "./pages/Affiliate/Affiliate";
import Winner from "./pages/Winner/Winner";
import HowItWork from "./pages/Support/HowItWork";
import CopUpBidShopD from "./pages/CopUpBidShop/CopUpBidShopD";
import AdminCoinPay from "./pages/admin/AdminCoinPay";
import CookieConsent from "./components/CookieConsent/CookieConsent";
import Privacy from "./pages/Privacy/Privacy";
import Terms from "./pages/Privacy/Terms";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* ================= AUTH ROUTES ================= */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />

        {/* ================= USER ROUTES (Protected) ================= */}
        {/* <Route element={<UserRoute />}>
          <Route path="/" element={<CopUpBidShop />} />
        </Route> */}
        <Route path="/" element={<CopUpBidShop />} />
         <Route path="/shop/product/:id" element={<CopUpBidShopD />} />
        <Route path="/shop" element={<CopUpBidShop />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        <Route element={<UserRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

         <Route element={<UserRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route element={<UserRoute />}>
          <Route path="/account" element={<Account />} />
        </Route>

        <Route element={<UserRoute />}>
          <Route path="/payment-result" element={<PaymentResult />} />
        </Route>

         <Route element={<UserRoute />}>
          <Route path="/auctions" element={<Auctions />} />
        </Route>

         <Route element={<UserRoute />}>
          <Route path="/cart" element={<Cart />} />
        </Route>

         <Route element={<UserRoute />}>
          <Route path="/trade" element={<Trade />} />
        </Route>

         <Route element={<UserRoute />}>
          <Route path="/favorites" element={<Favorites />} />
        </Route>

        <Route element={<UserRoute />}>
          <Route path="/affiliate" element={<Affiliate />} />
        </Route>

        <Route element={<UserRoute />}>
          <Route path="/winners" element={<Winner />} />
        </Route>

        <Route element={<UserRoute />}>
          <Route path="/how-to-play" element={<HowItWork />} />
        </Route>

        {/* ================= ADMIN ROUTES (Protected) ================= */}
        <Route element={<AdminRoute />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/products" element={<AdminProducts />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/waitlist" element={<AdminWaitlist />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/auctions" element={<AdminAuction />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/affiliates" element={<AdminAffilates />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/payouts" element={<AdminPayout />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin/control" element={<AdminControl />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/coins" element={<AdminCoins />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/pay-account" element={<AdminPayAccount />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/orders" element={<AdminOrders />} />
        </Route>

         <Route element={<AdminRoute />}>
          <Route path="/admin/favorites" element={<AdminFavorites />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin/banner" element={<AdminBanner />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin/coin-pay-in" element={<AdminCoinPay />} />
        </Route>

       

        {/* ================= 404 FALLBACK ================= */}
        <Route path="*" element={<NotFound />} />
        <Route path="/coming-soon" element={<ComingSoon />} />
      </Routes>
      <CookieConsent />
    </Router>
  );
}
