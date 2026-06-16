import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import { installDisplayCopyStandardizer } from "../../utils/displayCopy";
import "../../styles/report-builder-scope-fix.css";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

export function AppShell() {
  useEffect(() => installDisplayCopyStandardizer(), []);

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
