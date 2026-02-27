import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { encryptGuacamoleJson } from '../lib/guacamole-auth.js';
import { spawn } from 'child_process';
import os from 'os';

const router = Router();

// Function to get server IP address dynamically
function getServerIpAddress() {
  // Use HOST_IP environment variable if available (for Docker deployment)
  const hostIp = process.env.HOST_IP;
  if (hostIp && hostIp !== 'localhost') {
    return hostIp;
  }
  
  // Fallback to network interface detection
  const interfaces = os.networkInterfaces();
  
  // Try to find eth0 first
  if (interfaces.eth0) {
    for (const iface of interfaces.eth0) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  // If eth0 not found, look for any non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  // Fallback to localhost if no external IP found
  return 'localhost';
}

// Get dynamic Guacamole URL based on request (browser-detected IP)
function getGuacamoleBaseUrl(req) {
  let serverIp;
  
  // ALWAYS try to get the IP from the request headers first (browser knows the correct IP)
  if (req && req.headers) {
    // Extract hostname from the Host header (this is what the browser used to reach us)
    const hostHeader = req.headers['host'];
    if (hostHeader) {
      serverIp = hostHeader.split(':')[0]; // Remove port if present
    }
    
    // Also check other forwarded headers (for reverse proxy scenarios)
    if (!serverIp) {
      serverIp = req.headers['x-forwarded-host'] || 
                 req.headers['x-real-ip'] || 
                 req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    }
  }
  
  // Only fallback to localhost if we really can't determine the IP
  if (!serverIp || serverIp.startsWith('127.') || serverIp === 'localhost') {
    console.warn('⚠️ Could not determine server IP from request headers, using localhost');
    serverIp = 'localhost';
  }
  
  const guacamolePort = process.env.GUACAMOLE_PORT || '8080';
  const guacamoleUrl = `http://${serverIp}:${guacamolePort}/guacamole`;
  
  console.log(`🌐 Generated Guacamole URL: ${guacamoleUrl} (from Host: ${req?.headers?.host})`);
  return guacamoleUrl;
}

// Apply auth middleware to specific routes, not all routes
// router.use(authMiddleware);




// Disconnect all sessions (no auth required)
router.post('/disconnect-all', async (req, res) => {
  try {
    const sessionCount = (db.data.sessions || []).length;
    
    // Clear all sessions from the database
    db.data.sessions = [];
    await db.write();
    
    console.log(`Disconnected all ${sessionCount} sessions`);
    
    res.json({
      success: true,
      message: `All ${sessionCount} sessions disconnected`,
      count: 0,
      disconnected: sessionCount
    });
  } catch (err) {
    console.error('Error disconnecting all sessions:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to disconnect all sessions'
    });
  }
});

// Disconnect specific session (no auth required)
router.post('/disconnect/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    const sessions = db.data.sessions || [];
    const sessionIndex = sessions.findIndex(s => s.session_id === sessionId);
    
    if (sessionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    const disconnectedSession = sessions[sessionIndex];
    db.data.sessions = sessions.filter(s => s.session_id !== sessionId);
    await db.write();
    
    console.log(`Disconnected session: ${sessionId} (${disconnectedSession.ip})`);
    
    res.json({
      success: true,
      message: `Session ${sessionId} disconnected`,
      sessionId,
      ip: disconnectedSession.ip
    });
  } catch (err) {
    console.error('Error disconnecting session:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to disconnect session'
    });
  }
});


