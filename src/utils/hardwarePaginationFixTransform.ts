import type { Plugin } from 'vite';

const HARDWARE_PAGINATION_FIX = String.raw`        .hardware-module-root .hardware-pagination {
          flex: 0 0 auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
          width: calc(100% - 2.1rem) !important;
          max-width: calc(100% - 2.1rem) !important;
          min-height: 42px !important;
          margin: 12px 1.05rem 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          position: relative !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          bottom: auto !important;
          transform: none !important;
          overflow: visible !important;
        }

        .hardware-module-root .hardware-page-summary,
        .hardware-module-root .uam-page-summary.hardware-page-summary {
          flex: 0 0 auto !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: auto !important;
          min-width: 92px !important;
          max-width: none !important;
          height: 34px !important;
          min-height: 34px !important;
          padding: 0 14px !important;
          border: 1px solid #dbe4f2 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #5f6f8f !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          line-height: 1 !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05) !important;
          white-space: nowrap !important;
          position: relative !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          bottom: auto !important;
          transform: none !important;
        }

        .hardware-module-root .hardware-pagination-actions,
        .hardware-module-root .uam-pagination-controls.hardware-pagination-actions,
        .hardware-module-root .uam-pagination-controls.global-style.hardware-pagination-actions {
          flex: 0 0 auto !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 7px !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          height: auto !important;
          min-height: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          overflow: visible !important;
          position: relative !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          bottom: auto !important;
          transform: none !important;
        }

        .hardware-module-root .hardware-pagination-actions .hardware-page-icon,
        .hardware-module-root .hardware-pagination-actions .uam-page-icon,
        .hardware-module-root .hardware-pagination-actions .hardware-page-current,
        .hardware-module-root .hardware-pagination-actions .hardware-pagination-current {
          flex: 0 0 auto !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 36px !important;
          min-width: 36px !important;
          max-width: 36px !important;
          height: 34px !important;
          min-height: 34px !important;
          max-height: 34px !important;
          padding: 0 !important;
          border: 1px solid #dbe4f2 !important;
          border-radius: 12px !important;
          background: #ffffff !important;
          color: #3151d4 !important;
          font-size: 14px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05) !important;
          position: relative !important;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          bottom: auto !important;
          transform: none !important;
        }

        .hardware-module-root .hardware-pagination-actions .hardware-page-current,
        .hardware-module-root .hardware-pagination-actions .hardware-pagination-current {
          width: 42px !important;
          min-width: 42px !important;
          max-width: 42px !important;
          border-color: #bfdbfe !important;
          background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%) !important;
          color: #1d4ed8 !important;
        }

        .hardware-module-root .hardware-pagination-actions .hardware-page-icon:hover:not(:disabled),
        .hardware-module-root .hardware-pagination-actions .uam-page-icon:hover:not(:disabled) {
          border-color: #93c5fd !important;
          background: #eff6ff !important;
          transform: translateY(-1px) !important;
        }

        .hardware-module-root .hardware-pagination-actions .hardware-page-icon:disabled,
        .hardware-module-root .hardware-pagination-actions .uam-page-icon:disabled {
          opacity: 0.45 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }

        @media (max-width: 720px) {
          .hardware-module-root .hardware-pagination {
            width: 100% !important;
            max-width: 100% !important;
            margin: 12px 0 0 !important;
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .hardware-module-root .hardware-pagination-actions {
            justify-content: center !important;
          }
        }`;

