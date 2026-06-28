import { Bell, ChevronDown, Moon, Sparkles, Sun, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getStoredAccessUser, type AccessUser } from "../../routes/accessControl";
import EmaAssistWidget from "../AIAssist/EmaAssistWidget";

type PageMeta = {
  title: string;
  subtitle: string;
};

type ViewMode = "desktop" | "compact" | "tablet" | "mobile";

const defaultPageMeta: PageMeta = {
  title: "EMA System",
  subtitle: "Operations Console",
};

const pageMeta: Record<string, PageMeta> = {
  "/dashboard": {
    title: "IT Operation Dashboard",
    subtitle: "Overview of your EMA workspace.",
  },
  "/management-dashboard": {
    title: "Management Dashboard",
    subtitle: "Overview of your EMA workspace.",
  },
  "/hardware": {
    title: "Hardware Inventory",
    subtitle: "Track assets, ownership and lifecycle status.",
  },
  "/software": {
    title: "Software Inventory",
    subtitle: "Track applications, versions and classification status.",
  },
  "/network-inventory": {
    title: "Network Inventory",
    subtitle: "Monitor IP records, workgroups and network coverage.",
  },
  "/appmetering": {
    title: "Application Metering",
    subtitle: "Review application usage and performance metrics.",
  },
  "/internet-metering": {
    title: "Internet Metering",
    subtitle: "Review internet usage and performance metrics.",
  },
  "/app-restriction": {
    title: "Application Restriction",
    subtitle: "Manage and review application restriction policies.",
  },
  "/web-restriction": {
    title: "Web Restriction",
    subtitle: "Manage and review web restriction policies.",
  },
  "/patch-management": {
    title: "Patch Management",
    subtitle: "Manage and deploy software updates and patches.",
  },
  "/software-distribution": {
    title: "Software Distribution",
    subtitle: "Manage and deploy software packages and installations.",
  },
  "/service-desk": {
    title: "Service Desk",
    subtitle: "Manage incidents, knowledge base and support workflow.",
  },
  "/tasklist": {
    title: "Task List",
    subtitle: "Monitor command jobs and endpoint execution.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Control access, roles and system configuration.",
  },
  "/report": {
    title: "Report",
    subtitle: "Generate and review EMA operational reports.",
  },
};

function getViewMode(width: number): ViewMode {
  if (width <= 720) return "mobile";
  if (width <= 980) return "tablet";
  if (width <= 1320) return "compact";
  return "desktop";
}

