import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'netcore-rdp-secret-change-in-production';
const JWT_EXPIRY = '7d';

router.post('/login', async (req, res) => {
  try {
    const { username, password, targetIp } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const uname = username.toLowerCase();
    const token = jwt.sign(
      { userId: uname, username: uname },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    res.json({ token, username: uname, targetIp: targetIp || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ userId: req.userId, username: req.username });
});

export default router;
