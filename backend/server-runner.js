require('dotenv').config();

const jwt = require('jsonwebtoken');
const sql = require('mssql');
const registerNotificationSettingsRoutes = require('./notificationSettingsRoutes');
const registerSoftwarePolicyRoutes = require('./softwarePolicyRoutes');
const registerSoftwareComplianceDashboardRoutes = require('./softwareComplianceDashboardRoutes');

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
        IF COL_LENGTH('EMA_SoftwarePolicyItem', 'UnitPrice') IS NULL ALTER TABLE EMA_SoftwarePolicyItem ADD UnitPrice DECIMAL(18,2) NULL;
        IF COL_LENGTH('EMA_SoftwarePolicyItem', 'Currency') IS NULL ALTER TABLE EMA_SoftwarePolicyItem ADD Currency NVARCHAR(10) NULL;
        IF COL_LENGTH('EMA_SoftwarePolicyItem', 'NotUsedHours') IS NULL ALTER TABLE EMA_SoftwarePolicyItem ADD NotUsedHours DECIMAL(8,2) NULL;
        IF COL_LENGTH('EMA_SoftwarePolicy', 'IsActive') IS NULL ALTER TABLE EMA_SoftwarePolicy ADD IsActive BIT NULL;

        UPDATE EMA_SoftwarePolicy SET IsActive = 1 WHERE IsActive IS NULL;
        UPDATE EMA_SoftwarePolicyItem SET Currency = 'RM' WHERE Currency IS NULL OR LTRIM(RTRIM(Currency)) = '';
      `);

      const result = await pool.request().query(`
        SELECT
          p.PolicyID,
          p.PolicyName,
          COALESCE(NULLIF(p.Description, ''), primaryItem.Notes, '') AS Description,
          COALESCE(primaryItem.CategoryID, p.CategoryID) AS CategoryID,
          COALESCE(NULLIF(primaryItem.CategoryName, ''), p.CategoryName) AS CategoryName,
          COALESCE(NULLIF(p.WorkingStartTime, ''), primaryItem.WorkingStartTime, '09:00') AS WorkingStartTime,
          COALESCE(NULLIF(p.WorkingEndTime, ''), primaryItem.WorkingEndTime, '17:00') AS WorkingEndTime,
          COALESCE(NULLIF(p.WorkDays, ''), primaryItem.WorkDays, 'Mon-Fri') AS WorkDays,
          COALESCE(p.UtilizedHours, primaryItem.UtilizedHours, 2.00) AS UtilizedHours,
          COALESCE(p.UnderUtilizedHours, primaryItem.UnderUtilizedHours, 0.01) AS UnderUtilizedHours,
          COALESCE(primaryItem.NotUsedHours, 0.00) AS NotUsedHours,
          COALESCE(p.OpenCountThreshold, primaryItem.OpenCountThreshold, 1) AS OpenCountThreshold,
          ISNULL(p.IsActive, 1) AS IsActive,
          CASE WHEN ISNULL(p.IsActive, 1) = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
          p.CreatedAt,
          COALESCE(p.UpdatedAt, primaryItem.UpdatedAt, p.CreatedAt) AS UpdatedAt,
          primaryItem.PolicyItemID,
          primaryItem.SoftwareName,
          primaryItem.Publisher,
          primaryItem.ComplianceStatus,
          COALESCE(primaryItem.UnitPrice, 0.00) AS UnitPrice,
          COALESCE(NULLIF(primaryItem.Currency, ''), 'RM') AS Currency,
          COUNT(i.PolicyItemID) AS TotalItems,
          ISNULL(SUM(CASE WHEN i.ComplianceStatus = 'Legal' THEN 1 ELSE 0 END), 0) AS LegalCount,
          ISNULL(SUM(CASE WHEN i.ComplianceStatus = 'Illegal' THEN 1 ELSE 0 END), 0) AS IllegalCount,
          ISNULL(SUM(ISNULL(i.LicenseCount, 0)), 0) AS LicenseTotal,
          ISNULL(SUM(ISNULL(i.LicenseCount, 0) * ISNULL(i.UnitPrice, 0)), 0) AS TotalCost
        FROM EMA_SoftwarePolicy p
        LEFT JOIN EMA_SoftwarePolicyItem i
          ON i.PolicyID = p.PolicyID
        OUTER APPLY (
          SELECT TOP (1)
            pi.PolicyItemID,
            pi.SoftwareName,
            pi.CategoryID,
            pi.CategoryName,
            pi.Publisher,
            pi.ComplianceStatus,
            pi.WorkingStartTime,
            pi.WorkingEndTime,
            pi.WorkDays,
            pi.UtilizedHours,
            pi.UnderUtilizedHours,
            pi.NotUsedHours,
            pi.OpenCountThreshold,
            pi.UnitPrice,
            pi.Currency,
            pi.Notes,
            pi.CreatedAt,
            pi.UpdatedAt
          FROM EMA_SoftwarePolicyItem pi
          WHERE pi.PolicyID = p.PolicyID
          ORDER BY COALESCE(pi.UpdatedAt, pi.CreatedAt) DESC, pi.PolicyItemID DESC
        ) primaryItem
        GROUP BY
          p.PolicyID,
          p.PolicyName,
          p.Description,
          p.CategoryID,
          p.CategoryName,
          p.WorkingStartTime,
          p.WorkingEndTime,
          p.WorkDays,
          p.UtilizedHours,
          p.UnderUtilizedHours,
          p.OpenCountThreshold,
          p.IsActive,
          p.CreatedAt,
          p.UpdatedAt,
          primaryItem.PolicyItemID,
          primaryItem.SoftwareName,
          primaryItem.CategoryID,
          primaryItem.CategoryName,
          primaryItem.Publisher,
          primaryItem.ComplianceStatus,
          primaryItem.WorkingStartTime,
          primaryItem.WorkingEndTime,
          primaryItem.WorkDays,
          primaryItem.UtilizedHours,
          primaryItem.UnderUtilizedHours,
          primaryItem.NotUsedHours,
          primaryItem.OpenCountThreshold,
          primaryItem.UnitPrice,
          primaryItem.Currency,
          primaryItem.Notes,
          primaryItem.UpdatedAt
        ORDER BY COALESCE(p.UpdatedAt, primaryItem.UpdatedAt, p.CreatedAt) DESC;
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

