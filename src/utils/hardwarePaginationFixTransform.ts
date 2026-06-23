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

  // Do not auto-open the first registry row while the user is still on the list screen.
  // Auto-open caused the list page to immediately call items, publishers and software inventory APIs.
  next = next.replace(
    '    setActivePolicyId((current) => current ?? rows[0]?.PolicyID ?? null);',
    '    setActivePolicyId((current) => (rows.some((row) => row.PolicyID === current) ? current : null));'
  );

  // Keep initial load to one base request. The modal detail requests are opened only after Add/View/Edit.
  next = next.replace(
    '  useEffect(() => { void loadBase(); }, [loadBase]);',
    '  useEffect(() => {\n    void loadBase();\n  }, [loadBase]);'
  );

  // Policy items and publisher/software setup are only needed inside the modal/form.
  next = next.replace(
    '  useEffect(() => {\n    if (!activePolicy) return;',
    '  useEffect(() => {\n    if (policyUiMode !== "form" || !activePolicy) return;'
  );

  next = next.replace(
    '  }, [activePolicy, loadPolicyItems, loadPublishers]);',
    '  }, [policyUiMode, activePolicy, loadPolicyItems, loadPublishers]);'
  );

  // Software inventory can be heavy. Load it only when the modal is open and a real category is selected.
  next = next.replace(
    '    if (!ruleForm.categoryId) {\n      setSoftwareRows([]);\n      return;\n    }',
    '    if (policyUiMode !== "form" || !ruleForm.categoryId || ruleForm.categoryId === "__other__") {\n      setSoftwareRows([]);\n      return;\n    }'
  );

  next = next.replace(
    '  }, [ruleForm.categoryId, ruleForm.publisher, softwareSearch]);',
    '  }, [policyUiMode, ruleForm.categoryId, ruleForm.publisher, softwareSearch]);'
  );

  // Keep the top registry setup focused only on software identity. Move usage-rule fields into the
  // Classification & license section so the flow is: details -> map inventory -> classification/license/rules.
  const workRuleFields = `                  <label className="sp-field"><span>Work start</span><input type="time" value={ruleForm.workingStartTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingStartTime: e.target.value }))} /></label>
                  <label className="sp-field"><span>Work end</span><input type="time" value={ruleForm.workingEndTime} onChange={(e) => setRuleForm((c) => ({ ...c, workingEndTime: e.target.value }))} /></label>
                  <label className="sp-field"><span>Utilized if at least hour/day</span><input type="number" min="0" step="0.25" value={ruleForm.utilizedHours} onChange={(e) => setRuleForm((c) => ({ ...c, utilizedHours: e.target.value }))} /></label>
                  <label className="sp-field"><span>Open count/day</span><input type="number" min="0" value={ruleForm.openCountThreshold} onChange={(e) => setRuleForm((c) => ({ ...c, openCountThreshold: e.target.value }))} /></label>
                  <label className="sp-field full"><span>Note</span><textarea value={ruleForm.description} onChange={(e) => setRuleForm((c) => ({ ...c, description: e.target.value }))} placeholder="Optional note" /></label>`;

  if (next.includes(workRuleFields)) {
    next = next.replace(workRuleFields, '');
    next = next.replace(
      '                  <label className="sp-field"><span>End date</span><input type="date" value={softwareForm.licenseEndDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseEndDate: e.target.value }))} /></label>\n                </div>',
      '                  <label className="sp-field"><span>End date</span><input type="date" value={softwareForm.licenseEndDate} onChange={(e) => setSoftwareForm((c) => ({ ...c, licenseEndDate: e.target.value }))} /></label>\n                  ' + workRuleFields.trimStart() + '\n                </div>'
    );
  }

  next = next.replace(
    '                  <span className="sp-help">Monday to Friday. ≥ {ruleForm.utilizedHours || 2} hour/day = utilized, below that = underutilized, no activity = not used.</span>',
    '                  <span className="sp-help">Complete software details above, then map inventory records below.</span>'
  );

  // The publisher field is moved to the setup section by the registry flow patch. Keep the map toolbar in
  // one clean row: helper text, search input, search button.
  next = next.replace(
    '.sp-software-toolbar{display:grid;grid-template-columns:220px minmax(0,1fr) auto;',
    '.sp-software-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,320px) auto;'
  );

  next = next.replace(
    '<div className="sp-section-title"><strong>2. Classification & license</strong><small>Apply this to selected software.</small></div>',
    '<div className="sp-section-title"><strong>2. Classification, license & usage rules</strong><small>Legal status, license expiry and utilization rule.</small></div>'
  );

  // Do not show the separate "Saved mapped software" panel. It reads like a final step and breaks the form story.
  // Existing saved items are already reflected in the registry table after saving.
  next = next.replace(
    '<style>{INLINE_CSS}</style>',
    '<style>{INLINE_CSS}{`\nbody.ema-settings-page-active .software-policy-module .sp-policy-modal .sp-software-area > .sp-section:last-child{display:none!important;}\nbody.ema-settings-page-active .software-policy-module .sp-policy-modal .sp-software-area{grid-template-columns:minmax(0,1fr)!important;}\n`}</style>'
  );

  return next;
}

export function hardwarePaginationFixTransform(): Plugin {
  return {
    name: 'hardware-pagination-fix-transform',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');

      if (normalizedId.endsWith('/src/pages/SettingsWithNotifications.tsx')) {
        const next = patchSoftwareRegistrySettings(code);
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
