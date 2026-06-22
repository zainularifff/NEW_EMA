import type { Plugin } from 'vite';

const SOFTWARE_DETAIL_FETCH_STATE = String.raw`  const [softwareDetailPage, setSoftwareDetailPage] = useState(1);
  const [softwareExtraRows, setSoftwareExtraRows] = useState<SoftwareInventoryRow[]>([]);
  const [softwareExtraLoading, setSoftwareExtraLoading] = useState(false);`;

const SOFTWARE_DETAIL_FETCH_EFFECT = String.raw`  useEffect(() => {
    setEndpointDetailPage(1);
    setGeoDetailPage(1);
    setTicketDetailPage(1);
    setSecurityUpdateDetailPage(1);
    setRiskDetailPage(1);
    setSoftwareDetailPage(1);
  }, [activeView]);

  useEffect(() => {
    const drill = parseDrilldownKey(activeView);
    if (drill.level !== 'level3' || drill.view !== 'software') {
      setSoftwareExtraRows([]);
      setSoftwareExtraLoading(false);
      return;
    }

    const terms = (() => {
      const key = String(drill.item || '').toLowerCase();
      if (key.includes('antivirus')) return ['defender', 'sophos', 'symantec', 'mcafee', 'crowdstrike', 'sentinelone', 'bitdefender', 'eset'];
      if (key.includes('remote')) return ['anydesk', 'teamviewer', 'vnc', 'rustdesk', 'dameware', 'logmein', 'splashtop', 'screenconnect'];
      if (key.includes('browser') || key.includes('web')) return ['chrome', 'firefox', 'edge', 'brave', 'opera', 'safari'];
      if (key.includes('gaming') || key.includes('game')) return ['steam', 'epic games', 'riot', 'valorant', 'garena', 'battle.net', 'roblox', 'minecraft'];
      return [];
    })();

    if (!terms.length) return;

    let cancelled = false;
    const loadRows = async () => {
      setSoftwareExtraLoading(true);
      const token = getStoredAccessToken();
      const headers = new Headers({ Accept: 'application/json' });
      if (token) headers.set('Authorization', 'Bearer ' + token);

      try {
        const fetchOne = async (term: string) => {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 4500);
          try {
            const response = await fetch(buildApiUrl('/api/software', { search: term, limit: 50 }), {
              headers,
              credentials: 'include',
              signal: controller.signal,
            });
            if (!response.ok) return [] as unknown[];
            const payload = await response.json().catch(() => null) as any;
            return Array.isArray(payload?.data?.items) ? payload.data.items : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload?.data) ? payload.data : [];
          } catch {
            return [] as unknown[];
          } finally {
            window.clearTimeout(timeout);
          }
        };

        const resultSets = await Promise.all(terms.map(fetchOne));
        const rows = new Map<string, SoftwareInventoryRow>();

        resultSets.flat().forEach((raw: any) => {
          const row: SoftwareInventoryRow = {
            softwareName: String(raw.name || raw.softwareName || raw.productName || '-'),
            category: String(raw.category || raw.classification || 'Unclassified'),
            classification: String(raw.classification || raw.category || 'Unclassified'),
            productGroup: String(raw.productGroup || raw.vendor || raw.publisher || raw.licenseType || ''),
            deviceId: String(raw.deviceId || raw.assetTag || raw.asset_tag || raw.id || ''),
            deviceName: String(raw.deviceName || raw.hostname || raw.assignedTo || raw.assigned_to || ''),
            branch: String(raw.branch || raw.department || ''),
            version: String(raw.version || ''),
            publisher: String(raw.publisher || raw.vendor || ''),
            lastScan: String(raw.lastScan || raw.lastDetected || raw.last_detected || raw.createdAt || raw.created_at || ''),
            lifecycleStatus: String(raw.lifecycleStatus || ''),
            supportStatus: String(raw.supportStatus || ''),
            eolDate: String(raw.eolDate || ''),
            eosDate: String(raw.eosDate || ''),
            riskLevel: String(raw.riskLevel || ''),
            recommendation: String(raw.recommendation || ''),
          };
          const id = [row.softwareName, row.version, row.publisher, row.deviceName, row.deviceId].join('|').toLowerCase();
          if (id && !rows.has(id)) rows.set(id, row);
        });

        if (!cancelled) setSoftwareExtraRows(Array.from(rows.values()));
      } finally {
        if (!cancelled) setSoftwareExtraLoading(false);
      }
    };

    void loadRows();
    return () => { cancelled = true; };
  }, [activeView]);`;

export function itopsSoftwareDetailFetchTransform(): Plugin {
  return {
    name: 'itops-software-detail-fetch-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;
      let next = code;
      next = next.replace('  const [softwareDetailPage, setSoftwareDetailPage] = useState(1);', SOFTWARE_DETAIL_FETCH_STATE);
      next = next.replace(/  useEffect\(\(\) => \{\n    setEndpointDetailPage\(1\);\n    setGeoDetailPage\(1\);\n    setTicketDetailPage\(1\);\n    setSecurityUpdateDetailPage\(1\);\n    setRiskDetailPage\(1\);\n    setSoftwareDetailPage\(1\);\n  \}, \[activeView\]\);/, SOFTWARE_DETAIL_FETCH_EFFECT);
      next = next.replace('const rows = getSoftwareEvidenceRows();\n\n    if (!selected', 'const rows = [...getSoftwareEvidenceRows(), ...softwareExtraRows];\n\n    if (!selected');
      next = next.replace('Matched Rows" value={formatNumber(selectedRows.length)}', 'Matched Rows" value={softwareExtraLoading ? \'Loading...\' : formatNumber(selectedRows.length)}');
      return next === code ? null : { code: next, map: null };
    },
  };
}
