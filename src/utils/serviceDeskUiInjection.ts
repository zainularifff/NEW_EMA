
let observer: MutationObserver | null = null;
let rafId = 0;

function addClass(el: Element | null | undefined, ...classes: string[]) {
  if (!el) return;
  classes.filter(Boolean).forEach((className) => el.classList.add(className));
}

function textOf(el: Element | null | undefined) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function directChildren(el: Element | null | undefined) {
  return el ? Array.from(el.children) : [];
}

function looksLikeTicketTableHeader(el: Element) {
  const text = textOf(el).toLowerCase();
  return text.includes("req no") && text.includes("submitted") && text.includes("requester") && text.includes("action");
}

function decorateButtons(root: Element) {
  root.querySelectorAll("button").forEach((button) => {
    addClass(button, "sd-any-button");

    const text = textOf(button).toLowerCase();
    const svgCount = button.querySelectorAll("svg").length;

    if (svgCount > 0 && text.length <= 3) addClass(button, "sd-icon-button");
    if (text.includes("create ticket") || text.includes("submit ticket") || text.includes("update ticket") || text.includes("new ticket")) addClass(button, "sd-primary-action");
    if (text.includes("delete") || text.includes("close")) addClass(button, "sd-danger-action");
    if (text.includes("reset") || text.includes("cancel")) addClass(button, "sd-muted-action");
  });
}

function decorateServiceDeskRoot(root: HTMLElement) {
  addClass(root, "sd-root", "service-desk-module");

  const toast = root.querySelector(":scope > div[role='status']");
  addClass(toast, "sd-toast");

  const shell = directChildren(root).find((child) =>
    child.tagName === "DIV" &&
    child.querySelector(":scope > aside") &&
    child.querySelector(":scope > section")
  ) as HTMLElement | undefined;

  if (!shell) {
    const dialog = root.querySelector("section[role='dialog']");
    if (dialog) {
      addClass(root, "sd-portal-root");
      addClass(root.querySelector(":scope > div"), "sd-modal-backdrop");
      addClass(dialog, "sd-confirm-modal");
    }

    const form = root.querySelector("form");
    if (form) {
      addClass(root, "sd-form-portal-root");
      addClass(root.querySelector(":scope > div"), "sd-modal-backdrop");
      addClass(form, "sd-ticket-form");
    }

    decorateButtons(root);
    return;
  }

  addClass(shell, "sd-shell");

  const sidebar = shell.querySelector(":scope > aside") as HTMLElement | null;
  const page = shell.querySelector(":scope > section") as HTMLElement | null;

  addClass(sidebar, "sd-queue-panel");
  addClass(sidebar?.querySelector(":scope > div"), "sd-queue-head");

  const nav = sidebar?.querySelector("nav");
  addClass(nav, "sd-queue-nav");
  nav?.querySelectorAll(":scope > button").forEach((button) => addClass(button, "sd-queue-item"));

  addClass(page, "sd-page");

  const pageChildren = directChildren(page);
  const hero = pageChildren.find((child) => child.querySelector("[data-service-desk-kpi='true']")) as HTMLElement | undefined;
  addClass(hero, "sd-hero");

  if (hero) {
    const heroKids = directChildren(hero);
    addClass(heroKids[0], "sd-hero-copy");
    addClass(heroKids[1], "sd-kpi-grid");
    hero.querySelectorAll("[data-service-desk-kpi='true']").forEach((card) => addClass(card, "sd-kpi-card"));
  }

  const viewContainer = pageChildren.find((child) => child !== hero && child.tagName === "DIV") as HTMLElement | undefined;
  addClass(viewContainer, "sd-view-container");

  const sections = directChildren(viewContainer).filter((child) => child.tagName === "SECTION");

  sections.forEach((section) => {
    const sectionText = textOf(section).toLowerCase();

    if (sectionText.includes("knowledge base")) {
      addClass(section, "sd-kb-panel");
      section.querySelectorAll("table").forEach((table) => addClass(table, "sd-kb-table"));
      return;
    }

    if (
      section.querySelector("[data-ticket-row='true']") ||
      sectionText.includes("no incident found") ||
      section.querySelector("input[placeholder*='Search request']")
    ) {
      addClass(section, "sd-list-panel");

      directChildren(section).forEach((child) => {
        const childText = textOf(child).toLowerCase();

        if (child.querySelector("input[placeholder*='Search request']")) {
          addClass(child, "sd-commandbar");
        } else if (childText.includes("find incident") && child.querySelector("input")) {
          addClass(child, "sd-advanced-panel");
        } else if (child.querySelector("[data-ticket-row='true']") || childText.includes("no incident found")) {
          addClass(child, "sd-table-area");

          const empty = directChildren(child).find((item) => textOf(item).toLowerCase().includes("no incident found"));
          addClass(empty, "sd-empty-state");

          const tableWrap = directChildren(child).find((item) => item.querySelector("[data-ticket-row='true']") || looksLikeTicketTableHeader(item));
          addClass(tableWrap, "sd-table-wrap");

          if (tableWrap) {
            directChildren(tableWrap).forEach((row) => {
              if (looksLikeTicketTableHeader(row)) {
                addClass(row, "sd-table-row", "sd-table-head");
              } else if ((row as HTMLElement).dataset?.ticketRow === "true") {
                addClass(row, "sd-table-row", "sd-ticket-row");
              }

              directChildren(row).forEach((cell, index) => {
                addClass(cell, "sd-cell");
                if (index === 0) addClass(cell, "sd-no-cell");
                if (index === directChildren(row).length - 1) addClass(cell, "sd-action-cell");
              });
            });
          }
        } else if (child.textContent?.includes("Page")) {
          addClass(child, "sd-pagination");
        }
      });
    }
  });

  root.querySelectorAll(".sd-select").forEach((el) => addClass(el, "sd-filter-control"));
  root.querySelectorAll("label").forEach((label) => {
    if (label.querySelector("input")) addClass(label, "sd-field");
  });

  decorateButtons(root);
}

function decoratePortals() {
  document.querySelectorAll(".sd-select-menu, div[role='listbox']").forEach((menu) => {
    addClass(menu, "sd-select-menu");
    menu.querySelectorAll("button[role='option']").forEach((option) => addClass(option, "sd-select-option"));
  });
}

function run() {
  document.body.classList.add("sd-ui-injected-active");

  document.querySelectorAll<HTMLElement>("main[data-section='service-desk']").forEach((root) => {
    decorateServiceDeskRoot(root);
  });

  decoratePortals();
}

function schedule() {
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    run();
  });
}

export function installServiceDeskUiInjection() {
  if (typeof document === "undefined") return () => {};

  run();
  window.setTimeout(run, 0);
  window.setTimeout(run, 120);
  window.setTimeout(run, 500);

  observer?.disconnect();
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer?.disconnect();
    observer = null;
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
  };
}
