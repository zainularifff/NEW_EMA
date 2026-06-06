import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import {
  canViewPath,
  cleanPath,
  extractUser,
  getRouteModuleKeys,
  getStoredAccessUser,
  PUBLIC_AUTH_PATHS,
  saveAccessUser,
  type AccessUser,
} from "./accessControl";

type ProtectedRouteProps = {
  children?: React.ReactNode;
};

const VITE_ENV = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {});
const API_BASE = (VITE_ENV.VITE_API_BASE_URL || VITE_ENV.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

const TOKEN_KEYS = [
  "token",
  "accessToken",
  "authToken",
  "emaToken",
  "ema_access_token",
  "ema-access-token",
];

const USER_KEYS = [
  "user",
  "authUser",
  "currentUser",
  "emaUser",
  "loggedInUser",
  "userData",
  "auth",
  "authData",
  "emaAuth",
  "ema-auth",
];

function safeParseJson(value: string): any | null {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getStorageValue(key: string): string {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || "";
}

function extractToken(payload: any): string {
  if (!payload || typeof payload !== "object") return "";

  return String(
    payload.token ||
      payload.accessToken ||
      payload.authToken ||
      payload.emaToken ||
      payload.data?.token ||
      payload.data?.accessToken ||
      payload.user?.token ||
      payload.data?.user?.token ||
      ""
  );
}

function getStoredToken(): string {
  for (const key of TOKEN_KEYS) {
    const raw = getStorageValue(key);
    if (!raw) continue;

    const parsed = safeParseJson(raw);
    const tokenFromJson = extractToken(parsed);
    return tokenFromJson || raw;
  }

  for (const key of USER_KEYS) {
    const raw = getStorageValue(key);
    if (!raw) continue;

    const parsed = safeParseJson(raw);
    const tokenFromJson = extractToken(parsed);
    if (tokenFromJson) return tokenFromJson;
  }

  return "";
}

function LoadingAccess() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#edf5ff",
        color: "#14315f",
        fontSize: 14,
        fontWeight: 800,
        fontFamily:
          'Aptos, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      Loading access profile...
    </div>
  );
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const token = useMemo(() => getStoredToken(), [location.pathname]);
  const [user, setUser] = useState<AccessUser | null>(() => getStoredAccessUser());
  const [loading, setLoading] = useState(Boolean(token));
  const [authFailed, setAuthFailed] = useState(false);
  const path = cleanPath(location.pathname);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) setAuthFailed(true);
          return;
        }

        if (!response.ok) return;

        const payload = await response.json().catch(() => null);
        const nextUser = extractUser(payload);

        if (nextUser && !cancelled) {
          saveAccessUser(nextUser);
          setUser(nextUser);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [token, location.pathname]);

  if (PUBLIC_AUTH_PATHS.includes(path)) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (!token || authFailed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading && !user) {
    return <LoadingAccess />;
  }

  if (!canViewPath(user, path)) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{
          accessDenied: true,
          deniedPath: path,
          deniedModules: getRouteModuleKeys(path),
        }}
      />
    );
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}
