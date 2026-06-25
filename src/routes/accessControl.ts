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
  "system_admin",
  "sysadmin",
  "administrator",
  "admin",
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
      payload.roleName ||
      payload.roles ||
      payload.allowedModules ||
      payload.allowedRoutes ||
      payload.moduleAccess ||
      payload.permissions
  );
}

function splitAccessText(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitAccessText(item));
  }

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
  return [
    ...splitAccessText(user?.roles),
    ...splitAccessText(user?.roleName),
    ...splitAccessText(user?.role),
  ].map(normalizeKey);
}

function isPrivilegedUser(user: AccessUser | null): boolean {
  if (!user) return false;
  if (user.isSuperAdmin || user.isSystemAdmin) return true;
  return getUserRoleKeys(user).some((role) => PRIVILEGED_ROLE_KEYS.has(role));
}

function routeMatches(allowedRoute: string, pathname: string): boolean {
  const allowed = cleanPath(allowedRoute);
  const current = cleanPath(pathname);

  if (!allowed || allowed === "*" || allowed === "/*") return true;
  return current === allowed || current.startsWith(`${allowed}/`);
}

export function getRouteModuleKeys(pathname: string): string[] {
  const current = cleanPath(pathname);
  const matched = Object.entries(ROUTE_MODULE_MAP)
    .filter(([route]) => current === route || current.startsWith(`${route}/`))
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

function hasExplicitAccessConfig(user: AccessUser | null): boolean {
  if (!user) return false;
  return Boolean(
    splitAccessText(user.allowedModules).length ||
      splitAccessText(user.allowedRoutes).length ||
      Object.keys(user.moduleAccess || {}).length ||
      Object.keys(user.permissions?.modules || {}).length
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

export function canViewPath(inputUser: AccessUser | null | undefined, pathname: string): boolean {
  const path = cleanPath(pathname);
  const user = extractUser(inputUser) || inputUser || getStoredAccessUser();

  if (PUBLIC_AUTH_PATHS.some((publicPath) => routeMatches(publicPath, path))) return true;
  if (LANDING_PATHS.has(path)) return true;
  if (isPrivilegedUser(user)) return true;

  const allowedRoutes = splitAccessText(user?.allowedRoutes);
  if (allowedRoutes.some((allowedRoute) => routeMatches(allowedRoute, path))) return true;

  const routeModules = getRouteModuleKeys(path);
  if (!routeModules.length) return true;

  const allowedModules = collectModuleKeys(user);
  if (routeModules.some((moduleKey) => allowedModules.has(moduleKey))) return true;

  // Older API payloads do not always include module ACL fields. Do not lock the UI
  // unless the backend has actually supplied an explicit access config.
  return !hasExplicitAccessConfig(user);
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

  const firstAllowed = DEFAULT_ACCESSIBLE_ROUTES.find((route) => canViewPath(user, route));
  return firstAllowed || fallback;
}


function firstValue(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function roleIdOf(row: any) {
  return String(firstValue(row, ["RoleID", "roleID", "RoleId", "roleId", "id"])).trim();
}

function roleNameOf(row: any) {
  return String(firstValue(row, ["RoleName", "roleName", "name", "Name", "role", "Role"])).trim();
}

function moduleIdOf(row: any) {
  return String(firstValue(row, ["ModuleID", "moduleID", "ModuleId", "moduleId", "id"])).trim();
}

function moduleNameOf(row: any) {
  return String(firstValue(row, ["ModuleName", "moduleName", "name", "Name", "label", "Label"])).trim();
}

function moduleKeyOf(row: any) {
  return String(firstValue(row, ["ModuleKey", "moduleKey", "key", "Key"])).trim();
}

function moduleRouteOf(row: any) {
  const explicitRoute = String(firstValue(row, ["RoutePath", "routePath", "path", "Path", "url", "Url"])).trim();

  if (explicitRoute) {
    return explicitRoute.startsWith("/") ? explicitRoute : `/${explicitRoute.replace(/^\/+/, "")}`;
  }

  const label = `${moduleKeyOf(row)} ${moduleNameOf(row)}`;
  const normalized = normalizeKey(label);

  if (normalized.includes("management_dashboard")) return "/management-dashboard";
  if (normalized.includes("it_operation_dashboard") || normalized.includes("it_operations_dashboard") || normalized.includes("operations_dashboard")) return "/dashboard";
  if (normalized.includes("service_desk") || normalized.includes("incident") || normalized.includes("ticket")) return "/service-desk";
  if (normalized.includes("hardware")) return "/hardware";
  if (normalized.includes("software_inventory")) return "/software";
  if (normalized === "software" || normalized.includes("software_asset")) return "/software";
  if (normalized.includes("network")) return "/network-inventory";
  if (normalized.includes("app_metering") || normalized.includes("application_metering")) return "/appmetering";
  if (normalized.includes("internet_metering") || normalized.includes("web_metering")) return "/internet-metering";
  if (normalized.includes("app_restriction") || normalized.includes("application_restriction")) return "/app-restriction";
  if (normalized.includes("web_restriction")) return "/web-restriction";
  if (normalized.includes("patch")) return "/patch-management";
  if (normalized.includes("software_distribution")) return "/software-distribution";
  if (normalized.includes("task")) return "/tasklist";
  if (normalized.includes("report")) return "/report";
  if (normalized.includes("setting") || normalized.includes("user_access")) return "/settings";

  return "";
}

function userRoleIds(user: AccessUser | null) {
  return splitAccessText([
    (user as any)?.roleID,
    (user as any)?.RoleID,
    (user as any)?.roleId,
    (user as any)?.RoleId,
  ]).map(String).filter(Boolean);
}

function userRoleNames(user: AccessUser | null) {
  return [
    ...splitAccessText((user as any)?.roles),
    ...splitAccessText((user as any)?.roleName),
    ...splitAccessText((user as any)?.role),
  ].map(normalizeKey);
}

function payloadArray(payload: any, key: string) {
  const data = payload?.data || payload || {};
  const direct = data?.[key] || payload?.[key];

  if (Array.isArray(direct)) return direct;

  if (key === "permissions") {
    return (
      data?.rolePermissions ||
      data?.modulePermissions ||
      data?.RoleModulePermissions ||
      payload?.rolePermissions ||
      payload?.modulePermissions ||
      []
    );
  }

  return [];
}

export function applyRoleModuleAccessToUser(inputUser: AccessUser, moduleAccessPayload: any): AccessUser {
  const user = extractUser(inputUser) || inputUser;
  const roles = payloadArray(moduleAccessPayload, "roles");
  const modules = payloadArray(moduleAccessPayload, "modules");
  const permissions = payloadArray(moduleAccessPayload, "permissions");

  const roleIdsFromUser = new Set(userRoleIds(user));
  const roleNamesFromUser = new Set(userRoleNames(user));

  const matchedRoleIds = new Set<string>();

  roles.forEach((role: any) => {
    const roleId = roleIdOf(role);
    const roleName = normalizeKey(roleNameOf(role));

    if ((roleId && roleIdsFromUser.has(roleId)) || (roleName && roleNamesFromUser.has(roleName))) {
      matchedRoleIds.add(roleId);
    }
  });

  // If backend does not return role rows, permissions may still use direct role name/id.
  roleIdsFromUser.forEach((id) => matchedRoleIds.add(id));

  const allowedModuleIds = new Set<string>();

  permissions.forEach((permission: any) => {
    const permissionRoleId = String(firstValue(permission, ["RoleID", "roleID", "RoleId", "roleId"])).trim();
    const permissionRoleName = normalizeKey(firstValue(permission, ["RoleName", "roleName", "role", "Role"]));
    const canView = truthyAccessValue(
      permission?.CanView ??
      permission?.canView ??
      permission?.View ??
      permission?.view ??
      permission?.Allowed ??
      permission?.allowed ??
      permission?.IsAllowed ??
      permission?.isAllowed
    );

    const roleMatched =
      (permissionRoleId && matchedRoleIds.has(permissionRoleId)) ||
      (permissionRoleName && roleNamesFromUser.has(permissionRoleName));

    if (roleMatched && canView) {
      const moduleId = String(firstValue(permission, ["ModuleID", "moduleID", "ModuleId", "moduleId"])).trim();
      if (moduleId) allowedModuleIds.add(moduleId);
    }
  });

  const moduleAccess: Record<string, boolean> = {};
  const allowedRoutes = new Set(splitAccessText(user.allowedRoutes));
  const allowedModules = new Set(splitAccessText(user.allowedModules).map(normalizeKey).filter(Boolean));

  modules.forEach((moduleRow: any) => {
    const moduleId = moduleIdOf(moduleRow);
    if (!moduleId || !allowedModuleIds.has(moduleId)) return;

    const rawKeys = [
      moduleKeyOf(moduleRow),
      moduleNameOf(moduleRow),
    ].filter(Boolean);

    rawKeys.forEach((key) => {
      const normalized = normalizeKey(key);
      if (normalized) {
        moduleAccess[normalized] = true;
        allowedModules.add(normalized);
      }
    });

    const route = moduleRouteOf(moduleRow);

    if (route) {
      allowedRoutes.add(route);
      getRouteModuleKeys(route).forEach((key) => {
        moduleAccess[key] = true;
        allowedModules.add(key);
      });
    }
  });

  return {
    ...user,
    allowedRoutes: Array.from(allowedRoutes),
    allowedModules: Array.from(allowedModules),
    moduleAccess: {
      ...(user.moduleAccess || {}),
      ...moduleAccess,
    },
    hasModuleAccessConfig: true,
  };
}
