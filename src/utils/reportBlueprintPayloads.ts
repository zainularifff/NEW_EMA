type RangeLike = { from: string; to: string; preset?: string };
type PackLike = { id: string; title: string; subtitle?: string; category?: string; tone?: string };
type Row = Record<string, any>;
type Section = { type: string; title: string; rows: Row[]; columns?: string[] };

const SECTION_EMPTY_NOTE = "No live data returned for this section.";

function array(value: any): Row[] {
  return Array.isArray(value) ? value.filter((row) => row && typeof row === "object") : [];
}

function valueOf(row: Row, keys: string[], fallback: any = "") {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
    const found = Object.keys(row || {}).find((item) => item.toLowerCase() === key.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== "") return row[found];
  }
  return fallback;
}

function numberOf(row: Row, keys: string[], fallback = 0) {
  const raw = valueOf(row, keys, fallback);
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function uniqueRows(rows: Row[], keySelector: (row: Row) => string) {
  const map = new Map<string, Row>();
  rows.forEach((row) => {
    const key = keySelector(row).trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, row);
  });
  return Array.from(map.values());
}

function allSections(source: any): Section[] {
  return [
    ...array(source?.sections),
    ...array(source?.exportData?.sections),
  ].map((section: any) => ({
    type: String(section?.type || "table"),
    title: String(section?.title || "Data"),
    rows: array(section?.rows),
    columns: Array.isArray(section?.columns) ? section.columns : undefined,
  }));
}

function findSectionRows(source: any, terms: string[]): Row[] {
  const sections = allSections(source);
  const found = sections.find((section) => {
    const title = String(section?.title || "").toLowerCase();
    return terms.every((term) => title.includes(term.toLowerCase()));
  });
  return array(found?.rows);
}

function allEvidenceRows(source: any): Row[] {
  const rows = [
    ...array(source?.rows),
    ...array(source?.records),
    ...array(source?.items),
    ...array(source?.data),
    ...array(source?.exportData?.rows),
    ...array(source?.exportData?.records),
  ];

  allSections(source).forEach((section) => rows.push(...array(section.rows)));
  array(source?.dataSources).forEach((dataSource: any) => {
    rows.push(...array(dataSource?.rows));
    rows.push(...array(dataSource?.data));
    rows.push(...array(dataSource?.records));
  });

  return rows;
}

