import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Home", id: "home" },
  { to: "/app", label: "Verify", id: "app" },
  { to: "/pricing", label: "Pricing", id: "pricing" },
  { to: "/about", label: "About", id: "about" },
  { to: "/faq", label: "FAQ", id: "faq" },
];

export default function Header({ dark = false }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close the phone menu whenever the page changes
  useEffect(() => { setOpen(false); }, [pathname]);

  const linkCls = "text-sm font-medium hover:opacity-80 transition-opacity";
  const activeCls = "opacity-100";
  const inactiveCls = "opacity-70";
  const textMain = dark ? "text-[#EEF1F6]" : "text-[#1B2340]";

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
          <span className={`font-display text-xl font-bold ${textMain}`}>TrueLense</span>
        </Link>

        {/* Desktop menu */}
        <nav className={`hidden md:flex items-center gap-8 ${textMain}`}>
          {NAV.map((n) => (
            <Link
              key={n.id}
              to={n.to}
              data-testid={`nav-${n.id}`}
              className={`${linkCls} ${pathname === n.to ? activeCls : inactiveCls}`}
            >
              {n.label}
            </Link>
          ))}
          {user && (
            <Link to="/dashboard" data-testid="nav-dashboard" className={`${linkCls} ${pathname === "/dashboard" ? activeCls : inactiveCls}`}>
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
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
              <Link to="/login" className={`hidden md:inline-block btn-pill text-sm ${dark ? "text-[#EEF1F6] hover:bg-white/10" : "text-[#1B2340] hover:bg-[#1B2340]/5"}`} data-testid="header-login">Login</Link>
              <Link to="/signup" className={`btn-pill text-sm ${dark ? "bg-[#EEF1F6] text-[#1B2340]" : "bg-[#1B2340] text-[#EEF1F6]"}`} data-testid="header-signup">Sign up</Link>
            </>
          )}

          {/* Phone menu button */}
          <button
            onClick={() => setOpen((v) => !v)}
            className={`md:hidden h-10 w-10 flex items-center justify-center rounded-full ${dark ? "text-[#EEF1F6] hover:bg-white/10" : "text-[#1B2340] hover:bg-[#1B2340]/5"}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            data-testid="mobile-menu-btn"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Phone menu panel */}
      {open && (
        <div
          className={`md:hidden border-t ${dark ? "bg-[#0F1428] text-[#EEF1F6]" : "bg-[#EEF1F6] text-[#1B2340]"}`}
          data-testid="mobile-menu"
        >
          <nav className="max-w-7xl mx-auto px-6 py-3 flex flex-col">
            {NAV.map((n) => (
              <Link
                key={n.id}
                to={n.to}
                data-testid={`mnav-${n.id}`}
                className={`py-3 text-base font-medium border-b last:border-b-0 ${dark ? "border-white/10" : "border-black/10"} ${pathname === n.to ? "opacity-100" : "opacity-75"}`}
              >
                {n.label}
              </Link>
            ))}
            {user ? (
              <Link to="/dashboard" data-testid="mnav-dashboard" className={`py-3 text-base font-medium border-t ${dark ? "border-white/10" : "border-black/10"}`}>
                Dashboard
              </Link>
            ) : (
              <Link to="/login" data-testid="mnav-login" className={`py-3 text-base font-medium border-t ${dark ? "border-white/10" : "border-black/10"}`}>
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
