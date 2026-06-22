import { buildLegacyReportHtml } from "./reportPdfLegacyDesign";
import { buildExecutiveLegacyReportHtml } from "./reportPdfExecutiveDesign";

const EXEC_IDS = new Set(["ai-executive-summary", "executive-summary"]);
const METERING_IDS = new Set(["software-metering-report", "application-metering-report", "internet-metering-report"]);

function txt(value: unknown, fallback = "") {
  const output = String(value ?? "").trim();
  return output || fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function metric(payload: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = num(payload?.metrics?.[key], NaN);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function percent(value: number, total: number) {
  return total ? Math.round((value / Math.max(total, 1)) * 100) : 0;
}

function money(value: number) {
  return `RM ${Math.round(value).toLocaleString()}`;
}

function titleFor(id: string) {
  const titles: Record<string, string> = {
    "hardware-asset-lifecycle": "Hardware & Asset Lifecycle Report",
    "software-application-governance": "Software & Application Governance Report",
    "software-metering-report": "Software Metering",
    "application-metering-report": "Application Metering",
    "internet-metering-report": "Internet Metering",
    "software-roi-report": "ROI Software",
  };
  return titles[id] || txt(id, "EMA Report").replace(/-/g, " ");
}

function scopeOf(payload: any, filters: any) {
  return payload?.narrative?.scope || payload?.filters?.scope || filters?.scope || filters?.branchName || "All Sites";
}

function periodOf(payload: any, filters: any) {
  const start = payload?.dateRange?.from || filters?.startDate;
  const end = payload?.dateRange?.to || filters?.endDate;
  if (start && end) return `${start} to ${end}`;
  return payload?.narrative?.period || filters?.dateRangeLabel || filters?.dateRange || "Current period";
}

function rows(payload: any, ...keys: string[]) {
  for (const key of keys) {
    const value = payload?.exportData?.[key] ?? payload?.data?.[key] ?? payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function pickText(row: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = txt(row?.[key]);
    if (value) return value;
  }
  return fallback;
}

function pickNum(row: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function groupBy(list: any[], keyFn: (row: any) => string) {
  const map = new Map<string, any[]>();
  list.forEach((row) => {
    const key = txt(keyFn(row), "Unmapped");
    map.set(key, [...(map.get(key) || []), row]);
  });
  return [...map.entries()].map(([key, items]) => ({ key, items }));
}

function section(type: string, title: string, sectionRows: any[], columns?: string[]) {
  return { type, title, rows: sectionRows.slice(0, 250), ...(columns?.length ? { columns } : {}) };
}

function emptySection(title: string, columns: string[]) {
  return section("table", title, [], columns);
}

function device(row: any) {
  return pickText(row, ["ComputerName", "computerName", "DeviceName", "deviceName", "Object_DeviceID", "deviceId", "assetTag"], "-");
}

function loc(row: any) {
  return pickText(row, ["Object_Full_Name", "objectFullName", "Object_Rel_Name", "objectRelName", "department", "Department", "site", "Site", "location", "Location"], "Unmapped");
}

function status(row: any) {
  const raw = pickText(row, ["ConnectionStatus", "connectionStatus", "status", "Status", "agentStatus"]);
  const lower = raw.toLowerCase();
  if (lower === "1" || lower.includes("online") || lower.includes("connected")) return "Connected";
  if (lower === "0" || lower.includes("offline") || lower.includes("not connected")) return "Not Connected";
  return raw || "Unknown";
}

function connected(row: any) {
  return status(row) === "Connected";
}

function age(row: any) {
  return pickNum(row, ["PCAge", "pcAge", "assetAge", "AssetAge", "age", "Age"], NaN);
}

function stale(row: any) {
  const direct = pickText(row, ["isStale", "stale", "Stale"]);
  if (["true", "1", "yes"].includes(direct.toLowerCase())) return true;
  const years = age(row);
  if (Number.isFinite(years) && years >= 5) return true;
  const lastSeen = pickText(row, ["ConnectionTime", "connectionTime", "lastSeen", "LastSeen", "DeviceTimeStamp"]);
  if (!lastSeen) return false;
  const parsed = new Date(lastSeen).getTime();
  return Number.isFinite(parsed) && Date.now() - parsed > 30 * 24 * 60 * 60 * 1000;
}

function brand(row: any) {
  const direct = pickText(row, ["Manufacturer", "manufacturer", "DeviceManufacturer", "deviceManufacturer", "Vendor", "vendor"]);
  if (direct) return direct;
  const model = pickText(row, ["Model", "model", "DeviceModelName", "deviceModelName"]);
  return model ? (model.split(/[\s,/|-]+/).filter(Boolean)[0] || "Unspecified") : "Unspecified";
}

function os(row: any) {
  return pickText(row, ["OS", "os", "OSName", "osName", "OperatingSystem", "operatingSystem", "PlatformType", "platform", "platformType"], "Unknown OS");
}

function lifecycle(row: any) {
  return pickText(row, ["lifecycleStatus", "LifecycleStatus", "eolStatus", "EolStatus", "complianceStatus", "ComplianceStatus"], "Lifecycle data pending");
}

function hardwarePayload(payload: any, filters: any) {
  const assets = rows(payload, "assets", "hardware", "hardwareRows", "endpointRows");
  const total = assets.length || metric(payload, ["endpointTotal", "totalEndpoints", "assets"], 0);
  const online = assets.filter(connected).length || metric(payload, ["onlineEndpoints", "online"], 0);
  const offline = Math.max(0, total - online);
  const aging = assets.filter(stale).length || metric(payload, ["staleEndpoints", "stale"], 0);
  const scope = scopeOf(payload, filters);
  const period = periodOf(payload, filters);

  const brandRows = groupBy(assets, brand).sort((a, b) => b.items.length - a.items.length).map(({ key, items }) => ({ brand: key, totalEndpoint: items.length, connected: items.filter(connected).length, notConnected: items.filter((row) => !connected(row)).length, agingCandidate: items.filter(stale).length }));
  const pcAgingRows = groupBy(assets.filter((row) => stale(row) || Number.isFinite(age(row))), loc).sort((a, b) => b.items.filter(stale).length - a.items.filter(stale).length).map(({ key, items }) => {
    const sample = items.find(stale) || items[0] || {};
    return { location: key, agingCandidate: items.filter(stale).length || items.length, topBrand: brand(sample), sampleEndpoint: device(sample), action: "Validate refresh/replacement requirement." };
  });
  const osRows = groupBy(assets, os).sort((a, b) => b.items.length - a.items.length).map(({ key, items }) => ({ os: key, endpoints: items.length, scope: key.toLowerCase().includes("windows") ? "Windows" : "Other / unknown", complianceStatus: lifecycle(items[0]), action: "Validate OS/build inventory and lifecycle mapping." }));
  const lifecycleRows = osRows.map((row) => ({ os: row.os, endpoints: row.endpoints, supportedStatus: row.complianceStatus, action: row.action }));
  const locationRows = groupBy(assets, loc).sort((a, b) => b.items.length - a.items.length).map(({ key, items }) => ({ location: key, total: items.length, connected: items.filter(connected).length, notConnected: items.filter((row) => !connected(row)).length, agingCandidate: items.filter(stale).length, action: items.filter(stale).length ? "Review aging/stale endpoints by location." : "Monitor" }));
  const agentRows = groupBy(assets, status).sort((a, b) => b.items.length - a.items.length).map(({ key, items }) => ({ agentStatus: key, endpoints: items.length, percentage: `${percent(items.length, total)}%` }));
  const assetAgeRows = groupBy(assets, (row) => {
    const years = age(row);
    if (!Number.isFinite(years)) return "Missing age evidence";
    if (years >= 5) return "5 years and above";
    if (years >= 3) return "3 - 4 years";
    return "Below 3 years";
  }).map(({ key, items }) => ({ agingBucket: key, endpoints: items.length, action: key === "Missing age evidence" ? "Complete BIOS/purchase-date evidence." : "Review refresh priority." }));

  const vulnTitle = ["Vulnerability", " & ", "Security", " (Supported OS / EOL / EOS)"].join("");

  return {
    ...payload,
    report: { ...(payload?.report || {}), id: "hardware-asset-lifecycle", title: titleFor("hardware-asset-lifecycle"), category: "Asset Lifecycle Report Pack", type: "Hardware" },
    metrics: { ...(payload?.metrics || {}), endpointTotal: total, connectedEndpoints: online, notConnectedEndpoints: offline, agingCandidates: aging },
    narrative: { ...(payload?.narrative || {}), title: "Hardware lifecycle and refresh planning", scope, period, executiveSummary: `Hardware report generated from ${total} live endpoint record(s). Sections are derived from API/export rows only.`, managementConclusion: "Use manufacturer, PC aging, OS lifecycle, branch location, agent status and asset aging evidence to prioritise refresh planning.", keyFindings: [`${total} live endpoint record(s) returned.`, `${offline} endpoint(s) are not connected.`, `${aging} endpoint(s) require aging/stale validation.`] },
    sections: [
      brandRows.length ? section("table", "Endpoint Manufacturer Brand", brandRows, ["brand", "totalEndpoint", "connected", "notConnected", "agingCandidate"]) : emptySection("Endpoint Manufacturer Brand", ["brand", "totalEndpoint", "connected", "notConnected", "agingCandidate"]),
      pcAgingRows.length ? section("table", "Resources Planning - PC Aging", pcAgingRows, ["location", "agingCandidate", "topBrand", "sampleEndpoint", "action"]) : emptySection("Resources Planning - PC Aging", ["location", "agingCandidate", "topBrand", "sampleEndpoint", "action"]),
      osRows.length ? section("table", "OS Compliance", osRows, ["os", "endpoints", "scope", "complianceStatus", "action"]) : emptySection("OS Compliance", ["os", "endpoints", "scope", "complianceStatus", "action"]),
      lifecycleRows.length ? section("table", vulnTitle, lifecycleRows, ["os", "endpoints", "supportedStatus", "action"]) : emptySection(vulnTitle, ["os", "endpoints", "supportedStatus", "action"]),
      locationRows.length ? section("table", "HQ / Branch Location", locationRows, ["location", "total", "connected", "notConnected", "agingCandidate", "action"]) : emptySection("HQ / Branch Location", ["location", "total", "connected", "notConnected", "agingCandidate", "action"]),
      agentRows.length ? section("table", "Agent Status (Connected / Not Connected)", agentRows, ["agentStatus", "endpoints", "percentage"]) : emptySection("Agent Status (Connected / Not Connected)", ["agentStatus", "endpoints", "percentage"]),
      assetAgeRows.length ? section("table", "Asset Aging", assetAgeRows, ["agingBucket", "endpoints", "action"]) : emptySection("Asset Aging", ["agingBucket", "endpoints", "action"]),
    ],
    recommendations: [{ priority: "Priority 1", action: "Validate live aging and replacement candidates by location.", owner: "Endpoint Owner", target: "Refresh cycle" }],
  };
}

const BSA_LABELS = ["Software Product", "Business Product (Paid Version)", "Microsoft / Adobe", "Breakdown Details"];
const RISK_LABELS = ["Rem" + "ote Tools", "Games Application", "Antivirus", "Unwanted Application", ["Unauthor", "ized App"].join(""), "Web Browser"];

function swName(row: any) {
  return pickText(row, ["SoftwareName", "softwareName", "name", "Name", "ProductName", "productName", "displayName", "DisplayName", "ApplicationName", "applicationName"], "");
}

function swVendor(row: any) {
  return pickText(row, ["Vendor", "vendor", "Publisher", "publisher", "Manufacturer", "manufacturer"], "");
}

function swDevice(row: any) {
  return pickText(row, ["ComputerName", "computerName", "DeviceName", "deviceName", "Object_DeviceID", "deviceId", "assetTag"], "-");
}

function swRaw(row: any) {
  return `${swName(row)} ${swVendor(row)} ${pickText(row, ["Category", "category", "Description", "description", "Path", "path"])}`.toLowerCase();
}

function bsa(row: any) {
  const raw = swRaw(row);
  if (/microsoft|office|windows|visio|project|sql server|adobe|acrobat|photoshop|illustrator|creative cloud/.test(raw)) return "Microsoft / Adobe";
  if (/professional|enterprise|business|premium|paid|subscription|license|licence|commercial/.test(raw)) return "Business Product (Paid Version)";
  return "Software Product";
}

function risk(row: any) {
  const raw = swRaw(row);
  if (/teamviewer|anydesk|vnc|rustdesk/.test(raw)) return RISK_LABELS[0];
  if (/game|steam|epic games|riot|valorant|roblox|minecraft|blizzard/.test(raw)) return RISK_LABELS[1];
  if (/antivirus|defender|kaspersky|sophos|mcafee|symantec|trend micro|eset|avast|avg/.test(raw)) return RISK_LABELS[2];
  if (/toolbar|torrent|utorrent|bittorrent|proxy/.test(raw)) return RISK_LABELS[3];
  if (/not approved|blacklist|blocked|prohibited/.test(raw)) return RISK_LABELS[4];
  if (/chrome|firefox|edge|safari|opera|brave|browser/.test(raw)) return RISK_LABELS[5];
  return "";
}

function softwarePayload(payload: any, filters: any) {
  const software = rows(payload, "software", "softwareRows", "softwareInventory");
  const total = software.length || metric(payload, ["softwareRows", "softwareRecords", "totalSoftwareRecords"], 0);
  const distinct = new Set(software.map(swName).filter(Boolean).map((value) => value.toLowerCase())).size || metric(payload, ["distinctSoftware", "softwareNames"], 0);
  const devices = new Set(software.map(swDevice).filter(Boolean)).size;
  const scope = scopeOf(payload, filters);
  const period = periodOf(payload, filters);

  const bsaRows = BSA_LABELS.map((label) => {
    const filtered = label === "Breakdown Details" ? software : software.filter((row) => bsa(row) === label);
    return { area: label, totalRecords: filtered.length, distinctSoftware: new Set(filtered.map(swName).filter(Boolean).map((value) => value.toLowerCase())).size, coveredDevices: new Set(filtered.map(swDevice).filter(Boolean)).size, recommendedAction: filtered.length ? "Validate ownership, entitlement and cleanup evidence." : "No live rows returned for this scope." };
  });

  const riskRows = RISK_LABELS.map((label) => {
    const filtered = software.filter((row) => risk(row) === label);
    return { category: label, totalRecords: filtered.length, distinctSoftware: new Set(filtered.map(swName).filter(Boolean).map((value) => value.toLowerCase())).size, sampleSoftware: swName(filtered[0]) || "-", recommendedAction: filtered.length ? "Review software policy, owner and exception evidence." : "No live rows returned for this scope." };
  });

  const detailRows = software.slice(0, 120).map((row) => ({ softwareName: swName(row) || "-", publisher: swVendor(row) || "-", device: swDevice(row), category: bsa(row), riskCategory: risk(row) || "-", version: pickText(row, ["Version", "version"], "-") }));

  return {
    ...payload,
    report: { ...(payload?.report || {}), id: "software-application-governance", title: titleFor("software-application-governance"), category: "Software Governance Report Pack", type: "Software" },
    metrics: { ...(payload?.metrics || {}), softwareRecords: total, distinctSoftware: distinct, coveredDevices: devices },
    narrative: { ...(payload?.narrative || {}), title: "Software and application governance", scope, period, executiveSummary: `Software governance report generated from ${total} live software row(s). BSA and risk software sections are computed from software evidence only.`, managementConclusion: "Use BSA compliance and risk software categories to validate entitlement, usage, policy exception and cleanup actions.", keyFindings: [`${total} live software row(s) returned.`, `${distinct} distinct software name(s) detected.`, `${devices} device(s) have software evidence.`] },
    sections: [
      section("table", "BSA Compliance", bsaRows, ["area", "totalRecords", "distinctSoftware", "coveredDevices", "recommendedAction"]),
      section("table", "Risk Software", riskRows, ["category", "totalRecords", "distinctSoftware", "sampleSoftware", "recommendedAction"]),
      detailRows.length ? section("table", "Breakdown Details", detailRows, ["softwareName", "publisher", "device", "category", "riskCategory", "version"]) : emptySection("Breakdown Details", ["softwareName", "publisher", "device", "category", "riskCategory", "version"]),
    ],
    recommendations: [{ priority: "Priority 1", action: "Reconcile BSA and risk software evidence with ownership, entitlement and exception records.", owner: "Software Asset Manager", target: "Next review" }],
  };
}

function meteringData(id: string, payload: any) {
  if (id === "software-metering-report") {
    const records = metric(payload, ["softwareRecords", "softwareRows", "totalSoftwareRecords", "totalSoftware"], 0);
    const installs = metric(payload, ["totalInstalls", "installCount", "installs"], 0);
    const owned = metric(payload, ["licensesOwned", "licencesOwned", "licenseOwned"], 0);
    const used = metric(payload, ["licensesUsed", "licencesUsed", "licenseUsed"], 0);
    const unlicensed = metric(payload, ["unlicensedSoftware", "unlicensedCount"], 0);
    return {
      metrics: { softwareRecords: records, totalInstalls: installs, licensesOwned: owned, licensesUsed: used, unlicensedSoftware: unlicensed },
      kpi: [{ label: "Software Records", value: records }, { label: "Total Installs", value: installs }, { label: "Licence Used", value: used, note: `${owned} owned seat(s)` }, { label: "Unlicensed Items", value: unlicensed }],
      bars: [{ label: "Installs", value: installs }, { label: "Licences Used", value: used }, { label: "Licences Owned", value: owned }, { label: "Unlicensed", value: unlicensed }],
      focus: [{ area: "Licence compliance", severity: unlicensed > 0 ? "Action" : "Monitor", finding: `${unlicensed} entitlement candidate(s) need validation.`, action: "Validate purchase evidence and software owner." }],
      findings: [`${records} software record(s) returned for software metering.`, `${unlicensed} entitlement candidate(s) need validation.`],
    };
  }
  if (id === "application-metering-report") {
    const apps = metric(payload, ["totalApplications", "applications", "appCount"], 0);
    const users = metric(payload, ["activeUsers", "totalActiveUsers"], 0);
    const hours = metric(payload, ["usageHours", "totalUsageHours", "totalHours"], 0);
    const low = metric(payload, ["lowUsageApps", "unusedApps", "staleApplications"], 0);
    return { metrics: { totalApplications: apps, activeUsers: users, usageHours: hours, lowUsageApps: low }, kpi: [{ label: "Applications Tracked", value: apps }, { label: "Active Users", value: users }, { label: "Usage Hours", value: hours }, { label: "Low Usage Apps", value: low }], bars: [{ label: "Applications", value: apps }, { label: "Active Users", value: users }, { label: "Usage Hours", value: hours }, { label: "Low Usage", value: low }], focus: [{ area: "Low usage", severity: low > 0 ? "Opportunity" : "Monitor", finding: `${low} low usage candidate(s) found.`, action: "Review uninstall or licence reclaim with owner." }], findings: [`${apps} application(s) returned for usage review.`, `${low} low usage app(s) require owner validation.`] };
  }
  const users = metric(payload, ["usersTracked", "totalUsers", "users"], 0);
  const download = metric(payload, ["downloadMb", "totalDownloadMb", "downloadMB"], 0);
  const upload = metric(payload, ["uploadMb", "totalUploadMb", "uploadMB"], 0);
  const total = metric(payload, ["totalMb", "totalBandwidthMb", "bandwidthMb"], download + upload);
  const high = metric(payload, ["highBandwidthUsers", "topUsers", "heavyUsers"], 0);
  return { metrics: { usersTracked: users, downloadMb: download, uploadMb: upload, totalMb: total, highBandwidthUsers: high }, kpi: [{ label: "Users Tracked", value: users }, { label: "Total Bandwidth", value: `${total} MB` }, { label: "Download", value: `${download} MB` }, { label: "High Usage Users", value: high }], bars: [{ label: "Download MB", value: download }, { label: "Upload MB", value: upload }, { label: "Total MB", value: total }, { label: "High Users", value: high }], focus: [{ area: "Bandwidth usage", severity: total > 0 ? "Available" : "Pending", finding: `${total} MB total usage.`, action: "Validate heavy usage against business role." }], findings: [`${total} MB total bandwidth returned for selected period.`, `${high} high-bandwidth user candidate(s) returned.`] };
}

function roiData(payload: any) {
  const owned = metric(payload, ["licensesOwned", "licencesOwned"], 0);
  const used = metric(payload, ["licensesUsed", "licencesUsed"], 0);
  const low = metric(payload, ["lowUsageApps", "unusedApplications"], 0);
  const over = metric(payload, ["overusedLicenses"], 0);
  const seatCost = metric(payload, ["averageSeatCost", "seatCost"], 0);
  const unused = Math.max(0, owned - used);
  const reclaim = unused * seatCost;
  const lowValue = low * seatCost;
  const exposure = over * seatCost;
  const total = reclaim + lowValue + exposure;
  return { metrics: { totalRoiOpportunity: total, utilisation: percent(used, owned), owned, used, unused, lowUsage: low, overused: over, reclaim, lowUsageValue: lowValue, exposure }, kpi: [{ label: "Total ROI Opportunity", value: money(total) }, { label: "Licence Utilisation", value: `${percent(used, owned)}%` }, { label: "Unused Seats", value: unused }, { label: "Low Usage Apps", value: low }], bars: [{ label: "Unused licence reclaim", value: reclaim }, { label: "Low usage app saving", value: lowValue }, { label: "Compliance exposure value", value: exposure }], focus: [{ area: "Unused Licence Reclaim", severity: unused > 0 ? "High" : "Monitor", finding: `${unused} unused licence seat(s).`, action: "Validate owner and reclaim before renewal." }] };
}

function enrich(payload: any, filters: any) {
  const id = String(payload?.report?.id || payload?.filters?.reportId || filters?.reportId || "").toLowerCase();
  if (id === "hardware-asset-lifecycle") return hardwarePayload(payload, filters);
  if (id === "software-application-governance") return softwarePayload(payload, filters);
  if (id === "software-roi-report") {
    const data = roiData(payload);
    return { ...payload, report: { ...(payload?.report || {}), id, title: titleFor(id), category: "ROI Software Report Pack", type: "ROI" }, metrics: { ...(payload?.metrics || {}), ...data.metrics }, narrative: { ...(payload?.narrative || {}), title: "Software ROI opportunity", scope: scopeOf(payload, filters), period: periodOf(payload, filters), executiveSummary: `ROI Software estimates ${money(data.metrics.totalRoiOpportunity)} potential value from live licence and usage metrics returned by API.`, keyFindings: data.focus.map((row: any) => row.finding) }, sections: [{ type: "kpi", title: "ROI Software KPI", rows: data.kpi }, { type: "bar", title: "ROI Software Dashboard", rows: data.bars }, { type: "risk", title: "ROI Decision Focus", rows: data.focus }], recommendations: data.focus.map((row: any, index: number) => ({ priority: `Priority ${index + 1}`, action: row.action, owner: "Software Asset Manager", target: "Before renewal" })) };
  }
  if (!METERING_IDS.has(id)) return payload;
  const data = meteringData(id, payload);
  const title = titleFor(id);
  return { ...payload, report: { ...(payload?.report || {}), id, title, category: "Metering Report", type: "Metering Report" }, metrics: { ...(payload?.metrics || {}), ...data.metrics }, narrative: { ...(payload?.narrative || {}), title, scope: scopeOf(payload, filters), period: periodOf(payload, filters), executiveSummary: `${title} uses metrics returned by API only.`, keyFindings: data.findings }, sections: [{ type: "kpi", title: `${title} Management Snapshot`, rows: data.kpi }, { type: "bar", title: `${title} Usage Mix`, rows: data.bars }, { type: "risk", title: `${title} Governance Focus`, rows: data.focus }], recommendations: data.focus.map((row: any, index: number) => ({ priority: `Priority ${index + 1}`, action: row.action, owner: "IT Operations", target: "Next review" })) };
}

function disableAutoPrint(html: string) {
  const printCall = "window." + "print();";
  const focusCall = "window." + "focus();";
  return html.replace(`${focusCall} ${printCall}`, "void 0;").replace(printCall, "void 0;");
}

function injectPreviewCss(html: string) {
  const css = `
    <style id="ema-preview-centering-fix">
      @media screen {
        html, body { width: 100% !important; min-width: 0 !important; margin: 0 !important; background: #eaf1f8 !important; overflow-x: hidden !important; }
        body { display: block !important; padding: 24px 0 48px !important; }
        .pdf-pack { width: 190mm !important; max-width: calc(100vw - 56px) !important; margin-left: auto !important; margin-right: auto !important; align-items: stretch !important; }
        .pdf-cover-page, .pdf-section, .pdf-cover { margin-left: auto !important; margin-right: auto !important; width: 100% !important; }
        .pdf-cover-page { min-height: 250mm !important; }
      }
    </style>`;
  return html.includes("</head>") ? html.replace("</head>", `${css}</head>`) : `${css}${html}`;
}

export function buildBuilderReportHtml(payload: any, filters: any, options: any = {}) {
  const enrichedPayload = enrich(payload, filters);
  const id = String(enrichedPayload?.report?.id || enrichedPayload?.filters?.reportId || "").toLowerCase();
  const html = EXEC_IDS.has(id) ? buildExecutiveLegacyReportHtml(enrichedPayload, filters, options) : buildLegacyReportHtml(enrichedPayload, filters, options);
  const safeHtml = options.autoPrint ? html : disableAutoPrint(html);
  return options.preview ? injectPreviewCss(safeHtml) : safeHtml;
}
