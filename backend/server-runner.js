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
  // the faster inventory mapping endpoint before the older heavy join route.
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
