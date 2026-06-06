export type AccessUser = {
  user?: AccessUser;
  data?: AccessUser;
  username?: string;
  userID?: string;
  email?: string;
  name?: string;
  role?: string;
  roleName?: string;
  roles?: string[];
  isSuperAdmin?: boolean;
  isSystemAdmin?: boolean;
  allowedModules?: string[];
  allowedRoutes?: string[];
  moduleAccess?: Record<string, any>;
  permissions?: {
    modules?: Record<string, any>;
    [key: string]: any;
  };
  [key: string]: any;
};

export const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

export const LANDING_PATHS = new Set([
  "/",
  "/dashboard",
  "/landing",
  "/home",
]);

export const ROUTE_MODULE_MAP: Record<string, string[]> = {
  "/settings": ["settings", "system_settings", "user_access_management"],

  "/dashboard": [],
  "/landing": [],

  "/service-desk": ["service_desk", "incidents", "tickets"],
  "/incidents": ["service_desk", "incidents", "tickets"],
  "/tickets": ["service_desk", "incidents", "tickets"],

  "/hardware": ["hardware_inventory", "hardware", "asset_inventory", "endpoint_asset_inventory"],
  "/ema/hardware": ["hardware_inventory", "hardware", "asset_inventory", "endpoint_asset_inventory"],
  "/hardware-inventory": ["hardware_inventory", "hardware", "asset_inventory", "endpoint_asset_inventory"],

  "/software": ["software_inventory", "software"],
  "/software-inventory": ["software_inventory", "software"],

  "/software-distribution": ["software_distribution"],

  "/app-metering": ["app_metering", "application_metering"],
  "/application-metering": ["app_metering", "application_metering"],

  "/app-web-restriction": ["app_web_restriction", "web_restriction", "application_web_restriction"],
  "/web-restriction": ["app_web_restriction", "web_restriction", "application_web_restriction"],

  "/patch": ["patch_management", "patch", "online_patching"],
  "/patch-management": ["patch_management", "patch", "online_patching"],
  "/patch-inventory": ["patch_management", "patch", "online_patching"],

  "/task-list": ["task_list", "tasklist", "tasks"],
  "/tasklist": ["task_list", "tasklist", "tasks"],

  "/network": ["network", "network_management"],
  "/network-management": ["network", "network_management"],

  "/users": ["users", "user_management", "user_access_management"],
  "/reports": ["reports", "reporting"],

  "/geolocation": ["geolocation", "geo_location"],
};

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

export function normalizeKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function cleanPath(pathname: string): string {
  return pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
}

export function safeParseJson(value: string): any | null {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getStorageValue(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) || sessionStorage.getItem(key) || "";
}

function looksLikeUser(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;

  return Boolean(
    payload.username ||
      payload.userID ||
      payload.email ||
      payload.role ||
      payload.roleName ||
      payload.roles ||
      payload.allowedModules ||
      payload.allowedRoutes ||
      payload.moduleAccess ||
      payload.permissions
  );
}

export function extractUser(payload: any): AccessUser | null {
  if (!payload || typeof payload !== "object") return null;

  if (payload.data?.user && typeof payload.data.user === "object") return payload.data.user;
  if (payload.user && typeof payload.user === "object") return payload.user;
  if (payload.data && typeof payload.data === "object" && looksLikeUser(payload.data)) return payload.data;
  if (looksLikeUser(payload)) return payload;

  return null;
}

export function getStoredAccessUser(): AccessUser | null {
  for (const key of USER_KEYS) {
    const raw = getStorageValue(key);
    if (!raw) continue;

    const parsed = safeParseJson(raw);
    const user = extractUser(parsed);
    if (user) return user;
  }

  return null;
}

export function saveAccessUser(user: AccessUser) {
  try {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("currentUser", JSON.stringify(user));
  } catch {
    // Ignore storage errors.
  }
}

export function getRoles(user: AccessUser | null): string[] {
  if (!user) return [];

  return [
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.role || "",
    user.roleName || "",
  ]
    .map((role) => String(role || "").trim())
    .filter(Boolean);
}

export function isSuperAdmin(user: AccessUser | null): boolean {
  if (!user) return false;

  const roles = getRoles(user).map(normalizeKey);
  const username = normalizeKey(user.username || user.userID || user.email || user.name);
  const allowedModules = Array.isArray(user.allowedModules) ? user.allowedModules : [];
  const allowedRoutes = Array.isArray(user.allowedRoutes) ? user.allowedRoutes : [];

  return (
    Boolean(user.isSuperAdmin) ||
    Boolean(user.isSystemAdmin) ||
    allowedModules.includes("*") ||
    allowedRoutes.includes("*") ||
    Boolean(user.moduleAccess?.["*"]?.view) ||
    Boolean(user.permissions?.modules?.["*"]?.view) ||
    username === "superadmin" ||
    roles.includes("super_admin") ||
    roles.includes("superadmin") ||
    roles.includes("system_administrator") ||
    roles.includes("system_admin") ||
    roles.includes("system_manager") ||
    roles.includes("administrator") ||
    roles.includes("admin")
  );
}

export function getRouteModuleKeys(pathname: string): string[] {
  const path = cleanPath(pathname);

  if (LANDING_PATHS.has(path)) {
    return [];
  }

  if (ROUTE_MODULE_MAP[path]) {
    return ROUTE_MODULE_MAP[path].map(normalizeKey);
  }

  const matchedRoute = Object.keys(ROUTE_MODULE_MAP)
    .filter((route) => route !== "/" && path.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (matchedRoute) {
    return ROUTE_MODULE_MAP[matchedRoute].map(normalizeKey);
  }

  const firstSegment = path.split("/").filter(Boolean)[0];
  return firstSegment ? [normalizeKey(firstSegment)] : [];
}

function routeMatchesAllowedRoute(pathname: string, allowedRoutes: string[]) {
  const path = cleanPath(pathname).toLowerCase();

  return allowedRoutes.some((route) => {
    const allowed = String(route || "").trim().toLowerCase().replace(/\/+$/, "") || "/";
    if (!allowed || allowed === "*") return true;
    return path === allowed || path.startsWith(`${allowed}/`);
  });
}

export function canViewPath(user: AccessUser | null, pathname: string): boolean {
  const path = cleanPath(pathname);

  if (LANDING_PATHS.has(path)) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  const moduleKeys = getRouteModuleKeys(path);
  if (moduleKeys.length === 0) {
    return true;
  }

  const allowedModules = Array.isArray(user.allowedModules)
    ? user.allowedModules.map(normalizeKey)
    : [];

  const allowedRoutes = Array.isArray(user.allowedRoutes)
    ? user.allowedRoutes.map((route) => String(route || "").trim())
    : [];

  const moduleAccess = user.moduleAccess || user.permissions?.modules || {};

  if (allowedModules.includes("*") || allowedRoutes.includes("*")) {
    return true;
  }

  if (routeMatchesAllowedRoute(path, allowedRoutes)) {
    return true;
  }

  return moduleKeys.some((key) => {
    return (
      allowedModules.includes(key) ||
      Boolean(moduleAccess?.[key]?.view) ||
      moduleAccess?.[key] === true
    );
  });
}