// Get active sessions (no auth required for dashboard view)
router.get('/active', async (req, res) => {
  try {
    const sessions = db.data.sessions || [];
    const activeSessions = sessions
      .filter(session => {
        // Consider session active if created within last 4 hours
        const sessionAge = Date.now() - new Date(session.created_at).getTime();
        return sessionAge < 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(session => {
        // Determine status based on session age
        const sessionAge = Date.now() - new Date(session.created_at).getTime();
        let status = 'active';
        let statusMessage = 'Active';
        
        if (sessionAge < 30000) { // Less than 30 seconds
          status = 'connecting';
          statusMessage = 'Connecting...';
        } else if (sessionAge < 300000) { // Less than 5 minutes
          status = 'logged_in';
          statusMessage = 'Logged In';
        } else {
          status = 'established';
          statusMessage = 'Established';
        }
        
        return {
          sessionId: session.session_id,
          ip: session.ip,
          name: session.name || `Direct: ${session.ip}`,
          username: session.username,
          createdAt: session.created_at,
          guacamoleUrl: session.guacamole_url,
          useGuacamole: !!session.guacamole_url, // Add this field!
          status: status,
          statusMessage: statusMessage,
          ageSeconds: Math.floor(sessionAge / 1000)
        };
      });
    
    res.json({
      success: true,
      sessions: activeSessions,
      count: activeSessions.length
    });
  } catch (err) {
    console.error('Error fetching active sessions:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch active sessions',
      sessions: [],
      count: 0
    });
  }
});

// Protected routes with auth middleware
router.get('/recent-ips', authMiddleware, async (req, res) => {
  try {
    const ips = (db.data.recentIps || [])
      .filter(r => r.user_id === req.userId)
      .sort((a, b) => new Date(b.used_at) - new Date(a.used_at))
      .map(r => r.ip);
    const unique = [...new Set(ips)].slice(0, 5);
    res.json(unique);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recent-ips', authMiddleware, async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP required' });
    db.data.recentIps = db.data.recentIps || [];
    db.data.recentIps.push({
      user_id: req.userId,
      ip,
      used_at: new Date().toISOString()
    });
    await db.write();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple connect endpoint without token authentication
router.post('/connect', async (req, res) => {
  try {
    const { ip, username, password, name, useGuacamole = true } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'Target IP required' });
    }

    // Let Windows handle RDP authentication - no pre-validation needed

    // Store session info without user_id requirement
    const sessionId = `sess-${Date.now()}`;
    const currentTime = new Date().toISOString();
    
    // Store in recentIps for backward compatibility
    db.data.recentIps = db.data.recentIps || [];
    db.data.recentIps.push({
      ip,
      used_at: currentTime
    });
    
    // Store in sessions for dashboard display
    db.data.sessions = db.data.sessions || [];
    const sessionData = {
      session_id: sessionId,
      ip,
      username: username || 'guest',
      name: name || `Direct: ${ip}`,
      created_at: currentTime,
      guacamole_url: null // Will be set after Guacamole URL is generated
    };

    const rdpLines = [
      'full address:s:' + ip,
      'username:s:' + (username || ''),
      'prompt for credentials:i:1',
      'authentication level:i:0'
    ];
    const rdpFile = rdpLines.join('\r\n');

    // Check if user wants direct RDP or Guacamole
    if (!useGuacamole) {
      // Direct RDP connection
      db.data.sessions.push(sessionData);
      await db.write();

      return res.json({
        success: true,
        sessionId,
        ip,
        name: name || `Direct: ${ip}`,
        useGuacamole: false,
        rdpFile,
        rdpUri: `rdp://${username}:${encodeURIComponent(password)}@${ip}/?ignore-cert=true`
      });
    }

    const guacamoleBase = getGuacamoleBaseUrl(req);

    if (guacamoleBase) {
      const base = guacamoleBase.replace(/\/$/, '');
      const rdpUri = username
        ? `rdp://${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@${ip}/?ignore-cert=true`
        : `rdp://${ip}/?ignore-cert=true`;

      const jsonSecretKey = process.env.GUACAMOLE_JSON_SECRET_KEY || '4c0b569e4c96df157eee1b65dd0e4d41';
      let guacamoleUrl = `${base}/`;

      try {
        const rdpParams = {
          hostname: ip,
          port: '3389',
          'ignore-cert': 'true',
          security: 'nla',
          'disable-auth': 'false',
          ...(username && { username }),
          ...(password && { password })
        };

        const payload = {
          username: 'guest',
          expires: Date.now() + 60 * 60 * 1000,
          connections: {
            [name || `RDP ${ip}`]: {
              protocol: 'rdp',
              parameters: rdpParams
            }
          }
        };
        const encryptedData = encryptGuacamoleJson(payload, jsonSecretKey);
        guacamoleUrl = `${base}/?data=${encodeURIComponent(encryptedData)}`;
      } catch (err) {
        console.warn('Guacamole JSON auth failed, falling back to manual login:', err.message);
      }

      // Update session with Guacamole URL and save to database
      sessionData.guacamole_url = guacamoleUrl;
      db.data.sessions.push(sessionData);
      await db.write();

      return res.json({
        success: true,
        sessionId,
        ip,
        name: name || `Direct: ${ip}`,
        guacamoleUrl,
        guacamoleRdpUri: rdpUri,
        useGuacamole: true,
        rdpFile
      });
    }
    
    // For non-Guacamole case, still save session
    db.data.sessions.push(sessionData);
    await db.write();
    
    res.json({
      success: true,
      sessionId,
      ip,
      name: name || `Direct: ${ip}`,
      useGuacamole: false,
      rdpFile
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New endpoint with internal admin authentication
router.post('/connect-direct', async (req, res) => {
  try {
    const { ip, username, password, name, adminUsername, adminPassword } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'Target IP required' });
    }

    // Internal authentication check (skip token requirement)
    if (adminUsername && adminPassword) {
      // Simple admin validation (in production, use proper auth)
      if (adminUsername !== 'admin' || adminPassword !== 'admin') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid admin credentials',
          message: 'Admin authentication failed'
        });
      }
    }

    // Let Windows handle RDP authentication - no pre-validation needed

    db.data.recentIps = db.data.recentIps || [];
    db.data.recentIps.push({
      user_id: req.userId,
      ip,
      used_at: new Date().toISOString()
    });
    await db.write();

    const sessionId = `sess-${Date.now()}`;
    const rdpLines = [
      'full address:s:' + ip,
      'username:s:' + (username || ''),
      'prompt for credentials:i:1',
      'authentication level:i:0'
    ];
    const rdpFile = rdpLines.join('\r\n');
    const guacamoleBase = getGuacamoleBaseUrl(req);
    const guacUser = process.env.GUACAMOLE_USER || 'guacadmin';
    const guacPass = process.env.GUACAMOLE_PASSWORD || 'guacadmin';

    if (guacamoleBase) {
      const base = guacamoleBase.replace(/\/$/, '');
      const rdpUri = username
        ? `rdp://${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@${ip}/?ignore-cert=true`
        : `rdp://${ip}/?ignore-cert=true`;

      const jsonSecretKey = process.env.GUACAMOLE_JSON_SECRET_KEY || '4c0b569e4c96df157eee1b65dd0e4d41';
      let guacamoleUrl = `${base}/`;

      try {
        const rdpParams = {
          hostname: ip,
          port: '3389',
          'ignore-cert': 'true',
          security: 'nla',
          'disable-auth': 'false',
          ...(username && { username }),
          ...(password && { password })
        };

        const payload = {
          username: req.username || 'guest',
          expires: Date.now() + 60 * 60 * 1000,
          connections: {
            [name || `RDP ${ip}`]: {
              protocol: 'rdp',
              parameters: rdpParams
            }
          }
        };
        const encryptedData = encryptGuacamoleJson(payload, jsonSecretKey);
        guacamoleUrl = `${base}/?data=${encodeURIComponent(encryptedData)}`;
      } catch (err) {
        console.warn('Guacamole JSON auth failed, falling back to manual login:', err.message);
      }

      return res.json({
        success: true,
        sessionId,
        ip,
        name: name || `Direct: ${ip}`,
        guacamoleUrl,
        guacamoleRdpUri: rdpUri,
        useGuacamole: true,
        rdpFile
      });
    }
    res.json({
      success: true,
      sessionId,
      ip,
      name: name || `Direct: ${ip}`,
      useGuacamole: false,
      rdpFile
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
