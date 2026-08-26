import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/login");
      return;
    }
    const sessionId = m[1];
    (async () => {
      try {
        await api.post("/auth/emergent/session", { session_id: sessionId });
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { replace: true });
      } catch (err) {
        toast.error("Google login failed");
        navigate("/login", { replace: true });
      }
    })();
  }, [location.hash, navigate]);

  return (
    <div className="min-h-screen bg-[#1B2340] flex items-center justify-center text-[#EEF1F6]">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin mx-auto" />
        <p className="mt-4 opacity-70">Finishing your sign in…</p>
      </div>
    </div>
  );
}
