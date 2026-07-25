import express from 'express';
import db from '../db.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);
router.use(isAdmin);

// Distinct dates that have any recorded changes, most recently changed first
router.get('/dates', async (req, res) => {
  try {
    const rows = await db('audit_log')
      .select('report_date')
      .count('* as change_count')
      .max('changed_at as last_changed_at')
      .groupBy('report_date')
      .orderBy('last_changed_at', 'desc');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { report_date, user, field, report_type } = req.query;

    let query = db('audit_log').orderBy('changed_at', 'desc').limit(500);

    if (report_date) query = query.where({ report_date });
    if (report_type) query = query.where({ report_type });
    if (user) query = query.where('changed_by_email', 'like', `%${user}%`);
    if (field) query = query.where('field_name', 'like', `%${field}%`);

    const rows = await query;
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
