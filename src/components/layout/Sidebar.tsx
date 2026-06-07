import {
  BarChart3,
  Box,
  Gauge,
  Laptop,
  LogOut,
  Monitor,
  Network,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { canViewPath, getStoredAccessUser, type AccessUser } from "../../routes/accessControl";

type NavItem = {
  label: string;
  path: string;
  icon: typeof Gauge;
  comingSoon?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge },
  { label: "Hardware", path: "/hardware", icon: Laptop },
  { label: "Software", path: "/software", icon: Monitor, comingSoon: true },
  { label: "Network", path: "/network", icon: Network, comingSoon: true },
  { label: "Users", path: "/users", icon: Users, comingSoon: true },
  { label: "Reports", path: "/reports", icon: BarChart3, comingSoon: true },
  { label: "Task List", path: "/tasklist", icon: Settings },
  { label: "Service Desk", path: "/service-desk", icon: Box },
  { label: "Settings", path: "/settings", icon: Settings },
];

function mergeAccessUser(contextUser: unknown): AccessUser | null {
  const storedUser = getStoredAccessUser();

  if (!contextUser || typeof contextUser !== "object") {
    return storedUser;
  }

  return {
    ...(storedUser || {}),
    ...(contextUser as AccessUser),
    roles: (contextUser as AccessUser).roles || storedUser?.roles,
    role: (contextUser as AccessUser).role || storedUser?.role,
    roleName: (contextUser as AccessUser).roleName || storedUser?.roleName,
    allowedModules: (contextUser as AccessUser).allowedModules || storedUser?.allowedModules,
    allowedRoutes: (contextUser as AccessUser).allowedRoutes || storedUser?.allowedRoutes,
    moduleAccess: (contextUser as AccessUser).moduleAccess || storedUser?.moduleAccess,
    permissions: (contextUser as AccessUser).permissions || storedUser?.permissions,
  };
}

function splitRoleText(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getUserRoles(user: AccessUser | null): string[] {
  const roles = [
    ...splitRoleText((user as any)?.roles),
    ...splitRoleText((user as any)?.roleName),
    ...splitRoleText((user as any)?.role),
  ];

  const seen = new Set<string>();
  return roles.filter((role) => {
    const key = role.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getDisplayName(user: AccessUser | null) {
  return (
    (user as any)?.name ||
    (user as any)?.fullName ||
    (user as any)?.username ||
    (user as any)?.userID ||
    "Current user"
  );
}

function getSidebarRoleLabel(user: AccessUser | null) {
  const roles = getUserRoles(user);

  if (roles.length === 0) return "User";
  if (roles.length === 1) return roles[0];
  if (roles.length === 2) return roles.join(" • ");

  return `${roles[0]} +${roles.length - 1}`;
}

export function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const accessUser = mergeAccessUser(user);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName = getDisplayName(accessUser);
  const roleLabel = getSidebarRoleLabel(accessUser);
  const fullRoleLabel = getUserRoles(accessUser).join(" • ") || roleLabel;

  return (
    <aside className="ema-sidebar">
      <div className="ema-sidebar-brand">
        <div className="ema-logo">
          <Box size={23} />
        </div>

        <div>
          <div className="ema-sidebar-title">EMA System</div>
          <div className="ema-sidebar-subtitle">Operations Console</div>
        </div>
      </div>

      <div className="ema-sidebar-section">Workspace</div>

      <nav className="ema-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const hasAccess = canViewPath(accessUser, item.path);
          const isDisabled = item.comingSoon || !hasAccess;

          if (isDisabled) {
            return (
              <div
                key={item.path}
                className="ema-nav-link opacity-50"
                title={item.comingSoon ? "Coming soon" : "Access restricted"}
              >
                <Icon size={17} />
                {item.label}
                <span className="ema-nav-soon">
                  {item.comingSoon ? "Soon" : "Locked"}
                </span>
              </div>
            );
          }

          return (
            <NavLink key={item.path} to={item.path} className="ema-nav-link">
              <Icon size={17} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="ema-sidebar-footer">
        <div className="ema-user-card" title={`${displayName} • ${fullRoleLabel}`}>
          <div className="ema-user-avatar">
            <ShieldCheck size={18} />
          </div>

          <div className="min-w-0">
            <div className="fw-bold text-white lh-sm text-truncate">
              {displayName}
            </div>
            <div className="small text-muted text-truncate ema-user-role-label">{roleLabel}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-light w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
