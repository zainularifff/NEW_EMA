import { useMemo, useState } from "react";
import { generateReport, previewReport } from "../services/reportService";

type ReportCard = {
  id: string;
  title: string;
  subtitle: string;
  group: "Featured Reports" | "Dynamic Reporting";
  tone: string;
  icon: string;
  dynamic?: boolean;
};

type DateRange = {
  from: string;
  to: string;
};

type PreviewState = {
  report: ReportCard;
  payload: any;
  from: string;
  to: string;
} | null;

const REPORTS: ReportCard[] = [
  { id: "ai-executive-summary", title: "AI Executive Summary", subtitle: "Executive snapshot", group: "Featured Reports", tone: "#2563eb", icon: "▥" },
  { id: "client-summary-rnr", title: "Client RNR Report", subtitle: "Client risk & resource", group: "Featured Reports", tone: "#0f766e", icon: "◈" },
  { id: "hardware-asset-lifecycle", title: "Hardware Lifecycle", subtitle: "Asset lifecycle", group: "Featured Reports", tone: "#7c3aed", icon: "▧" },
  { id: "operations-health-sla", title: "Ops Health & SLA", subtitle: "Ops and SLA health", group: "Featured Reports", tone: "#0284c7", icon: "▤" },
  { id: "security-compliance-exposure", title: "Security Exposure", subtitle: "Risk exposure", group: "Featured Reports", tone: "#ef4444", icon: "!" },
  { id: "software-application-governance", title: "Software Governance", subtitle: "BSA and software", group: "Featured Reports", tone: "#f59e0b", icon: "◇" },
  { id: "dynamic-compliance-report", title: "Compliance Report", subtitle: "AI compliance", group: "Dynamic Reporting", tone: "#f59e0b", icon: "✓", dynamic: true },
  { id: "dynamic-cost-saving-report", title: "Cost Saving Report", subtitle: "AI savings", group: "Dynamic Reporting", tone: "#10b981", icon: "↗", dynamic: true },
  { id: "dynamic-risk-management-report", title: "Risk Management Report", subtitle: "AI risk management", group: "Dynamic Reporting", tone: "#ef4444", icon: "!", dynamic: true },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function fileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report";
}

function unwrapPayload(payload: any) {
  return payload?.data && typeof payload.data === "object" ? payload.data : payload;
}

function buildRequestPayload(report: ReportCard, range: DateRange) {
  return {
    reportId: report.id,
    dynamicReportType: report.dynamic ? report.id : undefined,
    dynamicReportTitle: report.dynamic ? report.title : undefined,
    dateRange: "custom",
    startDate: range.from,
    endDate: range.to,
    outputFormat: "PDF",
    includeSummary: true,
    includeChart: true,
    includeTable: true,
    includeRecommendation: true,
    relationID: 0,
    deviceGroup: "all",
    status: "all",
  };
}

