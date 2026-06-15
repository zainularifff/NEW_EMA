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
const FETCH_ORIGINAL_KEY = "__emaOriginalFetchForDynamicReports";
const PRINT_PATCHED_KEY = "__emaDynamicReportPrintGuardInstalled";

function safeJsonParse(value: any): AnyRecord | null {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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

function cleanDynamicText(value: any, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text
    .replace(/AI Executive Summary/gi, "AI Dynamic Report")
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
    "generated by gemini flash based on the selected report title"
  ];
  return markers.some((marker) => text.includes(marker));
}

function numberFromMetrics(metrics: AnyRecord | undefined, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = Number(metrics?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function reportSignal(metrics: AnyRecord | undefined) {
  const endpointTotal = numberFromMetrics(metrics, ["totalEndpoints", "endpointTotal", "assets"], 0);
  const online = numberFromMetrics(metrics, ["onlineEndpoints", "online"], 0);
  const offline = numberFromMetrics(metrics, ["offlineEndpoints", "offline"], 0);
  const stale = numberFromMetrics(metrics, ["staleEndpoints", "stale"], 0);
  const openTickets = numberFromMetrics(metrics, ["openTickets", "totalTickets", "tickets"], 0);
  const sla = numberFromMetrics(metrics, ["slaBreached", "slaBreachCandidates", "slaBreaches"], 0);
  const software = numberFromMetrics(metrics, ["softwareRows", "softwareRecords", "totalSoftwareRecords", "distinctSoftware"], 0);
  const reachability = endpointTotal ? Math.round((online / Math.max(endpointTotal, 1)) * 100) : numberFromMetrics(metrics, ["onlineRate"], 0);
  return { endpointTotal, online, offline, stale, openTickets, sla, software, reachability };
}

function splitParagraphs(value: any) {
  return String(value ?? "")
    .split(/(?:\n{2,}|\r?\n|(?<=\.)\s+(?=[A-Z0-9]))/)
    .map((item) => cleanDynamicText(item))
    .filter(Boolean);
}

function buildFallbackNarrative(definition: DynamicReportDefinition, metrics: AnyRecord | undefined) {
  const signal = reportSignal(metrics);
  const reportName = definition.title.replace(/ Report$/i, "");

  if (definition.id === "dynamic-compliance-report") {
    return {
      title: "Compliance posture requires evidence-led validation",
      paragraphs: [
        `This ${definition.title.toLowerCase()} reviews ${signal.endpointTotal} endpoint record(s), ${signal.software} software inventory signal(s) and ${signal.openTickets} service item(s) to determine whether the current scope is ready for audit or governance sign-off.`,
        `The main compliance concern is evidence reliability: ${signal.offline} endpoint(s) are offline or not online and ${signal.stale} endpoint(s) show stale telemetry, which can weaken the confidence of asset, OS and software compliance records.`,
        `Management should prioritise exception ownership, OS support validation and software governance evidence so that compliance gaps are closed with traceable action, not only reported as operational statistics.`
      ],
      findings: [
        `Compliance evidence covers ${signal.endpointTotal} endpoint record(s) with ${signal.reachability}% reachability.`,
        `${signal.stale} stale telemetry item(s) require evidence validation before audit reporting.`,
        `${signal.openTickets} service item(s) and ${signal.sla} SLA exposure signal(s) should be checked for compliance impact.`
      ]
    };
  }

  if (definition.id === "dynamic-cost-saving-report") {
    return {
      title: "Cost optimisation opportunities should be converted into tracked savings actions",
      paragraphs: [
        `This ${definition.title.toLowerCase()} evaluates the current endpoint and software footprint to identify where refresh planning, software rationalisation and operational cleanup can reduce avoidable cost.`,
        `${signal.software} software inventory record(s) and ${signal.endpointTotal} endpoint record(s) provide the baseline for renewal review, duplicate tooling checks and resource planning. Offline or stale endpoint evidence should be cleaned first so savings decisions are based on reliable usage visibility.`,
        `The recommended management approach is to separate quick-win cleanup from planned procurement decisions, then track each saving opportunity with owner, target date and expected financial impact.`
      ],
      findings: [
        `${signal.software} software record(s) can support renewal cleanup and rationalisation review.`,
        `${signal.endpointTotal} endpoint record(s) are available for refresh and utilisation planning.`,
        `${signal.offline + signal.stale} endpoint evidence gap(s) should be resolved before final savings sign-off.`
      ]
    };
  }

  return {
    title: `${reportName} exposure should be prioritised by business impact and remediation ownership`,
    paragraphs: [
      `This ${definition.title.toLowerCase()} evaluates endpoint availability, stale telemetry, SLA pressure and software exposure to identify where management action should be prioritised.`,
      `The current scope shows ${signal.offline} offline or not-online endpoint(s), ${signal.stale} stale telemetry item(s), and ${signal.sla} SLA exposure signal(s). These items should be reviewed together because unresolved operational gaps can become security, compliance or service-continuity risk.`,
      `Management should assign risk owners, confirm severity, agree target dates and track remediation evidence so that risk treatment is visible before the next governance review.`
    ],
    findings: [
      `${signal.offline} endpoint availability risk signal(s) require owner validation.`,
      `${signal.stale} telemetry confidence issue(s) can reduce risk reporting accuracy.`,
      `${signal.sla} SLA exposure signal(s) should be assessed for escalation and remediation priority.`
    ]
  };
}

function dynamicAiInstruction(definition: DynamicReportDefinition) {
  return [
    `Generate a fresh ${definition.title} using Gemini Flash style narrative.`,
    `The report must focus only on ${definition.promptFocus}.`,
    `Do not reuse the Executive Summary template, do not use the heading "Immediate management attention is required", and do not write generic endpoint-only paragraphs unless they support ${definition.title}.`,
    "Return unique narrative content for executiveSummary, keyFindings, managementConclusion and recommendations.",
    "Use management-ready business language, but keep the wording specific to the selected report title and available evidence."
  ].join(" ");
}

function normaliseDynamicSections(sections: any[], definition: DynamicReportDefinition) {
  const sourceSections = Array.isArray(sections) ? sections : [];
  const mapped = sourceSections.map((section, index) => {
    const type = String(section?.type || "table");
    const title = definition.sectionTitles[type] || `${definition.title} Section ${index + 1}`;
    return {
      ...section,
      title,
      rows: Array.isArray(section?.rows) ? section.rows : []
    };
  });

  if (!mapped.some((section) => section.type === "kpi")) {
    mapped.unshift({
      type: "kpi",
      title: definition.sectionTitles.kpi,
      rows: [
        { label: "Report Type", value: definition.type, note: definition.summaryLabel },
        { label: "AI Mode", value: "Gemini Flash", note: "Generated based on the selected dynamic report title." },
        { label: "Output Focus", value: definition.title, note: definition.description }
      ]
    });
  }

  return mapped;
}

function normaliseRecommendations(rawPayload: AnyRecord, definition: DynamicReportDefinition) {
  const source = Array.isArray(rawPayload.recommendations) ? rawPayload.recommendations : [];
  const cleaned = source
    .map((item: any) => {
      if (typeof item === "string") return { priority: "AI", action: cleanDynamicText(item) };
      const action = cleanDynamicText(item?.action || item?.recommendation || item?.description || "");
      if (!action || isStaticExecutiveTemplate(action)) return null;
      return { ...item, priority: item?.priority || item?.severity || "AI", action };
    })
    .filter(Boolean);
  return cleaned.length ? cleaned : definition.fallbackRecommendations;
}

function normaliseDynamicPayload(rawPayload: AnyRecord, requestPayload: AnyRecord, definition: DynamicReportDefinition) {
  const existingReport = rawPayload.report || {};
  const metrics = rawPayload.metrics || {};
  const rawNarrative = rawPayload.narrative || {};
  const fallbackNarrative = buildFallbackNarrative(definition, metrics);
  const rawSummary = cleanDynamicText(rawNarrative.executiveSummary || rawNarrative.summary || "");
  const useRawSummary = rawSummary && !isStaticExecutiveTemplate(rawSummary);
  const rawConclusion = cleanDynamicText(rawNarrative.managementConclusion || "");
  const useRawConclusion = rawConclusion && !isStaticExecutiveTemplate(rawConclusion);
  const rawTitle = cleanDynamicText(rawNarrative.title || "");
  const useRawTitle = rawTitle && !isStaticExecutiveTemplate(rawTitle);

  const existingFindings = Array.isArray(rawNarrative.keyFindings) ? rawNarrative.keyFindings : [];
  const aiFindings = existingFindings
    .map((item: any) => cleanDynamicText(item))
    .filter((item: string) => item && !isStaticExecutiveTemplate(item));
  const findings = (aiFindings.length ? aiFindings : fallbackNarrative.findings)
    .filter((item: string, index: number, list: string[]) => list.indexOf(item) === index)
    .slice(0, 7);
  const recommendations = normaliseRecommendations(rawPayload, definition);

  const normalised = {
    ...rawPayload,
    mode: "dynamic-reporting",
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
      dynamicReportCategory: "Dynamic Reporting"
    },
    narrative: {
      ...rawNarrative,
      title: useRawTitle ? rawTitle : fallbackNarrative.title,
      executiveSummary: useRawSummary ? rawSummary : fallbackNarrative.paragraphs.join("\n\n"),
      keyFindings: findings,
      managementConclusion: useRawConclusion ? rawConclusion : `${definition.title} requires owner-led follow-up based on AI findings, available evidence and management priority.`,
      recommendations: recommendations.map((item: any) => item.action)
    },
    sections: normaliseDynamicSections(rawPayload.sections, definition),
    recommendations,
    dataSources: Array.isArray(rawPayload.dataSources) ? rawPayload.dataSources : [],
    exportData: rawPayload.exportData || {}
  };

  if (typeof window !== "undefined") {
    (window as any)[LAST_DYNAMIC_PAYLOAD_KEY] = normalised;
  }

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
  if (nestedDefinition) {
    return {
      ...body,
      data: normaliseDynamicPayload(nestedPayload, requestPayload || {}, nestedDefinition)
    };
  }

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
    aiTemperature: payload.aiTemperature ?? 0.75,
    aiUniquenessSeed: `${definition.id}-${Date.now()}`
  };
}

