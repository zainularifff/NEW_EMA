function toText(value) {
  return String(value ?? '').trim();
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateOrNull(value) {
  const text = toText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function toBit(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
}

async function ensureSoftwarePolicyTables(pool) {
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
        SoftwareName NVARCHAR(500) NOT NULL,
        CategoryName NVARCHAR(255) NULL,
        Publisher NVARCHAR(255) NULL,
        Version NVARCHAR(255) NULL,
        ComplianceStatus NVARCHAR(40) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_Compliance DEFAULT ('Legal'),
        PurchaseStatus NVARCHAR(40) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_Purchase DEFAULT ('Unknown'),
        WorkingStartTime NVARCHAR(5) NULL,
        WorkingEndTime NVARCHAR(5) NULL,
        UtilizedHours DECIMAL(8,2) NULL,
        UnderUtilizedHours DECIMAL(8,2) NULL,
        NotUsedHours DECIMAL(8,2) NULL,
        OpenCountThreshold INT NULL,
        LicenseKey NVARCHAR(500) NULL,
        LicenseCount INT NULL,
        LicenseStartDate DATE NULL,
        LicenseEndDate DATE NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
      );
    END;

    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'WorkingStartTime') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD WorkingStartTime NVARCHAR(5) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'WorkingEndTime') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD WorkingEndTime NVARCHAR(5) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'UtilizedHours') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD UtilizedHours DECIMAL(8,2) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'UnderUtilizedHours') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD UnderUtilizedHours DECIMAL(8,2) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'NotUsedHours') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD NotUsedHours DECIMAL(8,2) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'OpenCountThreshold') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD OpenCountThreshold INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseKey') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseKey NVARCHAR(500) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseCount') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseCount INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseStartDate') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseStartDate DATE NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseEndDate') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseEndDate DATE NULL;
  `);
}

function registerSoftwarePolicyRoutes(app, { authenticateToken, dbConfig, sql }) {
  const guard = typeof authenticateToken === 'function' ? authenticateToken : (_req, _res, next) => next();

  app.get('/api/settings/software-policy/categories', guard, async (_req, res) => {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request().query(`
        SELECT TOP (1000) CategoryID, CategoryName
        FROM [TCO2].[dbo].[TS_SW_CATEGORY]
        WHERE CategoryName IS NOT NULL AND LTRIM(RTRIM(CategoryName)) <> ''
        ORDER BY CategoryName ASC
      `);
      res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Software policy categories failed:', error);
      res.status(500).json({ success: false, message: 'Failed to load software categories', error: error.message });
    }
  });

  app.get('/api/settings/software-policy/software', guard, async (req, res) => {
    let pool;
    try {
      const categoryName = toText(req.query.categoryName);
      const search = toText(req.query.search);
      const limit = Math.min(Math.max(toInt(req.query.limit, 500), 1), 1000);
      pool = await sql.connect(dbConfig);
      const request = pool.request();
      request.input('categoryName', sql.NVarChar(255), categoryName);
      request.input('search', sql.NVarChar(255), search);
      request.input('limit', sql.Int, limit);
      const result = await request.query(`
        SELECT TOP (@limit)
          d.SWUNI_Name AS SoftwareName,
          e.CategoryName,
          c.Publisher,
          c.DisplayVersion AS Version,
          a.Object_Client_Name AS Username,
          a.ComputerName,
          b.Object_Full_Name AS Department
        FROM [TCO2].[dbo].[TS_OBJECT_ROOT] a
        INNER JOIN [TCO2].[dbo].[TS_OBJECT_RELATION] b ON b.Object_Rel_Idn = a.Object_Rel_Idn
        INNER JOIN [TCO2].[dbo].[TSSI_SWUNI_ATTR] c ON a.Object_Root_Idn = c.Object_Root_Idn
        INNER JOIN [TCO2].[dbo].[TS_SWUNI_LIST] d ON c.SWUNI_Idn = d.SWUNI_Idn
        INNER JOIN [TCO2].[dbo].[TS_SW_CATEGORY] e ON e.CategoryID = d.SWUNI_Catg
        WHERE (@categoryName = '' OR e.CategoryName = @categoryName)
          AND (
            @search = ''
            OR d.SWUNI_Name LIKE '%' + @search + '%'
            OR c.Publisher LIKE '%' + @search + '%'
            OR c.DisplayVersion LIKE '%' + @search + '%'
            OR a.ComputerName LIKE '%' + @search + '%'
          )
        GROUP BY d.SWUNI_Name, e.CategoryName, c.Publisher, c.DisplayVersion, a.Object_Client_Name, a.ComputerName, b.Object_Full_Name
        ORDER BY d.SWUNI_Name ASC
      `);
      res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Software policy inventory failed:', error);
      res.status(500).json({ success: false, message: 'Failed to load software inventory mapping', error: error.message });
    }
  });

  app.get('/api/settings/software-policy/policies', guard, async (_req, res) => {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request().query(`
        SELECT
          p.PolicyID,
          p.PolicyName,
          p.Description,
          p.CategoryID,
          p.CategoryName,
          p.IsActive,
          p.CreatedAt,
          p.UpdatedAt,
          COUNT(i.PolicyItemID) AS TotalItems,
          SUM(CASE WHEN i.ComplianceStatus = 'Legal' THEN 1 ELSE 0 END) AS LegalCount,
          SUM(CASE WHEN i.ComplianceStatus IN ('Illegal', 'Restricted') THEN 1 ELSE 0 END) AS IllegalCount,
          SUM(ISNULL(i.LicenseCount, 0)) AS LicenseTotal
        FROM dbo.EMA_SoftwarePolicy p
        LEFT JOIN dbo.EMA_SoftwarePolicyItem i ON i.PolicyID = p.PolicyID
        WHERE p.IsActive = 1
        GROUP BY p.PolicyID, p.PolicyName, p.Description, p.CategoryID, p.CategoryName, p.IsActive, p.CreatedAt, p.UpdatedAt
        ORDER BY ISNULL(p.UpdatedAt, p.CreatedAt) DESC
      `);
      res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Software policy list failed:', error);
      res.status(500).json({ success: false, message: 'Failed to load software policies', error: error.message });
    }
  });

  app.post('/api/settings/software-policy/policies', guard, async (req, res) => {
    let pool;
    try {
      const policyName = toText(req.body.PolicyName || req.body.policyName);
      if (!policyName) return res.status(400).json({ success: false, message: 'Policy name is required' });
      pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request()
        .input('PolicyName', sql.NVarChar(200), policyName)
        .input('Description', sql.NVarChar(1000), toText(req.body.Description || req.body.description))
        .input('CategoryID', sql.Int, toInt(req.body.CategoryID || req.body.categoryID, 0) || null)
        .input('CategoryName', sql.NVarChar(255), toText(req.body.CategoryName || req.body.categoryName))
        .input('IsActive', sql.Bit, toBit(req.body.IsActive, true))
        .input('CreatedBy', sql.NVarChar(200), toText(req.user?.username || req.user?.email || req.user?.name))
        .query(`
          INSERT INTO dbo.EMA_SoftwarePolicy (PolicyName, Description, CategoryID, CategoryName, IsActive, CreatedBy, UpdatedAt)
          OUTPUT INSERTED.*
          VALUES (@PolicyName, NULLIF(@Description, ''), @CategoryID, NULLIF(@CategoryName, ''), @IsActive, NULLIF(@CreatedBy, ''), SYSUTCDATETIME())
        `);
      res.status(201).json({ success: true, data: result.recordset?.[0] || null });
    } catch (error) {
      console.error('Software policy create failed:', error);
      res.status(500).json({ success: false, message: 'Failed to create software policy', error: error.message });
    }
  });

  app.put('/api/settings/software-policy/policies/:id', guard, async (req, res) => {
    let pool;
    try {
      const policyId = toInt(req.params.id);
      if (!policyId) return res.status(400).json({ success: false, message: 'Policy ID is required' });
      pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request()
        .input('PolicyID', sql.Int, policyId)
        .input('PolicyName', sql.NVarChar(200), toText(req.body.PolicyName || req.body.policyName))
        .input('Description', sql.NVarChar(1000), toText(req.body.Description || req.body.description))
        .input('CategoryID', sql.Int, toInt(req.body.CategoryID || req.body.categoryID, 0) || null)
        .input('CategoryName', sql.NVarChar(255), toText(req.body.CategoryName || req.body.categoryName))
        .query(`
          UPDATE dbo.EMA_SoftwarePolicy
          SET
            PolicyName = COALESCE(NULLIF(@PolicyName, ''), PolicyName),
            Description = COALESCE(NULLIF(@Description, ''), Description),
            CategoryID = COALESCE(@CategoryID, CategoryID),
            CategoryName = COALESCE(NULLIF(@CategoryName, ''), CategoryName),
            UpdatedAt = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE PolicyID = @PolicyID
        `);
      res.json({ success: true, data: result.recordset?.[0] || null });
    } catch (error) {
      console.error('Software policy update failed:', error);
      res.status(500).json({ success: false, message: 'Failed to update software policy', error: error.message });
    }
  });

  app.get('/api/settings/software-policy/policies/:id/items', guard, async (req, res) => {
    let pool;
    try {
      const policyId = toInt(req.params.id);
      pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request().input('PolicyID', sql.Int, policyId).query(`
        SELECT
          PolicyItemID, PolicyID, SoftwareName, CategoryName, Publisher, Version,
          ComplianceStatus, PurchaseStatus, WorkingStartTime, WorkingEndTime,
          UtilizedHours, UnderUtilizedHours, NotUsedHours, OpenCountThreshold,
          LicenseKey, LicenseCount, LicenseStartDate, LicenseEndDate, Notes,
          CreatedAt, UpdatedAt
        FROM dbo.EMA_SoftwarePolicyItem
        WHERE PolicyID = @PolicyID
        ORDER BY SoftwareName ASC
      `);
      res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Software policy items failed:', error);
      res.status(500).json({ success: false, message: 'Failed to load policy items', error: error.message });
    }
  });

  app.post('/api/settings/software-policy/policies/:id/items', guard, async (req, res) => {
    let pool;
    const policyId = toInt(req.params.id);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!policyId) return res.status(400).json({ success: false, message: 'Policy ID is required' });
    if (items.length === 0) return res.status(400).json({ success: false, message: 'At least one software item is required' });

    try {
      pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        for (const item of items) {
          const softwareName = toText(item.SoftwareName || item.softwareName);
          if (!softwareName) continue;
          await new sql.Request(transaction)
            .input('PolicyID', sql.Int, policyId)
            .input('SoftwareName', sql.NVarChar(500), softwareName)
            .input('CategoryName', sql.NVarChar(255), toText(item.CategoryName || item.categoryName))
            .input('Publisher', sql.NVarChar(255), toText(item.Publisher || item.publisher))
            .input('Version', sql.NVarChar(255), toText(item.Version || item.version))
            .input('ComplianceStatus', sql.NVarChar(40), toText(item.ComplianceStatus || item.complianceStatus) || 'Legal')
            .input('PurchaseStatus', sql.NVarChar(40), toText(item.PurchaseStatus || item.purchaseStatus) || 'Unknown')
            .input('WorkingStartTime', sql.NVarChar(5), toText(item.WorkingStartTime || item.workingStartTime || '09:00'))
            .input('WorkingEndTime', sql.NVarChar(5), toText(item.WorkingEndTime || item.workingEndTime || '18:00'))
            .input('UtilizedHours', sql.Decimal(8, 2), toNumberOrNull(item.UtilizedHours ?? item.utilizedHours) ?? 4)
            .input('UnderUtilizedHours', sql.Decimal(8, 2), toNumberOrNull(item.UnderUtilizedHours ?? item.underUtilizedHours) ?? 1)
            .input('NotUsedHours', sql.Decimal(8, 2), toNumberOrNull(item.NotUsedHours ?? item.notUsedHours) ?? 0)
            .input('OpenCountThreshold', sql.Int, toInt(item.OpenCountThreshold ?? item.openCountThreshold, 1))
            .input('LicenseKey', sql.NVarChar(500), toText(item.LicenseKey || item.licenseKey))
            .input('LicenseCount', sql.Int, toInt(item.LicenseCount ?? item.licenseCount, 0))
            .input('LicenseStartDate', sql.Date, toDateOrNull(item.LicenseStartDate || item.licenseStartDate))
            .input('LicenseEndDate', sql.Date, toDateOrNull(item.LicenseEndDate || item.licenseEndDate))
            .input('Notes', sql.NVarChar(1000), toText(item.Notes || item.notes))
            .query(`
              MERGE dbo.EMA_SoftwarePolicyItem AS target
              USING (SELECT @PolicyID AS PolicyID, @SoftwareName AS SoftwareName, ISNULL(@Publisher, '') AS Publisher, ISNULL(@Version, '') AS Version) AS source
              ON target.PolicyID = source.PolicyID
                AND target.SoftwareName = source.SoftwareName
                AND ISNULL(target.Publisher, '') = source.Publisher
                AND ISNULL(target.Version, '') = source.Version
              WHEN MATCHED THEN
                UPDATE SET
                  CategoryName = NULLIF(@CategoryName, ''),
                  ComplianceStatus = @ComplianceStatus,
                  PurchaseStatus = @PurchaseStatus,
                  WorkingStartTime = NULLIF(@WorkingStartTime, ''),
                  WorkingEndTime = NULLIF(@WorkingEndTime, ''),
                  UtilizedHours = @UtilizedHours,
                  UnderUtilizedHours = @UnderUtilizedHours,
                  NotUsedHours = @NotUsedHours,
                  OpenCountThreshold = @OpenCountThreshold,
                  LicenseKey = NULLIF(@LicenseKey, ''),
                  LicenseCount = @LicenseCount,
                  LicenseStartDate = @LicenseStartDate,
                  LicenseEndDate = @LicenseEndDate,
                  Notes = NULLIF(@Notes, ''),
                  UpdatedAt = SYSUTCDATETIME()
              WHEN NOT MATCHED THEN
                INSERT (
                  PolicyID, SoftwareName, CategoryName, Publisher, Version,
                  ComplianceStatus, PurchaseStatus, WorkingStartTime, WorkingEndTime,
                  UtilizedHours, UnderUtilizedHours, NotUsedHours, OpenCountThreshold,
                  LicenseKey, LicenseCount, LicenseStartDate, LicenseEndDate, Notes
                )
                VALUES (
                  @PolicyID, @SoftwareName, NULLIF(@CategoryName, ''), NULLIF(@Publisher, ''), NULLIF(@Version, ''),
                  @ComplianceStatus, @PurchaseStatus, NULLIF(@WorkingStartTime, ''), NULLIF(@WorkingEndTime, ''),
                  @UtilizedHours, @UnderUtilizedHours, @NotUsedHours, @OpenCountThreshold,
                  NULLIF(@LicenseKey, ''), @LicenseCount, @LicenseStartDate, @LicenseEndDate, NULLIF(@Notes, '')
                );
            `);
        }
        await new sql.Request(transaction)
          .input('PolicyID', sql.Int, policyId)
          .query('UPDATE dbo.EMA_SoftwarePolicy SET UpdatedAt = SYSUTCDATETIME() WHERE PolicyID = @PolicyID');
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      res.json({ success: true, message: 'Software policy items saved' });
    } catch (error) {
      console.error('Software policy item save failed:', error);
      res.status(500).json({ success: false, message: 'Failed to save policy items', error: error.message });
    }
  });

  app.put('/api/settings/software-policy/items/:itemId', guard, async (req, res) => {
    let pool;
    try {
      const itemId = toInt(req.params.itemId);
      pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request()
        .input('PolicyItemID', sql.Int, itemId)
        .input('ComplianceStatus', sql.NVarChar(40), toText(req.body.ComplianceStatus || req.body.complianceStatus))
        .input('PurchaseStatus', sql.NVarChar(40), toText(req.body.PurchaseStatus || req.body.purchaseStatus))
        .input('WorkingStartTime', sql.NVarChar(5), toText(req.body.WorkingStartTime || req.body.workingStartTime))
        .input('WorkingEndTime', sql.NVarChar(5), toText(req.body.WorkingEndTime || req.body.workingEndTime))
        .input('UtilizedHours', sql.Decimal(8, 2), toNumberOrNull(req.body.UtilizedHours ?? req.body.utilizedHours))
        .input('UnderUtilizedHours', sql.Decimal(8, 2), toNumberOrNull(req.body.UnderUtilizedHours ?? req.body.underUtilizedHours))
        .input('NotUsedHours', sql.Decimal(8, 2), toNumberOrNull(req.body.NotUsedHours ?? req.body.notUsedHours))
        .input('OpenCountThreshold', sql.Int, toNumberOrNull(req.body.OpenCountThreshold ?? req.body.openCountThreshold))
        .input('LicenseKey', sql.NVarChar(500), toText(req.body.LicenseKey || req.body.licenseKey))
        .input('LicenseCount', sql.Int, toNumberOrNull(req.body.LicenseCount ?? req.body.licenseCount))
        .input('LicenseStartDate', sql.Date, toDateOrNull(req.body.LicenseStartDate || req.body.licenseStartDate))
        .input('LicenseEndDate', sql.Date, toDateOrNull(req.body.LicenseEndDate || req.body.licenseEndDate))
        .input('Notes', sql.NVarChar(1000), toText(req.body.Notes || req.body.notes))
        .query(`
          UPDATE dbo.EMA_SoftwarePolicyItem
          SET
            ComplianceStatus = COALESCE(NULLIF(@ComplianceStatus, ''), ComplianceStatus),
            PurchaseStatus = COALESCE(NULLIF(@PurchaseStatus, ''), PurchaseStatus),
            WorkingStartTime = COALESCE(NULLIF(@WorkingStartTime, ''), WorkingStartTime),
            WorkingEndTime = COALESCE(NULLIF(@WorkingEndTime, ''), WorkingEndTime),
            UtilizedHours = COALESCE(@UtilizedHours, UtilizedHours),
            UnderUtilizedHours = COALESCE(@UnderUtilizedHours, UnderUtilizedHours),
            NotUsedHours = COALESCE(@NotUsedHours, NotUsedHours),
            OpenCountThreshold = COALESCE(@OpenCountThreshold, OpenCountThreshold),
            LicenseKey = COALESCE(NULLIF(@LicenseKey, ''), LicenseKey),
            LicenseCount = COALESCE(@LicenseCount, LicenseCount),
            LicenseStartDate = COALESCE(@LicenseStartDate, LicenseStartDate),
            LicenseEndDate = COALESCE(@LicenseEndDate, LicenseEndDate),
            Notes = COALESCE(NULLIF(@Notes, ''), Notes),
            UpdatedAt = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE PolicyItemID = @PolicyItemID
        `);
      res.json({ success: true, data: result.recordset?.[0] || null });
    } catch (error) {
      console.error('Software policy item update failed:', error);
      res.status(500).json({ success: false, message: 'Failed to update policy item', error: error.message });
    }
  });

  app.delete('/api/settings/software-policy/items/:itemId', guard, async (req, res) => {
    let pool;
    try {
      const itemId = toInt(req.params.itemId);
      pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      await pool.request().input('PolicyItemID', sql.Int, itemId).query('DELETE FROM dbo.EMA_SoftwarePolicyItem WHERE PolicyItemID = @PolicyItemID');
      res.json({ success: true });
    } catch (error) {
      console.error('Software policy item delete failed:', error);
      res.status(500).json({ success: false, message: 'Failed to delete policy item', error: error.message });
    }
  });
}

module.exports = registerSoftwarePolicyRoutes;
