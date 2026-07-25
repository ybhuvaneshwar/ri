import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nk_user") || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("nk_token", data.token);
    localStorage.setItem("nk_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("nk_token");
    localStorage.removeItem("nk_user");
    setUser(null);
    window.location.href = "/login";
  };

  useEffect(() => {
    const t = localStorage.getItem("nk_token");
    if (t && !user) {
      setLoading(true);
      api.get("/auth/me").then(({ data }) => {
        setUser(data);
        localStorage.setItem("nk_user", JSON.stringify(data));
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, []); // eslint-disable-line

  return <AuthCtx.Provider value={{ user, login, logout, loading }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
