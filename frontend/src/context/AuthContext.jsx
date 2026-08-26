import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, clearToken, saveToken } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip /me check if returning from Emergent OAuth callback
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveToken(data.token);
    await refresh();
    return data;
  };
  const signup = async (email, password, name) => {
    const { data } = await api.post("/auth/signup", { email, password, name });
    saveToken(data.token);
    await refresh();
    return data;
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    clearToken();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, refresh, login, signup, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
