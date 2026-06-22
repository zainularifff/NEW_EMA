// backend/queries/queries_EMA.js

const sql = require("mssql");

const dbConfig = {
  user: process.env.DB_USER || process.env.SQL_USER,
  password: process.env.DB_PASSWORD || process.env.SQL_PASSWORD,
  server: process.env.DB_SERVER || process.env.SQL_SERVER || "localhost",
  database: process.env.DB_DATABASE || process.env.SQL_DATABASE || "EMA",
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
 * Auth query
 * Adjust table/column name later once we confirm current DB schema.
 */
async function findUserByUsername(username) {
  const query = `
    SELECT TOP 1
      console_Idn,
      userID,
      menuIndex
    FROM EMA_Users
    WHERE userID = @username
  `;

  const rows = await executeQuery(query, { username });
  return rows[0] || null;
}

async function loginUser(username) {
  return findUserByUsername(username);
}

/**
 * Hardware Inventory base queries.
 * These are safe defaults for EMA_ prefix tables.
 * Adjust table name if your DB still uses old table names.
 */
async function getHardwareInventory() {
  const query = `
    SELECT *
    FROM EMA_HardwareInventory
    ORDER BY 1 DESC
  `;

  return executeQuery(query);
}

async function getHardwareById(id) {
  const query = `
    SELECT TOP 1 *
    FROM EMA_HardwareInventory
    WHERE id = @id
  `;

  const rows = await executeQuery(query, { id });
  return rows[0] || null;
}

async function createHardware(payload = {}) {
  const query = `
    INSERT INTO EMA_HardwareInventory (
      assetTag,
      deviceName,
      category,
      brand,
      model,
      serialNumber,
      status,
      assignedTo,
      location,
      createdAt
    )
    VALUES (
      @assetTag,
      @deviceName,
      @category,
      @brand,
      @model,
      @serialNumber,
      @status,
      @assignedTo,
      @location,
      GETDATE()
    )
  `;

  return executeNonQuery(query, {
    assetTag: payload.assetTag || "",
    deviceName: payload.deviceName || "",
    category: payload.category || "",
    brand: payload.brand || "",
    model: payload.model || "",
    serialNumber: payload.serialNumber || "",
    status: payload.status || "Available",
    assignedTo: payload.assignedTo || "",
    location: payload.location || "",
  });
}

async function updateHardware(id, payload = {}) {
  const query = `
    UPDATE EMA_HardwareInventory
    SET
      assetTag = @assetTag,
      deviceName = @deviceName,
      category = @category,
      brand = @brand,
      model = @model,
      serialNumber = @serialNumber,
      status = @status,
      assignedTo = @assignedTo,
      location = @location,
      updatedAt = GETDATE()
    WHERE id = @id
  `;

  return executeNonQuery(query, {
    id,
    assetTag: payload.assetTag || "",
    deviceName: payload.deviceName || "",
    category: payload.category || "",
    brand: payload.brand || "",
    model: payload.model || "",
    serialNumber: payload.serialNumber || "",
    status: payload.status || "Available",
    assignedTo: payload.assignedTo || "",
    location: payload.location || "",
  });
}

async function deleteHardware(id) {
  const query = `
    DELETE FROM EMA_HardwareInventory
    WHERE id = @id
  `;

  return executeNonQuery(query, { id });
}

/**
 * Compatibility aliases.
 * These help if server.js uses slightly different names.
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

  findUserByUsername,
  loginUser,
  getUserByUsername: findUserByUsername,

  getHardwareInventory,
  getHardwareList: getHardwareInventory,
  getAllHardware: getHardwareInventory,

  getHardwareById,
  createHardware,
  updateHardware,
  deleteHardware,
};