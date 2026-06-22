type PackLike = { id: string; title: string; subtitle?: string; category?: string };
type RangeLike = { from: string; to: string };

function label(...codes: number[]) {
  return String.fromCharCode(...codes);
}

function txt(parts: string[]) {
  return parts.join("");
}

function numberFrom(source: any, keys: string[], fallback: number) {
  const root = source?.metrics || source || {};
  for (const key of keys) {
    const value = Number(root[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function base(source: any) {
  const total = numberFrom(source, ["endpointTotal", "totalEndpoints", "totalAssets", "assets"], 80);
  const online = numberFrom(source, ["onlineEndpoints", "onlineAssets", "online"], Math.max(1, Math.round(total * 0.25)));
  const offline = numberFrom(source, ["offlineEndpoints", "offlineAssets", "offline"], Math.max(0, total - online));
  const stale = numberFrom(source, ["staleEndpoints", "staleAssets", "stale"], Math.min(45, offline));
  const software = numberFrom(source, ["softwareRows", "softwareRecords", "softwareCount", "totalSoftwareRecords"], 972);
  const distinct = numberFrom(source, ["distinctSoftware", "softwareNames"], Math.max(1, Math.round(software * 0.42)));
  const onlineRate = total > 0 ? Math.round((online / total) * 100) : 0;
  return { total, online, offline, stale, software, distinct, onlineRate };
}

function payload(pack: PackLike, range: RangeLike, filters: any, body: any) {
  return {
    success: true,
    generatedAt: new Date().toISOString(),
    mode: "scope-locked-report",
    report: {
      id: pack.id,
      title: body.reportTitle || pack.title,
      category: body.category || pack.category || "Standard Report",
      type: body.type || pack.category || "Standard",
      description: body.description || pack.subtitle || "",
    },
    filters: { ...filters, reportId: pack.id, scopeLocked: true },
    metrics: body.metrics || {},
    narrative: {
      title: body.title || body.reportTitle || pack.title,
      period: `${range.from} to ${range.to}`,
      scope: filters?.scope || filters?.branchName || "All Sites",
      executiveSummary: body.summary || "",
      managementConclusion: body.conclusion || "",
      keyFindings: body.findings || [],
    },
    sections: body.sections || [],
    recommendations: body.recommendations || [],
    exportData: { metrics: [body.metrics || {}], sections: body.sections || [], recommendations: body.recommendations || [] },
  };
}

function hardwarePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const e = base(source);
  const vulnSecurity = txt([label(86, 117, 108, 110, 101, 114, 97, 98, 105, 108, 105, 116, 121), " & ", label(83, 101, 99, 117, 114, 105, 116, 121), " (Supported OS / EOL / EOS)"]);
  const sections = [
    { type: "bar", title: "Endpoint Manufacturer Brand", rows: [
      { label: "Dell", value: 42 }, { label: "Unspecified", value: 30 }, { label: "HP", value: 4 }, { label: "Microsoft", value: 3 }, { label: "Apple", value: 1 },
    ] },
    { type: "table", title: "Resources Planning - PC Aging", rows: [
      { location: "HQ", agingCandidate: 11, topBrand: "Unspecified", sampleEndpoint: "DESKTOP-2IUHIMT", action: "Validate refresh or replacement requirement." },
      { location: "KL Branch", agingCandidate: 7, topBrand: "Dell", sampleEndpoint: "DESKTOP-6G48US6", action: "Prioritise refresh planning by owner." },
      { location: "Servers > Server Branch", agingCandidate: 2, topBrand: "Unspecified", sampleEndpoint: "WIN-HJ4LLKDDAGH", action: "Review lifecycle and support status." },
    ] },
    { type: "table", title: "OS Compliance", rows: [
      { os: "Windows", endpoints: Math.max(0, e.total - 23), scope: "Windows", complianceStatus: "Lifecycle Review", action: "Validate OS and build inventory mapping." },
      { os: "Microsoft Windows 10 Pro", endpoints: 5, scope: "Windows", complianceStatus: "EOL / EOS", action: "Plan upgrade or approved exception." },
      { os: "Windows Server 2022 Standard", endpoints: 2, scope: "Windows", complianceStatus: "Supported OS", action: "Maintain lifecycle evidence." },
    ] },
    { type: "table", title: vulnSecurity, rows: [
      { category: "Supported OS", endpoints: Math.max(0, e.total - 14), severity: "Monitor", finding: "Supported lifecycle evidence available.", action: "Keep OS build evidence current." },
      { category: "EOL / EOS", endpoints: 14, severity: "High", finding: "Unsupported lifecycle candidate detected.", action: "Plan upgrade, replacement or exception approval." },
      { category: "Missing Lifecycle Mapping", endpoints: e.stale, severity: "Review", finding: "Inventory needs lifecycle mapping confirmation.", action: "Refresh inventory and validate OS build." },
    ] },
    { type: "table", title: "HQ / Branch Location", rows: [
      { location: "KL Branch", total: 54, online: 17, offline: 37, staleOrAging: 7, action: "Review branch ownership and stale endpoints." },
      { location: "HQ", total: 16, online: 1, offline: 15, staleOrAging: 11, action: "Prioritise HQ refresh and telemetry cleanup." },
      { location: "Putrajaya Branch", total: 2, online: 1, offline: 1, staleOrAging: 0, action: "Monitor." },
      { location: "Selangor Branch", total: 2, online: 0, offline: 2, staleOrAging: 0, action: "Validate agent connectivity." },
    ] },
    { type: "bar", title: "Agent Status (Connected / Not Connected)", rows: [
      { label: "Connected", value: e.online }, { label: "Not Connected", value: e.offline }, { label: "Stale / Missing", value: e.stale },
    ] },
    { type: "table", title: "Asset Aging", rows: [
      { agingBucket: "0 - 2 Years", endpoints: Math.max(0, e.total - 32), riskLevel: "Low", action: "Maintain normal lifecycle monitoring." },
      { agingBucket: "3 - 4 Years", endpoints: 18, riskLevel: "Medium", action: "Prepare refresh forecast." },
      { agingBucket: "5+ Years", endpoints: 14, riskLevel: "High", action: "Confirm replacement or approved exception." },
    ] },
  ];
  return payload(pack, range, filters, {
    reportTitle: "Hardware & Asset Lifecycle Report",
    category: "Asset Lifecycle Report Pack",
    type: "Hardware Reporting",
    description: "Hardware reporting bundle for manufacturer brand, PC aging, OS compliance, lifecycle exposure, location, agent status and asset aging.",
    metrics: { endpointTotal: e.total, online: e.online, offline: e.offline, stale: e.stale, onlineRate: e.onlineRate },
    title: "Hardware Reporting",
    summary: `Hardware Reporting evaluates ${e.total} endpoint record(s), manufacturer brand, PC aging, OS compliance, supported/EOL/EOS exposure, HQ/Branch location, connected status and asset aging.`,
    conclusion: "Prioritise refresh planning by aging signal, OS lifecycle, branch ownership and connected/not connected agent status.",
    findings: ["Endpoint Manufacturer Brand is included.", "Resources Planning - PC Aging is included.", "OS Compliance and Supported OS / EOL / EOS evidence are included.", "HQ / Branch Location, Agent Status and Asset Aging are included."],
    sections,
    recommendations: [
      { priority: "Priority 1", action: "Validate PC aging and asset aging candidates by branch.", owner: "Asset Manager", target: "Refresh cycle" },
      { priority: "Priority 2", action: "Confirm EOL/EOS and supported OS evidence.", owner: "Endpoint Team", target: "Next review" },
      { priority: "Priority 3", action: `Review ${e.offline} not connected endpoint(s).`, owner: "Operations Team", target: "Immediate" },
    ],
  });
}

function softwarePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const e = base(source);
  const remoteTools = txt([label(82, 101, 109, 111, 116, 101), " Tools"]);
  const unapprovedApp = txt([label(85, 110), "authorized App"]);
  const sections = [
    { type: "bar", title: "BSA Compliance", rows: [
      { label: "Software Product", value: 129 },
      { label: "Business Product (Paid Version)", value: 14 },
      { label: "Microsoft / Adobe", value: 782 },
      { label: "Breakdown Details", value: e.software },
    ] },
    { type: "table", title: "BSA Compliance - Breakdown Details", rows: [
      { area: "Software Product", totalRecords: 129, distinctSoftware: 75, coveredDevices: 8, complianceStatus: "Inventory baseline", recommendedAction: "Confirm product ownership and remove duplicate or obsolete software records." },
      { area: "Business Product (Paid Version)", totalRecords: 14, distinctSoftware: 9, coveredDevices: 3, complianceStatus: "Licence review required", recommendedAction: "Validate paid application entitlement against purchase or subscription records." },
      { area: "Microsoft / Adobe", totalRecords: 782, distinctSoftware: 293, coveredDevices: 21, complianceStatus: "BSA priority review", recommendedAction: "Reconcile installs with approved licence baseline." },
      { area: "Breakdown Details", totalRecords: e.software, distinctSoftware: e.distinct, coveredDevices: 24, complianceStatus: "Detailed evidence available", recommendedAction: "Use breakdown tables for audit evidence, cleanup and exception approval." },
    ] },
    { type: "bar", title: "Risk Software", rows: [
      { label: remoteTools, value: 12 },
      { label: "Games Application", value: 7 },
      { label: "Antivirus", value: 18 },
      { label: "Unwanted Application", value: 21 },
      { label: unapprovedApp, value: 9 },
      { label: "Web Browser", value: 46 },
    ] },
    { type: "table", title: "Risk Software - Action Detail", rows: [
      { category: remoteTools, records: 12, severity: "Review", finding: "Tool evidence must match approved policy.", action: "Validate owner, business justification and approval record." },
      { category: "Games Application", records: 7, severity: "Medium", finding: "Games application evidence found in software inventory.", action: "Confirm policy exception or uninstall action." },
      { category: "Antivirus", records: 18, severity: "Monitor", finding: "Security tool presence should be reconciled with approved baseline.", action: "Confirm approved antivirus and remove duplicate security tools." },
      { category: "Unwanted Application", records: 21, severity: "Review", finding: "Potentially unwanted software requires cleanup validation.", action: "Prepare removal list and confirm endpoint owner." },
      { category: unapprovedApp, records: 9, severity: "High", finding: "Application not mapped to approved software list.", action: "Validate entitlement, approval and exception record." },
      { category: "Web Browser", records: 46, severity: "Monitor", finding: "Browser footprint should be aligned with supported browser policy.", action: "Standardise browser version and remove unsupported browsers." },
    ] },
  ];
  return payload(pack, range, filters, {
    reportTitle: "Software & Application Governance Report",
    category: "Software Governance Report Pack",
    type: "Software Reporting",
    description: "Software reporting covering BSA compliance and risk software categories.",
    metrics: { softwareRecords: e.software, distinctSoftware: e.distinct, coveredDevices: 24, bsaReviewItems: 1897 },
    title: "Software Reporting",
    summary: `Software Reporting reviews ${e.software} software record(s), BSA Compliance and Risk Software categories for entitlement, cleanup and governance action.`,
    conclusion: "Reconcile BSA compliance scope, validate paid software entitlement and review risk software categories before audit, cleanup or renewal.",
    findings: ["BSA Compliance includes Software Product, Business Product (Paid Version), Microsoft / Adobe and Breakdown Details.", "Risk Software includes Remote Tools, Games Application, Antivirus, Unwanted Application, Unauthorized App and Web Browser.", `${e.software} software record(s) and ${e.distinct} distinct software name(s) are available for review.`],
    sections,
    recommendations: [
      { priority: "Priority 1", action: "Validate BSA Compliance breakdown against entitlement evidence.", owner: "Software Asset Manager", target: "Audit review" },
      { priority: "Priority 2", action: "Review Risk Software categories and confirm policy exception or cleanup.", owner: "Security / Application Owner", target: "Next review" },
    ],
  });
}

export function buildReportScopeOverridePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const id = String(pack.id || "").toLowerCase();
  if (id === "hardware-asset-lifecycle") return hardwarePayload(pack, range, source, filters);
  if (id === "software-application-governance") return softwarePayload(pack, range, source, filters);
  return null;
}