function metric(source: any, keys: string[]) {
  const root = source?.metrics || source || {};
  for (const key of keys) {
    const value = Number(root[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function basicMetrics(source: any) {
  const rows = allEvidenceRows(source);
  const endpointTotal = metric(source, ["endpointTotal", "totalEndpoints", "totalAssets", "assets"]) || rows.filter(isHardwareRow).length;
  const online = metric(source, ["onlineEndpoints", "onlineAssets", "online"]) || rows.filter((row) => isHardwareRow(row) && isConnected(row)).length;
  const offline = metric(source, ["offlineEndpoints", "offlineAssets", "offline"]) || rows.filter((row) => isHardwareRow(row) && isNotConnected(row)).length;
  const stale = metric(source, ["staleEndpoints", "staleAssets", "stale"]) || rows.filter((row) => hasValue(row, ["lastSeen", "lastConnected", "LastConnected", "lastCheckIn"]) === false && isHardwareRow(row)).length;
  const softwareRecords = metric(source, ["softwareRows", "softwareRecords", "softwareCount", "totalSoftwareRecords"]) || rows.filter(isSoftwareRow).length;
  const distinctSoftware = metric(source, ["distinctSoftware", "softwareNames"]) || new Set(rows.filter(isSoftwareRow).map((row) => String(valueOf(row, ["softwareName", "name", "productName", "applicationName"], "")).toLowerCase()).filter(Boolean)).size;
  return { endpointTotal, online, offline, stale, softwareRecords, distinctSoftware };
}

function hasValue(row: Row, keys: string[]) {
  return valueOf(row, keys, "") !== "";
}

function isHardwareRow(row: Row) {
  const keys = Object.keys(row || {}).map((key) => key.toLowerCase());
  return keys.some((key) => ["devicename", "computername", "assetid", "assettag", "serialnumber", "hostname", "agent", "platform", "manufacturer", "model"].includes(key));
}

function isSoftwareRow(row: Row) {
  const keys = Object.keys(row || {}).map((key) => key.toLowerCase());
  return keys.some((key) => ["softwarename", "productname", "applicationname", "publisher", "vendor", "installedversion", "licensetype", "executable"].includes(key));
}

function isConnected(row: Row) {
  const status = String(valueOf(row, ["connectionStatus", "status", "agentStatus", "onlineStatus", "availability", "LastConnected"], "")).toLowerCase();
  return /(online|connected|active|running|yes|true)/.test(status) && !/(not connected|offline|inactive|stale)/.test(status);
}

function isNotConnected(row: Row) {
  const status = String(valueOf(row, ["connectionStatus", "status", "agentStatus", "onlineStatus", "availability", "LastConnected"], "")).toLowerCase();
  return /(offline|not connected|inactive|stale|no|false)/.test(status);
}

function groupCount(rows: Row[], labelKeys: string[], valueKeys: string[] = []) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const label = String(valueOf(row, labelKeys, "")).trim();
    if (!label) return;
    const explicit = numberOf(row, valueKeys, NaN);
    map.set(label, (map.get(label) || 0) + (Number.isFinite(explicit) && explicit > 0 ? explicit : 1));
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Number(b.value) - Number(a.value));
}

function payload(pack: PackLike, range: RangeLike, filters: any, body: any) {
  return {
    success: true,
    generatedAt: new Date().toISOString(),
    mode: "data-driven-report-blueprint",
    report: {
      id: pack.id,
      title: body.reportTitle || pack.title,
      category: body.category || pack.category || "Standard Report",
      type: body.type || pack.category || "Standard",
      description: body.description || pack.subtitle || "",
    },
    filters: { ...filters, reportId: pack.id, dataDrivenOnly: true },
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
    dataSources: [{ name: pack.title, table: "Live report payload", rows: body.sourceRows || 0 }],
    exportData: { metrics: [body.metrics || {}], sections: body.sections || [], recommendations: body.recommendations || [] },
  };
}

function tableSection(title: string, rows: Row[], columns?: string[]): Section {
  return { type: "table", title, rows, columns };
}

function barSection(title: string, rows: Row[]): Section {
  return { type: "bar", title, rows };
}

function deriveHardwareRows(source: any) {
  return allEvidenceRows(source).filter(isHardwareRow);
}

function deriveSoftwareRows(source: any) {
  return allEvidenceRows(source).filter(isSoftwareRow);
}

function branchLocationRows(source: any, hardwareRows: Row[]) {
  const liveSection = [
    ...findSectionRows(source, ["branch"]),
    ...findSectionRows(source, ["location"]),
    ...findSectionRows(source, ["department"]),
  ];
  const candidates = liveSection.length ? liveSection : hardwareRows;
  const map = new Map<string, { location: string; total: number; connected: number; notConnected: number; staleOrAging: number }>();

  candidates.forEach((row) => {
    const location = String(valueOf(row, ["location", "branch", "department", "site", "groupPath", "workgroup", "name", "label"], "")).trim();
    if (!location) return;
    const total = numberOf(row, ["total", "count", "value", "endpoints", "assets"], 0) || 1;
    const connected = numberOf(row, ["online", "connected", "active"], 0) || (isConnected(row) ? 1 : 0);
    const notConnected = numberOf(row, ["offline", "notConnected", "inactive"], 0) || (isNotConnected(row) ? 1 : 0);
    const staleOrAging = numberOf(row, ["stale", "staleOrAging", "agingCandidate", "aging", "oldAsset"], 0);
    const current = map.get(location) || { location, total: 0, connected: 0, notConnected: 0, staleOrAging: 0 };
    current.total += total;
    current.connected += connected;
    current.notConnected += notConnected;
    current.staleOrAging += staleOrAging;
    map.set(location, current);
  });

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function brandRows(source: any, hardwareRows: Row[]) {
  const liveSection = [
    ...findSectionRows(source, ["manufacturer"]),
    ...findSectionRows(source, ["brand"]),
  ];
  const candidates = liveSection.length ? liveSection : hardwareRows;
  return groupCount(candidates, ["brand", "manufacturer", "make", "vendor", "label", "name"], ["total", "count", "value", "endpoints", "assets"]);
}

function pcAgingRows(source: any, locationRows: Row[], hardwareRows: Row[]) {
  const live = [
    ...findSectionRows(source, ["pc", "aging"]),
    ...findSectionRows(source, ["endpoint", "aging"]),
    ...findSectionRows(source, ["asset", "aging"]),
  ];
  if (live.length) return live;

  return locationRows
    .filter((row) => Number(row.staleOrAging || 0) > 0 || Number(row.agingCandidate || 0) > 0)
    .map((row) => ({
      location: row.location || row.label || row.name,
      agingCandidate: row.staleOrAging || row.agingCandidate || 0,
      topBrand: valueOf(row, ["topBrand", "brand", "manufacturer"], ""),
      sampleEndpoint: valueOf(row, ["sampleEndpoint", "deviceName", "computerName", "assetTag"], ""),
      action: "Validate refresh/replacement requirement.",
    }))
    .concat(
      hardwareRows
        .filter((row) => Number(valueOf(row, ["ageYears", "assetAge", "yearsOld"], 0)) >= 4)
        .map((row) => ({
          location: valueOf(row, ["location", "branch", "department", "site"], ""),
          agingCandidate: 1,
          topBrand: valueOf(row, ["brand", "manufacturer", "vendor"], ""),
          sampleEndpoint: valueOf(row, ["deviceName", "computerName", "assetTag", "hostname"], ""),
          action: "Validate refresh/replacement requirement.",
        }))
    );
}

function osComplianceRows(source: any, hardwareRows: Row[]) {
  const live = [
    ...findSectionRows(source, ["os", "compliance"]),
    ...findSectionRows(source, ["supported", "os"]),
  ];
  if (live.length) return live;

  return groupCount(hardwareRows, ["os", "operatingSystem", "platform", "osName"], ["total", "count", "value", "endpoints"])
    .map((row) => ({ os: row.label, endpoints: row.value, scope: "Live inventory", complianceStatus: "Requires lifecycle mapping", action: "Validate OS lifecycle status from inventory source." }));
}

function lifecycleRows(source: any, hardwareRows: Row[]) {
  const live = [
    ...findSectionRows(source, ["lifecycle"]),
    ...findSectionRows(source, ["eol"]),
    ...findSectionRows(source, ["eos"]),
  ];
  if (live.length) return live;

  const rows = hardwareRows
    .map((row) => {
      const lifecycle = String(valueOf(row, ["lifecycleStatus", "eolStatus", "supportStatus", "osSupportStatus"], "")).trim();
      if (!lifecycle) return null;
      return {
        category: lifecycle,
        endpoints: 1,
        severity: /eol|eos|expired|unsupported/i.test(lifecycle) ? "High" : "Monitor",
        finding: valueOf(row, ["os", "operatingSystem", "platform"], "Lifecycle evidence available."),
        action: /eol|eos|expired|unsupported/i.test(lifecycle) ? "Plan upgrade/replacement or exception approval." : "Maintain lifecycle evidence.",
      };
    })
    .filter(Boolean) as Row[];
  return groupCount(rows, ["category"], ["endpoints"]).map((row) => ({ category: row.label, endpoints: row.value, severity: /eol|eos|expired|unsupported/i.test(row.label) ? "High" : "Monitor", finding: "Derived from live lifecycle evidence.", action: /eol|eos|expired|unsupported/i.test(row.label) ? "Plan upgrade/replacement or exception approval." : "Maintain lifecycle evidence." }));
}

function agentStatusRows(source: any, hardwareRows: Row[]) {
  const live = [
    ...findSectionRows(source, ["agent", "status"]),
    ...findSectionRows(source, ["connected"]),
  ];
  if (live.length) return live;
  const connected = hardwareRows.filter(isConnected).length;
  const notConnected = hardwareRows.filter(isNotConnected).length;
  const unknown = Math.max(0, hardwareRows.length - connected - notConnected);
  return [
    connected ? { label: "Connected", value: connected } : null,
    notConnected ? { label: "Not Connected", value: notConnected } : null,
    unknown ? { label: "Unknown", value: unknown } : null,
  ].filter(Boolean) as Row[];
}

function assetAgingRows(source: any, hardwareRows: Row[]) {
  const live = [
    ...findSectionRows(source, ["asset", "aging"]),
    ...findSectionRows(source, ["asset", "age"]),
  ];
  if (live.length) return live;

  const buckets = new Map<string, number>();
  hardwareRows.forEach((row) => {
    const age = Number(valueOf(row, ["ageYears", "assetAge", "yearsOld"], NaN));
    const label = Number.isFinite(age)
      ? age < 3 ? "0 - 2 Years" : age < 5 ? "3 - 4 Years" : "5+ Years"
      : hasValue(row, ["purchaseDate", "warrantyStart", "createdDate"]) ? "Date Available / Age Not Calculated" : "Missing Purchase Date";
    buckets.set(label, (buckets.get(label) || 0) + 1);
  });
  return Array.from(buckets.entries()).map(([agingBucket, endpoints]) => ({ agingBucket, endpoints, level: agingBucket.includes("5+") ? "High" : agingBucket.includes("Missing") ? "Review" : "Monitor", action: "Validate asset lifecycle evidence." }));
}

function hardwarePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const hardwareRows = deriveHardwareRows(source);
  const metrics = basicMetrics(source);
  const locations = branchLocationRows(source, hardwareRows);
  const brands = brandRows(source, hardwareRows);
  const pcAging = pcAgingRows(source, locations, hardwareRows);
  const osRows = osComplianceRows(source, hardwareRows);
  const lifecycle = lifecycleRows(source, hardwareRows);
  const agentRows = agentStatusRows(source, hardwareRows);
  const assetAge = assetAgingRows(source, hardwareRows);

  const sections = [
    barSection("Endpoint Manufacturer Brand", brands),
    tableSection("Resources Planning - PC Aging", pcAging),
    tableSection("OS Compliance", osRows),
    tableSection("Vulnerability & Security (Supported OS / EOL / EOS)", lifecycle),
    tableSection("HQ / Branch Location", locations),
    barSection("Agent Status (Connected / Not Connected)", agentRows),
    tableSection("Asset Aging", assetAge),
  ];

  return payload(pack, range, filters, {
    reportTitle: "Hardware & Asset Lifecycle Report",
    category: "Asset Lifecycle Report Pack",
    type: "Hardware Reporting",
    description: "Hardware reporting generated from live inventory evidence.",
    metrics: { endpointTotal: metrics.endpointTotal, online: metrics.online, offline: metrics.offline, stale: metrics.stale },
    title: "Hardware Reporting",
    summary: hardwareRows.length ? `Hardware Reporting is generated from ${hardwareRows.length} live hardware record(s).` : SECTION_EMPTY_NOTE,
    conclusion: hardwareRows.length ? "Review manufacturer, PC aging, OS compliance, lifecycle, branch, agent status and asset aging evidence." : "Connect hardware inventory payload to populate this report.",
    findings: [
      `${brands.length} manufacturer/brand group(s) returned from live evidence.`,
      `${pcAging.length} PC aging row(s) returned from live evidence.`,
      `${locations.length} branch/location row(s) returned from live evidence.`,
      `${agentRows.length} agent status group(s) returned from live evidence.`,
    ],
    sections,
    recommendations: hardwareRows.length ? [
      { priority: "Priority 1", action: "Review PC aging and asset aging candidates from live inventory evidence.", owner: "Asset Manager", target: "Refresh review" },
      { priority: "Priority 2", action: "Validate OS compliance and lifecycle status from supported/EOL/EOS evidence.", owner: "Endpoint Team", target: "Next review" },
      { priority: "Priority 3", action: "Review connected/not connected agent status and branch ownership.", owner: "Operations Team", target: "Immediate" },
    ] : [],
    sourceRows: hardwareRows.length,
  });
}

function softwareCategoryRows(source: any, softwareRows: Row[], titleTerms: string[], categories: string[]) {
  const live = findSectionRows(source, titleTerms);
  if (live.length) return live;

  return categories.map((category) => {
    const categoryText = category.toLowerCase();
    const matched = softwareRows.filter((row) => {
      const text = `${valueOf(row, ["softwareName", "name", "productName", "applicationName"], "")} ${valueOf(row, ["publisher", "vendor", "manufacturer", "category", "type"], "")}`.toLowerCase();
      if (categoryText.includes("microsoft") || categoryText.includes("adobe")) return /microsoft|adobe/.test(text);
      if (categoryText.includes("business")) return /paid|business|commercial|licensed|subscription/.test(text);
      if (categoryText.includes("software product")) return !!text;
      if (categoryText.includes("remote")) return /remote|viewer|anydesk|teamviewer|vnc|rdp|screenconnect|ultraviewer/.test(text);
      if (categoryText.includes("games")) return /game|steam|epic games|riot|roblox|minecraft/.test(text);
      if (categoryText.includes("antivirus")) return /antivirus|defender|kaspersky|eset|symantec|mcafee|trend micro|avast|avg/.test(text);
      if (categoryText.includes("unwanted")) return /toolbar|coupon|adware|cleaner|optimizer|pup/.test(text);
      if (categoryText.includes("unauthorized")) return /crack|keygen|portable|torrent|bypass/.test(text);
      if (categoryText.includes("browser")) return /chrome|edge|firefox|opera|brave|safari|browser/.test(text);
      return false;
    });
    const distinct = new Set(matched.map((row) => String(valueOf(row, ["softwareName", "name", "productName", "applicationName"], "")).toLowerCase()).filter(Boolean)).size;
    return {
      area: category,
      category,
      totalRecords: matched.length,
      records: matched.length,
      distinctSoftware: distinct,
      coveredDevices: new Set(matched.map((row) => String(valueOf(row, ["deviceName", "computerName", "assetId", "clientId"], "")).toLowerCase()).filter(Boolean)).size,
      complianceStatus: matched.length ? "Review required" : "No live evidence returned",
      recommendedAction: matched.length ? "Validate entitlement, approval and cleanup action from live software evidence." : SECTION_EMPTY_NOTE,
    };
  });
}

function softwarePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const softwareRows = deriveSoftwareRows(source);
  const metrics = basicMetrics(source);
  const bsaRows = softwareCategoryRows(source, softwareRows, ["bsa"], ["Software Product", "Business Product (Paid Version)", "Microsoft / Adobe", "Breakdown Details"]);
  const riskRows = softwareCategoryRows(source, softwareRows, ["risk", "software"], ["Remote Tools", "Games Application", "Antivirus", "Unwanted Application", "Unauthorized App", "Web Browser"]);

  const sections = [
    barSection("BSA Compliance", bsaRows.map((row) => ({ label: row.area || row.category, value: row.totalRecords || row.records || 0 }))),
    tableSection("BSA Compliance - Breakdown Details", bsaRows),
    barSection("Risk Software", riskRows.map((row) => ({ label: row.category || row.area, value: row.records || row.totalRecords || 0 }))),
    tableSection("Risk Software - Action Detail", riskRows),
  ];

  return payload(pack, range, filters, {
    reportTitle: "Software & Application Governance Report",
    category: "Software Governance Report Pack",
    type: "Software Reporting",
    description: "Software reporting generated from live software evidence.",
    metrics: { softwareRecords: metrics.softwareRecords, distinctSoftware: metrics.distinctSoftware, bsaReviewItems: bsaRows.reduce((total, row) => total + Number(row.totalRecords || row.records || 0), 0) },
    title: "Software Reporting",
    summary: softwareRows.length ? `Software Reporting is generated from ${softwareRows.length} live software record(s).` : SECTION_EMPTY_NOTE,
    conclusion: softwareRows.length ? "Review BSA Compliance and Risk Software evidence using live software inventory rows." : "Connect software inventory payload to populate this report.",
    findings: [
      `${bsaRows.reduce((total, row) => total + Number(row.totalRecords || row.records || 0), 0)} BSA Compliance record(s) returned from live evidence.`,
      `${riskRows.reduce((total, row) => total + Number(row.records || row.totalRecords || 0), 0)} Risk Software record(s) returned from live evidence.`,
      `${metrics.distinctSoftware} distinct software name(s) returned from live evidence.`,
    ],
    sections,
    recommendations: softwareRows.length ? [
      { priority: "Priority 1", action: "Validate BSA Compliance breakdown against entitlement evidence.", owner: "Software Asset Manager", target: "Audit review" },
      { priority: "Priority 2", action: "Review Risk Software categories and confirm approval, exception or cleanup.", owner: "Security / Application Owner", target: "Next review" },
    ] : [],
    sourceRows: softwareRows.length,
  });
}

function simplePayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const rows = allEvidenceRows(source);
  const metrics = basicMetrics(source);
  const sections = allSections(source).length ? allSections(source) : [];
  return payload(pack, range, filters, {
    reportTitle: pack.title,
    category: pack.category || "Standard Report",
    type: pack.category || "Standard",
    description: pack.subtitle || "",
    metrics: { endpointTotal: metrics.endpointTotal, softwareRecords: metrics.softwareRecords },
    title: pack.title,
    summary: rows.length ? `${pack.title} is generated from ${rows.length} live evidence row(s).` : SECTION_EMPTY_NOTE,
    conclusion: rows.length ? "Review evidence, assign owner and track next action." : "No live evidence was returned for this report scope.",
    findings: rows.length ? [`${rows.length} live evidence row(s) returned.`] : [SECTION_EMPTY_NOTE],
    sections,
    recommendations: [],
    sourceRows: rows.length,
  });
}

export function buildReportBlueprintPayload(pack: PackLike, range: RangeLike, source: any, filters: any) {
  const id = String(pack.id || "").toLowerCase();
  if (id === "hardware-asset-lifecycle") return hardwarePayload(pack, range, source, filters);
  if (id === "software-application-governance") return softwarePayload(pack, range, source, filters);
  return simplePayload(pack, range, source, filters);
}
