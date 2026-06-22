// backend/queries/queries_TSMDM.js

const sql = require("mssql");

const dbConfig = {
  user: process.env.DB_USER || process.env.SQL_USER,
  password: process.env.DB_PASSWORD || process.env.SQL_PASSWORD,
  server: process.env.DB_SERVER || process.env.SQL_SERVER || "localhost",
  database:
    process.env.TSMDM_DB_DATABASE ||
    process.env.DB_DATABASE ||
    process.env.SQL_DATABASE ||
    "TSMDM",
  port: Number(process.env.DB_PORT || process.env.SQL_PORT || 1433),
  options: {
    encrypt: String(process.env.DB_ENCRYPT || "false") === "true",
    trustServerCertificate:
      String(process.env.DB_TRUST_CERT || "true") === "true",
  },
};

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }

  return poolPromise;
}

async function executeQuery(query, params = {}) {
  const pool = await getPool();
  const request = pool.request();

  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });

  const result = await request.query(query);
  return result.recordset || [];
}

async function executeScalar(query, params = {}) {
  const rows = await executeQuery(query, params);
  const firstRow = rows[0];

  if (!firstRow) {
    return null;
  }

  const firstKey = Object.keys(firstRow)[0];
  return firstRow[firstKey];
}

async function executeNonQuery(query, params = {}) {
  const pool = await getPool();
  const request = pool.request();

  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });

  const result = await request.query(query);
  return result.rowsAffected || [];
}

/**
 * Generic TSMDM helpers.
 * These are safe placeholders to stop module crash.
 * We can adjust table/query names after checking backend/server.js.
 */

async function getDevices() {
  const query = `
    SELECT *
    FROM Devices
    ORDER BY 1 DESC
  `;

  return executeQuery(query);
}

async function getDeviceById(id) {
  const query = `
    SELECT TOP 1 *
    FROM Devices
    WHERE id = @id
  `;

  const rows = await executeQuery(query, { id });
  return rows[0] || null;
}

async function getDeviceInventory() {
  return getDevices();
}

async function getSoftwareInventory() {
  const query = `
    SELECT *
    FROM SoftwareInventory
    ORDER BY 1 DESC
  `;

  return executeQuery(query);
}

async function getNetworkInventory() {
  const query = `
    SELECT *
    FROM NetworkInventory
    ORDER BY 1 DESC
  `;

  return executeQuery(query);
}

async function getUsers() {
  const query = `
    SELECT *
    FROM Users
    ORDER BY 1 DESC
  `;

  return executeQuery(query);
}

async function getDashboardSummary() {
  return {
    devices: 0,
    software: 0,
    network: 0,
    users: 0,
  };
}

/**
 * Compatibility aliases.
 * These help when server.js uses slightly different function names.
 */
module.exports = {
  sql,
  dbConfig,
  getPool,

  executeQuery,
  executeScalar,
  executeNonQuery,

  query: executeQuery,
  execute: executeQuery,
  runQuery: executeQuery,

  getDevices,
  getDeviceById,
  getDeviceInventory,
  getAllDevices: getDevices,
  getAllDeviceInventory: getDeviceInventory,

  getSoftwareInventory,
  getAllSoftware: getSoftwareInventory,

  getNetworkInventory,
  getAllNetwork: getNetworkInventory,

  getUsers,
  getAllUsers: getUsers,

  getDashboardSummary,
  getSummary: getDashboardSummary,
};