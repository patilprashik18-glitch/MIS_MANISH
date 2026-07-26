import express from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All user routes require admin access
router.use(authenticateToken);
router.use(isAdmin);

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await db('users').select('id', 'email', 'role', 'created_at');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new user
router.post('/', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [newUser] = await db('users').insert({
      email,
      password_hash,
      role
    }).returning(['id', 'email', 'role']);

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an existing user - password is optional (blank/omitted leaves it unchanged)
router.put('/:id', async (req, res) => {
  try {
    const { email, role, password } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    const updateData = { email, role };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    const [updated] = await db('users').where({ id: req.params.id }).update(updateData).returning(['id', 'email', 'role']);
    if (!updated) return res.status(404).json({ error: 'User not found' });

    res.json(updated);
  } catch (error) {
    console.error(error);
    if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
