require('dotenv').config();

const jwt = require('jsonwebtoken');
const sql = require('mssql');
const registerNotificationSettingsRoutes = require('./notificationSettingsRoutes');
const registerSoftwarePolicyRoutes = require('./softwarePolicyRoutes');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  connectionTimeout: 30000,
  requestTimeout: 60000,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

function notificationAuthenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET,
    { issuer: 'ema-node-api', audience: 'ema-react-app' },
    (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    }
  );
}

function toText(value) {
  return String(value ?? '').trim();
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function registerFastSoftwareRegistryListRoute(app) {
  if (app.__emaFastSoftwareRegistryListRouteRegistered) return;
  app.__emaFastSoftwareRegistryListRouteRegistered = true;

  app.get('/api/settings/software-policy/policies', notificationAuthenticateToken, async (_req, res) => {
    try {
      const pool = await sql.connect(dbConfig);

      await pool.request().query(`
        IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'UnitPrice') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD UnitPrice DECIMAL(18,2) NULL;
        IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'Currency') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD Currency NVARCHAR(10) NULL;
        IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'NotUsedHours') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD NotUsedHours DECIMAL(8,2) NULL;
        IF COL_LENGTH('dbo.EMA_SoftwarePolicy', 'IsActive') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicy ADD IsActive BIT NULL;

        UPDATE dbo.EMA_SoftwarePolicy SET IsActive = 1 WHERE IsActive IS NULL;
        UPDATE dbo.EMA_SoftwarePolicyItem SET Currency = 'RM' WHERE Currency IS NULL OR LTRIM(RTRIM(Currency)) = '';
      `);

      const result = await pool.request().query(`
        SELECT
          COALESCE(p.PolicyID, i.PolicyID) AS PolicyID,
          COALESCE(NULLIF(p.PolicyName, ''), i.SoftwareName) AS PolicyName,
          COALESCE(NULLIF(p.Description, ''), i.Notes, '') AS Description,
          COALESCE(i.CategoryID, p.CategoryID) AS CategoryID,
          COALESCE(NULLIF(i.CategoryName, ''), p.CategoryName) AS CategoryName,
          COALESCE(NULLIF(i.WorkingStartTime, ''), p.WorkingStartTime, '09:00') AS WorkingStartTime,
          COALESCE(NULLIF(i.WorkingEndTime, ''), p.WorkingEndTime, '17:00') AS WorkingEndTime,
          COALESCE(NULLIF(i.WorkDays, ''), p.WorkDays, 'Mon-Fri') AS WorkDays,
          COALESCE(i.UtilizedHours, p.UtilizedHours, 2.00) AS UtilizedHours,
          COALESCE(i.UnderUtilizedHours, p.UnderUtilizedHours, 0.01) AS UnderUtilizedHours,
          COALESCE(i.NotUsedHours, 0.00) AS NotUsedHours,
          COALESCE(i.OpenCountThreshold, p.OpenCountThreshold, 1) AS OpenCountThreshold,
          ISNULL(p.IsActive, 1) AS IsActive,
          COALESCE(p.CreatedAt, i.CreatedAt) AS CreatedAt,
          COALESCE(i.UpdatedAt, p.UpdatedAt, i.CreatedAt, p.CreatedAt) AS UpdatedAt,
          i.PolicyItemID,
          i.SoftwareName,
          i.Publisher,
          i.ComplianceStatus,
          COALESCE(i.UnitPrice, 0.00) AS UnitPrice,
          COALESCE(NULLIF(i.Currency, ''), 'RM') AS Currency,
          CAST(1 AS INT) AS TotalItems,
          CASE WHEN i.ComplianceStatus = 'Legal' THEN 1 ELSE 0 END AS LegalCount,
          CASE WHEN i.ComplianceStatus = 'Illegal' THEN 1 ELSE 0 END AS IllegalCount,
          ISNULL(i.LicenseCount, 0) AS LicenseTotal,
          ISNULL(i.LicenseCount, 0) * ISNULL(i.UnitPrice, 0) AS TotalCost
        FROM dbo.EMA_SoftwarePolicyItem i
        LEFT JOIN dbo.EMA_SoftwarePolicy p
          ON p.PolicyID = i.PolicyID
        WHERE ISNULL(p.IsActive, 1) = 1

        UNION ALL

        SELECT
          p.PolicyID,
          p.PolicyName,
          COALESCE(p.Description, '') AS Description,
          p.CategoryID,
          p.CategoryName,
          COALESCE(NULLIF(p.WorkingStartTime, ''), '09:00') AS WorkingStartTime,
          COALESCE(NULLIF(p.WorkingEndTime, ''), '17:00') AS WorkingEndTime,
          COALESCE(NULLIF(p.WorkDays, ''), 'Mon-Fri') AS WorkDays,
          COALESCE(p.UtilizedHours, 2.00) AS UtilizedHours,
          COALESCE(p.UnderUtilizedHours, 0.01) AS UnderUtilizedHours,
          CAST(0.00 AS DECIMAL(8,2)) AS NotUsedHours,
          COALESCE(p.OpenCountThreshold, 1) AS OpenCountThreshold,
          ISNULL(p.IsActive, 1) AS IsActive,
          p.CreatedAt,
          COALESCE(p.UpdatedAt, p.CreatedAt) AS UpdatedAt,
          CAST(NULL AS INT) AS PolicyItemID,
          CAST(NULL AS NVARCHAR(500)) AS SoftwareName,
          CAST(NULL AS NVARCHAR(255)) AS Publisher,
          CAST(NULL AS NVARCHAR(20)) AS ComplianceStatus,
          CAST(0.00 AS DECIMAL(18,2)) AS UnitPrice,
          CAST('RM' AS NVARCHAR(10)) AS Currency,
          CAST(0 AS INT) AS TotalItems,
          CAST(0 AS INT) AS LegalCount,
          CAST(0 AS INT) AS IllegalCount,
          CAST(0 AS INT) AS LicenseTotal,
          CAST(0.00 AS DECIMAL(18,2)) AS TotalCost
        FROM dbo.EMA_SoftwarePolicy p
        WHERE ISNULL(p.IsActive, 1) = 1
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.EMA_SoftwarePolicyItem i
            WHERE i.PolicyID = p.PolicyID
          )
        ORDER BY UpdatedAt DESC;
      `);

      return res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Fast software registry list failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load software registry list',
        error: error.message
      });
    }
  });
}

