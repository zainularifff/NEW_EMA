import Report from "./Report";

type AnyRecord = Record<string, any>;

type DynamicReportDefinition = {
  id: string;
  title: string;
  type: string;
  description: string;
  source: string;
  color: string;
  summaryLabel: string;
  promptFocus: string;
  sectionTitles: Record<string, string>;
  fallbackRecommendations: { priority: string; action: string }[];
};

const DYNAMIC_REPORTS: Record<string, DynamicReportDefinition> = {
  "dynamic-compliance-report": {
    id: "dynamic-compliance-report",
    title: "Compliance Report",
    type: "Compliance",
    description: "AI-generated compliance report with posture analysis, evidence summary and governance actions.",
    source: "Endpoint Inventory + Software Inventory + OS Compliance + Service Desk SLA",
    color: "#f59e0b",
    summaryLabel: "Compliance posture analysis",
    promptFocus: "audit readiness, compliance gaps, OS support posture, software governance evidence, SLA exposure and exception ownership",
    sectionTitles: {
      kpi: "Compliance Posture KPI",
      bar: "Compliance Gap Breakdown",
      donut: "Compliance Control Distribution",
      risk: "Compliance Exceptions & Audit Exposure",
      table: "Compliance Evidence Register"
    },
    fallbackRecommendations: [
      { priority: "High", action: "Validate compliance exceptions with owner, evidence status and target closure date." },
      { priority: "Medium", action: "Review OS support, software governance and SLA evidence before audit sign-off." },
      { priority: "Medium", action: "Prepare a compliance action register for management review." }
    ]
  },
  "dynamic-cost-saving-report": {
    id: "dynamic-cost-saving-report",
    title: "Cost Saving Report",
    type: "Cost Saving",
    description: "AI-generated cost saving report for refresh planning, software rationalisation and optimisation opportunities.",
    source: "Hardware Lifecycle + Software Inventory + Endpoint Utilisation + Resource Planning",
    color: "#10b981",
    summaryLabel: "Cost optimisation analysis",
    promptFocus: "cost optimisation, unused software, duplicate tools, endpoint refresh planning, renewal cleanup and avoidable support workload",
    sectionTitles: {
      kpi: "Cost Saving Opportunity KPI",
      bar: "Savings Opportunity Breakdown",
      donut: "Optimisation Area Distribution",
      risk: "Cost Leakage & Optimisation Risks",
      table: "Cost Saving Evidence Register"
    },
    fallbackRecommendations: [
      { priority: "High", action: "Identify software rationalisation and renewal cleanup candidates." },
      { priority: "Medium", action: "Prioritise aging endpoint refresh planning by business impact and support cost." },
      { priority: "Medium", action: "Create a savings tracker covering cleanup, renewal and procurement decisions." }
    ]
  },
  "dynamic-risk-management-report": {
    id: "dynamic-risk-management-report",
    title: "Risk Management Report",
    type: "Risk",
    description: "AI-generated risk management report with exposure analysis, severity view and remediation priorities.",
    source: "Endpoint Risk + Unsupported OS + Service Desk SLA + Data Quality + Software Risk",
    color: "#ef4444",
    summaryLabel: "Risk exposure analysis",
    promptFocus: "risk exposure, severity prioritisation, unsupported OS, SLA pressure, stale telemetry, data quality, software risk and remediation ownership",
    sectionTitles: {
      kpi: "Risk Exposure KPI",
      bar: "Severity Breakdown",
      donut: "Risk Distribution",
      risk: "Risk Register & Remediation Priority",
      table: "Risk Evidence Register"
    },
    fallbackRecommendations: [
      { priority: "High", action: "Prioritise high-risk endpoints, unsupported OS and SLA breach candidates for remediation." },
      { priority: "High", action: "Assign risk owners and target dates for each severity item in the register." },
      { priority: "Medium", action: "Track exception approval and remediation evidence before the next governance review." }
    ]
  }
};

