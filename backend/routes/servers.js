import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const servers = (db.data.servers || [])
      .filter(s => s.user_id === req.userId)
      .map(({ user_id, ...s }) => ({ ...s, tags: s.tags || ['Manual'] }));
    res.json(servers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, ip, os = 'Windows Server 2022' } = req.body;
    if (!name || !ip) {
      return res.status(400).json({ error: 'Name and IP required' });
    }
    const server = {
      id: Date.now(),
      user_id: req.userId,
      name,
      ip,
      os,
      status: 'online',
      tags: ['Manual']
    };
    db.data.servers = db.data.servers || [];
    db.data.servers.push(server);
    await db.write();
    const { user_id, ...out } = server;
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const idx = (db.data.servers || []).findIndex(
      s => s.id === id && s.user_id === req.userId
    );
    if (idx === -1) {
      return res.status(404).json({ error: 'Server not found' });
    }
    db.data.servers.splice(idx, 1);
    await db.write();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