function registerFastSoftwarePublishersRoute(app) {
  if (app.__emaFastSoftwarePublishersRouteRegistered) return;
  app.__emaFastSoftwarePublishersRouteRegistered = true;

  app.get('/api/settings/software-policy/publishers', notificationAuthenticateToken, async (req, res) => {
    try {
      const categoryId = toInt(req.query.categoryId || req.query.CategoryID, 0);
      const categoryName = toText(req.query.categoryName || req.query.CategoryName);

      if (!categoryId && !categoryName) {
        return res.json({ success: true, data: [] });
      }

      const pool = await sql.connect(dbConfig);
      const request = pool.request();
      request.timeout = 15000;
      request.input('categoryId', sql.Int, categoryId);
      request.input('categoryName', sql.NVarChar(255), categoryName);

      const result = await request.query(`
        ;WITH publisher_rows AS (
          SELECT DISTINCT TOP (500)
            NULLIF(LTRIM(RTRIM(c.Publisher)), '') AS Publisher
          FROM TS_SWUNI_LIST d WITH (NOLOCK)
          INNER JOIN TS_SW_CATEGORY e WITH (NOLOCK)
            ON e.CategoryID = d.SWUNI_Catg
          INNER JOIN TSSI_SWUNI_ATTR c WITH (NOLOCK)
            ON c.SWUNI_Idn = d.SWUNI_Idn
          WHERE (@categoryId <= 0 OR e.CategoryID = @categoryId)
            AND (@categoryName = '' OR e.CategoryName = @categoryName)
            AND NULLIF(LTRIM(RTRIM(c.Publisher)), '') IS NOT NULL
        )
        SELECT
          Publisher,
          CAST(0 AS BIGINT) AS SoftwareCount,
          CAST(0 AS BIGINT) AS InstalledCount
        FROM publisher_rows
        ORDER BY Publisher ASC
        OPTION (RECOMPILE);
      `);

      return res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Fast software registry publishers failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load software publishers',
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
        FROM TS_SWUNI_LIST d WITH (NOLOCK)
        INNER JOIN TS_SW_CATEGORY e WITH (NOLOCK)
          ON e.CategoryID = d.SWUNI_Catg
        WHERE (@categoryId <= 0 OR e.CategoryID = @categoryId)
          AND (@categoryName = '' OR e.CategoryName = @categoryName)
          AND (@search = '' OR d.SWUNI_Name LIKE '%' + @search + '%')
          AND (
            @publisher = ''
            OR EXISTS (
              SELECT 1
              FROM TSSI_SWUNI_ATTR c WITH (NOLOCK)
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

  // Register the policy-first registry list, fast publishers and fast inventory mapping endpoints
  // before the legacy software policy routes so Express resolves the intended flow.
  registerFastSoftwareRegistryListRoute(app);
  registerFastSoftwarePublishersRoute(app);
  registerFastSoftwareInventoryRoute(app);

  if (!app.__emaSoftwareComplianceDashboardRoutesRegistered) {
    app.__emaSoftwareComplianceDashboardRoutesRegistered = true;
    registerSoftwareComplianceDashboardRoutes(app, {
      authenticateToken: notificationAuthenticateToken,
      dbConfig,
      sql
    });
  }

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