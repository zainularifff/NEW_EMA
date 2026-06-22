function toText(value) {
  return String(value ?? '').trim();
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function normalizeClassification(value) {
  const text = toText(value).toLowerCase();
  if (['illegal', 'restricted', 'blocked', 'unauthorized', 'unapproved'].includes(text)) return 'Illegal';
  return 'Legal';
}

function normalizeTime(value, fallback) {
  const text = toText(value || fallback);
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
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
        SWUNI_Idn INT NULL,
        SoftwareName NVARCHAR(500) NOT NULL,
        CategoryID INT NULL,
        CategoryName NVARCHAR(255) NULL,
        Publisher NVARCHAR(255) NULL,
        Version NVARCHAR(255) NULL,
        ComplianceStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_Compliance DEFAULT ('Legal'),
        WorkingStartTime NVARCHAR(5) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_WorkStart DEFAULT ('09:00'),
        WorkingEndTime NVARCHAR(5) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_WorkEnd DEFAULT ('17:00'),
        WorkDays NVARCHAR(40) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_WorkDays DEFAULT ('Mon-Fri'),
        UtilizedHours DECIMAL(8,2) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_Utilized DEFAULT (2.00),
        UnderUtilizedHours DECIMAL(8,2) NOT NULL CONSTRAINT DF_EMA_SoftwarePolicyItem_UnderUtilized DEFAULT (0.01),
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

    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'SWUNI_Idn') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD SWUNI_Idn INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'CategoryID') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD CategoryID INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'WorkingStartTime') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD WorkingStartTime NVARCHAR(5) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'WorkingEndTime') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD WorkingEndTime NVARCHAR(5) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'WorkDays') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD WorkDays NVARCHAR(40) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'UtilizedHours') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD UtilizedHours DECIMAL(8,2) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'UnderUtilizedHours') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD UnderUtilizedHours DECIMAL(8,2) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'OpenCountThreshold') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD OpenCountThreshold INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseKey') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseKey NVARCHAR(500) NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseCount') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseCount INT NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseStartDate') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseStartDate DATE NULL;
    IF COL_LENGTH('dbo.EMA_SoftwarePolicyItem', 'LicenseEndDate') IS NULL ALTER TABLE dbo.EMA_SoftwarePolicyItem ADD LicenseEndDate DATE NULL;

    UPDATE dbo.EMA_SoftwarePolicyItem
    SET ComplianceStatus = 'Illegal'
    WHERE LOWER(ISNULL(ComplianceStatus, '')) IN ('restricted', 'blocked', 'unauthorized', 'unapproved');

    UPDATE dbo.EMA_SoftwarePolicyItem
    SET
      ComplianceStatus = CASE WHEN LOWER(ISNULL(ComplianceStatus, '')) = 'illegal' THEN 'Illegal' ELSE 'Legal' END,
      WorkingStartTime = COALESCE(NULLIF(WorkingStartTime, ''), '09:00'),
      WorkingEndTime = COALESCE(NULLIF(WorkingEndTime, ''), '17:00'),
      WorkDays = COALESCE(NULLIF(WorkDays, ''), 'Mon-Fri'),
      UtilizedHours = COALESCE(UtilizedHours, 2.00),
      UnderUtilizedHours = COALESCE(UnderUtilizedHours, 0.01);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_EMA_SoftwarePolicyItem_Software' AND object_id = OBJECT_ID('dbo.EMA_SoftwarePolicyItem'))
    BEGIN
      CREATE UNIQUE INDEX UX_EMA_SoftwarePolicyItem_Software
      ON dbo.EMA_SoftwarePolicyItem (PolicyID, SoftwareName, Publisher, Version);
    END;
  `);
}

function registerSoftwarePolicyRoutes(app, { authenticateToken, dbConfig, sql }) {
  const guard = typeof authenticateToken === 'function' ? authenticateToken : (_req, _res, next) => next();

  app.get('/api/settings/software-policy/categories', guard, async (_req, res) => {
    try {
      const pool = await sql.connect(dbConfig);
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
    try {
      const categoryId = toInt(req.query.categoryId || req.query.CategoryID, 0);
      const categoryName = toText(req.query.categoryName || req.query.CategoryName);
      const search = toText(req.query.search);
      const limit = Math.min(Math.max(toInt(req.query.limit, 500), 1), 1000);
      const pool = await sql.connect(dbConfig);
      const request = pool.request();
      request.input('categoryId', sql.Int, categoryId);
      request.input('categoryName', sql.NVarChar(255), categoryName);
      request.input('search', sql.NVarChar(255), search);
      request.input('limit', sql.Int, limit);
      const result = await request.query(`
        SELECT TOP (@limit)
          d.SWUNI_Idn,
          d.SWUNI_Name AS SoftwareName,
          e.CategoryID,
          e.CategoryName,
          NULLIF(LTRIM(RTRIM(c.Publisher)), '') AS Publisher,
          NULLIF(LTRIM(RTRIM(c.DisplayVersion)), '') AS Version,
          COUNT(DISTINCT a.Object_Root_Idn) AS InstalledDeviceCount
        FROM [TCO2].[dbo].[TS_OBJECT_ROOT] a
        INNER JOIN [TCO2].[dbo].[TS_OBJECT_RELATION] b ON b.Object_Rel_Idn = a.Object_Rel_Idn
        INNER JOIN [TCO2].[dbo].[TSSI_SWUNI_ATTR] c ON a.Object_Root_Idn = c.Object_Root_Idn
        INNER JOIN [TCO2].[dbo].[TS_SWUNI_LIST] d ON c.SWUNI_Idn = d.SWUNI_Idn
        INNER JOIN [TCO2].[dbo].[TS_SW_CATEGORY] e ON e.CategoryID = d.SWUNI_Catg
        WHERE (@categoryId <= 0 OR e.CategoryID = @categoryId)
          AND (@categoryName = '' OR e.CategoryName = @categoryName)
          AND (
            @search = ''
            OR d.SWUNI_Name LIKE '%' + @search + '%'
            OR c.Publisher LIKE '%' + @search + '%'
            OR c.DisplayVersion LIKE '%' + @search + '%'
          )
        GROUP BY d.SWUNI_Idn, d.SWUNI_Name, e.CategoryID, e.CategoryName, c.Publisher, c.DisplayVersion
        ORDER BY d.SWUNI_Name ASC
      `);
      res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Software policy inventory failed:', error);
      res.status(500).json({ success: false, message: 'Failed to load software inventory mapping', error: error.message });
    }
  });

  app.get('/api/settings/software-policy/policies', guard, async (_req, res) => {
    try {
      const pool = await sql.connect(dbConfig);
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
          SUM(CASE WHEN i.ComplianceStatus = 'Illegal' THEN 1 ELSE 0 END) AS IllegalCount,
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
    try {
      const policyName = toText(req.body.PolicyName || req.body.policyName || req.body.RuleName || req.body.ruleName);
      if (!policyName) return res.status(400).json({ success: false, message: 'Policy name is required' });
      const pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request()
        .input('PolicyName', sql.NVarChar(200), policyName)
        .input('Description', sql.NVarChar(1000), toText(req.body.Description || req.body.description))
        .input('CategoryID', sql.Int, toInt(req.body.CategoryID || req.body.categoryID || req.body.categoryId, 0) || null)
        .input('CategoryName', sql.NVarChar(255), toText(req.body.CategoryName || req.body.categoryName))
        .input('IsActive', sql.Bit, toBit(req.body.IsActive ?? req.body.isActive, true))
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
    try {
      const policyId = toInt(req.params.id);
      if (!policyId) return res.status(400).json({ success: false, message: 'Policy ID is required' });
      const pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request()
        .input('PolicyID', sql.Int, policyId)
        .input('PolicyName', sql.NVarChar(200), toText(req.body.PolicyName || req.body.policyName || req.body.RuleName || req.body.ruleName))
        .input('Description', sql.NVarChar(1000), toText(req.body.Description || req.body.description))
        .input('CategoryID', sql.Int, toInt(req.body.CategoryID || req.body.categoryID || req.body.categoryId, 0) || null)
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

  app.delete('/api/settings/software-policy/policies/:id', guard, async (req, res) => {
    try {
      const policyId = toInt(req.params.id);
      if (!policyId) return res.status(400).json({ success: false, message: 'Policy ID is required' });
      const pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      await pool.request().input('PolicyID', sql.Int, policyId).query(`
        UPDATE dbo.EMA_SoftwarePolicy
        SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
        WHERE PolicyID = @PolicyID
      `);
      res.json({ success: true });
    } catch (error) {
      console.error('Software policy delete failed:', error);
      res.status(500).json({ success: false, message: 'Failed to delete software policy', error: error.message });
    }
  });

  app.get('/api/settings/software-policy/policies/:id/items', guard, async (req, res) => {
    try {
      const policyId = toInt(req.params.id);
      const pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request().input('PolicyID', sql.Int, policyId).query(`
        SELECT
          PolicyItemID,
          PolicyID,
          SWUNI_Idn,
          SoftwareName,
          CategoryID,
          CategoryName,
          Publisher,
          Version,
          ComplianceStatus AS Classification,
          ComplianceStatus,
          WorkingStartTime,
          WorkingEndTime,
          WorkDays,
          UtilizedHours,
          UnderUtilizedHours,
          OpenCountThreshold,
          LicenseKey,
          LicenseCount,
          LicenseStartDate,
          LicenseEndDate,
          Notes,
          CreatedAt,
          UpdatedAt
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
    const policyId = toInt(req.params.id);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!policyId) return res.status(400).json({ success: false, message: 'Policy ID is required' });
    if (items.length === 0) return res.status(400).json({ success: false, message: 'At least one software item is required' });

    try {
      const pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        for (const item of items) {
          const softwareName = toText(item.SoftwareName || item.softwareName);
          if (!softwareName) continue;
          await new sql.Request(transaction)
            .input('PolicyID', sql.Int, policyId)
            .input('SWUNI_Idn', sql.Int, toInt(item.SWUNI_Idn || item.swuniId || item.SWUNI_IDN, 0) || null)
            .input('SoftwareName', sql.NVarChar(500), softwareName)
            .input('CategoryID', sql.Int, toInt(item.CategoryID || item.categoryID || item.categoryId, 0) || null)
            .input('CategoryName', sql.NVarChar(255), toText(item.CategoryName || item.categoryName))
            .input('Publisher', sql.NVarChar(255), toText(item.Publisher || item.publisher))
            .input('Version', sql.NVarChar(255), toText(item.Version || item.version))
            .input('ComplianceStatus', sql.NVarChar(20), normalizeClassification(item.Classification || item.ComplianceStatus || item.complianceStatus))
            .input('WorkingStartTime', sql.NVarChar(5), normalizeTime(item.WorkingStartTime || item.workingStartTime, '09:00'))
            .input('WorkingEndTime', sql.NVarChar(5), normalizeTime(item.WorkingEndTime || item.workingEndTime, '17:00'))
            .input('WorkDays', sql.NVarChar(40), toText(item.WorkDays || item.workDays) || 'Mon-Fri')
            .input('UtilizedHours', sql.Decimal(8, 2), toNumber(item.UtilizedHours ?? item.utilizedHours, 2))
            .input('UnderUtilizedHours', sql.Decimal(8, 2), toNumber(item.UnderUtilizedHours ?? item.underUtilizedHours, 0.01))
            .input('OpenCountThreshold', sql.Int, toInt(item.OpenCountThreshold ?? item.openCountThreshold, 0) || null)
            .input('LicenseKey', sql.NVarChar(500), toText(item.LicenseKey || item.licenseKey))
            .input('LicenseCount', sql.Int, toInt(item.LicenseCount ?? item.licenseCount, 0) || null)
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
                  SWUNI_Idn = COALESCE(@SWUNI_Idn, SWUNI_Idn),
                  CategoryID = COALESCE(@CategoryID, CategoryID),
                  CategoryName = NULLIF(@CategoryName, ''),
                  ComplianceStatus = @ComplianceStatus,
                  WorkingStartTime = @WorkingStartTime,
                  WorkingEndTime = @WorkingEndTime,
                  WorkDays = @WorkDays,
                  UtilizedHours = @UtilizedHours,
                  UnderUtilizedHours = @UnderUtilizedHours,
                  OpenCountThreshold = @OpenCountThreshold,
                  LicenseKey = NULLIF(@LicenseKey, ''),
                  LicenseCount = @LicenseCount,
                  LicenseStartDate = @LicenseStartDate,
                  LicenseEndDate = @LicenseEndDate,
                  Notes = NULLIF(@Notes, ''),
                  UpdatedAt = SYSUTCDATETIME()
              WHEN NOT MATCHED THEN
                INSERT (
                  PolicyID, SWUNI_Idn, SoftwareName, CategoryID, CategoryName, Publisher, Version,
                  ComplianceStatus, WorkingStartTime, WorkingEndTime, WorkDays, UtilizedHours, UnderUtilizedHours,
                  OpenCountThreshold, LicenseKey, LicenseCount, LicenseStartDate, LicenseEndDate, Notes
                )
                VALUES (
                  @PolicyID, @SWUNI_Idn, @SoftwareName, @CategoryID, NULLIF(@CategoryName, ''), NULLIF(@Publisher, ''), NULLIF(@Version, ''),
                  @ComplianceStatus, @WorkingStartTime, @WorkingEndTime, @WorkDays, @UtilizedHours, @UnderUtilizedHours,
                  @OpenCountThreshold, NULLIF(@LicenseKey, ''), @LicenseCount, @LicenseStartDate, @LicenseEndDate, NULLIF(@Notes, '')
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
    try {
      const itemId = toInt(req.params.itemId);
      const pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request()
        .input('PolicyItemID', sql.Int, itemId)
        .input('ComplianceStatus', sql.NVarChar(20), req.body.Classification || req.body.ComplianceStatus || req.body.complianceStatus ? normalizeClassification(req.body.Classification || req.body.ComplianceStatus || req.body.complianceStatus) : '')
        .input('WorkingStartTime', sql.NVarChar(5), toText(req.body.WorkingStartTime || req.body.workingStartTime))
        .input('WorkingEndTime', sql.NVarChar(5), toText(req.body.WorkingEndTime || req.body.workingEndTime))
        .input('WorkDays', sql.NVarChar(40), toText(req.body.WorkDays || req.body.workDays))
        .input('UtilizedHours', sql.Decimal(8, 2), toNumber(req.body.UtilizedHours ?? req.body.utilizedHours))
        .input('UnderUtilizedHours', sql.Decimal(8, 2), toNumber(req.body.UnderUtilizedHours ?? req.body.underUtilizedHours))
        .input('OpenCountThreshold', sql.Int, toNumber(req.body.OpenCountThreshold ?? req.body.openCountThreshold))
        .input('LicenseKey', sql.NVarChar(500), toText(req.body.LicenseKey || req.body.licenseKey))
        .input('LicenseCount', sql.Int, toNumber(req.body.LicenseCount ?? req.body.licenseCount))
        .input('LicenseStartDate', sql.Date, toDateOrNull(req.body.LicenseStartDate || req.body.licenseStartDate))
        .input('LicenseEndDate', sql.Date, toDateOrNull(req.body.LicenseEndDate || req.body.licenseEndDate))
        .input('Notes', sql.NVarChar(1000), toText(req.body.Notes || req.body.notes))
        .query(`
          UPDATE dbo.EMA_SoftwarePolicyItem
          SET
            ComplianceStatus = COALESCE(NULLIF(@ComplianceStatus, ''), ComplianceStatus),
            WorkingStartTime = COALESCE(NULLIF(@WorkingStartTime, ''), WorkingStartTime),
            WorkingEndTime = COALESCE(NULLIF(@WorkingEndTime, ''), WorkingEndTime),
            WorkDays = COALESCE(NULLIF(@WorkDays, ''), WorkDays),
            UtilizedHours = COALESCE(@UtilizedHours, UtilizedHours),
            UnderUtilizedHours = COALESCE(@UnderUtilizedHours, UnderUtilizedHours),
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
    try {
      const itemId = toInt(req.params.itemId);
      const pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      await pool.request().input('PolicyItemID', sql.Int, itemId).query('DELETE FROM dbo.EMA_SoftwarePolicyItem WHERE PolicyItemID = @PolicyItemID');
      res.json({ success: true });
    } catch (error) {
      console.error('Software policy item delete failed:', error);
      res.status(500).json({ success: false, message: 'Failed to delete policy item', error: error.message });
    }
  });

  app.get('/api/settings/software-policy/policies/:id/usage', guard, async (req, res) => {
    try {
      const policyId = toInt(req.params.id);
      const dateFrom = toDateOrNull(req.query.dateFrom) || toDateOrNull(req.query.from);
      const dateTo = toDateOrNull(req.query.dateTo) || toDateOrNull(req.query.to);
      const pool = await sql.connect(dbConfig);
      await ensureSoftwarePolicyTables(pool);
      const result = await pool.request()
        .input('PolicyID', sql.Int, policyId)
        .input('DateFrom', sql.Date, dateFrom)
        .input('DateTo', sql.Date, dateTo)
        .query(`
          WITH usage_data AS (
            SELECT
              i.PolicyItemID,
              i.SoftwareName,
              CAST(h.App_StartTime AS DATE) AS UsageDate,
              SUM(CASE WHEN ISNULL(h.ActiveTime, 0) > 86400 THEN ISNULL(h.ActiveTime, 0) / 3600000.0 ELSE ISNULL(h.ActiveTime, 0) / 3600.0 END) AS UsedHours,
              COUNT(h.ID) AS OpenCount
            FROM dbo.EMA_SoftwarePolicyItem i
            LEFT JOIN [TCO2].[dbo].[TS_SW_INFO] s ON
              i.SoftwareName IN (s.SW_ProductName, s.SW_FileName, s.SW_OrgFileName, s.SW_InterName)
              OR s.SW_ProductName LIKE '%' + i.SoftwareName + '%'
            LEFT JOIN [TCO2].[dbo].[TSSM_MONITOR_HISTORY] h ON h.SW_Idn = s.SW_Idn
              AND (@DateFrom IS NULL OR CAST(h.App_StartTime AS DATE) >= @DateFrom)
              AND (@DateTo IS NULL OR CAST(h.App_StartTime AS DATE) <= @DateTo)
              AND (DATEDIFF(DAY, 0, CAST(h.App_StartTime AS DATE)) % 7) BETWEEN 0 AND 4
              AND (i.WorkingStartTime IS NULL OR CONVERT(VARCHAR(5), CAST(h.App_StartTime AS TIME), 108) >= i.WorkingStartTime)
              AND (i.WorkingEndTime IS NULL OR CONVERT(VARCHAR(5), CAST(h.App_StartTime AS TIME), 108) <= i.WorkingEndTime)
            WHERE i.PolicyID = @PolicyID
            GROUP BY i.PolicyItemID, i.SoftwareName, CAST(h.App_StartTime AS DATE)
          )
          SELECT
            i.PolicyItemID,
            i.SoftwareName,
            i.ComplianceStatus AS Classification,
            i.WorkingStartTime,
            i.WorkingEndTime,
            i.UtilizedHours,
            i.UnderUtilizedHours,
            i.OpenCountThreshold,
            i.LicenseCount,
            i.LicenseStartDate,
            i.LicenseEndDate,
            u.UsageDate,
            COALESCE(u.UsedHours, 0) AS UsedHours,
            COALESCE(u.OpenCount, 0) AS OpenCount,
            CASE
              WHEN COALESCE(u.UsedHours, 0) >= i.UtilizedHours THEN 'Utilized'
              WHEN ISNULL(i.OpenCountThreshold, 0) > 0 AND COALESCE(u.OpenCount, 0) >= i.OpenCountThreshold THEN 'Utilized'
              WHEN COALESCE(u.UsedHours, 0) >= i.UnderUtilizedHours THEN 'Underutilized'
              ELSE 'Not Used'
            END AS RoiStatus,
            CASE
              WHEN i.LicenseEndDate IS NOT NULL AND i.LicenseEndDate < CAST(GETDATE() AS DATE) THEN 'Expired'
              WHEN i.LicenseEndDate IS NOT NULL AND i.LicenseEndDate <= DATEADD(DAY, 30, CAST(GETDATE() AS DATE)) THEN 'Expiring Soon'
              ELSE 'Valid'
            END AS LicenseStatus
          FROM dbo.EMA_SoftwarePolicyItem i
          LEFT JOIN usage_data u ON u.PolicyItemID = i.PolicyItemID
          WHERE i.PolicyID = @PolicyID
          ORDER BY i.SoftwareName ASC, u.UsageDate DESC
        `);
      res.json({ success: true, data: result.recordset || [] });
    } catch (error) {
      console.error('Software policy usage failed:', error);
      res.status(500).json({ success: false, message: 'Failed to load software policy usage', error: error.message });
    }
  });
}

module.exports = registerSoftwarePolicyRoutes;
