import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { itopsSoftwareDrilldownTransform } from './src/utils/itopsSoftwareDrilldownTransform';
import { hardwarePaginationFixTransform } from './src/utils/hardwarePaginationFixTransform';

function dashboardFocusCardOrderPatch() {
  return {
    name: 'dashboard-focus-card-order-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      const next = code.replace(
        /  const focusCards: FocusCard\[\] = useMemo\(\(\) => \[([\s\S]*?)\n  \], \[/,
        (match, body: string) => {
          const cardBlocks = body
            .split('\n    {')
            .slice(1)
            .map((block) => `\n    {${block.split('\n    },')[0]}\n    },`);
          const pick = (cardId: string) => cardBlocks.find((block) => block.includes(`id: '${cardId}',`))?.trimStart() || '';

          const ordered = ['devices', 'software', 'service', 'location', 'risk', 'patch']
            .map(pick)
            .filter(Boolean)
            .join('\n');

          return ordered ? `  const focusCards: FocusCard[] = useMemo(() => [\n${ordered}\n  ], [` : match;
        }
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}

function dashboardFocusCardColorPatch() {
  return {
    name: 'dashboard-focus-card-color-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      let next = code;
      const helperAnchor = '\nfunction KpiCard({ card, onOpen }: { card: FocusCard; onOpen: (view: string) => void }) {';
      const helper = `
function getFocusCardVisualStyle(view: string): CSSProperties {
  if (view === 'hardware') return { background: 'linear-gradient(135deg, #1e3a8a 0%, #0369a1 58%, #22d3ee 100%)' };
  if (view === 'software') return { background: 'linear-gradient(135deg, #581c87 0%, #7c3aed 56%, #c084fc 100%)' };
  if (view === 'serviceDesk') return { background: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 58%, #f59e0b 100%)' };
  if (view === 'geolocation') return { background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 56%, #2dd4bf 100%)' };
  if (view === 'risk') return { background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 56%, #fb7185 100%)' };
  if (view === 'patch') return { background: 'linear-gradient(135deg, #14532d 0%, #16a34a 56%, #84cc16 100%)' };
  return {};
}
`;

      if (next.includes(helperAnchor) && !next.includes('getFocusCardVisualStyle')) {
        next = next.replace(helperAnchor, `${helper}${helperAnchor}`);
      }

      next = next.split('className={`itops-pro-kpi itops-pro-kpi-${card.tone}`} onClick={() => onOpen(card.view)} aria-haspopup="dialog" data-drilldown-view={card.view}')
        .join('className={`itops-pro-kpi itops-pro-kpi-${card.tone}`} style={getFocusCardVisualStyle(card.view)} onClick={() => onOpen(card.view)} aria-haspopup="dialog" data-drilldown-view={card.view}');

      return next === code ? null : { code: next, map: null };
    },
  };
}

function dashboardUiPatch() {
  return {
    name: 'dashboard-ui-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      const exportStart = code.indexOf('          <button type="button" className="itops-pro-outline-btn"');
      const exportMarker = code.indexOf('<Download size={16} /> Export', exportStart);
      const exportEnd = exportMarker > -1 ? code.indexOf('          </button>', exportMarker) : -1;

      let next = code;
      if (exportStart > -1 && exportMarker > -1 && exportEnd > -1) {
        next = code.slice(0, exportStart) + code.slice(exportEnd + '          </button>'.length);
      }

      next = next.split('const hasSummaryCountWithoutRows = expectedCount > 0 && selectedRows.length === 0;').join('const hasSummaryCountWithoutRows = false;');
      next = next.split("tone: 'amber',\n      progress: softwareMappingPercent,").join("tone: 'purple',\n      progress: softwareMappingPercent,");

      const policyFetchHelperMarker = '\nasync function fetchItOpsDashboardData(forceRefresh = false) {';
      const policyFetchHelper = `
async function fetchSoftwarePolicyDashboardSummary(headers: Headers) {
  try {
    const response = await fetch(buildApiUrl('/api/settings/software-policy/policies'), {
      headers,
      credentials: 'include',
    });

    if (!response.ok) return null;

    const payload = await response.json().catch(() => null) as { success?: boolean; data?: unknown } | null;
    if (payload?.success === false) return null;

    const rows = Array.isArray(payload?.data) ? payload.data as Record<string, unknown>[] : [];
    const policyLegalSoftware = rows.reduce((sum, row) => sum + numberOrFallback(row.LegalCount ?? row.legalCount), 0);
    const explicitIllegalSoftware = rows.reduce((sum, row) => sum + numberOrFallback(row.IllegalCount ?? row.illegalCount), 0);
    const policyTotalSoftware = rows.reduce((sum, row) => sum + numberOrFallback(row.TotalItems ?? row.totalItems), 0) || policyLegalSoftware + explicitIllegalSoftware;
    const policyIllegalSoftware = explicitIllegalSoftware;
    const policyLicenseTotal = rows.reduce((sum, row) => sum + numberOrFallback(row.LicenseTotal ?? row.licenseTotal), 0);

    return {
      policyTotalSoftware,
      policyLegalSoftware,
      policyIllegalSoftware,
      policyLicenseTotal,
    } as Record<string, number>;
  } catch (_) {
    return null;
  }
}
`;
      if (next.includes(policyFetchHelperMarker) && !next.includes('fetchSoftwarePolicyDashboardSummary')) {
        next = next.replace(policyFetchHelperMarker, `${policyFetchHelper}${policyFetchHelperMarker}`);
      }

      const oldDashboardDataReturn = `  const data = normalizeDashboardData(payload.data);
  itopsDashboardClientCache = { at: Date.now(), data };
  return data;`;
      const newDashboardDataReturn = `  let data = normalizeDashboardData(payload.data);
  const softwarePolicySummary = await fetchSoftwarePolicyDashboardSummary(headers);
  if (softwarePolicySummary) {
    data = normalizeDashboardData({
      ...data,
      software: {
        ...data.software,
        ...softwarePolicySummary,
      },
    });
  }
  itopsDashboardClientCache = { at: Date.now(), data };
  return data;`;
      next = next.split(oldDashboardDataReturn).join(newDashboardDataReturn);

      const policyExpectedCountAnchor = "    if (selected.includes('unclassified')) return numberOrFallback(software.unclassifiedSoftware);\n";
      const policyExpectedCountPatch = "    if (selected.includes('unclassified')) return numberOrFallback(software.unclassifiedSoftware);\n    if (selected.includes('illegal')) {\n      const softwarePolicy = software as SoftwareSummary & Record<string, unknown>;\n      const policyLegalSoftware = numberOrFallback(softwarePolicy.policyLegalSoftware ?? softwarePolicy.legalSoftware ?? softwarePolicy.LegalCount, 0);\n      const allSoftwareTotal = Math.max(numberOrFallback(software.uniqueSoftware), numberOrFallback(softwarePolicy.policyTotalSoftware ?? softwarePolicy.totalPolicySoftware, 0), policyLegalSoftware + numberOrFallback(softwarePolicy.policyIllegalSoftware ?? softwarePolicy.illegalSoftware ?? softwarePolicy.IllegalCount, 0));\n      return Math.max(0, allSoftwareTotal - policyLegalSoftware);\n    }\n    if (selected.includes('legal')) return numberOrFallback((software as SoftwareSummary & Record<string, unknown>).policyLegalSoftware, 0);\n";
      next = next.split(policyExpectedCountAnchor).join(policyExpectedCountPatch);

      const policyResolveAnchor = "    if (!selected || selected.includes('install')) return rows;\n    if (selected.includes('unique software')) return uniqueSoftwareRows(rows);\n\n";
      const policyResolvePatch = "    if (!selected || selected.includes('install')) return rows;\n    if (selected.includes('unique software')) return uniqueSoftwareRows(rows);\n    if (selected.includes('illegal')) return uniqueSoftwareRows(rows);\n    if (selected.includes('legal')) return rows.filter((row) => /(^|\\b)legal(\\b|$)|approved|allowed/.test(getSoftwareRowSearchText(row)) && !/(^|\\b)illegal(\\b|$)|blocked|restricted|unauthorized|unapproved/.test(getSoftwareRowSearchText(row)));\n\n";
      next = next.split(policyResolveAnchor).join(policyResolvePatch);

      const policyDonutAnchor = "  const getSoftwareClassificationGraphRows = () => {";
      const policyHelpers = `  const renderSoftwarePolicyDonut = (items: { label: string; value: number; target: string; note: string; tone: CardTone }[], total: number) => {
    const displayTotal = Math.max(0, total || items.reduce((sum, item) => sum + numberOrFallback(item.value), 0));
    const safeTotal = Math.max(1, displayTotal);
    const legalCount = numberOrFallback(items.find((item) => item.target === 'Legal Software')?.value, 0);
    const illegalCount = numberOrFallback(items.find((item) => item.target === 'Illegal Software')?.value, 0);
    const complianceRate = displayTotal > 0 ? (legalCount / safeTotal) * 100 : 0;
    const legalShare = clampPercent(complianceRate);
    const illegalShare = clampPercent(100 - legalShare);
    const ringLength = 339.292;
    const legalArc = (legalShare / 100) * ringLength;
    const statusText = legalShare >= 90 ? 'Compliant' : legalShare >= 70 ? 'Review' : 'High Risk';
    const statusColor = legalShare >= 90 ? '#059669' : legalShare >= 70 ? '#d97706' : '#dc2626';

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr)', gap: 20, alignItems: 'center' }}>
        <button type="button" onClick={() => openLevel3('software', illegalCount > 0 ? 'Illegal Software' : 'Legal Software')} style={{ position: 'relative', width: 220, minHeight: 220, border: '1px solid #dbeafe', borderRadius: 30, background: 'radial-gradient(circle at 50% 44%, #ffffff 0%, #ffffff 38%, #f8fafc 39%, #eef6ff 100%)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 22px 50px rgba(15,23,42,.10)', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', inset: 14, borderRadius: 26, background: 'linear-gradient(135deg, rgba(34,197,94,.10), rgba(239,68,68,.08))' }} />
          <svg viewBox="0 0 220 220" width="190" height="190" style={{ position: 'relative', zIndex: 1, transform: 'rotate(-90deg)' }} aria-hidden="true">
            <defs>
              <linearGradient id="softwareComplianceLegal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#14b8a6" /><stop offset="100%" stopColor="#22c55e" /></linearGradient>
              <linearGradient id="softwareComplianceTrack" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fee2e2" /><stop offset="100%" stopColor="#fb7185" /></linearGradient>
            </defs>
            <circle cx="110" cy="110" r="76" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle cx="110" cy="110" r="54" fill="none" stroke="url(#softwareComplianceTrack)" strokeWidth="20" strokeLinecap="round" strokeDasharray="339.292 339.292" />
            <circle cx="110" cy="110" r="54" fill="none" stroke="url(#softwareComplianceLegal)" strokeWidth="20" strokeLinecap="round" strokeDasharray={String(legalArc) + ' 339.292'} />
            <circle cx="110" cy="110" r="34" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          </svg>
          <span style={{ position: 'absolute', zIndex: 2, width: 106, height: 106, borderRadius: 999, display: 'grid', placeItems: 'center', textAlign: 'center', background: 'rgba(255,255,255,.92)', boxShadow: '0 16px 32px rgba(15,23,42,.12)' }}>
            <span><small style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.08em' }}>Compliance</small><strong style={{ display: 'block', marginTop: 5, fontSize: 27, lineHeight: 1, fontWeight: 950, color: '#0f172a' }}>{formatPercent(complianceRate, 0)}</strong><small style={{ display: 'block', marginTop: 6, color: statusColor, fontSize: 9, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.06em' }}>{statusText}</small></span>
          </span>
          <span style={{ position: 'absolute', left: 16, bottom: 15, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 999, background: '#ffffff', color: '#334155', fontSize: 10, fontWeight: 900, boxShadow: '0 10px 22px rgba(15,23,42,.10)' }}><i style={{ width: 8, height: 8, borderRadius: 999, background: '#22c55e' }} />{formatNumber(legalCount)} legal</span>
          <span style={{ position: 'absolute', right: 16, bottom: 15, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 999, background: '#ffffff', color: '#334155', fontSize: 10, fontWeight: 900, boxShadow: '0 10px 22px rgba(15,23,42,.10)' }}><i style={{ width: 8, height: 8, borderRadius: 999, background: '#ef4444' }} />{formatNumber(illegalCount)} illegal</span>
        </button>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <button type="button" onClick={() => openLevel3('software', 'Legal Software')} style={{ minHeight: 98, border: '1px solid #bbf7d0', borderRadius: 18, background: 'linear-gradient(135deg, #f0fdf4, #ffffff)', padding: 14, textAlign: 'left', cursor: 'pointer', color: '#064e3b' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><b style={{ fontSize: 12, fontWeight: 950 }}>Legal Software</b><strong style={{ fontSize: 24, fontWeight: 950 }}>{formatNumber(legalCount)}</strong></span>
              <small style={{ display: 'block', marginTop: 4, color: '#047857', fontSize: 10, fontWeight: 850 }}>{formatPercent(legalShare, 1)} compliant asset</small>
              <em style={{ display: 'block', height: 7, marginTop: 12, borderRadius: 999, overflow: 'hidden', background: '#dcfce7' }}><i style={{ display: 'block', height: '100%', width: String(Math.max(3, legalShare)) + '%', borderRadius: 999, background: 'linear-gradient(90deg, #14b8a6, #22c55e)' }} /></em>
            </button>
            <button type="button" onClick={() => openLevel3('software', 'Illegal Software')} style={{ minHeight: 98, border: '1px solid #fecaca', borderRadius: 18, background: 'linear-gradient(135deg, #fff1f2, #ffffff)', padding: 14, textAlign: 'left', cursor: 'pointer', color: '#7f1d1d' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><b style={{ fontSize: 12, fontWeight: 950 }}>Illegal Software</b><strong style={{ fontSize: 24, fontWeight: 950 }}>{formatNumber(illegalCount)}</strong></span>
              <small style={{ display: 'block', marginTop: 4, color: '#b91c1c', fontSize: 10, fontWeight: 850 }}>{formatPercent(illegalShare, 1)} requires action</small>
              <em style={{ display: 'block', height: 7, marginTop: 12, borderRadius: 999, overflow: 'hidden', background: '#fee2e2' }}><i style={{ display: 'block', height: '100%', width: String(Math.max(3, illegalShare)) + '%', borderRadius: 999, background: 'linear-gradient(90deg, #f97316, #ef4444)' }} /></em>
            </button>
          </div>
          <div style={{ border: '1px solid #dbeafe', borderRadius: 18, background: 'linear-gradient(135deg, #eff6ff, #ffffff)', padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
            <div><strong style={{ display: 'block', color: '#1e3a8a', fontSize: 12, fontWeight: 950 }}>Compliance formula</strong><small style={{ display: 'block', marginTop: 3, color: '#475569', fontSize: 11, fontWeight: 800 }}>Legal Software / Total Software Asset. Unlisted software is treated as illegal.</small></div>
            <strong style={{ color: statusColor, fontSize: 20, fontWeight: 950 }}>{formatPercent(complianceRate, 0)}</strong>
          </div>
        </div>
      </div>
    );
  };

  const renderSecurityCompliancePanel = (policyItems: { label: string; value: number; target: string; note: string; tone: CardTone }[], total: number, lifecycleItems: { label: string; value: number; target: string; note: string; tone: CardTone }[]) => {
    const displayTotal = Math.max(0, total || policyItems.reduce((sum, item) => sum + numberOrFallback(item.value), 0));
    const safeTotal = Math.max(1, displayTotal);
    const legalCount = numberOrFallback(policyItems.find((item) => item.target === 'Legal Software')?.value, 0);
    const illegalCount = Math.max(0, displayTotal - legalCount);
    const legalDeg = Math.max(0, Math.min(360, (legalCount / safeTotal) * 360));
    const lifecycleTotal = Math.max(1, lifecycleItems.reduce((sum, item) => sum + numberOrFallback(item.value), 0));

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '250px minmax(0, 1fr)', gap: 18, alignItems: 'stretch' }}>
        <section style={{ border: '1px solid #e2e8f0', borderRadius: 22, padding: 16, background: 'linear-gradient(180deg, #ffffff, #f8fafc)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}><strong style={{ color: '#0f172a', fontSize: 13, fontWeight: 950 }}>Legal vs Illegal Ratio</strong><small style={{ color: '#64748b', fontWeight: 850 }}>License status</small></div>
          <button type="button" onClick={() => openLevel3('software', illegalCount > 0 ? 'Illegal Software' : 'Legal Software')} style={{ width: 170, height: 170, margin: '4px auto 14px', border: '0', borderRadius: '50%', background: 'conic-gradient(#22c55e 0deg ' + legalDeg + 'deg, #ef4444 ' + legalDeg + 'deg 360deg)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: '0 18px 38px rgba(15,23,42,.12)' }}>
            <span style={{ width: 104, height: 104, borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #e2e8f0' }}><span><strong style={{ display: 'block', color: '#0f172a', fontSize: 25, lineHeight: 1, fontWeight: 950 }}>{formatPercent((legalCount / safeTotal) * 100, 0)}</strong><small style={{ display: 'block', marginTop: 7, color: '#64748b', fontSize: 9, fontWeight: 900, textTransform: 'uppercase' }}>Legal</small></span></span>
          </button>
          <div style={{ display: 'grid', gap: 8 }}>
            <button type="button" onClick={() => openLevel3('software', 'Legal Software')} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', border: '1px solid #bbf7d0', borderRadius: 14, background: '#f0fdf4', color: '#064e3b', padding: '9px 10px', cursor: 'pointer', textAlign: 'left' }}><span style={{ fontSize: 11, fontWeight: 950 }}>Legal</span><strong>{formatNumber(legalCount)}</strong></button>
            <button type="button" onClick={() => openLevel3('software', 'Illegal Software')} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', border: '1px solid #fecaca', borderRadius: 14, background: '#fff1f2', color: '#7f1d1d', padding: '9px 10px', cursor: 'pointer', textAlign: 'left' }}><span style={{ fontSize: 11, fontWeight: 950 }}>Illegal</span><strong>{formatNumber(illegalCount)}</strong></button>
          </div>
        </section>

        <section style={{ border: '1px solid #e2e8f0', borderRadius: 22, padding: 16, background: 'linear-gradient(180deg, #ffffff, #f8fafc)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}><strong style={{ color: '#0f172a', fontSize: 13, fontWeight: 950 }}>Software Lifecycle Status</strong><small style={{ color: '#64748b', fontWeight: 850 }}>EOL/EOS breakdown</small></div>
          <div style={{ display: 'grid', gap: 12 }}>
            {lifecycleItems.map((item) => {
              const value = numberOrFallback(item.value);
              const percent = (value / lifecycleTotal) * 100;
              const color = item.tone === 'green' ? '#22c55e' : item.tone === 'amber' ? '#f59e0b' : '#ef4444';
              return (
                <button key={item.label} type="button" onClick={() => openLevel3('software', item.target)} style={{ border: '1px solid #e2e8f0', borderRadius: 16, background: '#ffffff', padding: '11px 12px', cursor: 'pointer', textAlign: 'left', color: '#0f172a' }}>
                  <span style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}><strong style={{ fontSize: 12, fontWeight: 950 }}>{item.label}</strong><b style={{ fontSize: 16 }}>{formatNumber(value)}</b></span>
                  <small style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: 10, fontWeight: 800 }}>{item.note}</small>
                  <em style={{ display: 'block', height: 9, marginTop: 10, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: String(Math.max(4, percent)) + '%', borderRadius: 999, background: color }} /></em>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  };

`;
      if (next.includes(policyDonutAnchor) && !next.includes('renderSoftwarePolicyDonut')) {
        next = next.replace(policyDonutAnchor, `${policyHelpers}${policyDonutAnchor}`);
      }

      const oldLifecycleRows = `    const lifecycleRows = [
      { label: 'Supported', target: 'Supported', note: 'Supported application lifecycle', tone: 'green' as CardTone, value: rows.filter((row) => softwareLifecycleMatches(row, 'supported')).length },
      { label: 'EOL/EOS Watch', target: 'EOL/EOS Watch', note: 'Near EOL/EOS from lifecycle lookup', tone: 'amber' as CardTone, value: numberOrFallback(software.eolApplications) + numberOrFallback(software.eosApplications) },
      { label: 'Unsupported Apps', target: 'Unsupported Apps', note: 'Expired or unsupported applications', tone: 'red' as CardTone, value: numberOrFallback(software.unsupportedApplications) },
      { label: 'Lifecycle Not Found', target: 'Lifecycle Not Found', note: 'No lifecycle mapping returned', tone: 'purple' as CardTone, value: rows.filter((row) => softwareLifecycleMatches(row, 'not found')).length },
    ];`;
      const newPolicyRows = `    const softwarePolicy = software as SoftwareSummary & Record<string, unknown>;
    const uniqueInventorySoftware = uniqueSoftwareRows(rows).length;
    const dashboardUniqueSoftware = numberOrFallback(software.uniqueSoftware, 0);
    const policyLegalSoftware = numberOrFallback(softwarePolicy.policyLegalSoftware ?? softwarePolicy.legalSoftware ?? softwarePolicy.LegalCount, 0);
    const explicitPolicyIllegalSoftware = numberOrFallback(softwarePolicy.policyIllegalSoftware ?? softwarePolicy.illegalSoftware ?? softwarePolicy.IllegalCount, 0);
    const policyItemTotalSoftware = numberOrFallback(softwarePolicy.policyTotalSoftware ?? softwarePolicy.totalPolicySoftware, 0);
    const policyTotalSoftware = Math.max(uniqueInventorySoftware, dashboardUniqueSoftware, policyItemTotalSoftware, policyLegalSoftware + explicitPolicyIllegalSoftware);
    const policyIllegalSoftware = Math.max(0, policyTotalSoftware - policyLegalSoftware);
    const lifecycleSupported = rows.filter((row) => softwareLifecycleMatches(row, 'supported')).length;
    const lifecycleApproaching = Math.max(0, numberOrFallback(software.eolApplications) + numberOrFallback(software.eosApplications));
    const lifecycleCritical = Math.max(numberOrFallback(software.unsupportedApplications), rows.filter((row) => softwareLifecycleMatches(row, 'unsupported')).length);
    const policyRows = [
      { label: 'Legal Software', target: 'Legal Software', note: 'Exists in Software Policy and classified Legal', tone: 'green' as CardTone, value: policyLegalSoftware },
      { label: 'Illegal Software', target: 'Illegal Software', note: 'Not in Software Policy as Legal', tone: 'red' as CardTone, value: policyIllegalSoftware },
    ];
    const lifecycleStatusRows = [
      { label: 'Supported', target: 'Supported', note: 'Masih selamat', tone: 'green' as CardTone, value: lifecycleSupported },
      { label: 'Approaching EOL/EOS', target: 'EOL/EOS Watch', note: 'Akan tamat dalam masa 6/12 bulan', tone: 'amber' as CardTone, value: lifecycleApproaching },
      { label: 'Critical EOL/EOS', target: 'Unsupported Apps', note: 'Sudah tamat tempoh', tone: 'red' as CardTone, value: lifecycleCritical },
    ];`;
      next = next.split(oldLifecycleRows).join(newPolicyRows);

      const oldSoftwareLevelTwoGrid = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, .9fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Classification Distribution" subtitle="Portfolio split by business, remote control, antivirus, browser, gaming and unclassified records. Click any segment to open the matching list." icon={BarChart3}>{renderSoftwareStackedDistribution(classificationRows, totalInstallations)}</Panel>
          <Panel title="Lifecycle Exposure" subtitle="Application support posture from lifecycle lookup. The donut highlights EOL/EOS and unsupported exposure." icon={ShieldAlert}>{renderSoftwareLifecycleDonut(lifecycleRows, totalInstallations)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
          <Panel title="Software Governance Balance" subtitle="Shows the relationship between classified inventory, cleanup backlog and lifecycle risk." icon={Gauge}>{renderSoftwareHorizontalBars(governanceRows, totalInstallations)}</Panel>
        </div>`;

      const newSoftwareLevelTwoGrid = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Compliance Rate (%)" subtitle="Peratusan perisian legal berdasarkan Software Policy. Contoh: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Software Governance Balance" subtitle="Shows the relationship between classified inventory, cleanup backlog and lifecycle risk." icon={Gauge}>{renderSoftwareHorizontalBars(governanceRows, totalInstallations)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Security & Compliance" subtitle="Legal vs Illegal Ratio dan Software Lifecycle Status dalam satu paparan." icon={ShieldAlert}>{renderSecurityCompliancePanel(policyRows, policyTotalSoftware, lifecycleStatusRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`;

      next = next.split(oldSoftwareLevelTwoGrid).join(newSoftwareLevelTwoGrid);
      next = next.split(`      <Panel title="Application Lifecycle Detail Cards" subtitle="Raw lifecycle signals returned by the service lookup for monitored major applications." icon={CalendarDays}>{renderSoftwareLifecycleCards()}</Panel>\n`).join('');
      next = next.split(`      <Panel title="Software Categories" subtitle="Click a category to open matching software records." icon={Database}>{renderBreakdownDrillCards(software.topCategories, 'software', 'No software category data yet.')}</Panel>\n`).join('');

      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig({
  plugins: [itopsSoftwareDrilldownTransform(), hardwarePaginationFixTransform(), dashboardUiPatch(), dashboardFocusCardOrderPatch(), dashboardFocusCardColorPatch(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
