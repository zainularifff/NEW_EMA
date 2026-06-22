type Preset = "today" | "this-week" | "this-month" | "last-30-days" | "custom";

type EnhancedRange = {
  preset: Preset;
  label: string;
  startDate: string;
  endDate: string;
};

declare global {
  interface Window {
    __emaReportDateRange?: EnhancedRange;
  }
}

const OPTIONS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day));
  return next;
}

function makeRange(preset: Preset, startOverride?: string, endOverride?: string): EnhancedRange {
  const end = new Date();
  const label = OPTIONS.find((option) => option.value === preset)?.label || "Custom Range";
  if (preset === "today") return { preset, label, startDate: iso(end), endDate: iso(end) };
  if (preset === "this-week") return { preset, label, startDate: iso(startOfWeek(end)), endDate: iso(end) };
  if (preset === "this-month") return { preset, label, startDate: iso(new Date(end.getFullYear(), end.getMonth(), 1)), endDate: iso(end) };
  if (preset === "custom") return { preset, label, startDate: startOverride || iso(end), endDate: endOverride || iso(end) };
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { preset: "last-30-days", label, startDate: iso(start), endDate: iso(end) };
}

function setRange(range: EnhancedRange) {
  window.__emaReportDateRange = range;
  document.querySelectorAll(".summary .metric").forEach((metric) => {
    const title = metric.querySelector("span")?.textContent?.trim().toLowerCase();
    const value = metric.querySelector("strong");
    if (!value) return;
    if (title === "period") value.textContent = `${range.startDate} → ${range.endDate}`;
    if (title === "date range") value.textContent = range.label;
  });
}

function styleInput(input: HTMLInputElement) {
  input.style.width = "100%";
  input.style.height = "32px";
  input.style.border = "1px solid #cfdced";
  input.style.borderRadius = "10px";
  input.style.background = "#f9fbff";
  input.style.padding = "6px 8px";
  input.style.fontWeight = "850";
  input.style.color = "#0b2447";
}

function ensureCustomInputs(field: HTMLElement, select: HTMLSelectElement) {
  let wrap = field.querySelector<HTMLDivElement>(".custom-range");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "custom-range";
    wrap.innerHTML = `<input type="date" aria-label="Report start date" /><input type="date" aria-label="Report end date" />`;
    field.appendChild(wrap);
  }
  wrap.style.gridTemplateColumns = "1fr 1fr";
  wrap.style.gap = "6px";
  wrap.style.marginTop = "6px";
  const inputs = Array.from(wrap.querySelectorAll<HTMLInputElement>("input"));
  inputs.forEach(styleInput);
  const current = window.__emaReportDateRange || makeRange("last-30-days");
  inputs[0].value = current.startDate;
  inputs[1].value = current.endDate;
  wrap.style.display = select.value === "custom" ? "grid" : "none";
  inputs.forEach((input) => {
    input.onchange = () => {
      const from = inputs[0].value || current.startDate;
      const to = inputs[1].value || current.endDate;
      const next = from > to ? makeRange("custom", from, from) : makeRange("custom", from, to);
      select.value = "custom";
      setRange(next);
    };
  });
}

function enhance() {
  const fields = Array.from(document.querySelectorAll<HTMLElement>(".builder-top .field"));
  const dateField = fields.find((field) => field.querySelector("span")?.textContent?.trim().toLowerCase() === "date range");
  const select = dateField?.querySelector<HTMLSelectElement>("select");
  if (!dateField || !select || select.dataset.enhancedRange === "1") return;

  select.dataset.enhancedRange = "1";
  select.innerHTML = OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
  const initial = window.__emaReportDateRange || makeRange("last-30-days");
  select.value = initial.preset;
  setRange(initial);
  ensureCustomInputs(dateField, select);
  select.onchange = () => {
    const next = makeRange(select.value as Preset, window.__emaReportDateRange?.startDate, window.__emaReportDateRange?.endDate);
    setRange(next);
    ensureCustomInputs(dateField, select);
  };
}

export function installReportDateRangeEnhancer() {
  setRange(window.__emaReportDateRange || makeRange("last-30-days"));
  enhance();
  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