function registerFastSoftwareInventoryRoute(app) {
  if (app.__emaFastSoftwareInventoryRouteRegistered) return;
  app.__emaFastSoftwareInventoryRouteRegistered = true;

  app.get('/api/settings/software-policy/software', notificationAuthenticateToken, async (req, res) => {
    try {
      const categoryId = toInt(req.query.categoryId || req.query.CategoryID, 0);
      const categoryName = toText(req.query.categoryName || req.query.CategoryName);
      const publisher = toText(req.query.publisher || req.query.Publisher);
      const search = toText(req.query.search);
      const limit = Math.min(Math.max(toInt(req.query.limit, 200), 1), 500);

      const pool = await sql.connect(dbConfig);
      const request = pool.request();
      request.timeout = 30000;
      request.input('categoryId', sql.Int, categoryId);
      request.input('categoryName', sql.NVarChar(255), categoryName);
      request.input('publisher', sql.NVarChar(255), publisher);
      request.input('search', sql.NVarChar(255), search);
      request.input('limit', sql.Int, limit);

      const result = await request.query(`
        SELECT TOP (@limit)
          d.SWUNI_Idn,
          CONVERT(NVARCHAR(50), d.SWUNI_Idn) AS SoftwareID,
          d.SWUNI_Name AS SoftwareName,
          e.CategoryID,
          e.CategoryName,
          NULLIF(@publisher, '') AS Publisher,
          CAST(NULL AS NVARCHAR(255)) AS Version,
          CAST(0 AS INT) AS InstalledCount,
          CAST(0 AS INT) AS InstalledDeviceCount
        FROM [TCO2].[dbo].[TS_SWUNI_LIST] d WITH (NOLOCK)
        INNER JOIN [TCO2].[dbo].[TS_SW_CATEGORY] e WITH (NOLOCK)
          ON e.CategoryID = d.SWUNI_Catg
        WHERE (@categoryId <= 0 OR e.CategoryID = @categoryId)
          AND (@categoryName = '' OR e.CategoryName = @categoryName)
          AND (@search = '' OR d.SWUNI_Name LIKE '%' + @search + '%')
          AND (
            @publisher = ''
            OR EXISTS (
              SELECT 1
              FROM [TCO2].[dbo].[TSSI_SWUNI_ATTR] c WITH (NOLOCK)
              WHERE c.SWUNI_Idn = d.SWUNI_Idn
                AND c.Publisher = @publisher
            )
          )
        ORDER BY d.SWUNI_Name ASC;
      `);

      return res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Fast software registry inventory failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load software inventory mapping',
        error: error.message
      });
    }
  });
}

const expressPath = require.resolve('express');
const originalExpress = require(expressPath);

function wrappedExpress(...args) {
  const app = originalExpress(...args);

  // Register this before the legacy software policy routes, so Express resolves
  // the item-first registry list and faster inventory mapping endpoints before
  // the older policy-first/heavy join routes.
  registerFastSoftwareRegistryListRoute(app);
  registerFastSoftwareInventoryRoute(app);

  if (!app.__emaNotificationRoutesRegistered) {
    app.__emaNotificationRoutesRegistered = true;
    registerNotificationSettingsRoutes(app, {
      authenticateToken: notificationAuthenticateToken,
      dbConfig,
      sql
    });
  }

  if (!app.__emaSoftwarePolicyRoutesRegistered) {
    app.__emaSoftwarePolicyRoutesRegistered = true;
    registerSoftwarePolicyRoutes(app, {
      authenticateToken: notificationAuthenticateToken,
      dbConfig,
      sql
    });
  }

  return app;
}

Object.assign(wrappedExpress, originalExpress);
require.cache[expressPath].exports = wrappedExpress;

require('./server.js');