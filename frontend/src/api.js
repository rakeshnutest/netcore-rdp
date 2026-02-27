// Use runtime-detected API URL (set by runtime-config.js) or fallback to build-time env
const API_BASE = window.RUNTIME_API_URL || import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export const api = {
  async login(username, password, targetIp = '') {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password, targetIp })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getServers() {
    const res = await fetch(`${API_BASE}/api/servers`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch servers');
    return data;
  },

  async addServer(name, ip, os = 'Windows Server 2022') {
    const res = await fetch(`${API_BASE}/api/servers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, ip, os })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add server');
    return data;
  },

  async removeServer(id) {
    const res = await fetch(`${API_BASE}/api/servers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to remove server');
    return data;
  },

  async getRecentIps() {
    const res = await fetch(`${API_BASE}/api/sessions/recent-ips`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) return [];
    return data;
  },

  async connect(ip, username = '', password = '', name = '', domain = '') {
    const res = await fetch(`${API_BASE}/api/sessions/connect`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ip, username, password, name, domain })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Connection failed');
    return data;
  },

  async getActiveSessions() {
    const res = await fetch(`${API_BASE}/api/sessions/active`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch active sessions');
    return data;
  },

  async disconnectAllSessions() {
    const res = await fetch(`${API_BASE}/api/sessions/disconnect-all`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to disconnect all sessions');
    return data;
  },

  async disconnectSession(sessionId) {
    const res = await fetch(`${API_BASE}/api/sessions/disconnect/${sessionId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to disconnect session');
    return data;
  }
};
