import type { Plugin } from 'vite';

const normalizePath = (id: string) => id.split(String.fromCharCode(92)).join('/');

export function managementSoftwareRoiForceViewTransform(): Plugin {
  return {
    name: 'management-software-roi-force-view-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!normalizePath(id).endsWith('/src/pages/ManagementDashboard.tsx')) return null;

      let next = code;

      const oldGuard = `  function renderBreakdownView() {\n    const rows = (drill.rows || []) as DrillRow[];\n    if (String(drill.area || '').toLowerCase() === 'saving' && rows.some((row) => String(row.key || '').toLowerCase() === 'software-roi')) return renderSoftwareRoiBreakdownView();`;

      const newGuard = `  function renderBreakdownView() {\n    const rows = (drill.rows || []) as DrillRow[];\n    const softwareRoiIdentity = [\n      drill.area,\n      drill.key,\n      drill.title,\n      ...(rows || []).map((row) => row.key),\n      ...(rows || []).map((row) => row.label),\n    ].filter(Boolean).join(' ').toLowerCase();\n    if (softwareRoiIdentity.includes('software-roi') || softwareRoiIdentity.includes('software roi') || softwareRoiIdentity.includes('usage vs licence')) return renderSoftwareRoiBreakdownView();`;

      next = next.split(oldGuard).join(newGuard);

      return next === code ? null : { code: next, map: null };
    },
  };
}
