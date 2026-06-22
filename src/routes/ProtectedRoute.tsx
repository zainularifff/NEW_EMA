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
const runtimeOrigin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";
const API_BASE = (VITE_ENV.VITE_API_BASE_URL || VITE_ENV.VITE_API_URL || runtimeOrigin).replace(/\/+$/, "");

const TOKEN_KEYS = [
  "token",
  "accessToken",
  "authToken",
  "emaToken",
  "ema-token",
  "ema_auth_token",
  "ema-auth-token",
  "ema_access_token",
  "ema-access-token",
  "jwt",
];

const USER_KEYS = [
  "user",
  "authUser",
  "currentUser",
  "emaUser",
  "ema-user",
  "loggedInUser",
  "userData",
  "auth",
  "authData",
  "emaAuth",
  "ema-auth",
  "ema-current-user",
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

function removeStorageValue(key: string) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

function clearStoredAuth() {
  [...TOKEN_KEYS, ...USER_KEYS].forEach(removeStorageValue);
}

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  const exp = Number(payload?.exp);

  if (!Number.isFinite(exp) || exp <= 0) return false;

  return exp * 1000 <= Date.now() + 30_000;
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
      payload.data?.authToken ||
      payload.user?.token ||
      payload.user?.accessToken ||
      payload.user?.authToken ||
      payload.data?.user?.token ||
      payload.data?.user?.accessToken ||
      payload.data?.user?.authToken ||
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

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const token = useMemo(() => getStoredToken(), [location.pathname]);
  const [user, setUser] = useState<AccessUser | null>(() => getStoredAccessUser());
  const [, setLoading] = useState(Boolean(token));
  const [authFailed, setAuthFailed] = useState(false);
  const path = cleanPath(location.pathname);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      setAuthFailed(false);

      if (!token) {
        clearStoredAuth();
        setUser(null);
        setLoading(false);
        return;
      }

      if (isTokenExpired(token)) {
        clearStoredAuth();
        setUser(null);
        setAuthFailed(true);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          clearStoredAuth();
          if (!cancelled) {
            setUser(null);
            setAuthFailed(true);
          }
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
