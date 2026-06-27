const express = require("express");
const crypto = require("crypto");
const { sql, getPool } = require("../queries/queries_EMA");

const router = express.Router();

let bcrypt = null;
try {
  bcrypt = require("bcryptjs");
} catch {
  try {
    bcrypt = require("bcrypt");
  } catch {
    bcrypt = null;
  }
}

async function hashPassword(password) {
  if (!password) return null;

  if (bcrypt && typeof bcrypt.hash === "function") {
    return bcrypt.hash(password, 10);
  }

  return "sha256:" + crypto.createHash("sha256").update(String(password)).digest("hex");
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeRoles(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBit(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true" ? 1 : 0;
}

function normalizeStatus(payload = {}) {
  if (toBit(payload.accountLocked)) return "Locked";

  const value = cleanText(payload.status || payload.accountStatus || "Active");
  return value.toLowerCase() === "inactive" ? "Inactive" : "Active";
}

function normalizeDate(value) {
  const text = cleanText(value);
  return text || null;
}

async function ensureUserAccessTables() {
  const pool = await getPool();

  await pool.request().query(`
IF OBJECT_ID('EMA_UserAccess', 'U') IS NULL
BEGIN
  CREATE TABLE EMA_UserAccess (
    UserAccessID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Username NVARCHAR(150) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    PasswordHash NVARCHAR(255) NULL,
    AccountStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_EMA_UserAccess_Status DEFAULT ('Active'),
    MFAEnabled BIT NOT NULL CONSTRAINT DF_EMA_UserAccess_MFA DEFAULT (0),
    AccountLocked BIT NOT NULL CONSTRAINT DF_EMA_UserAccess_Locked DEFAULT (0),
    AccessStartDate DATE NULL,
    AccessEndDate DATE NULL,
    LastLoginAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EMA_UserAccess_CreatedAt DEFAULT (SYSDATETIME()),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_EMA_UserAccess_UpdatedAt DEFAULT (SYSDATETIME())
  );

  CREATE UNIQUE INDEX IX_EMA_UserAccess_Username ON EMA_UserAccess(Username);
END;

IF OBJECT_ID('EMA_UserAccessRole', 'U') IS NULL
BEGIN
  CREATE TABLE EMA_UserAccessRole (
    UserAccessRoleID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserAccessID INT NOT NULL,
    RoleName NVARCHAR(150) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EMA_UserAccessRole_CreatedAt DEFAULT (SYSDATETIME())
  );

  CREATE INDEX IX_EMA_UserAccessRole_UserAccessID ON EMA_UserAccessRole(UserAccessID);
END;
`);
}

async function getUserAccessID(raw) {
  const key = cleanText(raw);

  if (!key) return null;

  const numericID = Number(key);

  if (Number.isInteger(numericID) && numericID > 0) {
    const rows = await getPool().then((pool) =>
      pool.request()
        .input("UserAccessID", sql.Int, numericID)
        .query("SELECT TOP 1 UserAccessID FROM EMA_UserAccess WHERE UserAccessID = @UserAccessID")
    );

    return rows.recordset[0]?.UserAccessID || null;
  }

  const pool = await getPool();
  const result = await pool.request()
    .input("Key", sql.NVarChar(255), key)
    .query(`
      SELECT TOP 1 UserAccessID
      FROM EMA_UserAccess
      WHERE Username = @Key OR Email = @Key
    `);

  return result.recordset[0]?.UserAccessID || null;
}

async function getUsers() {
  await ensureUserAccessTables();

  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      u.UserAccessID AS id,
      u.UserAccessID AS userAccessID,
      u.Username AS username,
      u.Email AS email,
      u.AccountStatus AS status,
      u.MFAEnabled AS requireMFA,
      u.MFAEnabled AS mfa,
      u.AccountLocked AS accountLocked,
      CONVERT(VARCHAR(10), u.AccessStartDate, 23) AS accessStartDate,
      CONVERT(VARCHAR(10), u.AccessEndDate, 23) AS accessEndDate,
      u.LastLoginAt AS lastLoginAt,
      ISNULL(
        STUFF((
          SELECT ',' + r.RoleName
          FROM EMA_UserAccessRole r
          WHERE r.UserAccessID = u.UserAccessID
          ORDER BY r.RoleName
          FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 1, ''),
        ''
      ) AS rolesCsv
    FROM EMA_UserAccess u
    ORDER BY u.UserAccessID DESC
  `);

  return result.recordset.map((row) => ({
    ...row,
    userID: row.userAccessID,
    name: row.username,
    roles: row.rolesCsv ? String(row.rolesCsv).split(",").filter(Boolean) : [],
    role: row.rolesCsv ? String(row.rolesCsv).split(",").filter(Boolean)[0] || "" : "",
    roleName: row.rolesCsv ? String(row.rolesCsv).split(",").filter(Boolean)[0] || "" : "",
  }));
}

async function getRoles() {
  await ensureUserAccessTables();

  const pool = await getPool();
  const roleSet = new Set([
    "Super Admin",
    "Client Admin",
    "Dashboard Manager",
    "IT Operation Manager",
    "L1 Support",
    "L2 Support",
    "L3 Support",
    "Service Desk",
    "Guest",
  ]);

  try {
    const result = await pool.request().query(`
      SELECT DISTINCT RoleName
      FROM EMA_UserAccessRole
      WHERE RoleName IS NOT NULL AND LTRIM(RTRIM(RoleName)) <> ''
      ORDER BY RoleName
    `);

    result.recordset.forEach((row) => roleSet.add(row.RoleName));
  } catch {}

  try {
    const result = await pool.request().query(`
      IF OBJECT_ID('EMA_Roles', 'U') IS NOT NULL
      BEGIN
        SELECT DISTINCT
          COALESCE(RoleName, name, roleName, Role) AS RoleName
        FROM EMA_Roles
      END
    `);

    result.recordset.forEach((row) => {
      if (row.RoleName) roleSet.add(row.RoleName);
    });
  } catch {}

  return Array.from(roleSet).filter(Boolean).sort();
}

async function replaceRoles(userAccessID, roles) {
  const pool = await getPool();

  await pool.request()
    .input("UserAccessID", sql.Int, userAccessID)
    .query("DELETE FROM EMA_UserAccessRole WHERE UserAccessID = @UserAccessID");

  for (const role of roles) {
    await pool.request()
      .input("UserAccessID", sql.Int, userAccessID)
      .input("RoleName", sql.NVarChar(150), role)
      .query(`
        INSERT INTO EMA_UserAccessRole (UserAccessID, RoleName)
        VALUES (@UserAccessID, @RoleName)
      `);
  }
}

async function createUser(payload = {}, allowExistingUpdate = false) {
  await ensureUserAccessTables();

  const username = cleanText(payload.username || payload.userID || payload.name);
  const email = cleanText(payload.email);
  const roles = normalizeRoles(payload.roles || payload.role || payload.roleName);
  const status = normalizeStatus(payload);
  const passwordHash = await hashPassword(payload.password);
  const mfaEnabled = toBit(payload.requireMFA ?? payload.mfa);
  const accountLocked = toBit(payload.accountLocked) || status === "Locked" ? 1 : 0;
  const accessStartDate = normalizeDate(payload.accessStartDate || payload.accessStart);
  const accessEndDate = normalizeDate(payload.accessEndDate || payload.accessEnd);

  if (!username) {
    const error = new Error("Username is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!email) {
    const error = new Error("Email is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!roles.length) {
    const error = new Error("At least one role is required.");
    error.statusCode = 400;
    throw error;
  }

  const pool = await getPool();

  const existing = await pool.request()
    .input("Username", sql.NVarChar(150), username)
    .input("Email", sql.NVarChar(255), email)
    .query("SELECT TOP 1 UserAccessID FROM EMA_UserAccess WHERE Username = @Username OR Email = @Email");

  if (existing.recordset[0]?.UserAccessID) {
    if (!allowExistingUpdate) {
      const error = new Error("User already exists.");
      error.statusCode = 409;
      throw error;
    }

    await updateUser(existing.recordset[0].UserAccessID, payload);
    return existing.recordset[0].UserAccessID;
  }

  const insertResult = await pool.request()
    .input("Username", sql.NVarChar(150), username)
    .input("Email", sql.NVarChar(255), email)
    .input("PasswordHash", sql.NVarChar(255), passwordHash)
    .input("AccountStatus", sql.NVarChar(30), status)
    .input("MFAEnabled", sql.Bit, mfaEnabled)
    .input("AccountLocked", sql.Bit, accountLocked)
    .input("AccessStartDate", sql.Date, accessStartDate)
    .input("AccessEndDate", sql.Date, accessEndDate)
    .query(`
      INSERT INTO EMA_UserAccess (
        Username,
        Email,
        PasswordHash,
        AccountStatus,
        MFAEnabled,
        AccountLocked,
        AccessStartDate,
        AccessEndDate,
        CreatedAt,
        UpdatedAt
      )
      OUTPUT INSERTED.UserAccessID
      VALUES (
        @Username,
        @Email,
        @PasswordHash,
        @AccountStatus,
        @MFAEnabled,
        @AccountLocked,
        @AccessStartDate,
        @AccessEndDate,
        SYSDATETIME(),
        SYSDATETIME()
      )
    `);

  const userAccessID = insertResult.recordset[0].UserAccessID;
  await replaceRoles(userAccessID, roles);

  return userAccessID;
}

async function updateUser(rawID, payload = {}) {
  await ensureUserAccessTables();

  const userAccessID = await getUserAccessID(rawID);

  if (!userAccessID) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const username = cleanText(payload.username || payload.userID || payload.name);
  const email = cleanText(payload.email);
  const roles = normalizeRoles(payload.roles || payload.role || payload.roleName);
  const status = normalizeStatus(payload);
  const passwordHash = await hashPassword(payload.password);
  const mfaEnabled = toBit(payload.requireMFA ?? payload.mfa);
  const accountLocked = toBit(payload.accountLocked) || status === "Locked" ? 1 : 0;
  const accessStartDate = normalizeDate(payload.accessStartDate || payload.accessStart);
  const accessEndDate = normalizeDate(payload.accessEndDate || payload.accessEnd);

  if (!username) {
    const error = new Error("Username is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!email) {
    const error = new Error("Email is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!roles.length) {
    const error = new Error("At least one role is required.");
    error.statusCode = 400;
    throw error;
  }

  const pool = await getPool();

  await pool.request()
    .input("UserAccessID", sql.Int, userAccessID)
    .input("Username", sql.NVarChar(150), username)
    .input("Email", sql.NVarChar(255), email)
    .input("PasswordHash", sql.NVarChar(255), passwordHash)
    .input("AccountStatus", sql.NVarChar(30), status)
    .input("MFAEnabled", sql.Bit, mfaEnabled)
    .input("AccountLocked", sql.Bit, accountLocked)
    .input("AccessStartDate", sql.Date, accessStartDate)
    .input("AccessEndDate", sql.Date, accessEndDate)
    .query(`
      UPDATE EMA_UserAccess
      SET
        Username = @Username,
        Email = @Email,
        PasswordHash = COALESCE(@PasswordHash, PasswordHash),
        AccountStatus = @AccountStatus,
        MFAEnabled = @MFAEnabled,
        AccountLocked = @AccountLocked,
        AccessStartDate = @AccessStartDate,
        AccessEndDate = @AccessEndDate,
        UpdatedAt = SYSDATETIME()
      WHERE UserAccessID = @UserAccessID
    `);

  await replaceRoles(userAccessID, roles);

  return userAccessID;
}

router.get("/users", async (req, res) => {
  try {
    const users = await getUsers();
    const roles = await getRoles();

    res.json({ success: true, users, roles });
  } catch (error) {
    console.error("Failed to load user access records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load user access records",
      error: error.message,
    });
  }
});

router.post("/bootstrap", async (req, res) => {
  try {
    await ensureUserAccessTables();

    const users = Array.isArray(req.body?.users) ? req.body.users : [];

    for (const user of users) {
      const username = cleanText(user.username || user.userID || user.name || user.email);
      const email = cleanText(user.email || (username.includes("@") ? username : ""));

      if (!username || !email) continue;

      await createUser(
        {
          ...user,
          username,
          email,
          roles: normalizeRoles(user.roles || user.role || user.roleName).length
            ? normalizeRoles(user.roles || user.role || user.roleName)
            : ["Guest"],
          status: user.status || "Active",
          requireMFA: user.requireMFA || user.mfa,
          accountLocked: user.accountLocked || String(user.status || "").toLowerCase() === "locked",
          accessStartDate: user.accessStartDate,
          accessEndDate: user.accessEndDate,
        },
        true
      );
    }

    const savedUsers = await getUsers();
    const roles = await getRoles();

    res.json({ success: true, users: savedUsers, roles });
  } catch (error) {
    console.error("Failed to bootstrap user access records:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bootstrap user access records",
      error: error.message,
    });
  }
});

router.post("/users", async (req, res) => {
  try {
    const userAccessID = await createUser(req.body || {}, false);
    const users = await getUsers();

    res.status(201).json({
      success: true,
      user: users.find((user) => Number(user.userAccessID) === Number(userAccessID)) || null,
    });
  } catch (error) {
    console.error("Failed to create user access record:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create user access record",
    });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const userAccessID = await updateUser(req.params.id, req.body || {});
    const users = await getUsers();

    res.json({
      success: true,
      user: users.find((user) => Number(user.userAccessID) === Number(userAccessID)) || null,
    });
  } catch (error) {
    console.error("Failed to update user access record:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user access record",
    });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await ensureUserAccessTables();

    const userAccessID = await getUserAccessID(req.params.id);

    if (!userAccessID) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const pool = await getPool();

    await pool.request()
      .input("UserAccessID", sql.Int, userAccessID)
      .query("DELETE FROM EMA_UserAccessRole WHERE UserAccessID = @UserAccessID");

    await pool.request()
      .input("UserAccessID", sql.Int, userAccessID)
      .query("DELETE FROM EMA_UserAccess WHERE UserAccessID = @UserAccessID");

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user access record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user access record",
      error: error.message,
    });
  }
});

router.put("/reset-mfa", async (req, res) => {
  try {
    await ensureUserAccessTables();

    const pool = await getPool();
    await pool.request().query(`
      UPDATE EMA_UserAccess
      SET MFAEnabled = 0,
          UpdatedAt = SYSDATETIME()
    `);

    const users = await getUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error("Failed to reset MFA:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset MFA",
      error: error.message,
    });
  }
});

module.exports = router;
