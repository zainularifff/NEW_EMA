import type { Plugin } from 'vite';

const ROI_TYPES = String.raw`
type SoftwareRoiSummary = {
  currency?: string;
  potentialSavings?: number;
  unusedPaidSoftware?: number;
  underUtilizedSoftware?: number;
  utilizedSoftware?: number;
  monitoredSoftware?: number;
  averageUsageHours?: number;
  opportunityLicenses?: number;
  evidenceWindowDays?: number;
};

type SoftwareRoiPayload = {
  summary?: SoftwareRoiSummary;
  rows?: Array<Record<string, unknown>>;
};
`;

const SOFTWARE_ROI_BREAKDOWN_VIEW = String.raw`
  function renderSoftwareRoiBreakdownView() {
    const summary = softwareRoi?.summary || {};
    const apiRows = softwareRoi?.rows || [];
    const savingValue = moneyValue(summary.potentialSavings);
    const monitored = Number(summary.monitoredSoftware || apiRows.length || 0);
    const unused = Number(summary.unusedPaidSoftware || 0);
    const underUsed = Number(summary.underUtilizedSoftware || 0);
    const utilized = Number(summary.utilizedSoftware || 0);
    const recoverableLicences = Number(summary.opportunityLicenses || 0);
    const avgUsage = Number(summary.averageUsageHours || 0);
    const windowDays = Number(summary.evidenceWindowDays || 30);
    const hasRows = apiRows.length > 0;
    const rowsForTable = hasRows ? apiRows : [{
      SoftwareName: 'Waiting for Software ROI API',
      Publisher: '-',
      LicenseCount: 0,
      InstalledPC: 0,
      TotalOpenCount: 0,
      TotalUsageHours: 0,
      AverageUsageHours: 0,
      AverageDailyUsageHours: 0,
      UtilizedHours: 'UtilizedHours',
      UnderUtilizedHours: 'UnderUtilizedHours',
      NotUsedHours: 'NotUsedHours',
      OpportunityLicenses: 0,
      PotentialSaving: 0,
      RoiStatus: softwareRoiLoaded ? 'No ROI rows returned' : 'Waiting API',
      EvidenceNote: 'Register /api/management-dashboard/software-roi. API must calculate software usage from TSSM_MONITOR_HISTORY using SW_Idn, App_StartTime, App_EndTime and ActiveTime, then compare with EMA_SoftwarePolicyItem thresholds.',
    }];

    return (
      <section className="md-view-panel">
        <div className="md-view-header">
          <div>
            <span className="md-view-eyebrow">Software ROI</span>
            <h2>Software ROI - usage vs licence rules</h2>
            <p>Cost Saving lens based on software register rules and application usage history. No branch optimisation placeholder is used here.</p>
          </div>
          <div className="md-view-actions">
            <button type="button" className="md-action-btn primary" onClick={closeDrilldown}><Icon name="back" /> Back to Overview</button>
            <button type="button" className="md-action-btn" onClick={refreshDashboard}><Icon name="refresh" /> Refresh</button>
          </div>
        </div>
        <div className="md-view-body">
          <div className="md-command-lens">
            <section className="md-command-hero">
              <div className="md-command-story">
                <span>Software rules + monitor history</span>
                <h3>ROI is calculated from registered software licences, usage hours and utilization thresholds.</h3>
                <p>
                  Source rules come from EMA_SoftwarePolicyItem and EMA_SoftwarePolicy. Usage evidence comes from TSSM_MONITOR_HISTORY using SW_Idn, App_StartTime, App_EndTime and ActiveTime.
                </p>
              </div>
              <div className="md-command-scoreboard">
                <article>
                  <span>Potential Saving</span>
                  <strong>{hasRows ? formatMoney(savingValue) : 'Waiting API'}</strong>
                  <small>OpportunityLicenses × UnitPrice</small>
                </article>
                <article>
                  <span>Recoverable Licences</span>
                  <strong>{recoverableLicences.toLocaleString()}</strong>
                  <small>Not used / under-utilized licence opportunity</small>
                </article>
                <article>
                  <span>Average Usage</span>
                  <strong>{avgUsage.toFixed(2)}h</strong>
                  <small>{windowDays.toLocaleString()} day evidence window</small>
                </article>
              </div>
            </section>

            <section className="md-decision-grid">
              <article className="md-decision-card tone-green">
                <span className="md-card-kicker">Not used</span>
                <h3>Below NotUsedHours</h3>
                <div className="md-decision-value-row"><strong>{unused.toLocaleString()}</strong><span>software item(s)</span></div>
                <p className="md-decision-insight">If average usage is below or equal to NotUsedHours, licence can be reviewed for removal or non-renewal.</p>
                <div className="md-decision-meta"><span>EMA_SoftwarePolicyItem.NotUsedHours</span></div>
              </article>
              <article className="md-decision-card tone-amber">
                <span className="md-card-kicker">Under-utilized</span>
                <h3>Below UnderUtilizedHours</h3>
                <div className="md-decision-value-row"><strong>{underUsed.toLocaleString()}</strong><span>software item(s)</span></div>
                <p className="md-decision-insight">If average usage is lower than UnderUtilizedHours, licence is not fully used and should be reviewed.</p>
                <div className="md-decision-meta"><span>EMA_SoftwarePolicyItem.UnderUtilizedHours</span></div>
              </article>
              <article className="md-decision-card tone-blue">
                <span className="md-card-kicker">Utilized</span>
                <h3>Meets UtilizedHours</h3>
                <div className="md-decision-value-row"><strong>{utilized.toLocaleString()}</strong><span>software item(s)</span></div>
                <p className="md-decision-insight">If average usage meets UtilizedHours, licence is treated as used and not counted as saving opportunity.</p>
                <div className="md-decision-meta"><span>EMA_SoftwarePolicyItem.UtilizedHours</span></div>
              </article>
            </section>

            <section className="md-command-table-card">
              <div className="md-command-table-head">
                <div>
                  <span className="md-command-pill">Management actions by value and evidence</span>
                  <h3>Software ROI evidence</h3>
                </div>
                <p>Every row compares actual usage hours against the software rule thresholds before showing licence opportunity.</p>
              </div>
              <div className="md-table-wrap">
                <table className="md-table" style={{ minWidth: 1280 }}>
                  <thead>
                    <tr>
                      <th>Software</th>
                      <th>Publisher</th>
                      <th>Licence</th>
                      <th>Installed PC</th>
                      <th>Open Count</th>
                      <th>Total Usage</th>
                      <th>Avg Usage</th>
                      <th>Daily Avg</th>
                      <th>Used / Under / Not Used</th>
                      <th>Opportunity</th>
                      <th>Potential Saving</th>
                      <th>ROI Status</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsForTable.map((row, index) => {
                      const item = row as Record<string, unknown>;
                      const potential = moneyValue(item.PotentialSaving);
                      return (
                        <tr key={String(item.PolicyItemID || item.SoftwareName || index)}>
                          <td><strong>{String(item.SoftwareName || '-')}</strong></td>
                          <td>{String(item.Publisher || '-')}</td>
                          <td>{Number(item.LicenseCount || 0).toLocaleString()}</td>
                          <td>{Number(item.InstalledPC || 0).toLocaleString()}</td>
                          <td>{Number(item.TotalOpenCount || 0).toLocaleString()}</td>
                          <td>{Number(item.TotalUsageHours || 0).toFixed(2)}h</td>
                          <td>{Number(item.AverageUsageHours || 0).toFixed(2)}h</td>
                          <td>{Number(item.AverageDailyUsageHours || 0).toFixed(2)}h</td>
                          <td>{String(item.UtilizedHours || '0')}h / {String(item.UnderUtilizedHours || '0')}h / {String(item.NotUsedHours || '0')}h</td>
                          <td>{Number(item.OpportunityLicenses || 0).toLocaleString()} licence(s)</td>
                          <td><strong>{formatMoney(potential)}</strong></td>
                          <td>{String(item.RoiStatus || '-')}</td>
                          <td>{String(item.EvidenceNote || 'Usage compared with Software Policy thresholds')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </section>
    );
  }
`;

