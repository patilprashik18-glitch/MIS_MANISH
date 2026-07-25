import express from 'express';
import db from '../db.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Require admin for all master data modifications (gets can be for any logged in user)
const requireAdminForWrite = (req, res, next) => {
  if (req.method !== 'GET') {
    return isAdmin(req, res, next);
  }
  next();
};

router.use(authenticateToken);
router.use(requireAdminForWrite);

const tables = {
  products: 'master_products',
  salesmen: 'master_salesmen',
  expenses: 'master_expenses',
  locations: 'master_locations',
  bag_types: 'master_bag_types',
};

// Generic CRUD endpoints for master data
router.get('/:type', async (req, res) => {
  const table = tables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid master data type' });

  try {
    const data = await db(table).orderBy('id', 'asc');
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:type', async (req, res) => {
  const table = tables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid master data type' });
  
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const [newItem] = await db(table).insert({ name }).returning('*');
    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT') { // Unique violation in PG or SQLite
       return res.status(400).json({ error: 'Name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:type/:id', async (req, res) => {
  const table = tables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid master data type' });

  try {
    const { name, is_active } = req.body;
    const [updated] = await db(table)
      .where({ id: req.params.id })
      .update({ name, is_active })
      .returning('*');
    
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