const SOFTWARE_SECURITY_COMPLIANCE_HELPERS = String.raw`  const renderSoftwareSecurityCompliance = (licenseRows: { label: string; value: number; target: string; note: string; tone: CardTone }[], licenseTotal: number, lifecycleRows: { label: string; value: number; target: string; note: string; tone: CardTone }[]) => {
    const legalCount = numberOrFallback(licenseRows.find((item) => item.target === 'Legal Software')?.value, 0);
    const illegalCount = numberOrFallback(licenseRows.find((item) => item.target === 'Illegal Software')?.value, 0);
    const safeLicenseTotal = Math.max(1, licenseTotal || legalCount + illegalCount);
    const legalShare = (legalCount / safeLicenseTotal) * 100;
    const pieDegrees = Math.max(0, Math.min(360, (legalShare / 100) * 360));
    const lifecycleTotal = Math.max(1, lifecycleRows.reduce((total, row) => total + numberOrFallback(row.value), 0));

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '210px minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
        <button type="button" onClick={() => openLevel3('software', illegalCount > 0 ? 'Illegal Software' : 'Legal Software')} style={{ minHeight: 222, border: '1px solid #dbeafe', borderRadius: 22, background: 'linear-gradient(180deg,#ffffff,#f8fafc)', padding: 16, cursor: 'pointer', color: '#0f172a', textAlign: 'center', display: 'grid', placeItems: 'center', boxShadow: '0 14px 34px rgba(15,23,42,.07)' }}>
          <span style={{ width: 132, height: 132, borderRadius: '50%', background: 'conic-gradient(#14b8a6 0deg ' + pieDegrees + 'deg, #ef4444 ' + pieDegrees + 'deg 360deg)', display: 'grid', placeItems: 'center', boxShadow: '0 16px 35px rgba(15,23,42,.12)' }}><span style={{ width: 82, height: 82, borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px #e2e8f0' }}><span><strong style={{ display: 'block', fontSize: 24, fontWeight: 950 }}>{formatPercent(legalShare, 0)}</strong><small style={{ color: '#64748b', fontSize: 9, fontWeight: 950, textTransform: 'uppercase' }}>Legal</small></span></span></span>
          <span style={{ display: 'block', marginTop: 12, fontSize: 11, fontWeight: 950, color: '#334155' }}>Legal vs Illegal Ratio</span>
          <span style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}><small style={{ fontSize: 10, fontWeight: 900, color: '#047857' }}>{formatNumber(legalCount)} legal</small><small style={{ fontSize: 10, fontWeight: 900, color: '#b91c1c' }}>{formatNumber(illegalCount)} illegal</small></span>
        </button>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 22, background: '#ffffff', padding: 16, display: 'grid', gap: 12, alignContent: 'start' }}>
          <div><strong style={{ display: 'block', fontSize: 14, color: '#0f172a', fontWeight: 950 }}>Software Lifecycle Status</strong><small style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: 11, fontWeight: 800 }}>Supported, approaching EOL/EOS and critical EOL/EOS.</small></div>
          {lifecycleRows.map((row) => {
            const value = numberOrFallback(row.value);
            const share = (value / lifecycleTotal) * 100;
            return (
              <button key={row.label} type="button" onClick={() => openLevel3('software', row.target)} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: toneSoftBg(row.tone), padding: '10px 12px', cursor: 'pointer', textAlign: 'left', color: '#0f172a' }}>
                <span style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}><b style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 950 }}><i style={{ width: 9, height: 9, borderRadius: 999, background: toneSolid(row.tone) }} />{row.label}</b><strong style={{ fontSize: 16, fontWeight: 950 }}>{formatNumber(value)}</strong></span>
                <small style={{ display: 'block', marginTop: 3, color: '#64748b', fontSize: 10, fontWeight: 800 }}>{row.note} · {formatPercent(share, 1)}</small>
                <em style={{ display: 'block', height: 7, marginTop: 9, borderRadius: 999, overflow: 'hidden', background: '#e2e8f0' }}><i style={{ display: 'block', height: '100%', width: String(Math.max(3, share)) + '%', background: toneGradient(row.tone), borderRadius: 999 }} /></em>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

`;

