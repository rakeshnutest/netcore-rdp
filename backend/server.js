import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, optionalAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import serversRoutes from './routes/servers.js';
import sessionsRoutes from './routes/sessions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7011;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// API routes only - frontend is served by separate Nginx container
app.use('/api/auth', authRoutes);
app.use('/api/servers', serversRoutes);
app.use('/api/sessions', sessionsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint for API
app.get('/', (req, res) => {
  res.json({ 
    message: 'NetCore RDP Backend API',
    version: '1.0.0',
    endpoints: ['/api/auth', '/api/servers', '/api/sessions', '/api/health']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 NetCore RDP Portal running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
});
