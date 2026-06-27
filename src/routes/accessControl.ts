export type AccessUser = {
  user?: AccessUser;
  data?: AccessUser;
  username?: string;
  userID?: string;
  email?: string;
  name?: string;
  role?: any;
  Role?: any;
  roleName?: any;
  RoleName?: any;
  roles?: any[];
  isSuperAdmin?: boolean;
  IsSuperAdmin?: boolean;
  isSystemAdmin?: boolean;
  IsSystemAdmin?: boolean;
  superAdmin?: boolean;
  SuperAdmin?: boolean;
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
  "/landing",
  "/home",
]);

export const ROUTE_MODULE_MAP: Record<string, string[]> = {
  "/settings": ["settings", "system_settings", "user_access_management"],

  "/dashboard": ["it_operation_dashboard", "it_operations_dashboard", "it_operations", "operations_dashboard"],
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

  "/appmetering": ["app_metering", "application_metering"],
  "/app-metering": ["app_metering", "application_metering"],
  "/application-metering": ["app_metering", "application_metering"],

  "/app-restriction": ["app_restriction", "application_restriction", "app_web_restriction"],
  "/app-web-restriction": ["app_web_restriction", "web_restriction", "application_web_restriction"],
  "/web-restriction": ["app_web_restriction", "web_restriction", "application_web_restriction"],

  "/patch": ["patch_management", "patch", "online_patching"],
  "/patch-management": ["patch_management", "patch", "online_patching"],
  "/patch-inventory": ["patch_management", "patch", "online_patching"],

  "/task-list": ["task_list", "tasklist", "tasks"],
  "/tasklist": ["task_list", "tasklist", "tasks"],

  "/network": ["network", "network_management", "network_inventory"],
  "/network-metering": ["network", "network_management", "network_inventory"],
  "/network-inventory": ["network", "network_management", "network_inventory"],
  "/network-management": ["network", "network_management", "network_inventory"],

  "/users": ["users", "user_management", "user_access_management"],
  "/report": ["reports", "reporting", "dynamic_reporting"],
  "/reports": ["reports", "reporting", "dynamic_reporting"],

  "/management-dashboard": ["management_dashboard"],
  "/internet-metering": ["internet_metering", "web_metering", "internet_usage"],
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

const PRIVILEGED_ROLE_KEYS = new Set([
  "super_admin",
  "superadmin",
  "super_administrator",
  "system_admin",
  "sysadmin",
  "root",
]);

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
      payload.Role ||
      payload.roleName ||
      payload.RoleName ||
      payload.roles ||
      payload.allowedModules ||
      payload.allowedRoutes ||
      payload.moduleAccess ||
      payload.permissions
  );
}

function splitAccessText(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => splitAccessText(item));

  return String(value || "")
    .split(/[,|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function truthyAccessValue(value: any): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;

  if (typeof value === "number") return value > 0;

  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    return ["1", "true", "yes", "y", "view", "read", "allow", "allowed", "enabled", "active", "full", "manage"].includes(normalized);
  }

  if (typeof value === "object") {
    return Boolean(
      value.view ??
        value.read ??
        value.allow ??
        value.allowed ??
        value.enabled ??
        value.active ??
        value.access ??
        value.canView ??
        value.visible ??
        value.manage
    );
  }

  return false;
}

function getUserRoleKeys(user: AccessUser | null): string[] {
  const values: unknown[] = [];

  const pushRole = (value: any) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(pushRole);
      return;
    }

    if (typeof value === "object") {
      [
        value.role,
        value.Role,
        value.roleName,
        value.RoleName,
        value.name,
        value.Name,
        value.label,
        value.Label,
        value.code,
        value.Code,
      ].forEach(pushRole);
      return;
    }

    values.push(value);
  };

  pushRole(user?.roles);
  pushRole(user?.role);
  pushRole(user?.Role);
  pushRole(user?.roleName);
  pushRole(user?.RoleName);
  pushRole((user as any)?.userRole);
  pushRole((user as any)?.UserRole);
  pushRole((user as any)?.profile?.role);
  pushRole((user as any)?.profile?.roleName);

  return values.map(normalizeKey).filter(Boolean);
}

