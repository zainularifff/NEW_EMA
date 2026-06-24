import type { Plugin } from 'vite';

const ROI_TYPES = `
type SoftwareRoiPayload = {
  summary?: {
    potentialSavings?: number;
    unusedPaidSoftware?: number;
    underUtilizedSoftware?: number;
    monitoredSoftware?: number;
    averageUsageHours?: number;
    opportunityLicenses?: number;
  };
  rows?: Array<Record<string, unknown>>;
};
`;

export function managementSoftwareRoiTransform(): Plugin {
  return {
    name: 'management-software-roi-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/ManagementDashboard.tsx')) return null;
      let next = code;

      if (!next.includes('type SoftwareRoiPayload =')) {
        next = next.replace('type TrendPoint = {', `${ROI_TYPES}\ntype TrendPoint = {`);
      }

      if (!next.includes('softwareRoi, setSoftwareRoi')) {
        next = next.replace(
          '  const [tablePageSize, setTablePageSize] = useState(10);',
          `  const [tablePageSize, setTablePageSize] = useState(10);\n  const [softwareRoi, setSoftwareRoi] = useState<SoftwareRoiPayload | null>(null);`,
        );
      }

      if (!next.includes('managementDashboardService.getSoftwareRoi<SoftwareRoiPayload>')) {
        next = next.replace(
          '  useEffect(() => { loadDashboard(); }, []);',
          `  useEffect(() => { loadDashboard(); }, []);\n\n  useEffect(() => {\n    let alive = true;\n    managementDashboardService.getSoftwareRoi<SoftwareRoiPayload>()\n      .then((data) => { if (alive) setSoftwareRoi(data || null); })\n      .catch(() => { if (alive) setSoftwareRoi(null); });\n    return () => { alive = false; };\n  }, []);`,
        );
      }

      if (!next.includes('const softwareRoiDrillRow = useMemo<DrillRow | null>')) {
        next = next.replace(
          '  const topKpis = useMemo(() => dashboard.executiveKpis.slice(0, 6), [dashboard.executiveKpis]);',
          `  const softwareRoiDrillRow = useMemo<DrillRow | null>(() => {\n    const summary = softwareRoi?.summary;\n    if (!summary) return null;\n    const savingValue = moneyValue(summary.potentialSavings);\n    const monitored = Number(summary.monitoredSoftware || (softwareRoi?.rows || []).length || 0);\n    const unused = Number(summary.unusedPaidSoftware || 0);\n    const underUsed = Number(summary.underUtilizedSoftware || 0);\n    return {\n      key: 'software-roi',\n      label: 'Software ROI',\n      count: monitored,\n      value: savingValue,\n      valueFmt: formatMoney(savingValue),\n      level3Area: 'saving',\n      level3Key: 'software-roi',\n      tone: savingValue > 0 ? 'green' : 'slate',\n      impactType: 'Cost optimization',\n      riskType: 'Unused paid software',\n      costType: 'Software licence waste',\n      metricLabel: 'Potential savings',\n      confidence: monitored > 0 ? 'Usage evidence from monitor history' : 'Waiting for usage evidence',\n      decision: savingValue > 0 ? 'Recover or reduce unused paid software licences' : 'Monitor paid software utilization',\n      insight: unused.toLocaleString() + ' unused and ' + underUsed.toLocaleString() + ' under-utilized paid software item(s).',\n      sample: [unused.toLocaleString() + ' unused paid software', underUsed.toLocaleString() + ' under-utilized software'],\n    };\n  }, [softwareRoi]);\n\n  const softwareRoiEvidenceRows = useMemo<EvidenceRow[]>(() => (softwareRoi?.rows || []).map((row, index) => ({\n    assetKey: String(row.PolicyItemID || row.SoftwareName || index),\n    objectAgent: 'Software ROI',\n    evidenceType: 'software-roi',\n    softwareName: String(row.SoftwareName || '-'),\n    deviceName: String(row.SoftwareName || '-'),\n    publisher: String(row.Publisher || '-'),\n    brand: String(row.Publisher || '-'),\n    category: 'Software / ROI',\n    classification: String(row.CategoryName || row.ComplianceStatus || 'Legal software'),\n    licenseCount: Number(row.LicenseCount || 0).toLocaleString(),\n    installedPc: Number(row.InstalledPC || 0).toLocaleString(),\n    openCount: Number(row.TotalOpenCount || 0).toLocaleString(),\n    totalUsageHours: Number(row.TotalUsageHours || 0).toFixed(2),\n    averageUsageHours: Number(row.AverageUsageHours || 0).toFixed(2),\n    averageDailyUsageHours: Number(row.AverageDailyUsageHours || 0).toFixed(2),\n    utilizedHours: Number(row.UtilizedHours || 0).toFixed(2),\n    underUtilizedHours: Number(row.UnderUtilizedHours || 0).toFixed(2),\n    notUsedHours: Number(row.NotUsedHours || 0).toFixed(2),\n    opportunityLicenses: Number(row.OpportunityLicenses || 0).toLocaleString(),\n    replacementCost: formatMoney(row.PotentialSaving || 0),\n    status: String(row.RoiStatus || '-'),\n    riskSeverity: String(row.RoiStatus || '-'),\n    reason: String(row.EvidenceNote || 'Usage compared with Software Policy utilization thresholds'),\n  })), [softwareRoi]);\n\n  const topKpis = useMemo(() => dashboard.executiveKpis.slice(0, 6), [dashboard.executiveKpis]);`,
        );
      }

      next = next.replace(
        '  const actions = useMemo(() => dashboard.boardActions.slice(0, 8), [dashboard.boardActions]);',
        `  const actions = useMemo(() => {\n    const baseActions = dashboard.boardActions.filter((action) => String(action.key || '').toLowerCase() !== 'saving:software-roi' && String(action.key || '').toLowerCase() !== 'software-roi');\n    if (!softwareRoiDrillRow) return baseActions.slice(0, 8);\n    const roiAction: BoardAction = {\n      area: 'Saving',\n      key: 'saving:software-roi',\n      issue: 'Software ROI',\n      impact: softwareRoiDrillRow.valueFmt || formatMoney(0),\n      decision: softwareRoiDrillRow.decision || 'Review unused paid software licences',\n      priority: moneyValue(softwareRoiDrillRow.value) > 0 ? 'High' : 'Medium',\n    };\n    return [roiAction, ...baseActions].slice(0, 8);\n  }, [dashboard.boardActions, softwareRoiDrillRow]);`,
      );

      next = next.replace(
        '      const rows = dashboard.level2[area] || [];\n      if (rows.length) {',
        `      const baseRows = dashboard.level2[area] || [];\n      const rows = area === 'saving' && softwareRoiDrillRow\n        ? [softwareRoiDrillRow, ...baseRows.filter((row) => String(row.key || '').toLowerCase() !== 'software-roi')]\n        : baseRows;\n      if (rows.length) {`,
      );

      next = next.replace(
        '    setDrill({ level: 3, area, key, title: evidenceTitle, rows: [], total: 0, loading: true, parent });',
        `    if (String(area || '').toLowerCase() === 'saving' && String(key || '').toLowerCase() === 'software-roi') {\n      setDrill({ level: 3, area, key, title: evidenceTitle || 'Software ROI Evidence', rows: softwareRoiEvidenceRows, total: softwareRoiEvidenceRows.length, loading: false, parent });\n      return;\n    }\n    setDrill({ level: 3, area, key, title: evidenceTitle, rows: [], total: 0, loading: true, parent });`,
      );

      next = next.replace(
        '  if (/software/.test(`${a} ${k} ${agent}`)) return "software";',
        '  if (/software-roi|software roi|roi/.test(`${a} ${k} ${agent}`)) return "software-roi";\n  if (/software/.test(`${a} ${k} ${agent}`)) return "software";',
      );

      next = next.replace(
        '  if (kind === "software") {\n    return [',
        `  if (kind === "software-roi") {\n    return [\n      { label: "Software", render: (row: EvidenceRow) => evidenceCellValue(row, ["softwareName", "deviceName"]) },\n      { label: "Publisher", render: (row: EvidenceRow) => evidenceCellValue(row, ["publisher", "brand"], "-") },\n      { label: "Licence", render: (row: EvidenceRow) => evidenceCellValue(row, "licenseCount", "0") },\n      { label: "Installed PC", render: (row: EvidenceRow) => evidenceCellValue(row, "installedPc", "0") },\n      { label: "Avg usage", render: (row: EvidenceRow) => evidenceCellValue(row, "averageUsageHours", "0.00") + "h" },\n      { label: "Used / Under / Not used", render: (row: EvidenceRow) => evidenceCellValue(row, "utilizedHours", "0.00") + "h / " + evidenceCellValue(row, "underUtilizedHours", "0.00") + "h / " + evidenceCellValue(row, "notUsedHours", "0.00") + "h" },\n      { label: "Opportunity", render: (row: EvidenceRow) => evidenceCellValue(row, "opportunityLicenses", "0") + " licence(s)" },\n      { label: "Potential saving", render: (row: EvidenceRow) => evidenceCostText(row) },\n      { label: "ROI status", render: (row: EvidenceRow) => evidenceCellValue(row, "status", "-") },\n    ];\n  }\n\n  if (kind === "software") {\n    return [`,
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}
