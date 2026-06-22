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

export function hardwarePaginationFixTransform(): Plugin {
  return {
    name: 'hardware-pagination-fix-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Hardware.tsx')) return null;

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

      const standaloneMarker = `        .hardware-module-root .hardware-pagination {\n          flex: 0 0 auto !important;\n        }`;
      const groupedMarker = `        .hardware-module-root .hardware-registry-toolbar,\n        .hardware-module-root .hardware-registry-subhead,\n        .hardware-module-root .hardware-pagination {\n          flex: 0 0 auto !important;\n        }`;

      if (next.includes(standaloneMarker)) {
        next = next.replace(standaloneMarker, HARDWARE_PAGINATION_FIX);
      } else if (next.includes(groupedMarker)) {
        next = next.replace(groupedMarker, `${groupedMarker}\n\n${HARDWARE_PAGINATION_FIX}`);
      }

      return next === code ? null : { code: next, map: null };
    },
  };
}
