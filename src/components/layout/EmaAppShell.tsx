import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar as SidebarComponent } from "./Sidebar";
import TopbarComponent from "./TopNavbar";
import "../../styles/ema-app-shell.css";

type EmaAppShellProps = {
  children: ReactNode;
};

const shellBypassPaths = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/2fa",

  // Old pages that already render their own sidebar/topbar/layout.
  "/dashboard",
  "/management-dashboard",
  "/report",
  "/report-board",
  "/report-builder-rules",
  "/report-builder-rules-clean",
  "/report-builder-rules-live",
];

export default function EmaAppShell({ children }: EmaAppShellProps) {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();
  const bypassShell = shellBypassPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));

  if (bypassShell) {
    return <>{children}</>;
  }

  return (
    <div>
      <aside>
        <SidebarComponent />
      </aside>

      <section>
        <header>
          <TopbarComponent />
        </header>

        <main>
          {children}
        </main>
      </section>
    </div>
  );
}
