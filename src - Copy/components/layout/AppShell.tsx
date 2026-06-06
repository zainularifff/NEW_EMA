import { Outlet } from "react-router-dom";

import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

export function AppShell() {
  return (
    <div className="ema-shell">
      <Sidebar />

      <div className="ema-main">
        <TopNavbar />

        <main className="ema-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}