const DYNAMIC_REPORT_IDS = Object.keys(DYNAMIC_REPORTS);
const LAST_DYNAMIC_PAYLOAD_KEY = "__emaLastDynamicReportPayload";
const FETCH_PATCHED_KEY = "__emaDynamicReportFetchNormalised";
const PRINT_PATCHED_KEY = "__emaDynamicReportPrintGuardInstalled";
const DAILY_CACHE_PREFIX = "__emaDynamicReportDailyCache:";
const DAILY_DISCLAIMER = "AI Dynamic Reporting is generated once per day for each selected report title. The content reflects the latest available dataset at generation time and should be reviewed by the report owner before management sign-off.";

function safeJsonParse(value: any): AnyRecord | null {
  if (!value || typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
}

function requestBody(input: RequestInfo | URL, init?: RequestInit): AnyRecord | null {
  const directBody = typeof init?.body === "string" ? safeJsonParse(init.body) : null;
  if (directBody) return directBody;
  if (typeof Request !== "undefined" && input instanceof Request) {
    const contentType = input.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
  }
  return null;
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return String(input || "");
}

function reportDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dailyCacheKey(definition: DynamicReportDefinition) {
  return `${DAILY_CACHE_PREFIX}${definition.id}:${reportDayKey()}`;
}

function cleanDynamicText(value: any, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text
    .replace(/AI Executive Summary/gi, "AI Dynamic Report")
    .replace(/Executive Management Brief/gi, "AI Dynamic Narrative")
    .replace(/Executive Summary/gi, "Dynamic Report")
    .replace(/executive summary/g, "dynamic report");
}

function isStaticExecutiveTemplate(value: any) {
  const text = String(value ?? "").toLowerCase();
  if (!text) return true;
  const markers = [
    "immediate management attention is required",
    "the current report scope covers",
    "endpoint availability directly affects support visibility",
    "management should treat this as a reporting-confidence issue",
    "software inventory record(s) are available in scope",
    "executive management brief",
    "recommended response is to prioritise breached",
    "reporting cycle",
    "offline or not online",
    "stale or missing last-seen telemetry"
  ];
  return markers.some((marker) => text.includes(marker));
}

function dynamicAiInstruction(definition: DynamicReportDefinition) {
  return [
    `Generate a fresh ${definition.title} using Gemini Flash narrative.`,
    `Focus only on ${definition.promptFocus}.`,
    `Do not reuse Executive Summary wording, do not use the heading Immediate management attention is required, and do not produce generic endpoint-only paragraphs unless they directly support ${definition.title}.`,
    "Do not copy the same paragraph structure across dynamic report titles.",
    "Every paragraph, finding, section insight and recommendation must be specific to the selected report title.",
    "This AI Dynamic Reporting output is generated once per day for this report title; include a short disclaimer that the report reflects the latest available dataset at generation time and requires owner review before management sign-off."
  ].join(" ");
}

function fallbackNarrative(definition: DynamicReportDefinition) {
  const byId: Record<string, { title: string; paragraphs: string[]; findings: string[] }> = {
    "dynamic-compliance-report": {
      title: "Compliance evidence requires owner validation before sign-off",
      paragraphs: [
        "This Compliance Report is an AI-assisted governance review for audit readiness, control evidence and exception ownership. The analysis should focus on whether inventory, OS, software and service records are strong enough to support compliance sign-off.",
        "The management priority is to confirm every compliance gap has a named owner, supporting evidence, target closure date and an approved acceptance status before it is presented as closed or acceptable.",
        "The recommended response is to validate compliance exceptions, confirm unsupported or unverified assets, and prepare a traceable evidence register before management approval."
      ],
      findings: [
        "Compliance output must be reviewed against evidence quality.",
        "Exception ownership should be confirmed before sign-off.",
        "Audit-ready records should include owner, status and closure date."
      ]
    },
    "dynamic-cost-saving-report": {
      title: "Cost saving opportunities require tracked financial ownership",
      paragraphs: [
        "This Cost Saving Report is an AI-assisted optimisation review for recurring cost, renewal exposure and avoidable support workload. The analysis should focus on savings opportunities rather than repeat endpoint health commentary.",
        "Management should separate quick-win savings from planned procurement decisions so every opportunity has an expected value, owner, dependency and target review date.",
        "The recommended response is to create a savings tracker covering unused software, overlapping applications, refresh candidates and procurement decisions that can reduce recurring cost."
      ],
      findings: [
        "Savings items need owner and estimated value.",
        "Software rationalisation should be reviewed before renewal.",
        "Refresh planning should prioritise avoidable support cost."
      ]
    },
    "dynamic-risk-management-report": {
      title: "Risk exposure requires severity-based remediation ownership",
      paragraphs: [
        "This Risk Management Report is an AI-assisted exposure review for severity, remediation accountability and governance escalation. The analysis should convert operational signals into a risk treatment plan.",
        "Management should review each risk signal by business impact, likelihood, owner and target date so unresolved operational gaps are converted into accountable remediation actions.",
        "The recommended response is to maintain a risk register with severity, exception approval status, remediation evidence and escalation path for overdue items."
      ],
      findings: [
        "Risk items need severity and owner validation.",
        "Unsupported or stale assets should be treated as exposure signals.",
        "Remediation evidence should be tracked before governance review."
      ]
    }
  };
  return byId[definition.id];
}

function safeDynamicField(value: any, definition: DynamicReportDefinition, fallback: string) {
  const cleaned = cleanDynamicText(value);
  if (!cleaned || isStaticExecutiveTemplate(cleaned)) return fallback;
  return cleaned;
}

function sanitiseDynamicRow(row: any, definition: DynamicReportDefinition, index: number) {
  if (!row || typeof row !== "object") return row;
  const fallback = fallbackNarrative(definition);
  const insight = fallback.findings[index % fallback.findings.length] || definition.summaryLabel;
  const result: AnyRecord = { ...row };
  Object.keys(result).forEach((key) => {
    if (typeof result[key] !== "string") return;
    result[key] = safeDynamicField(result[key], definition, insight);
  });
  return result;
}

function normaliseDynamicSections(sections: any[], definition: DynamicReportDefinition) {
  const sourceSections = Array.isArray(sections) ? sections : [];
  const mapped = sourceSections.map((section, index) => {
    const type = String(section?.type || "table");
    const rows = Array.isArray(section?.rows) ? section.rows.map((row: any, rowIndex: number) => sanitiseDynamicRow(row, definition, rowIndex)) : [];
    return { ...section, title: definition.sectionTitles[type] || `${definition.title} Section ${index + 1}`, rows };
  });

  mapped.unshift({
    type: "notice",
    title: "AI Dynamic Reporting Notice",
    rows: [
      { label: "Generation Frequency", value: "Once per day", note: `Daily report key: ${definition.id}-${reportDayKey()}` },
      { label: "Disclaimer", value: DAILY_DISCLAIMER, note: definition.title }
    ]
  });

  if (!mapped.some((section) => section.type === "kpi")) {
    mapped.unshift({
      type: "kpi",
      title: definition.sectionTitles.kpi,
      rows: [
        { label: "Report Type", value: definition.type, note: definition.summaryLabel },
        { label: "AI Mode", value: "Gemini Flash", note: "Generated once per day based on the selected dynamic report title." },
        { label: "Output Focus", value: definition.title, note: definition.description }
      ]
    });
  }
  return mapped;
}

function normaliseRecommendations(rawPayload: AnyRecord, definition: DynamicReportDefinition) {
  const source = Array.isArray(rawPayload.recommendations) ? rawPayload.recommendations : [];
  const cleaned = source.map((item: any) => {
    if (typeof item === "string") {
      const action = safeDynamicField(item, definition, "");
      return action ? { priority: "AI", action } : null;
    }
    const action = safeDynamicField(item?.action || item?.recommendation || item?.description || "", definition, "");
    if (!action) return null;
    return { ...item, priority: item?.priority || item?.severity || "AI", action };
  }).filter(Boolean);
  return cleaned.length ? cleaned : definition.fallbackRecommendations;
}

function hasUsableAiNarrative(payload: AnyRecord, definition: DynamicReportDefinition) {
  const narrative = payload?.narrative || {};
  const summary = cleanDynamicText(narrative.executiveSummary || narrative.summary || "");
  const title = cleanDynamicText(narrative.title || "");
  return Boolean(
    payload?.report?.id === definition.id &&
    summary &&
    title &&
    !isStaticExecutiveTemplate(summary) &&
    !isStaticExecutiveTemplate(title)
  );
}

function readDailyCache(definition: DynamicReportDefinition) {
  if (typeof window === "undefined") return null;
  const cached = safeJsonParse(window.localStorage?.getItem(dailyCacheKey(definition)) || "");
  if (!cached || !hasUsableAiNarrative(cached, definition)) return null;
  return cached;
}

function writeDailyCache(definition: DynamicReportDefinition, payload: AnyRecord) {
  if (typeof window === "undefined" || !hasUsableAiNarrative(payload, definition)) return;
  try {
    window.localStorage.setItem(dailyCacheKey(definition), JSON.stringify(payload));
  } catch {
    // Ignore storage quota or privacy-mode errors. The report still renders from the live payload.
  }
}

function normaliseDynamicPayload(rawPayload: AnyRecord, requestPayload: AnyRecord, definition: DynamicReportDefinition) {
  const existingReport = rawPayload.report || {};
  const rawNarrative = rawPayload.narrative || {};
  const fallback = fallbackNarrative(definition);
  const rawSummary = cleanDynamicText(rawNarrative.executiveSummary || rawNarrative.summary || "");
  const rawConclusion = cleanDynamicText(rawNarrative.managementConclusion || "");
  const rawTitle = cleanDynamicText(rawNarrative.title || "");
  const useRawSummary = rawSummary && !isStaticExecutiveTemplate(rawSummary);
  const useRawConclusion = rawConclusion && !isStaticExecutiveTemplate(rawConclusion);
  const useRawTitle = rawTitle && !isStaticExecutiveTemplate(rawTitle);
  const aiFindings = (Array.isArray(rawNarrative.keyFindings) ? rawNarrative.keyFindings : [])
    .map((item: any) => cleanDynamicText(item))
    .filter((item: string) => item && !isStaticExecutiveTemplate(item));
  const recommendations = normaliseRecommendations(rawPayload, definition);

  const normalised = {
    ...rawPayload,
    success: rawPayload.success !== false,
    mode: "dynamic-reporting",
    generatedAt: rawPayload.generatedAt || new Date().toISOString(),
    report: {
      ...existingReport,
      id: definition.id,
      title: definition.title,
      type: definition.type,
      description: definition.description,
      source: definition.source,
      category: "Dynamic Reporting",
      outputs: Array.isArray(existingReport.outputs) && existingReport.outputs.length ? existingReport.outputs : ["PDF", "PowerPoint", "Excel"]
    },
    filters: {
      ...(rawPayload.filters || {}),
      ...requestPayload,
      useAiAnalysis: true,
      aiProvider: "google",
      aiEngine: "gemini-flash",
      aiModel: requestPayload.aiModel || "gemini-2.5-flash",
      aiReportMode: "dynamic-reporting",
      aiPrompt: requestPayload.aiPrompt || dynamicAiInstruction(definition),
      forceAiNarrative: true,
      disableStaticNarrative: true,
      dynamicReportType: definition.id,
      dynamicReportTitle: definition.title,
      dynamicReportCategory: "Dynamic Reporting",
      generationFrequency: "once-per-day",
      dailyGenerationKey: `${definition.id}-${reportDayKey()}`,
      aiDisclaimer: DAILY_DISCLAIMER
    },
    narrative: {
      ...rawNarrative,
      title: useRawTitle ? rawTitle : fallback.title,
      executiveSummary: `${useRawSummary ? rawSummary : fallback.paragraphs.join("\n\n")}\n\n${DAILY_DISCLAIMER}`,
      keyFindings: (aiFindings.length ? aiFindings : fallback.findings).slice(0, 7),
      managementConclusion: useRawConclusion ? rawConclusion : `${definition.title} requires owner-led follow-up based on AI findings, available evidence and management priority.`,
      disclaimer: DAILY_DISCLAIMER,
      recommendations: recommendations.map((item: any) => item.action)
    },
    sections: normaliseDynamicSections(rawPayload.sections, definition),
    recommendations,
    dataSources: Array.isArray(rawPayload.dataSources) ? rawPayload.dataSources : [],
    exportData: { ...(rawPayload.exportData || {}), aiDisclaimer: DAILY_DISCLAIMER, generationFrequency: "once-per-day" }
  };

  if (typeof window !== "undefined") (window as any)[LAST_DYNAMIC_PAYLOAD_KEY] = normalised;
  writeDailyCache(definition, normalised);
  return normalised;
}

function resolveDynamicDefinition(requestPayload: AnyRecord | null, payload: AnyRecord | null) {
  const candidates = [
    requestPayload?.dynamicReportType,
    requestPayload?.reportId,
    requestPayload?.report?.id,
    payload?.filters?.dynamicReportType,
    payload?.report?.id
  ].map((item) => String(item || ""));
  const id = candidates.find((candidate) => DYNAMIC_REPORT_IDS.includes(candidate));
  return id ? DYNAMIC_REPORTS[id] : null;
}

function normaliseDynamicResponseBody(body: AnyRecord, requestPayload: AnyRecord | null) {
  const directDefinition = resolveDynamicDefinition(requestPayload, body);
  if (directDefinition) return normaliseDynamicPayload(body, requestPayload || {}, directDefinition);
  const nestedPayload = body?.data;
  const nestedDefinition = nestedPayload && typeof nestedPayload === "object" ? resolveDynamicDefinition(requestPayload, nestedPayload) : null;
  if (nestedDefinition) return { ...body, data: normaliseDynamicPayload(nestedPayload, requestPayload || {}, nestedDefinition) };
  return body;
}

function enrichDynamicRequestBody(payload: AnyRecord | null, definition: DynamicReportDefinition | null) {
  if (!payload || !definition) return payload;
  return {
    ...payload,
    useAiAnalysis: true,
    aiProvider: "google",
    aiEngine: "gemini-flash",
    aiModel: payload.aiModel || "gemini-2.5-flash",
    aiReportMode: "dynamic-reporting",
    dynamicReportType: definition.id,
    dynamicReportTitle: definition.title,
    dynamicReportCategory: "Dynamic Reporting",
    aiPrompt: payload.aiPrompt || dynamicAiInstruction(definition),
    aiInstruction: payload.aiInstruction || dynamicAiInstruction(definition),
    forceAiNarrative: true,
    disableStaticNarrative: true,
    aiTemperature: payload.aiTemperature ?? 0.85,
    aiUniquenessSeed: `${definition.id}-${reportDayKey()}`,
    generationFrequency: "once-per-day",
    dailyGenerationKey: `${definition.id}-${reportDayKey()}`,
    aiDisclaimer: DAILY_DISCLAIMER
  };
}

function htmlEscape(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printParagraphsHtml(payload: AnyRecord) {
  const narrative = payload?.narrative || {};
  const paragraphs = String(narrative.executiveSummary || narrative.managementConclusion || "")
    .split(/(?:\n{2,}|\r?\n)/)
    .map((item) => cleanDynamicText(item))
    .filter(Boolean)
    .slice(0, 5);
  return paragraphs.map((paragraph) => `<p class="pdf-justified">${htmlEscape(paragraph)}</p>`).join("");
}

function normaliseDynamicPrintHtml(html: string) {
  if (typeof window === "undefined") return html;
  const payload = (window as any)[LAST_DYNAMIC_PAYLOAD_KEY];
  const definition = resolveDynamicDefinition(payload?.filters || null, payload || null);
  if (!payload || !definition) return html;

  let patched = html
    .replace(/Executive Management Brief/g, `${definition.title} AI Dynamic Narrative`)
    .replace(/Immediate management attention is required/g, cleanDynamicText(payload.narrative?.title || definition.title));

  const headline = cleanDynamicText(payload.narrative?.title || definition.title);
  const replacement = `<div class="pdf-summary-copy"><span class="pdf-eyebrow">${htmlEscape(definition.title)} AI Dynamic Narrative</span><h2>${htmlEscape(headline)}</h2>${printParagraphsHtml(payload)}<p class="pdf-justified"><strong>AI Dynamic Reporting Notice:</strong> ${htmlEscape(DAILY_DISCLAIMER)}</p></div>`;

  if (patched.includes("pdf-summary-copy")) {
    patched = patched.replace(/<div class="pdf-summary-copy">[\s\S]*?<\/div>/, replacement);
  }
  return patched;
}

function installDynamicReportPrintGuard() {
  if (typeof window === "undefined" || typeof Document === "undefined") return;
  const globalWindow = window as any;
  if (globalWindow[PRINT_PATCHED_KEY]) return;
  globalWindow[PRINT_PATCHED_KEY] = true;
  const originalWrite = Document.prototype.write;
  Document.prototype.write = function patchedWrite(...args: string[]) {
    const patchedArgs = args.map((arg) => typeof arg === "string" ? normaliseDynamicPrintHtml(arg) : arg);
    return originalWrite.apply(this, patchedArgs as any);
  };
}

function responseFromPayload(payload: AnyRecord, response?: Response) {
  const headers = new Headers(response?.headers || undefined);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(payload), {
    status: response?.status || 200,
    statusText: response?.statusText || "OK",
    headers
  });
}

function installDynamicReportFetchNormaliser() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  const globalWindow = window as any;
  if (globalWindow[FETCH_PATCHED_KEY]) return;
  const originalFetch = window.fetch.bind(window);
  globalWindow[FETCH_PATCHED_KEY] = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const isReportEndpoint = url.includes("/api/reports/preview") || url.includes("/api/reports/generate");
    let payload = requestBody(input, init);
    const definition = isReportEndpoint ? resolveDynamicDefinition(payload, null) : null;
    if (!isReportEndpoint || !definition) return originalFetch(input, init);

    const cached = readDailyCache(definition);
    if (cached) {
      (window as any)[LAST_DYNAMIC_PAYLOAD_KEY] = cached;
      return responseFromPayload(cached);
    }

    let nextInit = init;
    if (payload && typeof init?.body === "string") {
      const enriched = enrichDynamicRequestBody(payload, definition);
      payload = enriched;
      nextInit = { ...init, body: JSON.stringify(enriched) };
    }

    const response = await originalFetch(input, nextInit);
    try {
      const json = await response.clone().json();
      const normalised = normaliseDynamicResponseBody(json, payload);
      return responseFromPayload(normalised, response);
    } catch {
      const fallback = normaliseDynamicPayload({ success: true }, payload || {}, definition);
      return responseFromPayload(fallback, response);
    }
  };
}

installDynamicReportFetchNormaliser();
installDynamicReportPrintGuard();

export default function ReportDynamicWrapper() {
  return <Report />;
}
