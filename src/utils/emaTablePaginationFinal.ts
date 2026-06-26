
let installed = false;
let observer: MutationObserver | null = null;

const STYLE_ID = "ema-final-table-pagination-style";

const css = `
html body.ema-table-pagination-final {
  --ema-final-border: rgba(226, 232, 240, 0.96);
  --ema-final-border-strong: rgba(203, 213, 225, 0.95);
  --ema-final-head: #fbfcfe;
  --ema-final-hover: #f8fbff;
  --ema-final-text: #0f2746;
  --ema-final-muted: #64748b;
  --ema-final-blue: #2563eb;
  --ema-final-purple: #4f46e5;
}

/* table parent */
html body.ema-table-pagination-final .ema-final-table-parent {
  min-height: 0 !important;
  height: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  display: grid !important;
  grid-template-rows: minmax(0, 1fr) 54px !important;
  gap: 0 !important;
}

/* pages with title/filter/search row before table */
html body.ema-table-pagination-final .internet-metering-page .ema-final-table-parent:has(> .form-grid) {
  grid-template-rows: 54px minmax(0, 1fr) 54px !important;
}

html body.ema-table-pagination-final .appmetering-module-root .ema-final-table-parent {
  grid-template-rows: 38px 54px minmax(0, 1fr) 54px !important;
  gap: 0 !important;
}

html body.ema-table-pagination-final .task-list-module .ema-final-table-parent,
html body.ema-table-pagination-final .task-list-module .task-list-content-body {
  grid-template-rows: 34px minmax(0, 1fr) 54px !important;
  gap: 10px !important;
}

/* standard table card */
html body.ema-table-pagination-final .ema-final-table {
  width: 100% !important;
  max-width: 100% !important;
  min-height: 0 !important;
  height: 100% !important;
  margin: 0 !important;
  border: 1px solid var(--ema-final-border) !important;
  border-bottom: 0 !important;
  border-radius: 14px 14px 0 0 !important;
  background: #ffffff !important;
  box-shadow: none !important;
  overflow: auto !important;
  scrollbar-gutter: stable !important;
}

/* standard pagination attached to table */
html body.ema-table-pagination-final .ema-final-pagination {
  width: 100% !important;
  max-width: 100% !important;
  height: 54px !important;
  min-height: 54px !important;
  max-height: 54px !important;
  margin: 0 !important;
  padding: 0 12px !important;
  border: 1px solid var(--ema-final-border) !important;
  border-top: 0 !important;
  border-radius: 0 0 14px 14px !important;
  background: #ffffff !important;
  box-shadow: none !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto auto !important;
  align-items: center !important;
  gap: 10px !important;
  overflow: hidden !important;
}

html body.ema-table-pagination-final .ema-final-pagination .uam-page-summary,
html body.ema-table-pagination-final .ema-final-pagination .uam-page-summary strong,
html body.ema-table-pagination-final .ema-final-pagination .uam-page-status,
html body.ema-table-pagination-final .ema-final-pagination .ema-pagination-summary {
  min-width: 0 !important;
  color: var(--ema-final-muted) !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
  line-height: 1.2 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

html body.ema-table-pagination-final .ema-final-pagination .uam-pagination-controls,
html body.ema-table-pagination-final .ema-final-pagination .ema-pagination-controls {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 6px !important;
}

html body.ema-table-pagination-final .ema-final-pagination .uam-page-icon,
html body.ema-table-pagination-final .ema-final-pagination .ema-page-btn {
  width: 36px !important;
  min-width: 36px !important;
  height: 36px !important;
  min-height: 36px !important;
  border-radius: 12px !important;
  border: 1px solid var(--ema-final-border-strong) !important;
  background: #ffffff !important;
  color: var(--ema-final-text) !important;
  padding: 0 !important;
  margin: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: none !important;
}

html body.ema-table-pagination-final .ema-final-pagination .uam-page-icon:disabled,
html body.ema-table-pagination-final .ema-final-pagination .ema-page-btn:disabled {
  opacity: 0.42 !important;
  cursor: not-allowed !important;
  background: #f8fafc !important;
  color: #94a3b8 !important;
}

html body.ema-table-pagination-final .ema-final-pagination .uam-page-current,
html body.ema-table-pagination-final .ema-final-pagination .ema-page-current {
  width: 36px !important;
  min-width: 36px !important;
  height: 36px !important;
  min-height: 36px !important;
  border-radius: 12px !important;
  border: 1px solid var(--ema-final-purple) !important;
  background: var(--ema-final-purple) !important;
  color: #ffffff !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  font-size: 12px !important;
  font-weight: 650 !important;
  line-height: 1 !important;
  box-shadow: 0 10px 20px rgba(79, 70, 229, 0.16) !important;
}

/* real table */
html body.ema-table-pagination-final .ema-final-table table {
  width: 100% !important;
  min-width: 820px !important;
  margin: 0 !important;
  border-collapse: collapse !important;
  table-layout: auto !important;
  background: #ffffff !important;
}

html body.ema-table-pagination-final .ema-final-table thead th {
  position: sticky !important;
  top: 0 !important;
  z-index: 8 !important;
  height: 50px !important;
  min-height: 50px !important;
  padding: 14px 12px !important;
  border-bottom: 1px solid var(--ema-final-border) !important;
  background: var(--ema-final-head) !important;
  color: var(--ema-final-text) !important;
  font-size: 10.5px !important;
  font-weight: 600 !important;
  line-height: 1.1 !important;
  letter-spacing: 0.045em !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
  vertical-align: middle !important;
}

html body.ema-table-pagination-final .ema-final-table tbody td {
  height: 58px !important;
  min-height: 58px !important;
  padding: 8px 12px !important;
  border-bottom: 1px solid var(--ema-final-border) !important;
  background: #ffffff !important;
  color: var(--ema-final-text) !important;
  font-size: 11.8px !important;
  font-weight: 500 !important;
  line-height: 1.25 !important;
  vertical-align: middle !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
}

html body.ema-table-pagination-final .ema-final-table tbody tr:hover td {
  background: var(--ema-final-hover) !important;
}

/* div table */
html body.ema-table-pagination-final .ema-final-table .user-row {
  width: 100% !important;
  margin: 0 !important;
  border-radius: 0 !important;
  border: 0 !important;
  border-bottom: 1px solid var(--ema-final-border) !important;
  background: #ffffff !important;
  box-shadow: none !important;
  align-items: stretch !important;
}

html body.ema-table-pagination-final .ema-final-table .user-row.head {
  position: sticky !important;
  top: 0 !important;
  z-index: 8 !important;
  min-height: 50px !important;
  height: 50px !important;
  background: var(--ema-final-head) !important;
}

html body.ema-table-pagination-final .ema-final-table .user-row:not(.head) {
  min-height: 58px !important;
  height: auto !important;
}

html body.ema-table-pagination-final .ema-final-table .user-row:not(.head):hover {
  background: var(--ema-final-hover) !important;
}

html body.ema-table-pagination-final .ema-final-table .user-cell {
  min-width: 0 !important;
  max-width: 100% !important;
  min-height: 58px !important;
  height: auto !important;
  padding: 8px 12px !important;
  color: var(--ema-final-text) !important;
  font-size: 11.8px !important;
  font-weight: 500 !important;
  line-height: 1.25 !important;
  display: flex !important;
  align-items: center !important;
  overflow: hidden !important;
}

html body.ema-table-pagination-final .ema-final-table .user-row.head .user-cell {
  min-height: 50px !important;
  height: 50px !important;
  padding-top: 14px !important;
  padding-bottom: 14px !important;
  color: var(--ema-final-text) !important;
  font-size: 10.5px !important;
  font-weight: 600 !important;
  line-height: 1.1 !important;
  letter-spacing: 0.045em !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

html body.ema-table-pagination-final .ema-final-table .user-row:not(.head) .user-cell:not(.row-number),
html body.ema-table-pagination-final .ema-final-table .user-row:not(.head) .user-cell:not(.row-number) * {
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  line-height: 1.35 !important;
}

/* row number */
html body.ema-table-pagination-final .ema-final-table .row-index-pill,
html body.ema-table-pagination-final .ema-final-table .software-row-no {
  width: 34px !important;
  min-width: 34px !important;
  max-width: 34px !important;
  height: 32px !important;
  min-height: 32px !important;
  max-height: 32px !important;
  padding: 0 !important;
  border-radius: 12px !important;
  border: 1px solid #bcd0ff !important;
  background: #eef5ff !important;
  color: var(--ema-final-blue) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
  line-height: 1 !important;
  font-size: 12px !important;
  font-weight: 650 !important;
  font-variant-numeric: tabular-nums !important;
}

/* empty/loading row */
html body.ema-table-pagination-final .ema-final-table tbody tr:has(.settings-helper-card) td {
  height: 58px !important;
  padding: 10px 14px !important;
}

html body.ema-table-pagination-final .ema-final-table .settings-helper-card {
  width: 100% !important;
  min-height: 38px !important;
  margin: 0 !important;
  border: 1px solid #c9dbff !important;
  border-radius: 12px !important;
  background: #f8fbff !important;
  color: var(--ema-final-text) !important;
  padding: 9px 12px !important;
  display: block !important;
  box-shadow: none !important;
}

/* force table + pagination not separated */
html body.ema-table-pagination-final .pricing-table-card + .uam-pagination,
html body.ema-table-pagination-final .hardware-device-table + .uam-pagination,
html body.ema-table-pagination-final .software-device-table + .uam-pagination,
html body.ema-table-pagination-final .task-standard-table + .uam-pagination {
  margin-top: 0 !important;
}

/* scrollbar */
html body.ema-table-pagination-final .ema-final-table::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

html body.ema-table-pagination-final .ema-final-table::-webkit-scrollbar-track {
  background: rgba(226, 232, 240, 0.58) !important;
  border-radius: 999px !important;
}

html body.ema-table-pagination-final .ema-final-table::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.62) !important;
  border-radius: 999px !important;
}

/* dropdown clean standard also */
html body.ema-table-pagination-final select,
html body.ema-table-pagination-final .setting-select,
html body.ema-table-pagination-final .im-select-trigger,
html body.ema-table-pagination-final .ema-sw-select-trigger,
html body.ema-table-pagination-final .ema-hw-select-trigger,
html body.ema-table-pagination-final .dropdown-toggle {
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  border: 1px solid var(--ema-final-border-strong) !important;
  border-radius: 12px !important;
  background: #ffffff !important;
  color: var(--ema-final-text) !important;
  box-shadow: none !important;
  outline: none !important;
}

/* FINAL FIX: App Metering table/filter/pagination polish */
html body.ema-table-pagination-final .appmetering-module-root .content-shell {
  min-height: 0 !important;
  height: 100% !important;
  display: grid !important;
  grid-template-rows: 64px minmax(0, 1fr) !important;
  overflow: hidden !important;
}

html body.ema-table-pagination-final .appmetering-module-root .content-head {
  height: 64px !important;
  min-height: 64px !important;
  padding: 12px 16px !important;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95) !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 12px !important;
}

html body.ema-table-pagination-final .appmetering-module-root .content-body {
  min-height: 0 !important;
  height: 100% !important;
  padding: 14px 16px 12px !important;
  display: grid !important;
  grid-template-rows: 44px 70px minmax(0, 1fr) 54px !important;
  gap: 10px !important;
  overflow: hidden !important;
  background: #ffffff !important;
}

html body.ema-table-pagination-final .appmetering-module-root .user-action-bar.advanced.clean {
  height: 44px !important;
  min-height: 44px !important;
  margin: 0 !important;
  padding: 0 !important;
  display: grid !important;
  grid-template-columns: minmax(360px, 1fr) auto auto auto !important;
  gap: 10px !important;
  align-items: center !important;
  overflow: visible !important;
}

html body.ema-table-pagination-final .appmetering-module-root .user-action-bar .section-search {
  height: 38px !important;
  min-height: 38px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(203, 213, 225, 0.95) !important;
  background: #ffffff !important;
  padding: 0 12px !important;
}

html body.ema-table-pagination-final .appmetering-module-root .content-body > .row.g-2.mb-3 {
  height: 70px !important;
  min-height: 70px !important;
  max-height: 70px !important;
  margin: 0 !important;
  padding: 0 !important;
  display: grid !important;
  grid-template-columns:
    minmax(150px, 180px)
    minmax(150px, 180px)
    minmax(220px, 1fr)
    minmax(150px, 190px)
    minmax(150px, 190px)
    minmax(150px, 190px) !important;
  gap: 10px !important;
  align-items: end !important;
  overflow: visible !important;
}

html body.ema-table-pagination-final .appmetering-module-root .content-body > .row.g-2.mb-3 > .form-field {
  min-width: 0 !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  display: grid !important;
  grid-template-rows: 14px 38px !important;
  gap: 6px !important;
}

html body.ema-table-pagination-final .appmetering-module-root .form-field span {
  margin: 0 !important;
  color: #0f2746 !important;
  font-size: 10.5px !important;
  font-weight: 650 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
}

html body.ema-table-pagination-final .appmetering-module-root .setting-input,
html body.ema-table-pagination-final .appmetering-module-root .setting-select {
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  border-radius: 12px !important;
  border: 1px solid rgba(203, 213, 225, 0.95) !important;
  background-color: #ffffff !important;
  color: #0f2746 !important;
  padding: 0 12px !important;
  font-size: 11.8px !important;
  font-weight: 600 !important;
  box-shadow: none !important;
  outline: none !important;
}

html body.ema-table-pagination-final .appmetering-module-root .setting-select {
  padding-right: 36px !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  background-image:
    linear-gradient(45deg, transparent 50%, #0f2746 50%),
    linear-gradient(135deg, #0f2746 50%, transparent 50%) !important;
  background-position:
    calc(100% - 17px) 16px,
    calc(100% - 12px) 16px !important;
  background-size: 5px 5px, 5px 5px !important;
  background-repeat: no-repeat !important;
}

html body.ema-table-pagination-final .appmetering-module-root .ema-final-table,
html body.ema-table-pagination-final .appmetering-module-root .pricing-table-card {
  height: 100% !important;
  min-height: 0 !important;
  margin: 0 !important;
  border: 1px solid rgba(226, 232, 240, 0.96) !important;
  border-bottom: 0 !important;
  border-radius: 14px 14px 0 0 !important;
  overflow: auto !important;
}

html body.ema-table-pagination-final .appmetering-module-root .pricing-table-card table {
  width: 100% !important;
  min-width: 980px !important;
  border-collapse: collapse !important;
}

html body.ema-table-pagination-final .appmetering-module-root .pricing-table-card thead th {
  height: 50px !important;
  min-height: 50px !important;
  padding: 14px 12px !important;
  background: #fbfcfe !important;
  border-bottom: 1px solid rgba(226, 232, 240, 0.96) !important;
  color: #0f2746 !important;
  font-size: 10.5px !important;
  font-weight: 600 !important;
  letter-spacing: 0.045em !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
}

html body.ema-table-pagination-final .appmetering-module-root .pricing-table-card tbody td {
  height: 58px !important;
  min-height: 58px !important;
  padding: 8px 12px !important;
  border-bottom: 1px solid rgba(226, 232, 240, 0.96) !important;
  color: #0f2746 !important;
  font-size: 11.8px !important;
  font-weight: 500 !important;
  vertical-align: middle !important;
}

html body.ema-table-pagination-final .appmetering-module-root .pricing-table-card .settings-helper-card {
  width: 100% !important;
  min-height: 38px !important;
  margin: 0 !important;
  padding: 9px 12px !important;
  border: 1px solid #c9dbff !important;
  border-radius: 12px !important;
  background: #f8fbff !important;
  color: #0f2746 !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  white-space: normal !important;
}

html body.ema-table-pagination-final .appmetering-module-root .pricing-table-card .settings-helper-card strong,
html body.ema-table-pagination-final .appmetering-module-root .pricing-table-card .settings-helper-card span {
  display: inline !important;
  margin: 0 !important;
  color: #0f2746 !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
  line-height: 1.3 !important;
}

html body.ema-table-pagination-final .appmetering-module-root .ema-final-pagination,
html body.ema-table-pagination-final .appmetering-module-root .uam-pagination {
  height: 54px !important;
  min-height: 54px !important;
  max-height: 54px !important;
  margin: 0 !important;
  padding: 0 12px !important;
  border: 1px solid rgba(226, 232, 240, 0.96) !important;
  border-top: 0 !important;
  border-radius: 0 0 14px 14px !important;
  background: #ffffff !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto auto !important;
  align-items: center !important;
  gap: 10px !important;
}

html body.ema-table-pagination-final .appmetering-module-root .soft-btn,
html body.ema-table-pagination-final .appmetering-module-root .primary-btn {
  height: 38px !important;
  min-height: 38px !important;
  border-radius: 12px !important;
  padding: 0 14px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  white-space: nowrap !important;
}

@media (max-width: 1320px) {
  html body.ema-table-pagination-final .appmetering-module-root .content-body > .row.g-2.mb-3 {
    overflow-x: auto !important;
    grid-template-columns:
      150px 150px 220px 150px 150px 150px !important;
  }
}

`;

