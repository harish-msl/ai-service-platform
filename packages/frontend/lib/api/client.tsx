"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // Increased to 120s (2 minutes) for AI operations (Ollama can be slow)
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to safely get auth data from cookies
const getAuthData = () => {
  try {
    const accessToken = Cookies.get("auth_access_token");
    const refreshToken = Cookies.get("auth_refresh_token");
    const user = Cookies.get("auth_user");

    if (accessToken) {
      return {
        accessToken,
        refreshToken: refreshToken || null,
        user: user ? JSON.parse(user) : null,
      };
    }
  } catch (error) {
    console.error("Failed to get auth data from cookies:", error);
  }
  return null;
};

// Helper to save auth data to cookies
const saveAuthData = (data: any) => {
  try {
    if (data.accessToken) {
      Cookies.set("auth_access_token", data.accessToken, { expires: 7, sameSite: "lax" });
    }
    if (data.refreshToken) {
      Cookies.set("auth_refresh_token", data.refreshToken, { expires: 7, sameSite: "lax" });
    }
    if (data.user) {
      Cookies.set("auth_user", JSON.stringify(data.user), { expires: 7, sameSite: "lax" });
    }
  } catch (error) {
    console.error("Failed to save auth data to cookies:", error);
  }
};

// Helper to remove auth data from cookies
const removeAuthData = () => {
  try {
    Cookies.remove("auth_access_token");
    Cookies.remove("auth_refresh_token");
    Cookies.remove("auth_user");
  } catch (error) {
    console.error("Failed to remove auth data from cookies:", error);
  }
};

// Flag to track if interceptors are initialized
let interceptorsInitialized = false;

// Initialize interceptors - call this from a useEffect in a client component
export const initializeApiInterceptors = () => {
  if (interceptorsInitialized || typeof window === "undefined") {
    return;
  }

  interceptorsInitialized = true;

  // Request interceptor - add auth token from cookies
  api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const authData = getAuthData();
      if (authData?.accessToken) {
        config.headers.Authorization = `Bearer ${authData.accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const authData = getAuthData();
          if (!authData?.refreshToken) {
            throw new Error("No refresh token");
          }

          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: authData.refreshToken,
          });

          const { access_token, refresh_token } = response.data;

          // Update stored auth data in cookies
          saveAuthData({
            accessToken: access_token,
            refreshToken: refresh_token,
            user: authData.user,
          });

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          removeAuthData();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

export default api;
