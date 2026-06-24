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
          `  const softwareRoiDrillRow = useMemo<DrillRow | null>(() => {\n    const summary = softwareRoi?.summary;\n    if (!summary) return null;\n    const savingValue = moneyValue(summary.potentialSavings);\n    const monitored = Number(summary.monitoredSoftware || (softwareRoi?.rows || []).length || 0);\n    const unused = Number(summary.unusedPaidSoftware || 0);\n    const underUsed = Number(summary.underUtilizedSoftware || 0);\n    return {\n      key: 'software-roi',\n      label: 'Software ROI',\n      count: monitored,\n      value: savingValue,\n      valueFmt: formatMoney(savingValue),\n      level3Area: 'saving',\n      level3Key: 'software-roi',\n      tone: savingValue > 0 ? 'green' : 'slate',\n      impactType: 'Cost optimization',\n      riskType: 'Unused paid software',\n      costType: 'Software licence waste',\n      metricLabel: 'Potential savings',\n      confidence: monitored > 0 ? 'Usage evidence from monitor history' : 'Waiting for usage evidence',\n      decision: savingValue > 0 ? 'Recover or reduce unused paid software licences' : 'Monitor paid software utilization',\n      insight: unused.toLocaleString() + ' unused and ' + underUsed.toLocaleString() + ' under-utilized paid software item(s).',\n      sample: [unused.toLocaleString() + ' unused paid software', underUsed.toLocaleString() + ' under-utilized software'],\n    };\n  }, [softwareRoi]);\n\n  const topKpis = useMemo(() => dashboard.executiveKpis.slice(0, 6), [dashboard.executiveKpis]);`,
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

      return next === code ? null : { code: next, map: null };
    },
  };
}
