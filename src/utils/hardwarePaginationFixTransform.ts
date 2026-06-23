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

function patchSoftwareRegistrySettings(code: string) {
  let next = code;

  next = next.replace(
    '    setActivePolicyId((current) => current ?? rows[0]?.PolicyID ?? null);',
    '    setActivePolicyId((current) => (rows.some((row) => row.PolicyID === current) ? current : null));'
  );

  next = next.replace(
    '  useEffect(() => { void loadBase(); }, [loadBase]);',
    '  useEffect(() => {\n    void loadBase();\n  }, [loadBase]);'
  );

  next = next.replace(
    '  useEffect(() => {\n    if (!activePolicy) return;',
    '  useEffect(() => {\n    if (policyUiMode !== "form" || !activePolicy) return;'
  );

  next = next.replace(
    '  }, [activePolicy, loadPolicyItems, loadPublishers]);',
    '  }, [policyUiMode, activePolicy, loadPolicyItems, loadPublishers]);'
  );

  next = next.replace(
    '    if (!ruleForm.categoryId) {\n      setSoftwareRows([]);\n      return;\n    }',
    '    if (policyUiMode !== "form" || !ruleForm.categoryId || ruleForm.categoryId === "__other__") {\n      setSoftwareRows([]);\n      return;\n    }'
  );

  next = next.replace(
    '  }, [ruleForm.categoryId, ruleForm.publisher, softwareSearch]);',
    '  }, [policyUiMode, ruleForm.categoryId, ruleForm.publisher, softwareSearch]);'
  );

  next = next.replace(
    `  const toggleSoftware = (row: SoftwareRow) => {
    const key = getSoftwareKey(row);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };`,
    `  const toggleSoftware = (row: SoftwareRow) => {
    const key = getSoftwareKey(row);
    setSelectedKeys((current) => (current.has(key) ? new Set() : new Set([key])));
  };`
  );

  next = next.replace(
    '<input type="checkbox" checked={selected} onChange={() => toggleSoftware(row)} />',
    '<input type="radio" name="software-registry-map" checked={selected} onChange={() => toggleSoftware(row)} />'
  );

  next = next.replace(
    '<div className="sp-selected-box">{selectedRows.length} software selected</div>',
    '<div className="sp-selected-box">{selectedRows.length ? "1 software selected" : "No software selected"}</div>'
  );

  const workRuleFields = `                  <label className="sp-field"><span>Work start</span><input type="time" value={ruleForm.workingStartTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingStartTime: e.target.value }))} /></label>
                  <label className="sp-field"><span>Work end</span><input type="time" value={ruleForm.workingEndTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingEndTime: e.target.value }))} /></label>
                  <label className="sp-field"><span>Utilized if at least hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.utilizedHours} onChange={(e) => setRuleForm((c) => ({ ...c, utilizedHours: e.target.value }))} /></label>
                  <label className="sp-field"><span>Open count/day</span><input type="number" min="0" value={ruleForm.openCountThreshold} onChange={(e) => setRuleForm((c) => ({ ...c, openCountThreshold: e.target.value }))} /></label>
                  <label className="sp-field full"><span>Note</span><textarea value={ruleForm.description} onChange={(e) => setRuleForm((c) => ({ ...c, description: e.target.value }))} placeholder="Optional note" /></label>`;

  if (next.includes(workRuleFields)) {
    next = next.replace(workRuleFields, '');
    next = next.replace(
      '                  <label className="sp-field"><span>End date</span><input type="date" value={softwareForm.licenseEndDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseEndDate: e.target.value }))} /></label>\n                </div>',
      '                  <label className="sp-field"><span>End date</span><input type="date" value={softwareForm.licenseEndDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseEndDate: e.target.value }))} /></label>\n' + workRuleFields + '\n                </div>'
    );
  }

  next = next.replace(
    '                  <span className="sp-help">Monday to Friday. ≥ {ruleForm.utilizedHours || 2} hour/day = utilized, below that = underutilized, no activity = not used.</span>',
    '                  <span className="sp-help">Select one inventory software, then complete classification, license and usage rules below.</span>'
  );

  next = next.replace(
    '.sp-software-toolbar{display:grid;grid-template-columns:220px minmax(0,1fr) auto;',
    '.sp-software-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,320px) auto;'
  );

  next = next.replace(
    '<div className="sp-section-title"><strong>2. Classification & license</strong><small>Apply this to selected software.</small></div>',
    '<div className="sp-section-title"><strong>2. Classification, license & usage rules</strong><small>Legal status, license expiry and utilization rule.</small></div>'
  );

  next = next.replace(
    '<div className="sp-section-title"><strong>3. Classification & license</strong><small>Apply legal status and license details after selecting mapped software.</small></div>',
    '<div className="sp-section-title"><strong>2. Classification, license & usage rules</strong><small>Legal status, license expiry and utilization rule.</small></div>'
  );

  next = next.replace(
    '<div className="sp-section-title"><strong>3. Classification, license & usage rules</strong><small>Legal status, license expiry and utilization rule.</small></div>',
    '<div className="sp-section-title"><strong>2. Classification, license & usage rules</strong><small>Legal status, license expiry and utilization rule.</small></div>'
  );

  next = next.replace(
    '<div className="sp-section-title"><strong>2. Map with inventory software</strong><small>Choose existing software from the selected category. If the category is Other, save custom registry details first.</small></div>',
    '<div className="sp-section-title"><strong>Inventory software mapping</strong><small>Select exactly one inventory software under the selected category.</small></div>'
  );

  next = next.replace(
    /\s*<section className="sp-section">\s*<div className="sp-section-title"><strong>4\. Saved mapped software<\/strong><small>Software already assigned to this registry\.<\/small><\/div>[\s\S]*?<\/section>/,
    ''
  );

  next = next.replace(
    /\s*<section className="sp-section">\s*<div className="sp-section-title"><strong>Saved software<\/strong><small>Software already assigned to this rule\.<\/small><\/div>[\s\S]*?<\/section>/,
    ''
  );

  next = next.replace(
    '<style>{INLINE_CSS}</style>',
    '<style>{INLINE_CSS}{`\nbody.ema-settings-page-active .software-policy-module .sp-policy-modal .sp-software-area > .sp-section:last-child{display:none!important;}\nbody.ema-settings-page-active .software-policy-module .sp-policy-modal .sp-software-area{grid-template-columns:minmax(0,1fr)!important;}\nbody.ema-settings-page-active .software-policy-module .sp-policy-modal .sp-setup{grid-template-columns:minmax(0,1fr)!important;}\n`}</style>'
  );

  return next;
}

export function hardwarePaginationFixTransform(): Plugin {
  return {
    name: 'hardware-pagination-fix-transform',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');

      if (normalizedId.endsWith('/src/pages/SettingsWithNotifications.tsx')) {
        const next = patchSoftwareRegistrySettings(code);
        return next === code ? null : { code: next, map: null };
      }

      if (!normalizedId.endsWith('/src/pages/Hardware.tsx')) return null;

      let next = code;

      next = next
        .replace('className="uam-pagination global-style hardware-pagination"', 'className="hardware-pagination"')
        .replace('className="uam-pagination-controls global-style hardware-pagination-actions"', 'className="hardware-pagination-actions"')
        .replaceAll('className="uam-page-icon"', 'className="hardware-page-icon"')
        .replace('className="uam-page-current hardware-pagination-current"', 'className="hardware-page-current"');

      next = next.replace('{toast && (\n        <div className={`hardware-toast hardware-toast-${toast.type}`} role="status">', '{toast && !activeModal && (\n        <div className={`hardware-toast hardware-toast-${toast.type}`} role="status">');

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
