function normalizeComplianceStatus(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('illegal') ? 'Illegal' : 'Legal';
}

function registerSoftwareComplianceDashboardRoutes(app, { authenticateToken, dbConfig, sql }) {
  const guard = typeof authenticateToken === 'function' ? authenticateToken : (_req, _res, next) => next();

  app.get('/api/dashboard/software-compliance/details', guard, async (req, res) => {
    try {
      const status = normalizeComplianceStatus(req.query.status || req.query.complianceStatus);
      const pool = await sql.connect(dbConfig);
      const request = pool.request();
      request.timeout = 45000;
      request.input('Status', sql.NVarChar(20), status);

      const result = await request.query(`
        ;WITH policy_items AS (
          SELECT
            pi.PolicyItemID,
            pi.PolicyID,
            pi.SWUNI_Idn,
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
            AND CASE WHEN LOWER(ISNULL(pi.ComplianceStatus, 'Legal')) = 'illegal' THEN 'Illegal' ELSE 'Legal' END = @Status
            AND NULLIF(LTRIM(RTRIM(pi.SoftwareName)), '') IS NOT NULL
        ),
        software_match AS (
          SELECT DISTINCT
            pi.PolicyItemID,
            si.SW_Idn
          FROM policy_items pi
          LEFT JOIN [TCO2].[dbo].[TS_SW_INFO] si WITH (NOLOCK)
            ON (pi.SWUNI_Idn IS NOT NULL AND pi.SWUNI_Idn = si.SW_Pkg_Idn)
            OR LOWER(LTRIM(RTRIM(ISNULL(si.SW_ProductName, '')))) = LOWER(pi.SoftwareName)
            OR LOWER(LTRIM(RTRIM(ISNULL(si.SW_FileName, '')))) = LOWER(pi.SoftwareName)
            OR LOWER(LTRIM(RTRIM(ISNULL(si.SW_OrgFileName, '')))) = LOWER(pi.SoftwareName)
        ),
        install_counts AS (
          SELECT
            sm.PolicyItemID,
            COUNT_BIG(DISTINCT CONCAT(CONVERT(NVARCHAR(50), mh.Object_Root_Idn), ':', CONVERT(NVARCHAR(50), sm.SW_Idn))) AS TotalInstall,
            COUNT_BIG(DISTINCT mh.Object_Root_Idn) AS InstalledPC
          FROM software_match sm
          LEFT JOIN [TCO2].[dbo].[TSSM_MONITOR_HISTORY] mh WITH (NOLOCK)
            ON mh.SW_Idn = sm.SW_Idn
          WHERE sm.SW_Idn IS NOT NULL
          GROUP BY sm.PolicyItemID
        )
        SELECT
          pi.PolicyID,
          pi.PolicyItemID,
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
          END AS LicenseStatus
        FROM policy_items pi
        LEFT JOIN install_counts ic
          ON ic.PolicyItemID = pi.PolicyItemID
        ORDER BY pi.SoftwareName ASC;
      `);

      return res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Software compliance dashboard detail failed:', error);
      return res.status(500).json({ success: false, message: 'Failed to load software compliance dashboard detail', error: error.message });
    }
  });
}

module.exports = registerSoftwareComplianceDashboardRoutes;
