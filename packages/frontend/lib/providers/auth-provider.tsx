"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Cookies from "js-cookie";
import { initializeApiInterceptors } from "../api/client";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER" | "VIEWER";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Initialize from cookies on mount (client-side only)
  useEffect(() => {
    // Initialize API interceptors on client side only
    initializeApiInterceptors();

    try {
      const storedUser = Cookies.get("auth_user");
      const storedAccessToken = Cookies.get("auth_access_token");
      const storedRefreshToken = Cookies.get("auth_refresh_token");

      if (storedUser && storedAccessToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken || null);
      }
    } catch (error) {
      console.error("Failed to load auth state from cookies:", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  const setAuth = (newUser: User, newAccessToken: string, newRefreshToken: string) => {
    setUser(newUser);
    setIsAuthenticated(true);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);

    // Store in cookies (7 days expiry)
    Cookies.set("auth_user", JSON.stringify(newUser), { expires: 7, sameSite: "lax" });
    Cookies.set("auth_access_token", newAccessToken, { expires: 7, sameSite: "lax" });
    Cookies.set("auth_refresh_token", newRefreshToken, { expires: 7, sameSite: "lax" });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAccessToken(null);
    setRefreshToken(null);

    // Remove cookies
    Cookies.remove("auth_user");
    Cookies.remove("auth_access_token");
    Cookies.remove("auth_refresh_token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        accessToken,
        refreshToken,
        hydrated,
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
