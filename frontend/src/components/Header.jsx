import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";

export default function Header({ dark = false }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const linkCls = "text-sm font-medium hover:opacity-80 transition-opacity";
  const activeCls = "opacity-100";
  const inactiveCls = "opacity-70";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 ${dark ? "glass-dark" : "glass"} border-b`}
      data-testid="site-header"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 group" data-testid="brand-link">
          <div className={`h-9 w-9 rounded-full overflow-hidden ring-1 ${dark ? "ring-white/25" : "ring-black/10"} group-hover:scale-105 transition-transform bg-[#1B2340]`}>
            <img src="/logo.png" alt="TrueLense" className="h-full w-full object-cover" />
          </div>
          <span className={`font-display text-xl font-bold ${dark ? "text-[#EEF1F6]" : "text-[#1B2340]"}`}>TrueLense</span>
        </Link>
        <nav className={`hidden md:flex items-center gap-8 ${dark ? "text-[#EEF1F6]" : "text-[#1B2340]"}`}>
          <Link to="/" data-testid="nav-home" className={`${linkCls} ${pathname === "/" ? activeCls : inactiveCls}`}>Home</Link>
          <Link to="/app" data-testid="nav-app" className={`${linkCls} ${pathname === "/app" ? activeCls : inactiveCls}`}>Verify</Link>
          <Link to="/pricing" data-testid="nav-pricing" className={`${linkCls} ${pathname === "/pricing" ? activeCls : inactiveCls}`}>Pricing</Link>
          {user && <Link to="/dashboard" data-testid="nav-dashboard" className={`${linkCls} ${pathname === "/dashboard" ? activeCls : inactiveCls}`}>Dashboard</Link>}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className={`hidden sm:block text-sm ${dark ? "text-[#EEF1F6]/80" : "text-[#1B2340]/80"}`} data-testid="header-user-name">
                {user.name || user.email}
              </span>
              <button onClick={logout} className={`btn-pill text-sm ${dark ? "bg-white/10 text-[#EEF1F6] hover:bg-white/20" : "bg-[#1B2340]/5 text-[#1B2340] hover:bg-[#1B2340]/10"}`} data-testid="logout-btn">
                <LogOut size={14} className="inline mr-1" />Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`btn-pill text-sm ${dark ? "text-[#EEF1F6] hover:bg-white/10" : "text-[#1B2340] hover:bg-[#1B2340]/5"}`} data-testid="header-login">Login</Link>
              <Link to="/signup" className={`btn-pill text-sm ${dark ? "bg-[#EEF1F6] text-[#1B2340]" : "bg-[#1B2340] text-[#EEF1F6]"}`} data-testid="header-signup">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