function isPrivilegedUser(user: AccessUser | null): boolean {
  if (!user) return false;

  if (
    user.isSuperAdmin === true ||
    user.IsSuperAdmin === true ||
    user.isSystemAdmin === true ||
    user.IsSystemAdmin === true ||
    user.superAdmin === true ||
    user.SuperAdmin === true ||
    user.moduleAccess?.__superAdmin === true ||
    user.moduleAccess?.["*"] === true
  ) {
    return true;
  }

  return getUserRoleKeys(user).some((roleKey) => PRIVILEGED_ROLE_KEYS.has(roleKey));
}

function routeMatches(allowedRoute: string, pathname: string): boolean {
  const allowed = cleanPath(allowedRoute);
  const current = cleanPath(pathname);

  if (!allowed || allowed === "*" || allowed === "/*") return true;
  return current === allowed || current.startsWith(allowed + "/");
}

export function getRouteModuleKeys(pathname: string): string[] {
  const current = cleanPath(pathname);
  const matched = Object.entries(ROUTE_MODULE_MAP)
    .filter(([route]) => current === route || current.startsWith(route + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0];

  return (matched?.[1] || []).map(normalizeKey).filter(Boolean);
}

function collectModuleKeys(user: AccessUser | null): Set<string> {
  const keys = new Set<string>();
  if (!user) return keys;

  splitAccessText(user.allowedModules).forEach((moduleKey) => keys.add(normalizeKey(moduleKey)));

  const moduleAccess = user.moduleAccess || user.permissions?.modules || {};
  Object.entries(moduleAccess).forEach(([moduleKey, accessValue]) => {
    if (truthyAccessValue(accessValue)) keys.add(normalizeKey(moduleKey));
  });

  return keys;
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

export function canViewPath(inputUser: AccessUser | null | undefined, pathname: string): boolean {
  const path = cleanPath(pathname);
  const user = extractUser(inputUser) || inputUser || getStoredAccessUser();

  if (PUBLIC_AUTH_PATHS.some((publicPath) => routeMatches(publicPath, path))) return true;
  if (LANDING_PATHS.has(path)) return true;

  if (!user) return false;

  // Super Admin always full access.
  if (isPrivilegedUser(user)) return true;

  const allowedRoutes = splitAccessText(user.allowedRoutes);
  if (allowedRoutes.some((allowedRoute) => allowedRoute === "*" || allowedRoute === "/*" || routeMatches(allowedRoute, path))) {
    return true;
  }

  const allowedModules = collectModuleKeys(user);
  if (allowedModules.has("*") || allowedModules.has("__superadmin") || allowedModules.has("__super_admin")) {
    return true;
  }

  const routeModules = getRouteModuleKeys(path);

  // Strict: unknown protected route blocked.
  if (!routeModules.length) return false;

  if (routeModules.some((moduleKey) => allowedModules.has(moduleKey))) return true;

  // Module not allowed by Module Control by Role = locked.
  return false;
}

export const canAccessPath = canViewPath;

export const DEFAULT_ACCESSIBLE_ROUTES = [
  "/management-dashboard",
  "/dashboard",
  "/service-desk",
  "/hardware",
  "/software",
  "/network-inventory",
  "/appmetering",
  "/internet-metering",
  "/app-restriction",
  "/web-restriction",
  "/patch-management",
  "/software-distribution",
  "/tasklist",
  "/report",
  "/settings",
];

export function getDefaultAccessiblePath(inputUser?: AccessUser | null, fallback = "/dashboard") {
  const user = extractUser(inputUser) || inputUser || getStoredAccessUser();

  if (isPrivilegedUser(user)) return "/dashboard";

  const firstAllowed = DEFAULT_ACCESSIBLE_ROUTES.find((route) => canViewPath(user, route));
  return firstAllowed || fallback;
}