export function managementSoftwareRoiTransform(): Plugin {
  return {
    name: 'management-software-roi-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/ManagementDashboard.tsx')) return null;
      let next = code;

      if (!next.includes('type SoftwareRoiSummary =')) {
        next = next.replace('type TrendPoint = {', ROI_TYPES + '\ntype TrendPoint = {');
      }

      if (!next.includes('softwareRoi, setSoftwareRoi')) {
        next = next.replace(
          '  const [tablePageSize, setTablePageSize] = useState(10);',
          `  const [tablePageSize, setTablePageSize] = useState(10);\n  const [softwareRoi, setSoftwareRoi] = useState<SoftwareRoiPayload | null>(null);\n  const [softwareRoiLoaded, setSoftwareRoiLoaded] = useState(false);`,
        );
      }

      if (!next.includes('managementDashboardService.getSoftwareRoi<SoftwareRoiPayload>')) {
        next = next.replace(
          '  useEffect(() => { loadDashboard(); }, []);',
          `  useEffect(() => { loadDashboard(); }, []);\n\n  useEffect(() => {\n    let alive = true;\n    setSoftwareRoiLoaded(false);\n    managementDashboardService.getSoftwareRoi<SoftwareRoiPayload>()\n      .then((data) => {\n        if (!alive) return;\n        setSoftwareRoi(data || null);\n        setSoftwareRoiLoaded(true);\n      })\n      .catch(() => {\n        if (!alive) return;\n        setSoftwareRoi(null);\n        setSoftwareRoiLoaded(true);\n      });\n    return () => { alive = false; };\n  }, []);`,
        );
      }

      if (!next.includes('const softwareRoiDrillRow = useMemo<DrillRow>(() =>')) {
        next = next.replace(
          '  const topKpis = useMemo(() => dashboard.executiveKpis.slice(0, 6), [dashboard.executiveKpis]);',
          `  const softwareRoiDrillRow = useMemo<DrillRow>(() => {\n    const summary = softwareRoi?.summary || {};\n    const savingValue = moneyValue(summary.potentialSavings);\n    const monitored = Number(summary.monitoredSoftware || (softwareRoi?.rows || []).length || 0);\n    const unused = Number(summary.unusedPaidSoftware || 0);\n    const underUsed = Number(summary.underUtilizedSoftware || 0);\n    const utilized = Number(summary.utilizedSoftware || 0);\n    const opportunityLicenses = Number(summary.opportunityLicenses || 0);\n    const avgUsage = Number(summary.averageUsageHours || 0);\n    const windowDays = Number(summary.evidenceWindowDays || 30);\n    const hasEvidence = monitored > 0 || savingValue > 0 || unused > 0 || underUsed > 0 || opportunityLicenses > 0;\n\n    return {\n      key: 'software-roi',\n      label: 'Software ROI - usage vs licence rules',\n      count: hasEvidence ? monitored : 1,\n      value: savingValue,\n      valueFmt: hasEvidence ? formatMoney(savingValue) : 'Waiting API',\n      level3Area: 'saving',\n      level3Key: 'software-roi',\n      tone: savingValue > 0 ? 'green' : softwareRoiLoaded ? 'amber' : 'slate',\n      impactType: 'Cost optimization',\n      riskType: 'Software register + monitor history',\n      costType: 'Licence waste / recovery',\n      metricLabel: hasEvidence ? 'Potential saving' : 'ROI API status',\n      confidence: hasEvidence ? 'Policy thresholds + TSSM usage evidence' : softwareRoiLoaded ? 'No ROI rows returned' : 'Waiting for Software ROI API',\n      decision: hasEvidence\n        ? 'Recover unused or under-used licences based on actual usage evidence'\n        : 'Register Software ROI API to calculate usage from App_StartTime, App_EndTime and ActiveTime',\n      insight: hasEvidence\n        ? 'Window ' + windowDays.toLocaleString() + ' day(s): ' + unused.toLocaleString() + ' not used, ' + underUsed.toLocaleString() + ' under-utilized, ' + utilized.toLocaleString() + ' utilized, ' + opportunityLicenses.toLocaleString() + ' licence(s) recoverable, average usage ' + avgUsage.toFixed(2) + 'h.'\n        : 'Software ROI uses EMA_SoftwarePolicyItem thresholds: UtilizedHours, UnderUtilizedHours and NotUsedHours, then compares usage hours from TSSM_MONITOR_HISTORY.',\n      sample: hasEvidence\n        ? [\n            'Potential saving: ' + formatMoney(savingValue),\n            unused.toLocaleString() + ' not used software item(s)',\n            underUsed.toLocaleString() + ' under-utilized software item(s)',\n            opportunityLicenses.toLocaleString() + ' licence(s) can be recovered',\n          ]\n        : [\n            'API endpoint: /api/management-dashboard/software-roi',\n            'Source: EMA_SoftwarePolicyItem + EMA_SoftwarePolicy + TSSM_MONITOR_HISTORY',\n            'Logic: usage hour <= NotUsedHours = Not Used; usage hour < UnderUtilizedHours = Under Utilized; usage hour >= UtilizedHours = Utilized',\n          ],\n    };\n  }, [softwareRoi, softwareRoiLoaded]);\n\n  const softwareRoiEvidenceRows = useMemo<EvidenceRow[]>(() => {\n    const rows = softwareRoi?.rows || [];\n    if (!rows.length) {\n      return [{\n        assetKey: 'software-roi-api-pending',\n        objectAgent: 'Software ROI',\n        evidenceType: 'software-roi',\n        softwareName: 'Software ROI calculation pending',\n        deviceName: 'Software ROI calculation pending',\n        publisher: '-',\n        brand: '-',\n        category: 'Software / ROI',\n        classification: 'Cost Saving',\n        licenseCount: '0',\n        installedPc: '0',\n        openCount: '0',\n        totalUsageHours: '0.00',\n        averageUsageHours: '0.00',\n        averageDailyUsageHours: '0.00',\n        utilizedHours: 'UtilizedHours threshold',\n        underUtilizedHours: 'UnderUtilizedHours threshold',\n        notUsedHours: 'NotUsedHours threshold',\n        workWindow: 'WorkingStartTime - WorkingEndTime',\n        workDays: 'WorkDays',\n        opportunityLicenses: '0',\n        replacementCost: formatMoney(0),\n        status: softwareRoiLoaded ? 'No ROI evidence returned' : 'Waiting API',\n        riskSeverity: 'Review',\n        reason: 'Register /api/management-dashboard/software-roi. It will calculate usage hours from TSSM_MONITOR_HISTORY using SW_Idn, App_StartTime, App_EndTime and ActiveTime, then compare with policy thresholds.',\n      }];\n    }\n\n    return rows.map((row, index) => ({\n      assetKey: String(row.PolicyItemID || row.SoftwareName || index),\n      objectAgent: 'Software ROI',\n      evidenceType: 'software-roi',\n      softwareName: String(row.SoftwareName || '-'),\n      deviceName: String(row.SoftwareName || '-'),\n      publisher: String(row.Publisher || '-'),\n      brand: String(row.Publisher || '-'),\n      category: 'Software / ROI',\n      classification: String(row.CategoryName || row.ComplianceStatus || 'Legal software'),\n      licenseCount: Number(row.LicenseCount || 0).toLocaleString(),\n      installedPc: Number(row.InstalledPC || 0).toLocaleString(),\n      openCount: Number(row.TotalOpenCount || 0).toLocaleString(),\n      totalUsageHours: Number(row.TotalUsageHours || 0).toFixed(2),\n      averageUsageHours: Number(row.AverageUsageHours || 0).toFixed(2),\n      averageDailyUsageHours: Number(row.AverageDailyUsageHours || 0).toFixed(2),\n      utilizedHours: Number(row.UtilizedHours || 0).toFixed(2),\n      underUtilizedHours: Number(row.UnderUtilizedHours || 0).toFixed(2),\n      notUsedHours: Number(row.NotUsedHours || 0).toFixed(2),\n      workWindow: String(row.WorkingStartTime || '-') + ' - ' + String(row.WorkingEndTime || '-'),\n      workDays: String(row.WorkDays || '-'),\n      opportunityLicenses: Number(row.OpportunityLicenses || 0).toLocaleString(),\n      replacementCost: formatMoney(row.PotentialSaving || 0),\n      status: String(row.RoiStatus || '-'),\n      riskSeverity: String(row.RoiStatus || '-'),\n      reason: String(row.EvidenceNote || 'Usage compared with Software Policy utilization thresholds'),\n    }));\n  }, [softwareRoi, softwareRoiLoaded]);\n\n  const topKpis = useMemo(() => dashboard.executiveKpis.slice(0, 6), [dashboard.executiveKpis]);`,
        );
      }

      next = next.replace(
        '  const pillars = useMemo(() => dashboard.pillars.slice(0, 4), [dashboard.pillars]);',
        `  const pillars = useMemo(() => {\n    const summary = softwareRoi?.summary || {};\n    const savingValue = moneyValue(summary.potentialSavings);\n    const unused = Number(summary.unusedPaidSoftware || 0);\n    const underUsed = Number(summary.underUtilizedSoftware || 0);\n    const opportunityLicenses = Number(summary.opportunityLicenses || 0);\n    return dashboard.pillars.slice(0, 4).map((pillar) => {\n      const text = String(pillar.id || pillar.title || '').toLowerCase();\n      if (!/saving|cost/.test(text)) return pillar;\n      return {\n        ...pillar,\n        scoreTitle: 'Cost Saving + Software ROI',\n        scoreValue: savingValue > 0 ? formatMoney(savingValue) : (pillar.scoreValue || pillar.secondValue || 'ROI'),\n        scoreUnit: '',\n        scoreStatus: savingValue > 0\n          ? opportunityLicenses.toLocaleString() + ' recoverable licence(s)'\n          : softwareRoiLoaded ? 'Software ROI evidence ready for review' : 'Waiting Software ROI API',\n        secondTitle: 'Software ROI',\n        secondValue: savingValue > 0 ? formatMoney(savingValue) : 'ROI',\n        secondNote: unused.toLocaleString() + ' not used • ' + underUsed.toLocaleString() + ' under-utilized',\n      };\n    });\n  }, [dashboard.pillars, softwareRoi, softwareRoiLoaded]);`,
      );

      next = next.replace(
        '  const actions = useMemo(() => dashboard.boardActions.slice(0, 8), [dashboard.boardActions]);',
        `  const actions = useMemo(() => {\n    const baseActions = dashboard.boardActions.filter((action) => String(action.key || '').toLowerCase() !== 'saving:software-roi' && String(action.key || '').toLowerCase() !== 'software-roi');\n    const roiAction: BoardAction = {\n      area: 'Saving',\n      key: 'saving:software-roi',\n      issue: 'Software ROI - usage vs licence rules',\n      impact: softwareRoiDrillRow.valueFmt || formatMoney(0),\n      decision: softwareRoiDrillRow.decision || 'Review software register usage, recover unused paid licences and reduce renewal waste',\n      priority: moneyValue(softwareRoiDrillRow.value) > 0 ? 'High' : 'Medium',\n    };\n    return [roiAction, ...baseActions].slice(0, 8);\n  }, [dashboard.boardActions, softwareRoiDrillRow]);`,
      );

      next = next.replace(
        '      const rows = dashboard.level2[area] || [];\n      if (rows.length) {',
        `      const baseRows = dashboard.level2[area] || [];\n      const rows = area === 'saving'\n        ? [softwareRoiDrillRow]\n        : baseRows;\n      if (rows.length) {`,
      );

      next = next.replace(
        '      const rows: DrillRow[] = dashboard.boardActions.map((action) => {',
        `      const rows: DrillRow[] = actions.map((action) => {`,
      );

      if (!next.includes('function renderSoftwareRoiBreakdownView()')) {
        next = next.replace('  function renderBreakdownView() {', SOFTWARE_ROI_BREAKDOWN_VIEW + '\n\n  function renderBreakdownView() {');
      }

      next = next.replace(
        '  function renderBreakdownView() {\n    const rows = (drill.rows || []) as DrillRow[];',
        `  function renderBreakdownView() {\n    const rows = (drill.rows || []) as DrillRow[];\n    if (String(drill.area || '').toLowerCase() === 'saving' && rows.some((row) => String(row.key || '').toLowerCase() === 'software-roi')) return renderSoftwareRoiBreakdownView();`,
      );

      next = next.replace(
        '    setDrill({ level: 3, area, key, title: evidenceTitle, rows: [], total: 0, loading: true, parent });',
        `    if (String(area || '').toLowerCase() === 'saving' && String(key || '').toLowerCase() === 'software-roi') {\n      setDrill({ level: 3, area, key, title: 'Software ROI Evidence - policy usage and licence saving', rows: softwareRoiEvidenceRows, total: softwareRoiEvidenceRows.length, loading: false, parent });\n      return;\n    }\n    setDrill({ level: 3, area, key, title: evidenceTitle, rows: [], total: 0, loading: true, parent });`,
      );

      next = next.replace(
        '  if (/software/.test(`${a} ${k} ${agent}`)) return "software";',
        '  if (/software-roi|software roi|roi/.test(`${a} ${k} ${agent}`)) return "software-roi";\n  if (/software/.test(`${a} ${k} ${agent}`)) return "software";',
      );

      next = next.replace(
        '  if (kind === "software") {\n    return [',
        `  if (kind === "software-roi") {\n    return [\n      { label: "Software", render: (row: EvidenceRow) => evidenceCellValue(row, ["softwareName", "deviceName"]) },\n      { label: "Publisher", render: (row: EvidenceRow) => evidenceCellValue(row, ["publisher", "brand"], "-") },\n      { label: "Licence", render: (row: EvidenceRow) => evidenceCellValue(row, "licenseCount", "0") },\n      { label: "Installed PC", render: (row: EvidenceRow) => evidenceCellValue(row, "installedPc", "0") },\n      { label: "Open Count", render: (row: EvidenceRow) => evidenceCellValue(row, "openCount", "0") },\n      { label: "Total Usage", render: (row: EvidenceRow) => evidenceCellValue(row, "totalUsageHours", "0.00") + "h" },\n      { label: "Avg Usage", render: (row: EvidenceRow) => evidenceCellValue(row, "averageUsageHours", "0.00") + "h" },\n      { label: "Daily Avg", render: (row: EvidenceRow) => evidenceCellValue(row, "averageDailyUsageHours", "0.00") + "h" },\n      { label: "Used / Under / Not Used", render: (row: EvidenceRow) => evidenceCellValue(row, "utilizedHours", "0.00") + "h / " + evidenceCellValue(row, "underUtilizedHours", "0.00") + "h / " + evidenceCellValue(row, "notUsedHours", "0.00") + "h" },\n      { label: "Working Window", render: (row: EvidenceRow) => evidenceCellValue(row, "workWindow", "-") + " · " + evidenceCellValue(row, "workDays", "-") },\n      { label: "Opportunity", render: (row: EvidenceRow) => evidenceCellValue(row, "opportunityLicenses", "0") + " licence(s)" },\n      { label: "Potential Saving", render: (row: EvidenceRow) => evidenceCostText(row) },\n      { label: "ROI Status", render: (row: EvidenceRow) => evidenceCellValue(row, "status", "-") },\n      { label: "Logic / Evidence", render: (row: EvidenceRow) => evidenceCellValue(row, "reason", "Usage compared with Software Policy thresholds") },\n    ];\n  }\n\n  if (kind === "software") {\n    return [`,
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}