function markTables() {
  if (typeof document === "undefined") return;

  document.body.classList.add("ema-table-pagination-final");

  const tableSelectors = [
    ".pricing-table-card",
    ".hardware-device-table.hardware-standard-table",
    ".software-device-table.software-standard-table",
    ".task-standard-table",
    ".user-access-table.task-standard-table",
  ];

  const paginationSelectors = [
    ".uam-pagination",
    ".hardware-pagination",
    ".software-page-pagination",
    ".task-settings-pagination",
    ".ema-pagination",
  ];

  const tables = Array.from(document.querySelectorAll<HTMLElement>(tableSelectors.join(",")));
  const paginations = Array.from(document.querySelectorAll<HTMLElement>(paginationSelectors.join(",")));

  tables.forEach((table) => {
    table.classList.add("ema-final-table");

    const parent = table.parentElement;
    if (!parent) return;

    const siblingPagination = Array.from(parent.children).find((child) =>
      child instanceof HTMLElement &&
      paginationSelectors.some((selector) => child.matches(selector))
    ) as HTMLElement | undefined;

    if (siblingPagination) {
      parent.classList.add("ema-final-table-parent");
      siblingPagination.classList.add("ema-final-pagination");
    }
  });

  paginations.forEach((pagination) => {
    pagination.classList.add("ema-final-pagination");

    const parent = pagination.parentElement;
    if (!parent) return;

    const siblingTable = Array.from(parent.children).find((child) =>
      child instanceof HTMLElement &&
      tableSelectors.some((selector) => child.matches(selector))
    ) as HTMLElement | undefined;

    if (siblingTable) {
      parent.classList.add("ema-final-table-parent");
      siblingTable.classList.add("ema-final-table");
    }
  });
}

function mountStyle() {
  if (typeof document === "undefined") return;

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.setAttribute("data-ema-final", "table-pagination");
  }

  style.textContent = css;

  if (style.parentElement) {
    style.parentElement.removeChild(style);
  }

  document.head.appendChild(style);
  markTables();
}

export function installEmaTablePaginationFinal() {
  if (typeof document === "undefined") return;

  mountStyle();

  window.setTimeout(mountStyle, 0);
  window.setTimeout(mountStyle, 120);
  window.setTimeout(mountStyle, 500);

  if (installed) return;
  installed = true;

  observer = new MutationObserver(() => {
    mountStyle();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("popstate", () => window.setTimeout(mountStyle, 0));
}

export function uninstallEmaTablePaginationFinal() {
  observer?.disconnect();
  observer = null;
  installed = false;
}
