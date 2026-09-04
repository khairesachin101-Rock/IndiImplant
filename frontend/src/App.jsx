import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import CategoryListing from "./pages/CategoryListing.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import PSIConnect from "./pages/PSIConnect.jsx";
import PSICaseChat from "./pages/PSICaseChat.jsx";
import CompanyDashboard from "./pages/CompanyDashboard.jsx";
import CompanyProfile from "./pages/CompanyProfile.jsx";
import { getSession } from "./session.js";

function RequireRole({ role, children }) {
  const session = getSession();
  if (!session || session.role !== role) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAuth({ children }) {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/doctor"
        element={
          <RequireRole role="doctor">
            <DoctorDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/category/:categoryName"
        element={
          <RequireRole role="doctor">
            <CategoryListing />
          </RequireRole>
        }
      />
      <Route
        path="/product/:productId"
        element={
          <RequireRole role="doctor">
            <ProductDetail />
          </RequireRole>
        }
      />
      <Route
        path="/psi"
        element={
          <RequireRole role="doctor">
            <PSIConnect />
          </RequireRole>
        }
      />
      <Route
        path="/chat/:type/:threadId"
        element={
          <RequireAuth>
            <PSICaseChat />
          </RequireAuth>
        }
      />
      <Route
        path="/company/:companyId"
        element={
          <RequireRole role="doctor">
            <CompanyProfile />
          </RequireRole>
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireRole role="company">
            <CompanyDashboard />
          </RequireRole>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
