function normalizeComplianceStatus(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('illegal') ? 'Illegal' : 'Legal';
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const CACHE_TTL_MS = Number(process.env.SOFTWARE_COMPLIANCE_DASHBOARD_CACHE_TTL_MS || 60000);
const responseCache = new Map();

function getCache(key) {
  const item = responseCache.get(key);
  if (!item) return null;
  if (Date.now() - item.createdAt > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(item.payload));
  } catch (_) {
    return item.payload;
  }
}

function setCache(key, payload) {
  if (!key || !payload || CACHE_TTL_MS <= 0) return;
  responseCache.set(key, {
    createdAt: Date.now(),
    payload
  });
}

function bypassCache(req) {
  const value = String(req?.query?.refresh || req?.query?.noCache || req?.query?.nocache || '').toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

async function ensureSoftwareComplianceColumns(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.EMA_SoftwarePolicy', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.EMA_SoftwarePolicy (
        PolicyID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PolicyName NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000) NULL,
        CategoryID INT NULL,
        CategoryName NVARCHAR(255) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_EMA_SoftwarePolicy_IsActive DEFAULT (1),
        CreatedBy NVARCHAR(200) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EMA_SoftwarePolicy_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
      );
    END;

    IF OBJECT_ID('dbo.EMA_SoftwarePolicyItem', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.EMA_SoftwarePolicyItem (
        PolicyItemID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PolicyID INT NOT NULL,
        SWUNI_Idn INT NULL,
        SoftwareName NVARCHAR(500) NOT NULL,
        CategoryID INT NULL,
        CategoryName NVARCHAR(255) NULL,
        Publisher NVARCHAR(255) NULL,
        Version NVARCHAR(255) NULL,
        ComplianceStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_Compliance DEFAULT ('Legal'),
        LicenseCount INT NULL,
        LicenseStartDate DATE NULL,
        LicenseEndDate DATE NULL,
        UnitPrice DECIMAL(18,2) NULL,
        Currency NVARCHAR(10) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
      );
    END;

    IF COL_LENGTH('dbo.EMA_SoftwarePolicy', 'IsActive') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicy ADD IsActive BIT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'SWUNI_Idn') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD SWUNI_Idn INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'CategoryID') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD CategoryID INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'CategoryName') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD CategoryName NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'Publisher') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD Publisher NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'ComplianceStatus') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD ComplianceStatus NVARCHAR(20) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseCount') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseCount INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseEndDate') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseEndDate DATE NULL;

    UPDATE dbo.EMA_SoftwarePolicy SET IsActive = 1 WHERE IsActive IS NULL;

    UPDATE dbo.EMA_SoftwarePolicyItem
    SET ComplianceStatus = CASE WHEN LOWER(ISNULL(ComplianceStatus, '')) IN ('illegal', 'restricted', 'blocked', 'unauthorized', 'unapproved') THEN 'Illegal' ELSE 'Legal' END
    WHERE ComplianceStatus IS NULL
       OR LOWER(ISNULL(ComplianceStatus, '')) IN ('illegal', 'restricted', 'blocked', 'unauthorized', 'unapproved', 'legal', 'allowed', 'approved');
  `);
}

function registerSoftwareComplianceDashboardRoutes(app, { authenticateToken, dbConfig, sql }) {
  const guard = typeof authenticateToken === 'function' ? authenticateToken : (_req, _res, next) => next();

  app.get('/api/dashboard/software-compliance/summary', guard, async (req, res) => {
    const cacheKey = 'summary';
    if (!bypassCache(req)) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    try {
      const pool = await sql.connect(dbConfig);
      await ensureSoftwareComplianceColumns(pool);

      const request = pool.request();
      request.timeout = 30000;

      const result = await request.query(`
        ;WITH policy_items AS (
          SELECT
            pi.PolicyItemID,
            CASE WHEN LOWER(ISNULL(pi.ComplianceStatus, 'Legal')) = 'illegal' THEN 'Illegal' ELSE 'Legal' END AS ComplianceStatus,
            ISNULL(pi.LicenseCount, 0) AS LicenseCount
          FROM dbo.EMA_SoftwarePolicyItem pi WITH (NOLOCK)
          INNER JOIN dbo.EMA_SoftwarePolicy p WITH (NOLOCK)
            ON p.PolicyID = pi.PolicyID
          WHERE ISNULL(p.IsActive, 1) = 1
            AND NULLIF(LTRIM(RTRIM(pi.SoftwareName)), '') IS NOT NULL
        ),
        policy_counts AS (
          SELECT
            CAST(ISNULL(SUM(CASE WHEN ComplianceStatus = 'Legal' THEN 1 ELSE 0 END), 0) AS INT) AS LegalCount,
            CAST(ISNULL(SUM(CASE WHEN ComplianceStatus = 'Illegal' THEN 1 ELSE 0 END), 0) AS INT) AS ExplicitIllegalCount,
            CAST(ISNULL(COUNT(1), 0) AS INT) AS PolicyItemCount,
            CAST(ISNULL(SUM(LicenseCount), 0) AS INT) AS LicenseTotal
          FROM policy_items
        ),
        inventory_unique AS (
          SELECT
            CAST(ISNULL(COUNT_BIG(DISTINCT mh.SW_Idn), 0) AS INT) AS UniqueSoftware
          FROM [TCO2].[dbo].[TSSM_MONITOR_HISTORY] mh WITH (NOLOCK)
          WHERE mh.SW_Idn IS NOT NULL
        )
        SELECT
          iu.UniqueSoftware AS TotalItems,
          pc.LegalCount,
          CASE
            WHEN iu.UniqueSoftware > pc.LegalCount THEN iu.UniqueSoftware - pc.LegalCount
            ELSE pc.ExplicitIllegalCount
          END AS IllegalCount,
          pc.ExplicitIllegalCount,
          pc.PolicyItemCount,
          pc.LicenseTotal
        FROM policy_counts pc
        CROSS JOIN inventory_unique iu;
      `);

      const row = result.recordset?.[0] || {};
      const data = [{
        TotalItems: toInt(row.TotalItems, 0),
        LegalCount: toInt(row.LegalCount, 0),
        IllegalCount: Math.max(0, toInt(row.IllegalCount, 0)),
        ExplicitIllegalCount: toInt(row.ExplicitIllegalCount, 0),
        PolicyItemCount: toInt(row.PolicyItemCount, 0),
        LicenseTotal: toInt(row.LicenseTotal, 0)
      }];

      const payload = {
        success: true,
        data,
        summary: {
          policyTotalSoftware: data[0].TotalItems,
          policyLegalSoftware: data[0].LegalCount,
          policyIllegalSoftware: data[0].IllegalCount,
          explicitPolicyIllegalSoftware: data[0].ExplicitIllegalCount,
          policyLicenseTotal: data[0].LicenseTotal
        }
      };

      setCache(cacheKey, payload);
      return res.json(payload);
    } catch (error) {
      console.error('Software compliance dashboard summary failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load software compliance dashboard summary',
        error: error.message
      });
    }
  });

  app.get('/api/dashboard/software-compliance/details', guard, async (req, res) => {
    try {
      const status = normalizeComplianceStatus(req.query.status || req.query.complianceStatus);
      const limit = Math.min(Math.max(toInt(req.query.limit, 1000), 1), 5000);
      const cacheKey = `details:${status}:${limit}`;

      if (!bypassCache(req)) {
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);
      }

      const pool = await sql.connect(dbConfig);
      await ensureSoftwareComplianceColumns(pool);

      const request = pool.request();
      request.timeout = 45000;
      request.input('Status', sql.NVarChar(20), status);
      request.input('Limit', sql.Int, limit);

      const result = await request.query(`
        ;WITH all_policy_items AS (
          SELECT
            pi.PolicyItemID,
            pi.PolicyID,
            pi.SWUNI_Idn,
            LOWER(LTRIM(RTRIM(ISNULL(pi.SoftwareName, '')))) AS SoftwareKey,
            NULLIF(LTRIM(RTRIM(pi.SoftwareName)), '') AS SoftwareName,
            NULLIF(LTRIM(RTRIM(pi.Publisher)), '') AS Publisher,
            NULLIF(LTRIM(RTRIM(pi.CategoryName)), '') AS CategoryName,
            CASE WHEN LOWER(ISNULL(pi.ComplianceStatus, 'Legal')) = 'illegal' THEN 'Illegal' ELSE 'Legal' END AS ComplianceStatus,
            ISNULL(pi.LicenseCount, 0) AS TotalLicense,
            pi.LicenseEndDate
          FROM dbo.EMA_SoftwarePolicyItem pi WITH (NOLOCK)
          INNER JOIN dbo.EMA_SoftwarePolicy p WITH (NOLOCK)
            ON p.PolicyID = pi.PolicyID
          WHERE ISNULL(p.IsActive, 1) = 1
            AND NULLIF(LTRIM(RTRIM(pi.SoftwareName)), '') IS NOT NULL
        ),
        selected_policy_items AS (
          SELECT *
          FROM all_policy_items
          WHERE ComplianceStatus = @Status
        ),
        policy_software_match AS (
          SELECT DISTINCT
            pi.PolicyItemID,
            si.SW_Idn
          FROM selected_policy_items pi
          LEFT JOIN [TCO2].[dbo].[TS_SW_INFO] si WITH (NOLOCK)
            ON (pi.SWUNI_Idn IS NOT NULL AND pi.SWUNI_Idn = si.SW_Pkg_Idn)
            OR LOWER(LTRIM(RTRIM(ISNULL(si.SW_ProductName, '')))) = pi.SoftwareKey
            OR LOWER(LTRIM(RTRIM(ISNULL(si.SW_FileName, '')))) = pi.SoftwareKey
            OR LOWER(LTRIM(RTRIM(ISNULL(si.SW_OrgFileName, '')))) = pi.SoftwareKey
            OR LOWER(LTRIM(RTRIM(ISNULL(si.SW_InterName, '')))) = pi.SoftwareKey
        ),
        policy_install_counts AS (
          SELECT
            sm.PolicyItemID,
            COUNT_BIG(DISTINCT CONCAT(CONVERT(NVARCHAR(50), mh.Object_Root_Idn), ':', CONVERT(NVARCHAR(50), sm.SW_Idn))) AS TotalInstall,
            COUNT_BIG(DISTINCT mh.Object_Root_Idn) AS InstalledPC
          FROM policy_software_match sm
          LEFT JOIN [TCO2].[dbo].[TSSM_MONITOR_HISTORY] mh WITH (NOLOCK)
            ON mh.SW_Idn = sm.SW_Idn
          WHERE sm.SW_Idn IS NOT NULL
          GROUP BY sm.PolicyItemID
        ),
        policy_result AS (
          SELECT
            CAST(pi.PolicyID AS INT) AS PolicyID,
            CAST(pi.PolicyItemID AS INT) AS PolicyItemID,
            pi.SoftwareName,
            pi.Publisher,
            pi.CategoryName,
            pi.ComplianceStatus,
            CAST(ISNULL(ic.TotalInstall, 0) AS INT) AS TotalInstall,
            CAST(ISNULL(ic.InstalledPC, 0) AS INT) AS InstalledPC,
            CAST(ISNULL(pi.TotalLicense, 0) AS INT) AS TotalLicense,
            CAST(ISNULL(pi.TotalLicense, 0) - ISNULL(ic.TotalInstall, 0) AS INT) AS Balance,
            CONVERT(VARCHAR(10), pi.LicenseEndDate, 120) AS LicenseEndDate,
            CASE WHEN pi.LicenseEndDate IS NULL THEN NULL ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), pi.LicenseEndDate) END AS DaysToExpire,
            CASE
              WHEN ISNULL(pi.TotalLicense, 0) - ISNULL(ic.TotalInstall, 0) < 0 THEN 'Negative - Over installed'
              WHEN ISNULL(pi.TotalLicense, 0) - ISNULL(ic.TotalInstall, 0) = 0 THEN 'Enough'
              ELSE 'Positive - License available'
            END AS PositionStatus,
            CASE
              WHEN pi.LicenseEndDate IS NULL THEN 'No expiry date'
              WHEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), pi.LicenseEndDate) < 0 THEN 'Expired'
              WHEN DATEDIFF(DAY, CAST(GETDATE() AS DATE), pi.LicenseEndDate) <= 30 THEN 'Near expiry'
              ELSE 'Valid'
            END AS LicenseStatus,
            CAST(0 AS INT) AS SortGroup
          FROM selected_policy_items pi
          LEFT JOIN policy_install_counts ic
            ON ic.PolicyItemID = pi.PolicyItemID
        ),
        inventory_counts AS (
          SELECT
            si.SW_Idn,
            COALESCE(NULLIF(LTRIM(RTRIM(si.SW_ProductName)), ''), NULLIF(LTRIM(RTRIM(si.SW_OrgFileName)), ''), NULLIF(LTRIM(RTRIM(si.SW_FileName)), ''), CONCAT('Software ', si.SW_Idn)) AS SoftwareName,
            NULLIF(LTRIM(RTRIM(si.SW_CompanyName)), '') AS Publisher,
            COALESCE(NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(255), si.SW_Category))), ''), 'Unclassified') AS CategoryName,
            COUNT_BIG(DISTINCT CONCAT(CONVERT(NVARCHAR(50), mh.Object_Root_Idn), ':', CONVERT(NVARCHAR(50), si.SW_Idn))) AS TotalInstall,
            COUNT_BIG(DISTINCT mh.Object_Root_Idn) AS InstalledPC
          FROM [TCO2].[dbo].[TSSM_MONITOR_HISTORY] mh WITH (NOLOCK)
          INNER JOIN [TCO2].[dbo].[TS_SW_INFO] si WITH (NOLOCK)
            ON si.SW_Idn = mh.SW_Idn
          WHERE mh.SW_Idn IS NOT NULL
          GROUP BY
            si.SW_Idn,
            si.SW_ProductName,
            si.SW_OrgFileName,
            si.SW_FileName,
            si.SW_CompanyName,
            si.SW_Category
        ),
        unlisted_result AS (
          SELECT
            CAST(NULL AS INT) AS PolicyID,
            CAST(NULL AS INT) AS PolicyItemID,
            inv.SoftwareName,
            inv.Publisher,
            inv.CategoryName,
            CAST('Illegal' AS NVARCHAR(20)) AS ComplianceStatus,
            CAST(ISNULL(inv.TotalInstall, 0) AS INT) AS TotalInstall,
            CAST(ISNULL(inv.InstalledPC, 0) AS INT) AS InstalledPC,
            CAST(0 AS INT) AS TotalLicense,
            CAST(0 - ISNULL(inv.TotalInstall, 0) AS INT) AS Balance,
            CAST(NULL AS VARCHAR(10)) AS LicenseEndDate,
            CAST(NULL AS INT) AS DaysToExpire,
            CAST('Negative - Unlisted software' AS NVARCHAR(100)) AS PositionStatus,
            CAST('No expiry date' AS NVARCHAR(100)) AS LicenseStatus,
            CAST(1 AS INT) AS SortGroup
          FROM inventory_counts inv
          WHERE @Status = 'Illegal'
            AND NOT EXISTS (
              SELECT 1
              FROM all_policy_items pi
              WHERE (pi.SWUNI_Idn IS NOT NULL AND EXISTS (
                      SELECT 1
                      FROM [TCO2].[dbo].[TS_SW_INFO] sx WITH (NOLOCK)
                      WHERE sx.SW_Idn = inv.SW_Idn
                        AND sx.SW_Pkg_Idn = pi.SWUNI_Idn
                    ))
                 OR LOWER(inv.SoftwareName) = pi.SoftwareKey
            )
        ),
        combined AS (
          SELECT * FROM policy_result
          UNION ALL
          SELECT * FROM unlisted_result
        )
        SELECT TOP (@Limit)
          PolicyID,
          PolicyItemID,
          SoftwareName,
          Publisher,
          CategoryName,
          ComplianceStatus,
          TotalInstall,
          InstalledPC,
          TotalLicense,
          Balance,
          LicenseEndDate,
          DaysToExpire,
          PositionStatus,
          LicenseStatus
        FROM combined
        ORDER BY SortGroup ASC, SoftwareName ASC;
      `);

      const payload = { success: true, data: result.recordset || [] };
      setCache(cacheKey, payload);
      return res.json(payload);
    } catch (error) {
      console.error('Software compliance dashboard detail failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load software compliance dashboard detail',
        error: error.message
      });
    }
  });
}

module.exports = registerSoftwareComplianceDashboardRoutes;
