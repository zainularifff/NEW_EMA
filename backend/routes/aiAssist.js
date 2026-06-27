const express = require('express');
const sql = require('mssql');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const router = express.Router();

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 15000),
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 60000),
  pool: {
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 1),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT || 30000),
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    appName: process.env.DB_APP_NAME || 'EMA-AI-Assist',
  },
};

let poolPromise = null;

async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig).catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

function textValue(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeQuestion(value) {
  return textValue(value).toLowerCase().replace(/\s+/g, ' ');
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatPercent(value, total) {
  const numerator = safeNumber(value);
  const denominator = safeNumber(total);
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function safeDateLabel(value) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return textValue(value) || 'Not recorded';
  return parsed.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const restrictedReply =
  'I can help with safe operational summaries only. I cannot perform changes, expose backend details, reveal database structure, or show user presence information.';

const blockedActionPattern = /\b(insert|update|delete|drop|alter|truncate|merge|create|exec|execute|grant|revoke|backup|restore|dbcc|xp_|sp_)\b/i;
const backendPattern = /\b(table|tables|column|columns|schema|database|db|sql|query|queries|backend|server|api|endpoint route|information_schema|sys\.tables|dbo\.|structure|data structure|raw json|show me the query|show query|describe table|senarai table|nama table|nama column|struktur database|struktur db|struktur table)\b/i;
const userPresencePattern = /(active|online|logged|login|session|signin|sign in|currently|sekarang|aktif|atas talian|masuk)\s*(user|users|account|accounts|staff|admin|engineer|pengguna|orang|operator)|\b(who is online|siapa online|berapa active user|berapa user active|user aktif|online user|current user sessions|logged in users)\b/i;

function getRestriction(question) {
  const text = normalizeQuestion(question);

  if (!text) {
    return 'Please enter a question about operational data.';
  }

  if (blockedActionPattern.test(text)) {
    return 'I can display approved operational information only. Create, update, delete, configuration changes, and other database actions are not allowed.';
  }

  if (userPresencePattern.test(text)) {
    return 'I cannot show active users, online users, login sessions, or user presence information.';
  }

  if (backendPattern.test(text)) {
    return 'I cannot reveal backend details, database structure, table names, column names, SQL queries, or internal implementation details.';
  }

  return null;
}

function resolveIntent(question) {
  const text = normalizeQuestion(question);

  if (/\b(setting|settings|audit|change|changes|policy|rbac|access control|latest update|recent update|perubahan|tetapan)\b/i.test(text)) {
    return 'settings_changes';
  }

  if (/\b(risk|risks|risky|at risk|aging|stale|inactive|exposure|compliance|comply|vulnerab|bahaya|risiko)\b/i.test(text)) {
    return 'risk_review';
  }

  if (/\b(patch|patches|patched|unpatched|security update|hotfix|vulnerability|vulnerabilities)\b/i.test(text)) {
    return 'patch_risks';
  }

  if (/\b(endpoint|endpoints|device|devices|asset|assets|computer|pc|health|online|offline|active|inactive|last seen|connection|inventory|hardware)\b/i.test(text)) {
    return 'endpoint_health';
  }

  return 'unsupported';
}

async function tableExists(pool, tableName) {
  const result = await pool.request()
    .input('tableName', sql.NVarChar(128), tableName)
    .query(`
      SELECT 1 AS existsFlag
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = @tableName;
    `);

  return result.recordset.length > 0;
}

async function columnExists(pool, tableName, columnName) {
  const result = await pool.request()
    .input('tableName', sql.NVarChar(128), tableName)
    .input('columnName', sql.NVarChar(128), columnName)
    .query(`
      SELECT 1 AS existsFlag
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
        AND COLUMN_NAME = @columnName;
    `);

  return result.recordset.length > 0;
}

async function getEndpointHealth(pool) {
  const rows = [];
  const hasEmAssets = await tableExists(pool, 'TS_OBJECT_ROOT');
  const hasMdmAssets = await tableExists(pool, 'TSMDM_ASSET');

  if (hasEmAssets) {
    const hasId = await columnExists(pool, 'TS_OBJECT_ROOT', 'Object_Root_Idn');
    const hasStatus = await columnExists(pool, 'TS_OBJECT_ROOT', 'ConnectionStatus');
    const hasConnectionTime = await columnExists(pool, 'TS_OBJECT_ROOT', 'ConnectionTime');

    const statusConnected = hasStatus
      ? `SUM(CASE WHEN ISNULL(TRY_CONVERT(INT, ConnectionStatus), 0) = 1 THEN 1 ELSE 0 END)`
      : `CAST(0 AS INT)`;
    const statusDisconnected = hasStatus
      ? `SUM(CASE WHEN ISNULL(TRY_CONVERT(INT, ConnectionStatus), 0) <> 1 THEN 1 ELSE 0 END)`
      : `CAST(0 AS INT)`;
    const stale = hasConnectionTime
      ? `SUM(CASE WHEN ConnectionTime IS NULL OR ConnectionTime < DATEADD(DAY, -30, GETDATE()) THEN 1 ELSE 0 END)`
      : `CAST(0 AS INT)`;
    const whereClause = hasId ? `WHERE ISNULL(Object_Root_Idn, 0) > 0` : ``;

    const result = await pool.request().query(`
      SELECT
        COUNT(1) AS totalEndpoints,
        ${statusConnected} AS connectedEndpoints,
        ${statusDisconnected} AS disconnectedEndpoints,
        ${stale} AS attentionNeeded
      FROM TS_OBJECT_ROOT WITH (NOLOCK)
      ${whereClause};
    `);

    rows.push(result.recordset[0] || {});
  }

  if (hasMdmAssets) {
    const hasId = await columnExists(pool, 'TSMDM_ASSET', 'MDM_Asset_Idn');
    const hasStatus = await columnExists(pool, 'TSMDM_ASSET', 'ConnectionStatus');
    const hasTime = await columnExists(pool, 'TSMDM_ASSET', 'DeviceTimeStamp');

    const statusText = `LOWER(CONVERT(NVARCHAR(100), ConnectionStatus))`;
    const connected = hasStatus
      ? `SUM(CASE WHEN TRY_CONVERT(INT, ConnectionStatus) = 1 OR ${statusText} IN ('online', 'connected', 'active') THEN 1 ELSE 0 END)`
      : `CAST(0 AS INT)`;
    const disconnected = hasStatus
      ? `SUM(CASE WHEN NOT (TRY_CONVERT(INT, ConnectionStatus) = 1 OR ${statusText} IN ('online', 'connected', 'active')) THEN 1 ELSE 0 END)`
      : `CAST(0 AS INT)`;
    const stale = hasTime
      ? `SUM(CASE WHEN DeviceTimeStamp IS NULL OR DeviceTimeStamp < DATEADD(DAY, -30, GETDATE()) THEN 1 ELSE 0 END)`
      : `CAST(0 AS INT)`;
    const whereClause = hasId ? `WHERE ISNULL(MDM_Asset_Idn, 0) > 0` : ``;

    const result = await pool.request().query(`
      SELECT
        COUNT(1) AS totalEndpoints,
        ${connected} AS connectedEndpoints,
        ${disconnected} AS disconnectedEndpoints,
        ${stale} AS attentionNeeded
      FROM TSMDM_ASSET WITH (NOLOCK)
      ${whereClause};
    `);

    rows.push(result.recordset[0] || {});
  }

  const summary = rows.reduce((acc, row) => ({
    totalEndpoints: acc.totalEndpoints + safeNumber(row.totalEndpoints),
    connectedEndpoints: acc.connectedEndpoints + safeNumber(row.connectedEndpoints),
    disconnectedEndpoints: acc.disconnectedEndpoints + safeNumber(row.disconnectedEndpoints),
    attentionNeeded: acc.attentionNeeded + safeNumber(row.attentionNeeded),
  }), {
    totalEndpoints: 0,
    connectedEndpoints: 0,
    disconnectedEndpoints: 0,
    attentionNeeded: 0,
  });

  return {
    title: 'Endpoint health summary',
    totalEndpoints: summary.totalEndpoints,
    connectedEndpoints: summary.connectedEndpoints,
    disconnectedEndpoints: summary.disconnectedEndpoints,
    attentionNeeded: summary.attentionNeeded,
    connectedRate: formatPercent(summary.connectedEndpoints, summary.totalEndpoints),
    attentionRate: formatPercent(summary.attentionNeeded, summary.totalEndpoints),
  };
}

async function getRiskReview(pool) {
  const health = await getEndpointHealth(pool);

  return {
    title: 'Risk review summary',
    totalEndpoints: health.totalEndpoints,
    endpointsNeedingAttention: health.attentionNeeded,
    attentionRate: health.attentionRate,
    keyRisk: health.attentionNeeded > 0
      ? 'Some endpoints need review because their latest connection is missing or older than the accepted monitoring window.'
      : 'No major endpoint aging risk was detected from the available summary.',
  };
}

async function getSettingsChanges(pool) {
  const hasAudit = await tableExists(pool, 'EMA_AuditLogs');
  if (!hasAudit) {
    return {
      title: 'Settings changes summary',
      changes: [],
      note: 'No settings change history is available yet.',
    };
  }

  const result = await pool.request().query(`
    SELECT TOP 8
      COALESCE(NULLIF(Module, ''), 'System') AS area,
      COALESCE(NULLIF(Action, ''), 'Updated setting') AS activity,
      COALESCE(NULLIF(Severity, ''), 'Info') AS priority,
      CreatedAt AS activityTime
    FROM EMA_AuditLogs WITH (NOLOCK)
    WHERE CreatedAt >= DATEADD(DAY, -14, GETDATE())
    ORDER BY CreatedAt DESC;
  `);

  return {
    title: 'Recent settings changes',
    changes: (result.recordset || []).map((row) => ({
      area: textValue(row.area) || 'System',
      activity: textValue(row.activity) || 'Updated setting',
      priority: textValue(row.priority) || 'Info',
      time: safeDateLabel(row.activityTime),
    })),
  };
}

async function getPatchRisks() {
  return {
    title: 'Patch risk summary',
    note: 'Patch risk reporting is restricted to approved summary endpoints only. No approved patch summary source is configured in this assistant route yet.',
  };
}

async function runAllowedIntent(pool, intent) {
  if (intent === 'endpoint_health') return getEndpointHealth(pool);
  if (intent === 'risk_review') return getRiskReview(pool);
  if (intent === 'settings_changes') return getSettingsChanges(pool);
  if (intent === 'patch_risks') return getPatchRisks(pool);

  return {
    title: 'Unsupported request',
    note: 'I can answer approved operational summary questions only.',
  };
}

function fallbackAnswer(intent, data) {
  if (intent === 'endpoint_health') {
    return [
      `Endpoint health summary: ${data.totalEndpoints} endpoints are recorded.`,
      `${data.connectedEndpoints} are connected and ${data.disconnectedEndpoints} are not connected.`,
      `${data.attentionNeeded} endpoints need review. Connected rate is ${data.connectedRate}.`,
    ].join('\n');
  }

  if (intent === 'risk_review') {
    return [
      `Risk review summary: ${data.endpointsNeedingAttention} of ${data.totalEndpoints} endpoints need attention.`,
      `Attention rate is ${data.attentionRate}.`,
      data.keyRisk,
    ].join('\n');
  }

  if (intent === 'settings_changes') {
    if (!Array.isArray(data.changes) || data.changes.length === 0) {
      return data.note || 'No recent settings changes are available.';
    }

    const lines = data.changes.map((item, index) => (
      `${index + 1}. ${item.area}: ${item.activity} (${item.priority}) - ${item.time}`
    ));

    return `Recent settings changes:\n${lines.join('\n')}`;
  }

  if (intent === 'patch_risks') {
    return data.note || 'Patch risk summary is not configured yet.';
  }

  return 'I can answer approved operational summary questions only.';
}

const backendLeakPattern = /\b(TS_|TSMDM_|EMA_|HD_|dbo\.|INFORMATION_SCHEMA|sys\.tables|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|MERGE|EXEC|JOIN|WHERE|FROM|GROUP BY|ORDER BY|database|table|column|schema|backend|API|SQL query|raw JSON)\b/i;

function containsBackendLeak(answer) {
  return backendLeakPattern.test(textValue(answer));
}

async function buildSafeAnswer(question, intent, data) {
  if (!genAI) return fallbackAnswer(intent, data);

  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    });

    const prompt = `
You are Friday, the secure EMA operations assistant.
Answer only using the approved summary data below.

Rules:
- Do not mention table names, column names, database names, SQL, query, API, backend, schema, or implementation details.
- Do not reveal active users, online users, logged-in users, sessions, staff presence, or account presence.
- Do not suggest or perform create, update, delete, configuration changes, or any system action.
- Do not show raw JSON.
- Keep the answer short, professional, and focused on operational data only.

User question:
${question}

Approved summary data:
${JSON.stringify(data)}
`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    if (!answer || containsBackendLeak(answer)) {
      return fallbackAnswer(intent, data);
    }

    return answer;
  } catch (error) {
    console.warn('Friday summary generation skipped:', error.message);
    return fallbackAnswer(intent, data);
  }
}

router.post('/', async (req, res) => {
  try {
    const message = textValue(req.body?.message);

    const restricted = getRestriction(message);
    if (restricted) {
      return res.status(200).json({
        success: true,
        answer: restricted,
      });
    }

    const intent = resolveIntent(message);
    if (intent === 'unsupported') {
      return res.status(200).json({
        success: true,
        answer: 'I can answer approved operational summary questions only, such as endpoint health, risk summary, patch summary, or recent settings changes.',
      });
    }

    const pool = await getPool();
    const data = await runAllowedIntent(pool, intent);
    const answer = await buildSafeAnswer(message, intent, data);

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error('AI Assist safe route error:', {
      message: error.message,
      code: error.code,
    });

    return res.status(500).json({
      success: false,
      error: 'Friday is temporarily unavailable. Please try again.',
    });
  }
});

module.exports = router;