function textValue(value: any, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function downloadHtml(report: ReportCard, payload: any, range: DateRange) {
  const data = unwrapPayload(payload) || {};
  const narrative = data.narrative || {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const rowsHtml = sections
    .map((section: any) => {
      const rows = Array.isArray(section.rows) ? section.rows : [];
      const body = rows.slice(0, 12).map((row: any) => {
        if (!row || typeof row !== "object") return `<li>${textValue(row)}</li>`;
        return `<li>${Object.entries(row).map(([key, value]) => `<strong>${key}:</strong> ${textValue(value)}`).join(" · ")}</li>`;
      }).join("");
      return `<section><h2>${textValue(section.title || section.type, "Section")}</h2><ul>${body || "<li>No rows available.</li>"}</ul></section>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${report.title}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:36px;color:#12233f;background:#f8fbff;line-height:1.45}
    main{max-width:980px;margin:auto;background:white;border:1px solid #d8e5f6;border-radius:24px;padding:34px;box-shadow:0 18px 45px rgba(15,35,71,.10)}
    h1{margin:0 0 6px;font-size:30px} .meta{color:#64748b;font-weight:700;margin-bottom:22px}
    .summary{background:#eef6ff;border:1px solid #d3e4fb;border-radius:16px;padding:18px;margin:18px 0}
    h2{font-size:18px;margin:24px 0 10px;color:#17325d} li{margin:8px 0} strong{color:#17325d}
  </style>
</head>
<body>
<main>
  <h1>${report.title}</h1>
  <div class="meta">${range.from} to ${range.to}</div>
  <div class="summary">${textValue(narrative.executiveSummary || narrative.summary || narrative.title || report.subtitle, "Report generated successfully.").replace(/\n/g, "<br />")}</div>
  ${rowsHtml || "<section><h2>Report Data</h2><p>No section data returned.</p></section>"}
</main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileSafeName(report.title)}-${range.from}-to-${range.to}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ReportBoard() {
  const [ranges, setRanges] = useState<Record<string, DateRange>>(() => {
    const from = firstDayOfMonth();
    const to = today();
    return REPORTS.reduce<Record<string, DateRange>>((record, report) => {
      record[report.id] = { from, to };
      return record;
    }, {});
  });
  const [loading, setLoading] = useState<Record<string, "preview" | "download" | undefined>>({});
  const [preview, setPreview] = useState<PreviewState>(null);
  const [error, setError] = useState("");

  const groupedReports = useMemo(() => {
    return ["Featured Reports", "Dynamic Reporting"].map((group) => ({
      name: group as ReportCard["group"],
      items: REPORTS.filter((report) => report.group === group),
    }));
  }, []);

  const updateRange = (reportId: string, key: keyof DateRange, value: string) => {
    setRanges((current) => ({ ...current, [reportId]: { ...current[reportId], [key]: value } }));
  };

  const runPreview = async (report: ReportCard) => {
    const range = ranges[report.id];
    setError("");
    setLoading((current) => ({ ...current, [report.id]: "preview" }));
    try {
      const payload = await previewReport(buildRequestPayload(report, range));
      setPreview({ report, payload: unwrapPayload(payload), from: range.from, to: range.to });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview report.");
    } finally {
      setLoading((current) => ({ ...current, [report.id]: undefined }));
    }
  };

  const runDownload = async (report: ReportCard) => {
    const range = ranges[report.id];
    setError("");
    setLoading((current) => ({ ...current, [report.id]: "download" }));
    try {
      const payload = await generateReport(buildRequestPayload(report, range));
      downloadHtml(report, payload, range);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download report.");
    } finally {
      setLoading((current) => ({ ...current, [report.id]: undefined }));
    }
  };

  return (
    <main className="report-board-page">
      <style>{`
        .report-board-page {
          min-height: 100%;
          padding: 22px;
          color: #13294b;
          background:
            radial-gradient(circle at 10% 0%, rgba(37, 99, 235, 0.07), transparent 24rem),
            radial-gradient(circle at 92% 2%, rgba(14, 165, 233, 0.06), transparent 22rem),
            linear-gradient(135deg, #f6f8fb 0%, #edf2f7 54%, #e5ecf4 100%);
        }
        .report-board-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .report-board-head span,
        .report-board-section-title span {
          display: block;
          color: #2563eb;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .13em;
          text-transform: uppercase;
        }
        .report-board-head h2 {
          margin: 4px 0 3px;
          font-size: clamp(24px, 3vw, 38px);
          line-height: 1;
          letter-spacing: -0.055em;
        }
        .report-board-head p {
          margin: 0;
          color: #667996;
          font-weight: 760;
        }
        .report-board-count {
          min-width: 120px;
          border: 1px solid #d6e3f5;
          border-radius: 18px;
          background: rgba(255,255,255,.78);
          padding: 13px 16px;
          text-align: right;
          box-shadow: 0 12px 28px rgba(15,35,71,.05);
        }
        .report-board-count strong { display: block; font-size: 24px; line-height: 1; }
        .report-board-count small { color: #72839d; font-weight: 800; }
        .report-board-section { margin-top: 18px; }
        .report-board-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 2px 10px;
        }
        .report-board-section-title small { color: #64748b; font-weight: 850; }
        .report-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(230px, 1fr));
          gap: 16px;
        }
        .report-card {
          position: relative;
          min-height: 230px;
          display: flex;
          flex-direction: column;
          gap: 13px;
          border: 1px solid #d6e3f5;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(249,252,255,.94));
          padding: 18px;
          box-shadow: 0 16px 34px rgba(15,35,71,.065);
          overflow: hidden;
        }
        .report-card::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 4px;
          background: var(--report-accent);
        }
        .report-card-top {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr);
          gap: 13px;
          align-items: center;
        }
        .report-card-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: var(--report-accent);
          background: color-mix(in srgb, var(--report-accent) 12%, #ffffff);
          font-weight: 950;
        }
        .report-card h3 {
          margin: 0;
          font-size: 16px;
          line-height: 1.1;
          letter-spacing: -0.025em;
        }
        .report-card p {
          margin: 4px 0 0;
          color: #647895;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.2;
        }
        .report-date-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: auto;
        }
        .report-date-grid label {
          display: grid;
          gap: 5px;
          color: #6d7f9a;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .report-date-grid input {
          width: 100%;
          min-height: 38px;
          border: 1px solid #d4e1f3;
          border-radius: 13px;
          background: #fff;
          color: #13294b;
          padding: 8px 10px;
          font-weight: 800;
          outline: none;
        }
        .report-card-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .report-card-actions button {
          min-height: 40px;
          border-radius: 14px;
          border: 1px solid #cfddef;
          background: #ffffff;
          color: #13294b;
          font-weight: 950;
        }
        .report-card-actions button.primary {
          border-color: transparent;
          color: #ffffff;
          background: linear-gradient(135deg, var(--report-accent), color-mix(in srgb, var(--report-accent) 72%, #071d3b));
          box-shadow: 0 12px 22px color-mix(in srgb, var(--report-accent) 22%, transparent);
        }
        .report-card-actions button:disabled { opacity: .58; cursor: wait; }
        .report-card-notice {
          margin: -2px 0 0;
          color: #7b5c12;
          background: rgba(245, 158, 11, .10);
          border: 1px solid rgba(245, 158, 11, .22);
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 800;
        }
        .report-board-error {
          margin: 12px 0 0;
          border: 1px solid rgba(239, 68, 68, .24);
          border-radius: 16px;
          background: rgba(239, 68, 68, .08);
          color: #b91c1c;
          padding: 12px 14px;
          font-weight: 850;
        }
        .report-preview-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 26px;
          background: rgba(15, 23, 42, .46);
          backdrop-filter: blur(8px);
        }
        .report-preview-modal {
          width: min(880px, 100%);
          max-height: min(760px, calc(100vh - 52px));
          overflow: auto;
          border-radius: 26px;
          border: 1px solid #d8e5f6;
          background: #ffffff;
          padding: 24px;
          box-shadow: 0 28px 80px rgba(15, 23, 42, .26);
        }
        .report-preview-modal header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          border-bottom: 1px solid #e2eaf6;
          padding-bottom: 14px;
          margin-bottom: 14px;
        }
        .report-preview-modal h3 { margin: 0; font-size: 24px; }
        .report-preview-modal header small { color: #64748b; font-weight: 800; }
        .report-preview-modal header button {
          border: 1px solid #d4e1f3;
          background: #f8fbff;
          border-radius: 12px;
          padding: 8px 12px;
          font-weight: 900;
        }
        .report-preview-summary {
          border: 1px solid #d7e3f3;
          border-radius: 16px;
          background: #f8fbff;
          padding: 14px;
          color: #304a70;
          font-weight: 760;
        }
        .report-preview-section {
          margin-top: 16px;
          border: 1px solid #e0e9f6;
          border-radius: 16px;
          padding: 14px;
        }
        .report-preview-section h4 { margin: 0 0 10px; }
        .report-preview-section li { margin: 7px 0; color: #3a5274; }
        @media (max-width: 1500px) { .report-card-grid { grid-template-columns: repeat(3, minmax(230px, 1fr)); } }
        @media (max-width: 1080px) { .report-card-grid { grid-template-columns: repeat(2, minmax(220px, 1fr)); } }
        @media (max-width: 720px) { .report-board-page { padding: 14px; } .report-card-grid { grid-template-columns: 1fr; } .report-board-head { align-items: flex-start; flex-direction: column; } }
      `}</style>

      <section className="report-board-head">
        <div>
          <span>Reporting</span>
          <h2>Report Center</h2>
          <p>Select a report card, choose the date range, then preview or download.</p>
        </div>
        <div className="report-board-count">
          <strong>{REPORTS.length}</strong>
          <small>reports</small>
        </div>
      </section>

      {groupedReports.map((group) => (
        <section className="report-board-section" key={group.name}>
          <div className="report-board-section-title">
            <span>{group.name}</span>
            <small>{group.items.length} reports</small>
          </div>
          <div className="report-card-grid">
            {group.items.map((report) => {
              const range = ranges[report.id];
              const state = loading[report.id];
              return (
                <article className="report-card" key={report.id} style={{ "--report-accent": report.tone } as React.CSSProperties}>
                  <div className="report-card-top">
                    <div className="report-card-icon">{report.icon}</div>
                    <div>
                      <h3>{report.title}</h3>
                      <p>{report.subtitle}</p>
                    </div>
                  </div>

                  {report.dynamic && <div className="report-card-notice">AI dynamic report is generated once per day for this report title.</div>}

                  <div className="report-date-grid">
                    <label>
                      From
                      <input type="date" value={range.from} onChange={(event) => updateRange(report.id, "from", event.target.value)} />
                    </label>
                    <label>
                      To
                      <input type="date" value={range.to} onChange={(event) => updateRange(report.id, "to", event.target.value)} />
                    </label>
                  </div>

                  <div className="report-card-actions">
                    <button type="button" onClick={() => runPreview(report)} disabled={Boolean(state)}>
                      {state === "preview" ? "Loading..." : "Preview"}
                    </button>
                    <button className="primary" type="button" onClick={() => runDownload(report)} disabled={Boolean(state)}>
                      {state === "download" ? "Preparing..." : "Download"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {error && <div className="report-board-error">{error}</div>}

      {preview && (
        <div className="report-preview-backdrop" onClick={(event) => event.target === event.currentTarget && setPreview(null)}>
          <section className="report-preview-modal">
            <header>
              <div>
                <h3>{preview.report.title}</h3>
                <small>{preview.from} to {preview.to}</small>
              </div>
              <button type="button" onClick={() => setPreview(null)}>Close</button>
            </header>
            <div className="report-preview-summary">
              {textValue(preview.payload?.narrative?.executiveSummary || preview.payload?.narrative?.summary || preview.payload?.narrative?.title || preview.report.subtitle, "Preview loaded.")}
            </div>
            {(Array.isArray(preview.payload?.sections) ? preview.payload.sections : []).slice(0, 5).map((section: any, index: number) => (
              <section className="report-preview-section" key={`${section?.title || section?.type || "section"}-${index}`}>
                <h4>{textValue(section?.title || section?.type, `Section ${index + 1}`)}</h4>
                <ul>
                  {(Array.isArray(section?.rows) ? section.rows : []).slice(0, 8).map((row: any, rowIndex: number) => (
                    <li key={rowIndex}>{typeof row === "object" && row ? Object.entries(row).map(([key, value]) => `${key}: ${textValue(value)}`).join(" · ") : textValue(row)}</li>
                  ))}
                </ul>
              </section>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
