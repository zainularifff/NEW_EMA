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

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge, enabled: true },
  { label: "Hardware", path: "/hardware", icon: Laptop, enabled: true },
  { label: "Software", path: "/software", icon: Monitor, enabled: false },
  { label: "Network", path: "/network", icon: Network, enabled: false },
  { label: "Users", path: "/users", icon: Users, enabled: false },
  { label: "Reports", path: "/reports", icon: BarChart3, enabled: false },
  { label: "Settings", path: "/settings", icon: Settings, enabled: false },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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

          if (!item.enabled) {
            return (
              <div key={item.path} className="ema-nav-link opacity-50">
                <Icon size={17} />
                {item.label}
                <span className="ema-nav-soon">Soon</span>
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
        <div className="ema-user-card">
          <div className="ema-user-avatar">
            <ShieldCheck size={18} />
          </div>

          <div className="min-w-0">
            <div className="fw-bold text-white lh-sm">
              {user?.name || user?.username || "Admin User"}
            </div>
            <div className="small text-muted">System Manager</div>
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