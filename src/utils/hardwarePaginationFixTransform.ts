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

const SOFTWARE_REGISTRY_FLOW_CSS = String.raw`
body.ema-settings-page-active .software-policy-module .sp-map-field{display:none!important;}
body.ema-settings-page-active .software-policy-module .sp-map-block{display:block!important;margin-top:10px!important;border-radius:14px!important;}
body.ema-settings-page-active .software-policy-module .sp-map-block .sp-section-title{padding:10px 12px!important;background:#f8fbff!important;}
body.ema-settings-page-active .software-policy-module .sp-map-block .sp-section-body{padding:12px!important;}
body.ema-settings-page-active .software-policy-module .sp-map-block .sp-table{min-height:170px!important;max-height:235px!important;}
body.ema-settings-page-active .software-policy-module .sp-map-block .sp-row{min-height:48px!important;}
body.ema-settings-page-active .software-policy-module .sp-map-block .sp-empty{min-height:120px!important;}
body.ema-settings-page-active .software-policy-module .sp-policy-modal{height:min(92vh,940px)!important;}
`;

function patchSoftwareRegistryFlow(code: string) {
  let next = code;
  if (!next.includes('function SoftwareRegistryManagement()')) return code;

  next = next.replace(
    '    if (uiMode !== "form" || !ruleForm.categoryId || ruleForm.categoryId === "__other__") {',
    '    if (uiMode !== "form" || !ruleForm.categoryId || ruleForm.categoryId === "__other__" || !ruleForm.publisher) {'
  );

  next = next.replace(
    '<label className="sp-field"><span>Publisher</span><select value={ruleForm.publisher} onChange={(e) => setRuleForm((c) => ({ ...c, publisher: e.target.value }))} disabled={!ruleForm.categoryId || ruleForm.categoryId === "__other__"}><option value="">Select publisher after category</option>{publishers.map((row) => <option key={row.Publisher} value={row.Publisher}>{row.Publisher}</option>)}</select></label>',
    '<label className="sp-field"><span>Publisher</span><select value={ruleForm.publisher} onChange={(e) => { setRuleForm((c) => ({ ...c, publisher: e.target.value })); setSelectedKeys(new Set()); setSoftwareRows([]); }} disabled={!ruleForm.categoryId || ruleForm.categoryId === "__other__"}><option value="">Select publisher after category</option>{publishers.map((row) => <option key={row.Publisher} value={row.Publisher}>{row.Publisher}</option>)}</select></label>'
  );

  next = next.replace(
    `    if (selectedRows.length === 0) {
      await loadPolicies();
      setUiMode("list");
      return;
    }`,
    `    if (selectedRows.length === 0) {
      setMessage({ type: "error", text: "Select one inventory software before saving this registry." });
      return;
    }`
  );

  next = next.replace(
    '<div className="sp-selected-box">{selectedRows.length ? "1 software selected" : "No software selected"}</div>',
    '<div className="sp-selected-box">{selectedRows.length ? `Selected: ${selectedRows[0]?.SoftwareName || "1 software"}` : "No software selected"}</div>'
  );

  next = next.replace(
    '<small>Choose category, select publisher, map one inventory software, then complete license and usage rules.</small>',
    '<small>Create one software registry, map one inventory software, then enter license and usage rules.</small>'
  );

  next = next.replace(
    '<div className="sp-section-title"><strong>Inventory software mapping</strong><small>Select exactly one software from inventory after choosing category and publisher.</small></div>',
    '<div className="sp-section-title"><strong>Inventory software list</strong><small>After category and publisher are selected, choose one software only.</small></div>'
  );

  next = next.replace(
    '<span className="sp-help">Select one inventory software that matches this registry.</span>',
    '<span className="sp-help">Choose one software from this list. One registry cannot map more than one software.</span>'
  );

  next = next.replace(
    '<div className="sp-empty">Select category and publisher to display software list.</div>',
    '<div className="sp-empty">Select category and publisher first. Software list will appear here.</div>'
  );

  if (!next.includes(SOFTWARE_REGISTRY_FLOW_CSS.trim())) {
    next = next.replace(
      '<style>{INLINE_CSS}</style>',
      '<style>{INLINE_CSS}{`\n' + SOFTWARE_REGISTRY_FLOW_CSS.replace(/`/g, '\\`') + '\n`}</style>'
    );
  }

  return next;
}

export function hardwarePaginationFixTransform(): Plugin {
  return {
    name: 'hardware-pagination-fix-transform',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/').split('?')[0];

      if (normalizedId.endsWith('/src/pages/SettingsWithNotifications.tsx')) {
        const next = patchSoftwareRegistryFlow(code);
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
