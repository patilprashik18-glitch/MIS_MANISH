import express from 'express';
import db from '../db.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Any authenticated user can read thresholds (needed to render alert flags on report/dashboard views)
router.get('/', async (req, res) => {
  try {
    const rows = await db('settings').select('*');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Only Admin can change thresholds
router.put('/:key', isAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined || value === null || value === '') {
      return res.status(400).json({ error: 'Value is required' });
    }

    const updated = await db('settings').where({ key: req.params.key }).update({ value: String(value) });
    if (!updated) return res.status(404).json({ error: 'Setting not found' });

    const row = await db('settings').where({ key: req.params.key }).first();
    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