function htmlEscape(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printParagraphsHtml(payload: AnyRecord) {
  const narrative = payload?.narrative || {};
  const paragraphs = splitParagraphs(narrative.executiveSummary || narrative.managementConclusion).slice(0, 4);
  return (paragraphs.length ? paragraphs : ["AI narrative was not returned for this dynamic report. Please regenerate after confirming the Gemini backend configuration."])
    .map((paragraph) => `<p class="pdf-justified">${htmlEscape(paragraph)}</p>`)
    .join("");
}

function normaliseDynamicPrintHtml(html: string) {
  if (typeof window === "undefined") return html;
  const payload = (window as any)[LAST_DYNAMIC_PAYLOAD_KEY];
  const definition = resolveDynamicDefinition(payload?.filters || null, payload || null);
  if (!payload || !definition || !html.includes("Executive Management Brief")) return html;

  const headline = cleanDynamicText(payload.narrative?.title || definition.title);
  const replacement = `<div class="pdf-summary-copy">
          <span class="pdf-eyebrow">${htmlEscape(definition.title)} AI Narrative</span>
          <h2>${htmlEscape(headline)}</h2>
          ${printParagraphsHtml(payload)}
        </div>`;

  return html.replace(/<div class="pdf-summary-copy">[\s\S]*?<\/div>\s*\$?\{?/, (match) => {
    const suffix = match.endsWith("${") ? "${" : "";
    return `${replacement}${suffix}`;
  });
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

function installDynamicReportFetchNormaliser() {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;

  const globalWindow = window as any;
  if (globalWindow[FETCH_PATCHED_KEY]) return;

  const originalFetch = window.fetch.bind(window);
  globalWindow[FETCH_ORIGINAL_KEY] = originalFetch;
  globalWindow[FETCH_PATCHED_KEY] = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const isReportEndpoint = url.includes("/api/reports/preview") || url.includes("/api/reports/generate");
    let payload = requestBody(input, init);
    const definition = isReportEndpoint ? resolveDynamicDefinition(payload, null) : null;
    let nextInit = init;

    if (definition && payload && typeof init?.body === "string") {
      payload = enrichDynamicRequestBody(payload, definition);
      nextInit = {
        ...init,
        body: JSON.stringify(payload)
      };
    }

    const response = await originalFetch(input, nextInit);
    if (!isReportEndpoint || !definition) return response;

    try {
      const json = await response.clone().json();
      const normalised = normaliseDynamicResponseBody(json, payload);
      const headers = new Headers(response.headers);
      headers.set("content-type", "application/json");
      return new Response(JSON.stringify(normalised), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  };
}

installDynamicReportFetchNormaliser();
installDynamicReportPrintGuard();

export default function ReportDynamicWrapper() {
  return <Report />;
}
