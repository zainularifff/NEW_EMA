import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getPagination, buildResponse } from '../utils/pagination';

export async function getAll(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, offset } = getPagination(req);
  try {
    const pool = await getPool();
    const count = await pool.request().query('SELECT COUNT(*) as total FROM summary_reports');
    const result = await pool.request()
      .input('offset', sql.Int, offset).input('limit', sql.Int, limit)
      .query(`SELECT id, title, category, generated_by as generatedBy, status, created_at as createdAt
        FROM summary_reports ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    res.json({ status: 'success', data: buildResponse(result.recordset, count.recordset[0].total, page, limit), message: '' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const { title, category } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('title', sql.NVarChar, title)
      .input('category', sql.NVarChar, category || 'General')
      .input('generatedBy', sql.NVarChar, req.user?.username || 'system')
      .query(`INSERT INTO summary_reports (title, category, generated_by, status, created_at)
        VALUES (@title, @category, @generatedBy, 'Completed', GETDATE())`);
    res.status(201).json({ status: 'success', data: null, message: 'Report generated' });
  } catch { res.status(500).json({ status: 'error', message: 'Server error' }); }
}
