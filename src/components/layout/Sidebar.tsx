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
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { canViewPath, getStoredAccessUser, type AccessUser } from "../../routes/accessControl";

type IconType = typeof Gauge;

type NavItem = {
  label: string;
  path: string;
  icon: IconType;
  comingSoon?: boolean;
};

type NavSection = {
  title: string;
  icon: IconType;
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
  return pathname === path || pathname.startsWith(path + "/");
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

  return roles[0] + " +" + String(roles.length - 1);
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sidebarStyle: CSSProperties = {
  width: 224,
  minWidth: 224,
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "linear-gradient(180deg, #061b3d 0%, #031126 100%)",
  borderRight: "1px solid rgba(255,255,255,0.08)",
  color: "#ffffff",
  overflowY: "auto",
  overflowX: "hidden",
  scrollbarWidth: "none",
  padding: "18px 14px 14px",
  overscrollBehavior: "contain",
};

const brandStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 2px 18px",
  borderBottom: "1px solid rgba(255,255,255,0.11)",
};

const logoStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 13,
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, #3f7cff 0%, #6c3bff 100%)",
  boxShadow: "0 14px 30px rgba(74, 104, 255, 0.35)",
};

const brandTitleStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: "16px",
  fontWeight: 800,
  letterSpacing: "-0.02em",
  textTransform: "uppercase",
};

const brandSubtitleStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 9.5,
  lineHeight: "11px",
  fontWeight: 700,
  color: "rgba(226,232,240,0.76)",
  textTransform: "uppercase",
};

const sectionLabelStyle: CSSProperties = {
  margin: "20px 0 8px",
  padding: "0 2px",
  fontSize: 10,
  fontWeight: 800,
  color: "rgba(226,232,240,0.75)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const navStyle: CSSProperties = {
  display: "grid",
  gap: 7,
  flex: 1,
  alignContent: "start",
  paddingBottom: 14,
};

const subNavStyle: CSSProperties = {
  display: "grid",
  gap: 5,
  margin: "4px 0 4px 24px",
};

const footerStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: "auto",
  paddingTop: 10,
};

