import { useEffect } from "react";
import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";

import { installDisplayCopyStandardizer } from "../../utils/displayCopy";
import "../../styles/report-builder-scope-fix.css";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";

const globalShellCss =
  ":root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;background:#f6f9ff;}" +
  "*{box-sizing:border-box;}" +
  "html,body,#root{min-height:100%;margin:0;}" +
  "body{overflow:hidden;background:#f6f9ff;}" +
  "button,input{font-family:inherit;}" +
  "[data-ema-sidebar='true']::-webkit-scrollbar{width:0;height:0;display:none;}" +
  "[data-ema-page='true']::-webkit-scrollbar{width:10px;height:10px;}" +
  "[data-ema-page='true']::-webkit-scrollbar-thumb{background:#d5deef;border-radius:999px;}";

const shellStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  overflow: "hidden",
  background: "#f6f9ff",
};

const mainStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "linear-gradient(180deg, #f8fbff 0%, #f4f7fc 100%)",
};

const pageStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "0 20px 20px",
  background: "#f6f9ff",
};

export function AppShell() {
  useEffect(() => installDisplayCopyStandardizer(), []);

  return (
    <>
      <style>{globalShellCss}</style>

      <div style={shellStyle}>
        <Sidebar />

        <div style={mainStyle}>
          <TopNavbar />

          <main data-ema-page="true" style={pageStyle}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