function useViewMode() {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "desktop";
    return getViewMode(window.innerWidth);
  });

  useEffect(() => {
    const sync = () => setMode(getViewMode(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return mode;
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/dashboard";
  return pathname.replace(/\/+$/, "") || "/dashboard";
}

function resolvePageMeta(pathname: string) {
  const cleanPath = normalizePathname(pathname);

  if (pageMeta[cleanPath]) {
    return pageMeta[cleanPath];
  }

  const matchedBase = Object.keys(pageMeta)
    .sort((a, b) => b.length - a.length)
    .find((route) => cleanPath === route || cleanPath.startsWith(route + "/"));

  return matchedBase ? pageMeta[matchedBase] : defaultPageMeta;
}

function openEmaAssistant() {
  window.dispatchEvent(new CustomEvent("ema-ai-assist-open"));
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

function getPrimaryRoleLabel(user: AccessUser | null) {
  const roles = getUserRoles(user);
  return roles[0] || "User";
}

function getFullRoleLabel(user: AccessUser | null) {
  const roles = getUserRoles(user);
  return roles.length > 0 ? roles.join(" • ") : "User";
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

function buildStyles(isDark: boolean, mode: ViewMode) {
  const isMobile = mode === "mobile";
  const isTablet = mode === "tablet";

  const colors = isDark
    ? {
        bg: "#071225",
        border: "rgba(148,163,184,0.22)",
        text: "#f8fafc",
        muted: "#9fb0c8",
        surface: "#0d1b33",
        icon: "#dbeafe",
        body: "#071225",
      }
    : {
        bg: "#ffffff",
        border: "#e2eaf6",
        text: "#0f172a",
        muted: "#667894",
        surface: "#ffffff",
        icon: "#10284f",
        body: "#f6f9ff",
      };

  const headerStyle: CSSProperties = {
    width: "100%",
    minHeight: isMobile ? 104 : 72,
    display: "flex",
    alignItems: "center",
    gap: isMobile ? 8 : 10,
    padding: isMobile ? "10px 12px" : isTablet ? "0 16px" : "0 24px",
    background: colors.bg,
    borderBottom: "1px solid " + colors.border,
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.22)" : "0 7px 20px rgba(15,23,42,0.045)",
    zIndex: 50,
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    flexWrap: isMobile ? "wrap" : "nowrap",
  };

  const titleWrapStyle: CSSProperties = {
    flex: isMobile ? "1 0 100%" : "1 1 auto",
    minWidth: 0,
    overflow: "hidden",
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    color: colors.text,
    fontSize: isMobile ? 15.5 : 17,
    lineHeight: isMobile ? "20px" : "22px",
    fontWeight: 800,
    letterSpacing: "-0.035em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const subtitleStyle: CSSProperties = {
    margin: "2px 0 0",
    color: colors.muted,
    fontSize: isMobile ? 10.5 : 11.2,
    lineHeight: "14px",
    fontWeight: 650,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const actionsStyle: CSSProperties = {
    marginLeft: isMobile ? 0 : "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "space-between" : "flex-end",
    gap: isMobile ? 8 : 10,
    flex: isMobile ? "1 0 100%" : "0 0 auto",
    minWidth: 0,
  };

  const iconButtonStyle: CSSProperties = {
    width: isMobile ? 38 : 42,
    height: isMobile ? 38 : 42,
    minWidth: isMobile ? 38 : 42,
    borderRadius: 14,
    border: "1px solid " + colors.border,
    background: colors.surface,
    color: colors.icon,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    position: "relative",
    boxShadow: isDark ? "none" : "0 7px 18px rgba(15,23,42,0.04)",
  };

  const aiButtonStyle: CSSProperties = {
    height: isMobile ? 38 : 42,
    minWidth: isMobile ? 100 : 128,
    borderRadius: 14,
    border: 0,
    padding: isMobile ? "0 12px" : "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "linear-gradient(135deg, #476dff 0%, #6737ff 100%)",
    color: "#ffffff",
    boxShadow: "0 13px 26px rgba(79,70,229,0.24)",
    fontSize: isMobile ? 11.5 : 12.5,
    lineHeight: "15px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const adminButtonStyle: CSSProperties = {
    height: isMobile ? 38 : 42,
    minWidth: isMobile ? 122 : 152,
    borderRadius: 14,
    border: "1px solid " + colors.border,
    padding: isMobile ? "0 10px" : "0 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: colors.surface,
    color: colors.text,
    boxShadow: isDark ? "none" : "0 7px 18px rgba(15,23,42,0.04)",
    fontSize: isMobile ? 11.5 : 12.5,
    lineHeight: "15px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return {
    colors,
    isMobile,
    headerStyle,
    titleWrapStyle,
    titleStyle,
    subtitleStyle,
    actionsStyle,
    iconButtonStyle,
    aiButtonStyle,
    adminButtonStyle,
  };
}

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const accessUser = mergeAccessUser(user);
  const { isDark, toggleTheme } = useTheme();
  const mode = useViewMode();

  const styles = useMemo(() => buildStyles(isDark, mode), [isDark, mode]);
  const current = useMemo(() => resolvePageMeta(location.pathname), [location.pathname]);

  useEffect(() => {
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    document.body.style.background = styles.colors.body;
  }, [isDark, styles.colors.body]);

  const goNotificationSettings = () => {
    window.dispatchEvent(new CustomEvent("ema-notifications-open"));

    if (normalizePathname(location.pathname) !== "/settings") {
      navigate("/settings?section=notification-channels");
      return;
    }

    const params = new URLSearchParams(location.search);
    params.set("section", "notification-channels");
    navigate("/settings?" + params.toString(), { replace: true });
  };

  const goAdminProfile = () => {
    if (normalizePathname(location.pathname) !== "/settings") {
      navigate("/settings?section=user-access-management");
      return;
    }

    const params = new URLSearchParams(location.search);
    params.set("section", "user-access-management");
    navigate("/settings?" + params.toString(), { replace: true });
  };

  const roleLabel = getPrimaryRoleLabel(accessUser);
  const roleTitle = getDisplayName(accessUser) + " • " + getFullRoleLabel(accessUser);

  return (
    <>
      <header data-ema-topbar="true" style={styles.headerStyle}>
        <div style={styles.titleWrapStyle}>
          <h1 style={styles.titleStyle}>{current.title}</h1>
          <p style={styles.subtitleStyle}>{current.subtitle}</p>
        </div>

        <div style={styles.actionsStyle}>
          <button
            type="button"
            style={styles.iconButtonStyle}
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            type="button"
            style={styles.iconButtonStyle}
            onClick={goNotificationSettings}
            aria-label="Notifications"
            title="Notification settings"
          >
            <Bell size={17} />
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 7,
                width: 15,
                height: 15,
                borderRadius: 999,
                background: "#ef3d5b",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: 8.5,
                fontWeight: 900,
                lineHeight: "15px",
                border: "2px solid " + styles.colors.surface,
              }}
            >
              3
            </span>
          </button>

          <button type="button" style={styles.aiButtonStyle} onClick={openEmaAssistant} title="AI Assistant">
            <Sparkles size={16} />
            <span>{styles.isMobile ? "AI" : "AI Assistant"}</span>
          </button>

          <button type="button" style={styles.adminButtonStyle} title={roleTitle} onClick={goAdminProfile}>
            <UserCircle size={18} />
            <span
              style={{
                maxWidth: styles.isMobile ? 90 : 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {roleLabel}
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <EmaAssistWidget showFloatingLauncher={false} />
    </>
  );
}

export default TopNavbar;