const userCardStyle: CSSProperties = {
  minHeight: 66,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 12px",
  borderRadius: 11,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const logoutButtonStyle: CSSProperties = {
  width: "100%",
  height: 43,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

function navButtonStyle(options: {
  active?: boolean;
  child?: boolean;
  disabled?: boolean;
  sectionOpen?: boolean;
}): CSSProperties {
  const active = Boolean(options.active);
  const child = Boolean(options.child);
  const disabled = Boolean(options.disabled);
  const sectionOpen = Boolean(options.sectionOpen);

  let background = "transparent";
  let color = "rgba(241,245,249,0.92)";
  let boxShadow = "none";
  let border = "1px solid transparent";

  if (active && !child) {
    background = "linear-gradient(135deg, #ff9d13 0%, #ff8100 100%)";
    color = "#ffffff";
    boxShadow = "0 14px 28px rgba(255,129,0,0.28)";
    border = "1px solid rgba(255,255,255,0.18)";
  } else if (active && child) {
    background = "rgba(255,153,0,0.18)";
    color = "#ffffff";
    border = "1px solid rgba(255,255,255,0.08)";
  } else if (sectionOpen && !child) {
    background = "rgba(255,255,255,0.04)";
    color = "#ffffff";
  }

  if (disabled) {
    color = "rgba(226,232,240,0.38)";
  }

  return {
    width: "100%",
    minHeight: child ? 30 : 40,
    borderRadius: child ? 9 : 10,
    border,
    background,
    color,
    boxShadow,
    display: "flex",
    alignItems: "center",
    gap: child ? 8 : 10,
    padding: child ? "7px 10px" : "9px 10px",
    fontSize: child ? 10.5 : 13,
    lineHeight: child ? "13px" : "16px",
    fontWeight: child ? 800 : 800,
    letterSpacing: child ? "-0.01em" : "-0.015em",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.62 : 1,
    textAlign: "left",
  };
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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName = getDisplayName(accessUser);
  const roleLabel = getSidebarRoleLabel(accessUser);
  const fullRoleLabel = getUserRoles(accessUser).join(" • ") || roleLabel;
  const initials = getInitials(displayName);

  return (
    <aside data-ema-sidebar="true" style={sidebarStyle}>
      <div style={brandStyle}>
        <div style={logoStyle}>
          <Box size={21} strokeWidth={2.1} />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={brandTitleStyle}>EMA System</div>
          <div style={brandSubtitleStyle}>Operations Console</div>
        </div>
      </div>

      <div style={sectionLabelStyle}>Main Category</div>

      <nav style={navStyle}>
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = openSection === section.title;
          const hasActiveItem = section.items.some((item) => isRouteActive(location.pathname, item.path));

          if (!section.collapsible) {
            const item = section.items[0];
            const hasAccess = canViewPath(accessUser, item.path);
            const isDisabled = item.comingSoon || !hasAccess;
            const isActive = isRouteActive(location.pathname, item.path);

            return (
              <button
                key={section.title}
                type="button"
                title={item.comingSoon ? "Coming soon" : isDisabled ? "Access restricted" : section.title}
                disabled={isDisabled}
                style={navButtonStyle({ active: isActive, disabled: isDisabled })}
                onClick={() => {
                  if (!isDisabled) navigate(item.path);
                }}
              >
                <SectionIcon size={17} strokeWidth={2.1} />
                <span style={{ flex: 1, minWidth: 0 }}>{section.title}</span>
                {isActive ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            );
          }

          return (
            <div key={section.title} style={{ display: "grid", gap: 4 }}>
              <button
                type="button"
                style={navButtonStyle({ active: false, sectionOpen: isOpen || hasActiveItem })}
                onClick={() => setOpenSection((current) => (current === section.title ? "" : section.title))}
                aria-expanded={isOpen}
                aria-controls={"sidebar-section-" + section.title.replace(/\s+/g, "-").toLowerCase()}
              >
                <SectionIcon size={17} strokeWidth={2.1} />
                <span style={{ flex: 1, minWidth: 0 }}>{section.title}</span>
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {isOpen && (
                <div id={"sidebar-section-" + section.title.replace(/\s+/g, "-").toLowerCase()} style={subNavStyle}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const hasAccess = canViewPath(accessUser, item.path);
                    const isDisabled = item.comingSoon || !hasAccess;
                    const isActive = isRouteActive(location.pathname, item.path);

                    return (
                      <button
                        key={item.path}
                        type="button"
                        title={item.comingSoon ? "Coming soon" : isDisabled ? "Access restricted" : item.label}
                        disabled={isDisabled}
                        style={navButtonStyle({ active: isActive, child: true, disabled: isDisabled })}
                        onClick={() => {
                          if (!isDisabled) navigate(item.path);
                        }}
                      >
                        <Icon size={14} strokeWidth={2.2} />
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal" }}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={footerStyle}>
        <div style={userCardStyle} title={displayName + " • " + fullRoleLabel}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #3f7cff 0%, #6c3bff 100%)",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 800,
              position: "relative",
              flexShrink: 0,
            }}
          >
            {initials}
            <span
              style={{
                position: "absolute",
                right: -1,
                bottom: -1,
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#22c55e",
                border: "2px solid #061b3d",
              }}
            />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: "#ffffff",
                fontSize: 11.5,
                lineHeight: "14px",
                fontWeight: 800,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                marginTop: 2,
                color: "rgba(226,232,240,0.74)",
                fontSize: 10.5,
                lineHeight: "13px",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {roleLabel}
            </div>
          </div>

          <ChevronDown size={14} color="rgba(255,255,255,0.8)" />
        </div>

        <button type="button" onClick={handleLogout} style={logoutButtonStyle}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
