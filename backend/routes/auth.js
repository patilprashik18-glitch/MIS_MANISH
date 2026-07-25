import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Setup an initial admin if no users exist (for first run)
router.post('/setup', async (req, res) => {
    try {
        const usersCount = await db('users').count('id as count').first();
        if (parseInt(usersCount.count) > 0) {
            return res.status(400).json({ error: 'Setup already completed' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash('admin123', salt);
        
        await db('users').insert({
            email: 'admin@mfmpl.com',
            password_hash,
            role: 'admin'
        });
        
        res.json({ message: 'Default admin created: admin@mfmpl.com / admin123' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
