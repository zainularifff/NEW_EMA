import {
  Activity,
  BarChart3,
  Box,
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  Globe2,
  HardDrive,
  Headset,
  LayoutDashboard,
  LogOut,
  Monitor,
  Network,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { canViewPath, getStoredAccessUser, type AccessUser } from "../../routes/accessControl";

type NavItem = {
  label: string;
  path: string;
  icon: typeof Gauge;
  comingSoon?: boolean;
};

type NavSection = {
  title: string;
  icon: typeof Gauge;
  items: NavItem[];
  collapsible?: boolean;
};

const navSections: NavSection[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    collapsible: true,
    items: [
      { label: "IT Operation Dashboard", path: "/dashboard", icon: Gauge },
      { label: "Management Dashboard", path: "/management-dashboard", icon: BarChart3 },
    ],
  },
  {
    title: "Module",
    icon: Boxes,
    collapsible: true,
    items: [
      { label: "Hardware Inventory", path: "/hardware", icon: HardDrive },
      { label: "Software Inventory", path: "/software", icon: Monitor },
      { label: "Network Inventory", path: "/network-inventory", icon: Network },
      { label: "App Metering", path: "/appmetering", icon: Activity },
      { label: "Internet Metering", path: "/internet-metering", icon: Globe2 },
      { label: "App Restriction", path: "/app-restriction", icon: ShieldOff },
      { label: "Web Restriction", path: "/web-restriction", icon: Globe2 },
      { label: "Patch Management", path: "/patch-management", icon: ShieldCheck },
      { label: "Software Distribution", path: "/software-distribution", icon: PackageCheck },
      { label: "Task List", path: "/tasklist", icon: ClipboardList },
    ],
  },
  {
    title: "Report",
    icon: FileText,
    items: [{ label: "Report", path: "/report", icon: FileText }],
  },
  {
    title: "Service Desk",
    icon: Headset,
    items: [{ label: "Service Desk", path: "/service-desk", icon: Headset }],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [{ label: "Settings", path: "/settings", icon: Settings }],
  },
];

function isRouteActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

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
  const location = useLocation();
  const { logout, user } = useAuth();
  const accessUser = mergeAccessUser(user);

  const activeSectionTitle = useMemo(() => {
    const activeSection = navSections.find((section) =>
      section.items.some((item) => isRouteActive(location.pathname, item.path))
    );

    return activeSection?.title || "Dashboard";
  }, [location.pathname]);

  const [openSection, setOpenSection] = useState<string>(activeSectionTitle);

  useEffect(() => {
    const activeSection = navSections.find((section) =>
      section.collapsible && section.items.some((item) => isRouteActive(location.pathname, item.path))
    );

    if (activeSection) {
      setOpenSection(activeSection.title);
    }
  }, [location.pathname]);

  const toggleSection = (sectionTitle: string) => {
    setOpenSection((current) => (current === sectionTitle ? "" : sectionTitle));
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName = getDisplayName(accessUser);
  const roleLabel = getSidebarRoleLabel(accessUser);
  const fullRoleLabel = getUserRoles(accessUser).join(" • ") || roleLabel;

  return (
    <>
      <style>{`
        .ema-sidebar-scrollless {
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .ema-sidebar-scrollless::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
      `}</style>

      <aside
        className="ema-sidebar ema-sidebar-scrollless"
        style={{ overscrollBehavior: "contain" }}
      >
      <div className="ema-sidebar-brand">
        <div className="ema-logo">
          <Box size={23} />
        </div>

        <div>
          <div className="ema-sidebar-title">EMA System</div>
          <div className="ema-sidebar-subtitle">Operations Console</div>
        </div>
      </div>

      <div className="ema-sidebar-section">Main Category</div>

      <nav className="ema-nav">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = openSection === section.title;
          const hasActiveItem = section.items.some((item) => isRouteActive(location.pathname, item.path));

          if (!section.collapsible) {
            const item = section.items[0];
            const Icon = item.icon;
            const hasAccess = canViewPath(accessUser, item.path);
            const isDisabled = item.comingSoon || !hasAccess;
            const isActive = isRouteActive(location.pathname, item.path);

            if (isDisabled) {
              return (
                <div
                  key={section.title}
                  className="ema-nav-link opacity-50"
                  title={item.comingSoon ? "Coming soon" : "Access restricted"}
                >
                  <Icon size={17} />
                  <span className="flex-grow-1">{section.title}</span>
                  <span className="ema-nav-soon">{item.comingSoon ? "Soon" : "Locked"}</span>
                </div>
              );
            }

            return (
              <NavLink
                key={section.title}
                to={item.path}
                className={`ema-nav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={17} />
                <span>{section.title}</span>
              </NavLink>
            );
          }

          return (
            <div key={section.title} className="d-grid gap-1">
              <button
                type="button"
                className={`ema-nav-link w-100 border-0 ${hasActiveItem && !isOpen ? "active" : ""}`}
                style={!hasActiveItem || isOpen ? { background: "transparent" } : undefined}
                onClick={() => toggleSection(section.title)}
                aria-expanded={isOpen}
                aria-controls={`sidebar-section-${section.title.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <SectionIcon size={17} />
                <span className="flex-grow-1 text-start">{section.title}</span>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {isOpen && (
                <div
                  id={`sidebar-section-${section.title.replace(/\s+/g, "-").toLowerCase()}`}
                  className="d-grid gap-1 ps-4 mb-1"
                >
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const hasAccess = canViewPath(accessUser, item.path);
                    const isDisabled = item.comingSoon || !hasAccess;
                    const isActive = isRouteActive(location.pathname, item.path);

                    if (isDisabled) {
                      return (
                        <div
                          key={item.path}
                          className="ema-nav-link opacity-50"
                          title={item.comingSoon ? "Coming soon" : "Access restricted"}
                        >
                          <Icon size={16} />
                          <span className="flex-grow-1">{item.label}</span>
                          <span className="ema-nav-soon">
                            {item.comingSoon ? "Soon" : "Locked"}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={`ema-nav-link ${isActive ? "active" : ""}`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
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
    </>
  );
}
