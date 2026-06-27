import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import {
  canViewPath,
  cleanPath,
  extractUser,
  getDefaultAccessiblePath,
  getRouteModuleKeys,
  getStoredAccessUser,
  PUBLIC_AUTH_PATHS,
  saveAccessUser,
  type AccessUser,
} from "./accessControl";

import {
  clearSessionActivity,
  getIdleTimeoutConfigFromAccessControls,
  getLastActivityHeader,
  isIdleTimedOut,
  touchSessionActivity,
  type IdleTimeoutConfig,
} from "../utils/sessionActivity";

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
  clearSessionActivity();
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

async function loadIdleTimeoutConfig(token: string): Promise<IdleTimeoutConfig> {
  try {
    const response = await fetch(`${API_BASE}/api/settings/access-controls`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EMA-Last-Activity-At": getLastActivityHeader(),
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return { enabled: false, timeoutMinutes: 30 };
    }

    const payload = await response.json().catch(() => null);
    return getIdleTimeoutConfigFromAccessControls(payload);
  } catch {
    return { enabled: false, timeoutMinutes: 30 };
  }
}

function mergeFreshUserWithStoredAccess(freshUser: AccessUser, storedUser: AccessUser | null): AccessUser {
  const freshAllowedModules = Array.isArray(freshUser.allowedModules) && freshUser.allowedModules.length
    ? freshUser.allowedModules
    : undefined;

  const freshAllowedRoutes = Array.isArray(freshUser.allowedRoutes) && freshUser.allowedRoutes.length
    ? freshUser.allowedRoutes
    : undefined;

  const freshModuleAccess = freshUser.moduleAccess && Object.keys(freshUser.moduleAccess).length
    ? freshUser.moduleAccess
    : undefined;

  const freshPermissions = freshUser.permissions && Object.keys(freshUser.permissions).length
    ? freshUser.permissions
    : undefined;

  return {
    ...freshUser,
    allowedModules: freshAllowedModules || storedUser?.allowedModules || [],
    allowedRoutes: freshAllowedRoutes || storedUser?.allowedRoutes || [],
    moduleAccess: freshModuleAccess || storedUser?.moduleAccess || {},
    permissions: freshPermissions || storedUser?.permissions || {},
    hasModuleAccessConfig:
      freshUser.hasModuleAccessConfig ??
      storedUser?.hasModuleAccessConfig ??
      Boolean(freshAllowedModules || freshAllowedRoutes || freshModuleAccess || storedUser?.allowedModules?.length || storedUser?.allowedRoutes?.length),
  };
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const token = useMemo(() => getStoredToken(), [location.pathname]);
  const [user, setUser] = useState<AccessUser | null>(() => getStoredAccessUser());
  const [loading, setLoading] = useState(Boolean(token));
  const [authFailed, setAuthFailed] = useState(false);
  const [idleConfig, setIdleConfig] = useState<IdleTimeoutConfig>({ enabled: false, timeoutMinutes: 30 });
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
          headers: {
            Authorization: `Bearer ${token}`,
            "X-EMA-Last-Activity-At": getLastActivityHeader(),
          },
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
          const storedUser = getStoredAccessUser();
          const mergedUser = mergeFreshUserWithStoredAccess(nextUser, storedUser);
          saveAccessUser(mergedUser);
          setUser(mergedUser);
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

  useEffect(() => {
    let cancelled = false;

    async function loadIdleConfig() {
      if (!token || PUBLIC_AUTH_PATHS.includes(path)) {
        setIdleConfig({ enabled: false, timeoutMinutes: 30 });
        return;
      }

      const config = await loadIdleTimeoutConfig(token);
      if (!cancelled) setIdleConfig(config);
    }

    void loadIdleConfig();

    return () => {
      cancelled = true;
    };
  }, [token, path]);

  useEffect(() => {
    if (!token || PUBLIC_AUTH_PATHS.includes(path)) return undefined;

    touchSessionActivity(true);

    const markActivity = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      touchSessionActivity();
    };

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousedown",
      "mousemove",
      "scroll",
      "touchstart",
      "wheel",
    ];

    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    const handleVisibility = () => {
      if (!document.hidden) markActivity();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    const interval = window.setInterval(() => {
      if (!idleConfig.enabled) return;
      if (!isIdleTimedOut(idleConfig.timeoutMinutes)) return;

      clearStoredAuth();
      setUser(null);
      setAuthFailed(true);
      window.location.href = "/login?reason=idle";
    }, 15000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(interval);
    };
  }, [token, path, idleConfig.enabled, idleConfig.timeoutMinutes]);

  if (PUBLIC_AUTH_PATHS.includes(path)) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "#0f2746", fontWeight: 800 }}>
        Please wait while we verify your access...
      </div>
    );
  }

  if (!token || authFailed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canViewPath(user, path)) {
    const redirectTo = getDefaultAccessiblePath(user, "");

    if (redirectTo && cleanPath(redirectTo) !== path) {
      return (
        <Navigate
          to={redirectTo}
          replace
          state={{
            accessDenied: true,
            deniedPath: path,
            deniedModules: getRouteModuleKeys(path),
          }}
        />
      );
    }

    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, color: "#0f2746" }}>
        <div style={{ maxWidth: 520, padding: 24, borderRadius: 18, background: "#ffffff", border: "1px solid #cbd5e1", boxShadow: "0 18px 48px rgba(15, 23, 42, 0.12)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Access denied</h2>
          <p style={{ margin: 0, color: "#64748b" }}>
            Your account does not have permission to access this module. Please contact the system administrator.
          </p>
        </div>
      </div>
    );
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}
