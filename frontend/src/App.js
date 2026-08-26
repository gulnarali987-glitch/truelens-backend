import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import AppPage from "@/pages/AppPage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Pricing from "@/pages/Pricing";
import Dashboard from "@/pages/Dashboard";
import PaymentSuccess from "@/pages/PaymentSuccess";
import AuthCallback from "@/pages/AuthCallback";
import GlowCursor from "@/components/GlowCursor";
import ClickBurst from "@/components/ClickBurst";
import "@/App.css";

function Router() {
  const location = useLocation();
  // Emergent OAuth returns to /dashboard#session_id=...
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Router />
        <ClickBurst />
        <GlowCursor />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
