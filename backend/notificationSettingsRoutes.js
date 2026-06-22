const axios = require('axios');
const sql = require('mssql');

const WHATSAPP_MONTHLY_LIMIT = Number(process.env.WHATSAPP_MONTHLY_LIMIT || 200);

const TABLES = {
  email: 'EMA_EmailSettings',
  whatsapp: 'EMA_WhatsAppSettings',
  rules: 'EMA_NotificationRules',
  stats: 'EMA_NotificationStats'
};

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function boolValue(value) {
  return value === true || value === 1 || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === '1' || String(value).toLowerCase() === 'yes' || String(value).toLowerCase() === 'on';
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function withWhatsappPrefix(value) {
  const text = cleanText(value).replace(/\s+/g, '');
  if (!text) return '';
  if (text.startsWith('whatsapp:')) return text;
  return `whatsapp:${text.startsWith('+') ? text : `+${text}`}`;
}

async function ensureNotificationTables(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.EMA_EmailSettings', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.EMA_EmailSettings (
        SettingID INT IDENTITY(1,1) PRIMARY KEY,
        Provider NVARCHAR(50) NOT NULL DEFAULT 'SMTP',
        SmtpHost NVARCHAR(255) NULL,
        SmtpPort INT NULL,
        SmtpUser NVARCHAR(255) NULL,
        SmtpPassword NVARCHAR(MAX) NULL,
        FromEmail NVARCHAR(255) NULL,
        FromName NVARCHAR(255) NULL,
        UseTLS BIT NOT NULL DEFAULT 1,
        IsEnabled BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
      );
    END;

    IF OBJECT_ID('dbo.EMA_WhatsAppSettings', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.EMA_WhatsAppSettings (
        SettingID INT IDENTITY(1,1) PRIMARY KEY,
        Provider NVARCHAR(50) NOT NULL DEFAULT 'Twilio',
        AccountSID NVARCHAR(255) NULL,
        AuthToken NVARCHAR(MAX) NULL,
        FromNumber NVARCHAR(100) NULL,
        IsEnabled BIT NOT NULL DEFAULT 0,
        MonthlyLimit INT NOT NULL DEFAULT 200,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
      );
    END;

    IF OBJECT_ID('dbo.EMA_NotificationRules', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.EMA_NotificationRules (
        RuleID INT IDENTITY(1,1) PRIMARY KEY,
        RuleKey NVARCHAR(100) NOT NULL UNIQUE,
        RuleName NVARCHAR(255) NOT NULL,
        Description NVARCHAR(500) NULL,
        EmailEnabled BIT NOT NULL DEFAULT 0,
        WhatsAppEnabled BIT NOT NULL DEFAULT 0,
        IsEnabled BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
      );
    END;

    IF OBJECT_ID('dbo.EMA_NotificationStats', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.EMA_NotificationStats (
        StatID INT IDENTITY(1,1) PRIMARY KEY,
        Channel NVARCHAR(50) NOT NULL,
        PeriodKey NVARCHAR(20) NOT NULL,
        SentCount INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        CONSTRAINT UQ_EMA_NotificationStats_Channel_Period UNIQUE (Channel, PeriodKey)
      );
    END;

    IF OBJECT_ID('dbo.EmailSettings', 'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dbo.EMA_EmailSettings)
       AND EXISTS (SELECT 1 FROM dbo.EmailSettings)
    BEGIN
      INSERT INTO dbo.EMA_EmailSettings (Provider, SmtpHost, SmtpPort, SmtpUser, SmtpPassword, FromEmail, FromName, UseTLS, IsEnabled, CreatedAt, UpdatedAt)
      SELECT TOP 1 Provider, SmtpHost, SmtpPort, SmtpUser, SmtpPassword, FromEmail, FromName, UseTLS, IsEnabled, CreatedAt, UpdatedAt
      FROM dbo.EmailSettings
      ORDER BY SettingID DESC;
    END;

    IF OBJECT_ID('dbo.WhatsAppSettings', 'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dbo.EMA_WhatsAppSettings)
       AND EXISTS (SELECT 1 FROM dbo.WhatsAppSettings)
    BEGIN
      INSERT INTO dbo.EMA_WhatsAppSettings (Provider, AccountSID, AuthToken, FromNumber, IsEnabled, MonthlyLimit, CreatedAt, UpdatedAt)
      SELECT TOP 1 Provider, AccountSID, AuthToken, FromNumber, IsEnabled, MonthlyLimit, CreatedAt, UpdatedAt
      FROM dbo.WhatsAppSettings
      ORDER BY SettingID DESC;
    END;

    IF OBJECT_ID('dbo.NotificationStats', 'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dbo.EMA_NotificationStats)
       AND EXISTS (SELECT 1 FROM dbo.NotificationStats)
    BEGIN
      INSERT INTO dbo.EMA_NotificationStats (Channel, PeriodKey, SentCount, CreatedAt, UpdatedAt)
      SELECT Channel, PeriodKey, SentCount, CreatedAt, UpdatedAt
      FROM dbo.NotificationStats;
    END;
  `);

  const defaults = [
    ['CRM_CREATED', 'CRM Created', 'Notify when a CRM record is created.'],
    ['INCIDENT_CREATED', 'Incident Created', 'Notify when a Service Desk incident is created.'],
    ['INCIDENT_UPDATED', 'Incident Updated', 'Notify when a Service Desk incident is updated.'],
    ['INCIDENT_RESOLVED', 'Incident Resolved', 'Notify when a Service Desk incident is resolved.'],
    ['LEASE_EXPIRY_3M', 'Lease Expiry - 3 Months', 'Notify when a lease expires in 3 months.'],
    ['LEASE_EXPIRY_1M', 'Lease Expiry - 1 Month', 'Notify when a lease expires in 1 month.'],
    ['LEASE_EXPIRY_1W', 'Lease Expiry - 1 Week', 'Notify when a lease expires in 1 week.'],
    ['LICENSE_EXCEEDED', 'License Exceeded', 'Notify when license usage exceeds threshold.']
  ];

  for (const [key, name, description] of defaults) {
    await pool.request()
      .input('RuleKey', sql.NVarChar(100), key)
      .input('RuleName', sql.NVarChar(255), name)
      .input('Description', sql.NVarChar(500), description)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.EMA_NotificationRules WHERE RuleKey = @RuleKey)
          INSERT INTO dbo.EMA_NotificationRules (RuleKey, RuleName, Description, EmailEnabled, WhatsAppEnabled, IsEnabled)
          VALUES (@RuleKey, @RuleName, @Description, 0, 0, 1);
      `);
  }
}

function mapEmail(row = {}) {
  return {
    provider: cleanText(row.Provider, 'SMTP'),
    host: cleanText(row.SmtpHost),
    port: Number(row.SmtpPort || 587),
    user: cleanText(row.SmtpUser || row.FromEmail),
    fromEmail: cleanText(row.FromEmail),
    fromName: cleanText(row.FromName, 'EMA System'),
    ssl: row.UseTLS === undefined ? true : boolValue(row.UseTLS),
    isActive: boolValue(row.IsEnabled),
    hasPassword: Boolean(cleanText(row.SmtpPassword))
  };
}

function mapWhatsapp(row = {}) {
  return {
    provider: cleanText(row.Provider, 'Twilio'),
    accountSid: cleanText(row.AccountSID),
    authToken: '',
    fromNumber: cleanText(row.FromNumber),
    isEnabled: boolValue(row.IsEnabled),
    monthlyLimit: Number(row.MonthlyLimit || WHATSAPP_MONTHLY_LIMIT),
    hasAuthToken: Boolean(cleanText(row.AuthToken))
  };
}

function mapRule(row = {}) {
  return {
    RuleKey: cleanText(row.RuleKey),
    Enabled: boolValue(row.Enabled ?? row.EmailEnabled),
    WhatsAppEnabled: boolValue(row.WhatsAppEnabled),
    Description: cleanText(row.Description)
  };
}

async function getWhatsappUsage(pool) {
  const key = monthKey();
  await pool.request()
    .input('Channel', sql.NVarChar(50), 'whatsapp')
    .input('PeriodKey', sql.NVarChar(20), key)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.EMA_NotificationStats WHERE Channel=@Channel AND PeriodKey=@PeriodKey)
        INSERT INTO dbo.EMA_NotificationStats (Channel, PeriodKey, SentCount) VALUES (@Channel, @PeriodKey, 0);
    `);
  const result = await pool.request()
    .input('Channel', sql.NVarChar(50), 'whatsapp')
    .input('PeriodKey', sql.NVarChar(20), key)
    .query('SELECT TOP 1 SentCount FROM dbo.EMA_NotificationStats WHERE Channel=@Channel AND PeriodKey=@PeriodKey;');
  const sent = Number(result.recordset?.[0]?.SentCount || 0);
  return {
    count: sent,
    sent,
    limit: WHATSAPP_MONTHLY_LIMIT,
    remaining: Math.max(0, WHATSAPP_MONTHLY_LIMIT - sent),
    activeProvider: 'Twilio',
    periodKey: key
  };
}

function registerNotificationSettingsRoutes(app, options = {}) {
  const authenticateToken = options.authenticateToken || ((req, res, next) => next());
  const dbConfig = options.dbConfig;
  const sqlClient = options.sql || sql;

  if (!app) throw new Error('Express app is required for notification settings routes.');
  if (!dbConfig) throw new Error('dbConfig is required for notification settings routes.');

  const getPool = () => sqlClient.connect(dbConfig);

  app.get('/api/settings/email', authenticateToken, async (req, res) => {
    try {
      const pool = await getPool();
      await ensureNotificationTables(pool);
      const result = await pool.request().query('SELECT TOP 1 * FROM dbo.EMA_EmailSettings ORDER BY SettingID DESC;');
      res.json({ success: true, data: mapEmail(result.recordset?.[0] || {}) });
    } catch (err) {
      console.error('GET /api/settings/email error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/settings/email', authenticateToken, async (req, res) => {
    try {
      const body = req.body || {};
      const pool = await getPool();
      await ensureNotificationTables(pool);
      await pool.request()
        .input('Provider', sqlClient.NVarChar(50), cleanText(body.provider, 'SMTP'))
        .input('SmtpHost', sqlClient.NVarChar(255), cleanText(body.host || body.smtpHost))
        .input('SmtpPort', sqlClient.Int, Number(body.port || body.smtpPort || 587))
        .input('SmtpUser', sqlClient.NVarChar(255), cleanText(body.user || body.smtpUser))
        .input('SmtpPassword', sqlClient.NVarChar(sqlClient.MAX), cleanText(body.pass || body.smtpPassword || body.password))
        .input('FromEmail', sqlClient.NVarChar(255), cleanText(body.fromEmail || body.user))
        .input('FromName', sqlClient.NVarChar(255), cleanText(body.fromName, 'EMA System'))
        .input('UseTLS', sqlClient.Bit, body.ssl === undefined && body.useTLS === undefined ? true : boolValue(body.ssl ?? body.useTLS))
        .input('IsEnabled', sqlClient.Bit, boolValue(body.isActive ?? body.isEnabled))
        .query(`
          IF EXISTS (SELECT 1 FROM dbo.EMA_EmailSettings)
            UPDATE dbo.EMA_EmailSettings SET Provider=@Provider, SmtpHost=@SmtpHost, SmtpPort=@SmtpPort, SmtpUser=@SmtpUser,
              SmtpPassword=CASE WHEN @SmtpPassword='' THEN SmtpPassword ELSE @SmtpPassword END,
              FromEmail=@FromEmail, FromName=@FromName, UseTLS=@UseTLS, IsEnabled=@IsEnabled, UpdatedAt=GETDATE()
          ELSE
            INSERT INTO dbo.EMA_EmailSettings (Provider, SmtpHost, SmtpPort, SmtpUser, SmtpPassword, FromEmail, FromName, UseTLS, IsEnabled)
            VALUES (@Provider, @SmtpHost, @SmtpPort, @SmtpUser, @SmtpPassword, @FromEmail, @FromName, @UseTLS, @IsEnabled);
        `);
      res.json({ success: true, data: { saved: true, table: TABLES.email } });
    } catch (err) {
      console.error('POST /api/settings/email error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put('/api/settings/email', authenticateToken, async (req, res) => {
    req.method = 'POST';
    app._router.handle(req, res);
  });

  app.post('/api/settings/email/test', authenticateToken, async (req, res) => {
    res.json({ success: true, message: 'Email test endpoint registered.' });
  });

  app.get('/api/settings/whatsapp', authenticateToken, async (req, res) => {
    try {
      const pool = await getPool();
      await ensureNotificationTables(pool);
      const result = await pool.request().query('SELECT TOP 1 * FROM dbo.EMA_WhatsAppSettings ORDER BY SettingID DESC;');
      res.json({ success: true, data: mapWhatsapp(result.recordset?.[0] || { MonthlyLimit: WHATSAPP_MONTHLY_LIMIT }) });
    } catch (err) {
      console.error('GET /api/settings/whatsapp error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/settings/whatsapp', authenticateToken, async (req, res) => {
    try {
      const body = req.body || {};
      const pool = await getPool();
      await ensureNotificationTables(pool);
      await pool.request()
        .input('Provider', sqlClient.NVarChar(50), 'Twilio')
        .input('AccountSID', sqlClient.NVarChar(255), cleanText(body.accountSid || body.accountSID))
        .input('AuthToken', sqlClient.NVarChar(sqlClient.MAX), cleanText(body.authToken))
        .input('FromNumber', sqlClient.NVarChar(100), cleanText(body.fromNumber))
        .input('IsEnabled', sqlClient.Bit, boolValue(body.isEnabled))
        .input('MonthlyLimit', sqlClient.Int, WHATSAPP_MONTHLY_LIMIT)
        .query(`
          IF EXISTS (SELECT 1 FROM dbo.EMA_WhatsAppSettings)
            UPDATE dbo.EMA_WhatsAppSettings SET Provider=@Provider, AccountSID=@AccountSID,
              AuthToken=CASE WHEN @AuthToken='' THEN AuthToken ELSE @AuthToken END,
              FromNumber=@FromNumber, IsEnabled=@IsEnabled, MonthlyLimit=@MonthlyLimit, UpdatedAt=GETDATE()
          ELSE
            INSERT INTO dbo.EMA_WhatsAppSettings (Provider, AccountSID, AuthToken, FromNumber, IsEnabled, MonthlyLimit)
            VALUES (@Provider, @AccountSID, @AuthToken, @FromNumber, @IsEnabled, @MonthlyLimit);
        `);
      const result = await pool.request().query('SELECT TOP 1 * FROM dbo.EMA_WhatsAppSettings ORDER BY SettingID DESC;');
      res.json({ success: true, data: { saved: true, table: TABLES.whatsapp, settings: mapWhatsapp(result.recordset?.[0] || {}) } });
    } catch (err) {
      console.error('POST /api/settings/whatsapp error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put('/api/settings/whatsapp', authenticateToken, async (req, res) => {
    req.method = 'POST';
    app._router.handle(req, res);
  });

  app.get('/api/settings/whatsapp/usage', authenticateToken, async (req, res) => {
    try {
      const pool = await getPool();
      await ensureNotificationTables(pool);
      res.json({ success: true, data: await getWhatsappUsage(pool) });
    } catch (err) {
      console.error('GET /api/settings/whatsapp/usage error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/settings/whatsapp/test', authenticateToken, async (req, res) => {
    try {
      const body = req.body || {};
      const pool = await getPool();
      await ensureNotificationTables(pool);
      const saved = await pool.request().query('SELECT TOP 1 * FROM dbo.EMA_WhatsAppSettings ORDER BY SettingID DESC;');
      const settings = saved.recordset?.[0] || {};
      const accountSid = cleanText(body.accountSid || settings.AccountSID);
      const authToken = cleanText(body.authToken || settings.AuthToken);
      const from = withWhatsappPrefix(body.fromNumber || settings.FromNumber);
      const to = withWhatsappPrefix(body.testNumber || body.testRecipient || body.to || body.recipient);

      if (!accountSid || !authToken || !from || !to) {
        return res.status(400).json({ success: false, message: 'Account SID, Auth Token, From Number and Test Recipient are required.' });
      }

      const params = new URLSearchParams();
      params.append('From', from);
      params.append('To', to);
      params.append('Body', cleanText(body.message, 'EMA System WhatsApp notification test.'));

      let twilioResponse;
      try {
        twilioResponse = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
          params,
          { auth: { username: accountSid, password: authToken }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
        );
      } catch (twilioErr) {
        const detail = twilioErr?.response?.data?.message || twilioErr.message || 'Twilio request failed';
        return res.status(502).json({ success: false, message: detail, detail: twilioErr?.response?.data || null });
      }

      const key = monthKey();
      await pool.request()
        .input('Channel', sqlClient.NVarChar(50), 'whatsapp')
        .input('PeriodKey', sqlClient.NVarChar(20), key)
        .query(`
          IF EXISTS (SELECT 1 FROM dbo.EMA_NotificationStats WHERE Channel=@Channel AND PeriodKey=@PeriodKey)
            UPDATE dbo.EMA_NotificationStats SET SentCount = ISNULL(SentCount, 0) + 1, UpdatedAt = GETDATE() WHERE Channel=@Channel AND PeriodKey=@PeriodKey
          ELSE
            INSERT INTO dbo.EMA_NotificationStats (Channel, PeriodKey, SentCount) VALUES (@Channel, @PeriodKey, 1);
        `);

      res.json({ success: true, message: 'WhatsApp test sent successfully.', data: { sid: twilioResponse?.data?.sid, status: twilioResponse?.data?.status || 'queued', usage: await getWhatsappUsage(pool) } });
    } catch (err) {
      console.error('POST /api/settings/whatsapp/test error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get('/api/settings/notification-rules', authenticateToken, async (req, res) => {
    try {
      const pool = await getPool();
      await ensureNotificationTables(pool);
      const result = await pool.request().query('SELECT * FROM dbo.EMA_NotificationRules ORDER BY RuleID ASC;');
      res.json({ success: true, data: (result.recordset || []).map(mapRule) });
    } catch (err) {
      console.error('GET /api/settings/notification-rules error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.put('/api/settings/notification-rules', authenticateToken, async (req, res) => {
    try {
      const rules = Array.isArray(req.body) ? req.body : Array.isArray(req.body?.rules) ? req.body.rules : [];
      const pool = await getPool();
      await ensureNotificationTables(pool);
      for (const rule of rules) {
        await pool.request()
          .input('RuleKey', sqlClient.NVarChar(100), cleanText(rule.ruleKey || rule.RuleKey || rule.key))
          .input('EmailEnabled', sqlClient.Bit, boolValue(rule.emailEnabled ?? rule.EmailEnabled ?? rule.Enabled))
          .input('WhatsAppEnabled', sqlClient.Bit, boolValue(rule.whatsAppEnabled ?? rule.whatsappEnabled ?? rule.WhatsAppEnabled))
          .input('IsEnabled', sqlClient.Bit, rule.isEnabled === undefined ? true : boolValue(rule.isEnabled || rule.IsEnabled))
          .query('UPDATE dbo.EMA_NotificationRules SET EmailEnabled=@EmailEnabled, WhatsAppEnabled=@WhatsAppEnabled, IsEnabled=@IsEnabled, UpdatedAt=GETDATE() WHERE RuleKey=@RuleKey;');
      }
      res.json({ success: true, data: { updated: rules.length, table: TABLES.rules } });
    } catch (err) {
      console.error('PUT /api/settings/notification-rules error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });
}

module.exports = registerNotificationSettingsRoutes;