function patchDashboardSoftwareSecurityCompliance(code: string) {
  let next = code;

  const helperAnchor = '  const getSoftwareClassificationGraphRows = () => {';
  if (next.includes(helperAnchor) && !next.includes('renderSoftwareSecurityCompliance')) {
    next = next.replace(helperAnchor, `${SOFTWARE_SECURITY_COMPLIANCE_HELPERS}${helperAnchor}`);
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
    const supportedLifecycleSoftware = rows.filter((row) => softwareLifecycleMatches(row, 'supported')).length;
    const approachingLifecycleSoftware = Math.max(0, numberOrFallback(software.eolApplications) + numberOrFallback(software.eosApplications));
    const criticalLifecycleSoftware = Math.max(0, numberOrFallback(software.unsupportedApplications));
    const policyRows = [
      { label: 'Legal Software', target: 'Legal Software', note: 'Exists in Software Policy and classified Legal', tone: 'green' as CardTone, value: policyLegalSoftware },
      { label: 'Illegal Software', target: 'Illegal Software', note: 'Not in Software Policy as Legal', tone: 'red' as CardTone, value: policyIllegalSoftware },
    ];
    const softwareLifecycleStatusRows = [
      { label: 'Supported', target: 'Supported', note: 'Masih selamat', tone: 'green' as CardTone, value: supportedLifecycleSoftware },
      { label: 'Approaching EOL/EOS', target: 'EOL/EOS Watch', note: 'Akan tamat dalam masa 6/12 bulan', tone: 'amber' as CardTone, value: approachingLifecycleSoftware },
      { label: 'Critical EOL/EOS', target: 'Unsupported Apps', note: 'Sudah tamat tempoh', tone: 'red' as CardTone, value: criticalLifecycleSoftware },
    ];`;
  next = next.split(oldLifecycleRows).join(newPolicyRows);

  const oldGrid = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, .9fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Classification Distribution" subtitle="Portfolio split by business, remote control, antivirus, browser, gaming and unclassified records. Click any segment to open the matching list." icon={BarChart3}>{renderSoftwareStackedDistribution(classificationRows, totalInstallations)}</Panel>
          <Panel title="Lifecycle Exposure" subtitle="Application support posture from lifecycle lookup. The donut highlights EOL/EOS and unsupported exposure." icon={ShieldAlert}>{renderSoftwareLifecycleDonut(lifecycleRows, totalInstallations)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
          <Panel title="Software Governance Balance" subtitle="Shows the relationship between classified inventory, cleanup backlog and lifecycle risk." icon={Gauge}>{renderSoftwareHorizontalBars(governanceRows, totalInstallations)}</Panel>
        </div>`;

  const newGrid = `        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Software Compliance Rate (%)" subtitle="Peratusan perisian legal berdasarkan Software Policy. Contoh: 92% Legal." icon={ShieldCheck}>{renderSoftwarePolicyDonut(policyRows, policyTotalSoftware)}</Panel>
          <Panel title="Software Governance Balance" subtitle="Shows the relationship between classified inventory, cleanup backlog and lifecycle risk." icon={Gauge}>{renderSoftwareHorizontalBars(governanceRows, totalInstallations)}</Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>
          <Panel title="Security & Compliance" subtitle="Legal vs Illegal Ratio and Software Lifecycle Status in one combined view." icon={ShieldAlert}>{renderSoftwareSecurityCompliance(policyRows, policyTotalSoftware, softwareLifecycleStatusRows)}</Panel>
          <Panel title="Major Application EOL/EOS Watch" subtitle="Microsoft Office, Microsoft 365, Adobe, Google Chrome and Firefox coverage with click-through detail." icon={CalendarDays}>{renderSoftwareHorizontalBars(majorRows, totalInstallations)}</Panel>
        </div>`;
  next = next.split(oldGrid).join(newGrid);

  return next;
}

export function hardwarePaginationFixTransform(): Plugin {
  return {
    name: 'hardware-pagination-fix-transform',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');
      if (normalizedId.endsWith('/src/pages/Dashboard.tsx')) {
        const next = patchDashboardSoftwareSecurityCompliance(code);
        return next === code ? null : { code: next, map: null };
      }
      if (!normalizedId.endsWith('/src/pages/Hardware.tsx')) return null;

      let next = code;

      // Keep Hardware pagination isolated from the global User Access Management pagination CSS.
      next = next
        .replace('className="uam-pagination global-style hardware-pagination"', 'className="hardware-pagination"')
        .replace('className="uam-pagination-controls global-style hardware-pagination-actions"', 'className="hardware-pagination-actions"')
        .replaceAll('className="uam-page-icon"', 'className="hardware-page-icon"')
        .replace('className="uam-page-current hardware-pagination-current"', 'className="hardware-page-current"');

      // Do not let fixed-position toast notifications cover the geolocation modal/right panel.
      next = next.replace('{toast && (\n        <div className={`hardware-toast hardware-toast-${toast.type}`} role="status">', '{toast && !activeModal && (\n        <div className={`hardware-toast hardware-toast-${toast.type}`} role="status">');

      // When the filtered result shrinks, keep users on the last valid page instead of jumping to page 1.
      next = next.replace('  useEffect(() => {\n    if (page > pageCount) setPage(1);\n  }, [page, pageCount]);', '  useEffect(() => {\n    setPage((current) => Math.min(Math.max(1, current), pageCount));\n  }, [pageCount]);');

      const standaloneMarker = `        .hardware-module-root .hardware-pagination {
          flex: 0 0 auto !important;
        }`;
      const groupedMarker = `        .hardware-module-root .hardware-registry-toolbar,
        .hardware-module-root .hardware-registry-subhead,
        .hardware-module-root .hardware-pagination {
          flex: 0 0 auto !important;
        }`;

      if (next.includes(standaloneMarker)) {
        next = next.replace(standaloneMarker, HARDWARE_PAGINATION_FIX);
      } else if (next.includes(groupedMarker)) {
        next = next.replace(groupedMarker, `${groupedMarker}\n\n${HARDWARE_PAGINATION_FIX}`);
      }

      return next === code ? null : { code: next, map: null };
    },
  };
}
