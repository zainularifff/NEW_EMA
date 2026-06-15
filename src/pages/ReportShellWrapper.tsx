import { useEffect } from "react";
import ReportDynamicWrapper from "./ReportDynamicWrapper";

const REPORT_SHELL_FIX_STYLE_ID = "ema-report-shell-consistency-fix";

const REPORT_SHELL_FIX_CSS = `
  html.ema-report-page-active,
  body.ema-report-page-active {
    height: 100% !important;
    overflow: hidden !important;
    background: #e8eef6 !important;
  }

  body.ema-report-page-active .ema-shell {
    min-height: 100vh !important;
    height: 100vh !important;
    overflow: hidden !important;
    background: linear-gradient(135deg, #eef3f8 0%, #e8eef6 52%, #dfe7f1 100%) !important;
  }

  body.ema-report-page-active .ema-main {
    min-height: 0 !important;
    height: 100vh !important;
    overflow: hidden !important;
    background: #e8eef6 !important;
  }

  body.ema-report-page-active .ema-topbar {
    background: #3f4955 !important;
    border-bottom: 1px solid rgba(203, 213, 225, 0.42) !important;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.14) !important;
    backdrop-filter: none !important;
  }

  body.ema-report-page-active .ema-topbar-title h1,
  body.ema-report-page-active .ema-topbar-role-label {
    color: #f8fafc !important;
  }

  body.ema-report-page-active .ema-topbar-title p {
    color: #cbd5e1 !important;
  }

  body.ema-report-page-active .ema-global-search,
  body.ema-report-page-active .ema-icon-btn,
  body.ema-report-page-active .ema-admin-topbar-btn {
    border-color: rgba(148, 163, 184, 0.28) !important;
    background: rgba(15, 23, 42, 0.28) !important;
  }

  body.ema-report-page-active .ema-page {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    height: calc(100vh - 76px) !important;
    overflow: hidden !important;
    padding: 0 !important;
    background: #e8eef6 !important;
  }

  body.ema-report-page-active .settings-module-root.ema-report-module-root,
  body.ema-report-page-active .ema-report-module-root {
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    max-height: 100% !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    padding: 14px !important;
    box-sizing: border-box !important;
    color: #173154 !important;
    scrollbar-gutter: stable !important;
    -webkit-overflow-scrolling: touch !important;
    background:
      radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.075), transparent 24rem),
      radial-gradient(circle at 100% 6%, rgba(8, 126, 164, 0.055), transparent 24rem),
      linear-gradient(135deg, #f6f8fb 0%, #edf2f7 54%, #e5ecf4 100%) !important;
  }

  body.ema-report-page-active .ema-report-module-root::-webkit-scrollbar {
    width: 10px !important;
  }

  body.ema-report-page-active .ema-report-module-root::-webkit-scrollbar-track {
    background: #eef4fb !important;
    border-radius: 999px !important;
  }

  body.ema-report-page-active .ema-report-module-root::-webkit-scrollbar-thumb {
    background: #c9d7ea !important;
    border: 2px solid #eef4fb !important;
    border-radius: 999px !important;
  }

  body.ema-report-page-active .ema-report-module-root .settings-layout.report-settings-layout {
    height: auto !important;
    min-height: min-content !important;
    max-height: none !important;
    align-items: start !important;
    overflow: visible !important;
  }

  body.ema-report-page-active .ema-report-module-root .featured-report-nav-panel {
    position: sticky !important;
    top: 0 !important;
    align-self: start !important;
    max-height: calc(100vh - 106px) !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  body.ema-report-page-active .ema-report-module-root .settings-content.report-main-content,
  body.ema-report-page-active .ema-report-module-root .report-workspace-shell,
  body.ema-report-page-active .ema-report-module-root .report-workspace-body,
  body.ema-report-page-active .ema-report-module-root .featured-report-layout,
  body.ema-report-page-active .ema-report-module-root .featured-report-main-panel,
  body.ema-report-page-active .ema-report-module-root .report-config-panel,
  body.ema-report-page-active .ema-report-module-root .report-config-panel .config-card {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }

  body.ema-report-page-active .ema-report-module-root .report-workspace-body {
    padding-bottom: 56px !important;
  }
`;

function installReportShellFixes() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.add("ema-report-page-active");
  document.body.classList.add("ema-report-page-active");

  let style = document.getElementById(REPORT_SHELL_FIX_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = REPORT_SHELL_FIX_STYLE_ID;
    style.textContent = REPORT_SHELL_FIX_CSS;
    document.body.appendChild(style);
  }
}

function removeReportShellFixes() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove("ema-report-page-active");
  document.body.classList.remove("ema-report-page-active");
  document.getElementById(REPORT_SHELL_FIX_STYLE_ID)?.remove();
}

export default function ReportShellWrapper() {
  useEffect(() => {
    installReportShellFixes();
    window.requestAnimationFrame(installReportShellFixes);
    const timer = window.setTimeout(installReportShellFixes, 120);

    return () => {
      window.clearTimeout(timer);
      removeReportShellFixes();
    };
  }, []);

  return <ReportDynamicWrapper />;
}
