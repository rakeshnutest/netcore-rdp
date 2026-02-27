import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Monitor,
  Settings,
  Plus,
  Power,
  Trash2,
  X,
  Maximize2,
  Search,
  Zap,
  ArrowLeft,
  Menu,
  Lock,
  Play,
  Network,
  Activity,
  Key,
  Server,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from './api';

const App = () => {
  const [view, setView] = useState('app'); // Always show app, no login required

  const [servers, setServers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiSessions, setApiSessions] = useState([]);
  const [focusedSessionId, setFocusedSessionId] = useState(null);
  const [focusedSessionData, setFocusedSessionData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quickIp, setQuickIp] = useState('');
  const [quickDomain, setQuickDomain] = useState('');
  const [quickUsername, setQuickUsername] = useState('');
  const [quickPassword, setQuickPassword] = useState('');
  const [defaultRdpDomain, setDefaultRdpDomain] = useState('');
  const [defaultRdpUsername, setDefaultRdpUsername] = useState('');
  const [defaultRdpPassword, setDefaultRdpPassword] = useState('');
  const [recentIps, setRecentIps] = useState([]);
  const [newServer, setNewServer] = useState({
    name: '',
    ip: '',
    os: 'Windows Server 2022'
  });
  const [connectError, setConnectError] = useState('');
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [showDefaultRdpPassword, setShowDefaultRdpPassword] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState(null);
  const [needsIframeFocus, setNeedsIframeFocus] = useState(false);
  const [connectionFailedSessionIds, setConnectionFailedSessionIds] = useState(new Set());
  const guacamoleIframeRef = useRef(null);

  const markConnectionFailed = (sessionId) => {
    setConnectionFailedSessionIds(prev => new Set([...prev, sessionId]));
  };

  const clearConnectionFailed = (sessionId) => {
    setConnectionFailedSessionIds(prev => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
  };

  useEffect(() => {
    if (focusedSessionId) {
      const hasGuacamole = apiSessions.some(
        s => s.sessionId === focusedSessionId && s.useGuacamole && s.guacamoleUrl
      );
      setNeedsIframeFocus(hasGuacamole);
    }
  }, [focusedSessionId, apiSessions]);


  const handleIframeFocusClick = () => {
    guacamoleIframeRef.current?.focus();
    setNeedsIframeFocus(false);
  };

  const loadApiSessions = async () => {
    try {
      const data = await api.getActiveSessions();
      setApiSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load API sessions:', err);
      setApiSessions([]);
    }
  };

  const loadData = async () => {
    try {
      // Skip servers and recent IPs (they require auth) - just load sessions
      await loadApiSessions();
    } catch (err) {
      console.error('Failed to load data:', err);
      // Don't redirect to login - just continue with empty data
    }
  };

  useEffect(() => {
    // Skip login requirement - direct access
    if (view === 'app') {
      loadData();
    }
  }, [view]);

  // Auto-refresh API sessions every 30 seconds
  useEffect(() => {
    if (view === 'app') {
      const interval = setInterval(loadApiSessions, 30000);
      return () => clearInterval(interval);
    }
  }, [view]);


  const handleAddServer = async (e) => {
    e.preventDefault();
    try {
      const server = await api.addServer(newServer.name, newServer.ip, newServer.os);
      setServers(prev => [...prev, server]);
      setIsAddModalOpen(false);
      setNewServer({ name: '', ip: '', os: 'Windows Server 2022' });
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const startSession = async (server) => {
    setConnectError('');
    try {
      const session = await api.connect(
        server.ip,
        defaultRdpUsername || quickUsername,
        defaultRdpPassword || quickPassword,
        server.name,
        defaultRdpDomain || quickDomain
      );
      // Reload API sessions to show the new session
      await loadApiSessions();

      // Focus on the new session if it doesn't exist
      const exists = apiSessions.find(s => s.ip === server.ip);
      if (!exists) {
        setFocusedSessionId(session.sessionId);
        setFocusedSessionData({ ...server, ...session });
      } else {
        setFocusedSessionId(exists.sessionId);
        setFocusedSessionData(exists);
      }
      setIsSidebarOpen(false);
    } catch (err) {
      setConnectError(err.message || 'Connection failed');
    }
  };

  const disconnectSession = async (sessionId) => {
    try {
      await api.disconnectSession(sessionId);
      await loadApiSessions(); // Reload the sessions list
      setDisconnectMessage({ ip: 'Session disconnected' });

      // Clear focused session if it was the disconnected one
      if (focusedSessionId === sessionId) {
        setFocusedSessionId(null);
        setFocusedSessionData(null);
      }

      setConnectionFailedSessionIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });

      setTimeout(() => setDisconnectMessage(null), 3000);
    } catch (err) {
      setConnectError(err.message || 'Failed to disconnect session');
    }
  };

  const disconnectApiSession = async (sessionId) => {
    try {
      await api.disconnectSession(sessionId);
      await loadApiSessions(); // Refresh the list
      setDisconnectMessage({ ip: 'API session' });
      setTimeout(() => setDisconnectMessage(null), 3000);
    } catch (err) {
      setConnectError(err.message || 'Failed to disconnect session');
    }
  };

  const disconnectAllApiSessions = async () => {
    try {
      const result = await api.disconnectAllSessions();
      await loadApiSessions(); // Refresh the list
      setDisconnectMessage({ ip: `All ${result.disconnected} API sessions` });
      setTimeout(() => setDisconnectMessage(null), 5000);
    } catch (err) {
      setConnectError(err.message || 'Failed to disconnect all sessions');
    }
  };

  const handleQuickConnect = async (e) => {
    e.preventDefault();
    if (!quickIp) return;
    setConnectError('');
    try {
      const session = await api.connect(
        quickIp,
        quickUsername,
        quickPassword,
        `Direct: ${quickIp}`,
        quickDomain
      );
      // Reload API sessions to show the new session
      await loadApiSessions();

      // Focus on the new session
      setFocusedSessionId(session.sessionId);
      setFocusedSessionData({ ...session, ip: quickIp, name: `Direct: ${quickIp}` });
      if (!recentIps.includes(quickIp)) {
        setRecentIps(prev =>
          [quickIp, ...prev.filter(ip => ip !== quickIp)].slice(0, 5)
        );
      }
      setQuickIp('');
      setQuickUsername('');
      setQuickPassword('');
    } catch (err) {
      setConnectError(err.message || 'Connection failed');
    }
  };

  const removeServer = async (id) => {
    try {
      await api.removeServer(id);
      setServers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    // Just clear sessions, no login redirect
    setFocusedSessionId(null);
    setFocusedSessionData(null);
    // Optionally reload to reset state
    window.location.reload();
  };

  const copyToken = () => {
    navigator.clipboard.writeText(localStorage.getItem('token') || '');
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const ApiEndpoint = ({ method, path, auth = true, body, desc }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            method === 'GET'
              ? 'bg-emerald-500/20 text-emerald-400'
              : method === 'POST'
                ? 'bg-blue-500/20 text-blue-400'
                : method === 'DELETE'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-slate-600 text-slate-400'
          }`}
        >
          {method}
        </span>
        <code className="text-sm font-mono text-white">{path}</code>
        {auth && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
            Auth required
          </span>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-2">{desc}</p>
      {body && (
        <pre className="bg-slate-950 rounded-lg p-3 text-xs text-slate-500 overflow-x-auto mt-2">
          {JSON.stringify(body, null, 2)}
        </pre>
      )}
    </div>
  );

  const SidebarItem = ({ id, icon: Icon, label, badge }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setFocusedSessionId(null);
        setFocusedSessionData(null);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
        activeTab === id && !focusedSessionId
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center space-x-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {badge > 0 && (
        <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  const ServerCard = ({ server }) => {
    const isActive = apiSessions.some(s => s.ip === server.ip);
    return (
      <div
        className={`bg-slate-900 border rounded-xl p-5 hover:border-blue-500/50 transition-all group ${
          isActive ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-800'
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <div
            className={`p-2 rounded-lg ${
              isActive ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-500'
            }`}
          >
            <Monitor size={24} />
          </div>
          <div className="flex space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => removeServer(server.id)}
              className="p-1 text-slate-500 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{server.name}</h3>
        <p className="text-blue-400 text-sm font-mono mb-6">{server.ip}</p>
        <div className="flex items-center justify-between mb-6">
          {isActive && (
            <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
              CONNECTED
            </span>
          )}
        </div>
        <button
          onClick={() => startSession(server)}
          className={`w-full py-2 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all ${
            isActive
              ? 'bg-slate-800 text-blue-400 hover:bg-slate-700'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          <Power size={16} />
          <span>{isActive ? 'Resume Session' : 'Connect to IP'}</span>
        </button>
      </div>
    );
  };


  const focusedSession = apiSessions.find(s => s.sessionId === focusedSessionId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex overflow-hidden font-sans relative">
      {disconnectMessage && (
        <div className="fixed top-0 left-0 right-0 z-[70] bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="font-bold flex items-center gap-2">
            <Power size={18} />
            Disconnected from {disconnectMessage.ip}
          </span>
          <button
            onClick={() => setDisconnectMessage(null)}
            className="p-1 hover:bg-red-700 rounded"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      )}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4 z-50 transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center space-x-2">
            <Monitor className="text-blue-500" size={24} />
            <span className="text-xl font-bold text-white tracking-tight">NetCore</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Navigation
          </p>
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem id="connections" icon={Monitor} label="Saved IPs" badge={servers.length} />
          <SidebarItem id="direct" icon={Zap} label="Direct Access" />

          <div className="pt-6 pb-2">
            <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Running Sessions
            </p>
            {apiSessions.length === 0 ? (
              <p className="px-4 text-xs text-slate-600 italic">No active connections</p>
            ) : (
              <div className="space-y-1 px-1">
                {apiSessions.map(session => (
                  <div key={session.sessionId} className="group relative">
                    <button
                      onClick={() => {
                        setFocusedSessionId(session.sessionId);
                        setFocusedSessionData(session);
                        setActiveTab(null);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                        connectionFailedSessionIds.has(session.sessionId)
                          ? 'bg-red-600/80 text-white hover:bg-red-600'
                          : focusedSessionId === session.sessionId
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate pr-2 font-mono text-xs">{session.ip}</span>
                      <div className="flex items-center">
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            connectionFailedSessionIds.has(session.sessionId)
                              ? 'bg-red-300'
                              : focusedSessionId === session.sessionId
                                ? 'bg-white'
                                : 'bg-emerald-500 animate-pulse'
                          }`}
                        />
                        <X
                          size={14}
                          className={`opacity-0 group-hover:opacity-100 ${
                            focusedSessionId === session.sessionId ? 'text-blue-200' : 'hover:text-red-500'
                          }`}
                          onClick={e => {
                            e.stopPropagation();
                            disconnectSession(session.sessionId);
                          }}
                        />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6">
            <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Gateway
            </p>
            <SidebarItem id="api" icon={Key} label="API Documentation" />
          </div>
        </nav>

        <div className="mt-auto mb-4 px-4">
          <div className="text-center py-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Designed by</p>
            <p className="text-xs text-slate-500 font-medium">rakeshkumar.r@nutanix.com</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mb-4 w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-400 transition-colors"
        >
          <Power size={20} />
          <span className="font-medium text-sm">Reset Portal</span>
        </button>
      </aside>

      <main className="flex-1 relative overflow-y-auto w-full bg-slate-950/50">
        <div className="lg:hidden h-16 border-b border-slate-800 bg-slate-950 flex items-center px-4 sticky top-0 z-30 justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <Monitor className="text-blue-500" size={20} />
            <span className="font-bold text-sm">NETCORE</span>
          </div>
          <div className="w-10" />
        </div>

        {apiSessions.length > 0 && (
          <div
            className="absolute inset-0 z-[60] bg-black flex flex-col"
            style={{ display: focusedSessionId ? 'flex' : 'none' }}
          >
            {focusedSession && (
              <>
                <div className="bg-slate-900 h-14 flex items-center justify-between px-4 border-b border-slate-800">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        setFocusedSessionId(null);
                        setFocusedSessionData(null);
                      }}
                      className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-lg"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">
                        Live Connection
                      </span>
                      <span className="text-sm font-mono text-blue-400 leading-none">
                        {focusedSession.ip}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-blue-500/10 rounded-full text-blue-400 text-[10px] font-bold">
                      <Network size={12} />
                      <span>256-BIT ENCRYPTION</span>
                    </div>
                <button
                  onClick={() => markConnectionFailed(focusedSession.sessionId)}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  Report failed
                </button>
                <button
                  onClick={() => disconnectSession(focusedSession.sessionId)}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase"
                >
                  Disconnect
                </button>
                  </div>
                </div>
                {focusedSession.useGuacamole && focusedSession.guacamoleUrl && focusedSession.guacamoleRdpUri && (
                  <div className="shrink-0 bg-slate-900/95 border-b border-slate-700 px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-xs text-slate-400">
                      Paste this in Guacamole Quick Connect bar:
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <code className="text-xs font-mono text-blue-400 truncate flex-1">
                        {focusedSession.guacamoleRdpUri}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            focusedSession.guacamoleRdpUri
                          );
                        }}
                        className="text-xs font-bold text-blue-500 hover:text-blue-400 shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Login: guacadmin / guacadmin
                    </span>
                  </div>
                )}
                {focusedSession && !focusedSession.useGuacamole && (
                  <div className="flex-1 bg-slate-950 flex flex-col relative overflow-hidden">
                    <div className="text-center p-8">
                      <Monitor size={80} className="mx-auto text-blue-500/20 mb-8" />
                      <h2 className="text-3xl font-bold text-white mb-2">
                        Connection: {focusedSession.ip}
                      </h2>
                      <p className="text-slate-500 font-mono text-sm mb-6">
                        Use your native RDP client to connect
                      </p>
                      <p className="text-slate-600 text-xs font-mono mb-4 break-all max-w-md">
                        {focusedSession.rdpFile}
                      </p>
                      <button
                        onClick={() => {
                          const blob = new Blob([focusedSession.rdpFile || ''], {
                            type: 'application/rdp'
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${focusedSession.ip.replace(/\./g, '-')}.rdp`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold text-sm"
                      >
                        Download .rdp File
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {apiSessions.some(s => s.useGuacamole && s.guacamoleUrl) && (
              <div
                className="flex-1 flex flex-col overflow-hidden min-h-0 relative"
                style={{
                  display:
                    !focusedSession || focusedSession?.useGuacamole ? 'flex' : 'none'
                }}
              >
                {apiSessions
                  .filter(s => s.useGuacamole && s.guacamoleUrl)
                  .map(session => (
                    <iframe
                      key={session.sessionId}
                      ref={
                        focusedSessionId === session.sessionId
                          ? guacamoleIframeRef
                          : null
                      }
                      src={session.guacamoleUrl}
                      className={`flex-1 w-full min-h-0 border-0 ${
                        focusedSessionId === session.sessionId ? '' : 'hidden'
                      }`}
                      title={`RDP ${session.ip}`}
                      tabIndex={0}
                    />
                  ))}
                {focusedSession?.useGuacamole && !connectionFailedSessionIds.has(focusedSessionId) && (
                  <button
                    type="button"
                    onClick={() => markConnectionFailed(focusedSession.sessionId)}
                    className="absolute bottom-4 right-4 z-[25] bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg border-2 border-red-400"
                  >
                    Connection failed?
                  </button>
                )}
                {connectionFailedSessionIds.has(focusedSessionId) && (
                  <div
                    className="absolute inset-0 z-[30] flex flex-col items-center justify-center p-8"
                    style={{ backgroundColor: '#b91c1c' }}
                  >
                    <p className="text-white text-lg font-bold mb-2">
                      Connection failed
                    </p>
                    <p className="text-white/90 text-sm mb-6">
                      Log in failed. Please check credentials and try again.
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => clearConnectionFailed(focusedSessionId)}
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium text-sm"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => disconnectSession(focusedSessionId)}
                        className="bg-white text-red-600 hover:bg-white/90 px-4 py-2 rounded-lg font-bold text-sm"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
                {needsIframeFocus && !connectionFailedSessionIds.has(focusedSessionId) && (
                  <button
                    type="button"
                    onClick={handleIframeFocusClick}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer"
                    aria-label="Click to focus and use keyboard"
                  >
                    <span className="text-white/90 text-sm font-medium px-4 py-2 bg-slate-800/90 rounded-lg">
                      Click to focus and use keyboard
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!focusedSessionId && (
          <div className="p-8 max-w-7xl mx-auto">
            {connectError && (
              <div className="mb-6 bg-red-600 border border-red-500 rounded-xl py-3 px-4 text-white font-medium text-sm">
                {connectError}
              </div>
            )}
            {activeTab === 'dashboard' && (
              <div>
                <div className="mb-12">
                  <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
                    System Console
                  </h1>
                  <p className="text-slate-500">Connected to Enterprise Gateway v4.2</p>
                </div>



                {/* Sessions */}
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                      <Network className="text-green-500" size={20} />
                      <span>Sessions</span>
                    </h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 uppercase">
                        {apiSessions.length} Active
                      </span>
                      {apiSessions.length > 0 && (
                        <button
                          onClick={disconnectAllApiSessions}
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                        >
                          <Power size={12} />
                          <span>Disconnect All</span>
                        </button>
                      )}
                      <button
                        onClick={loadApiSessions}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  </div>

                  {apiSessions.length === 0 ? (
                    <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center">
                      <Network className="mx-auto text-slate-700 mb-4" size={40} />
                      <h4 className="text-slate-400 font-bold mb-2">No Active Sessions</h4>
                      <p className="text-slate-600 text-sm mb-6">
                        Sessions created via API calls will appear here.
                      </p>
                      <button
                        onClick={() => setActiveTab('direct')}
                        className="text-blue-500 text-xs font-bold uppercase hover:underline"
                      >
                        Go to Direct Connect
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {apiSessions.map(session => (
                        <div
                          key={session.sessionId}
                          className="bg-slate-900 border border-green-500/30 rounded-2xl p-5 hover:border-green-500 transition-all"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
                                <Network size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter leading-none mb-1">
                                  API Session
                                </p>
                                <p className="text-sm font-mono text-white leading-none">
                                  {session.ip}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => disconnectApiSession(session.sessionId)}
                              className="p-1.5 text-slate-500 hover:text-red-500 bg-slate-800 rounded-lg transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="text-xs text-slate-400 mb-3">
                            <div>User: {session.username}</div>
                            <div>Name: {session.name}</div>
                            <div>Created: {new Date(session.createdAt).toISOString().replace('T', ' ').replace('Z', ' UTC')}</div>
                          </div>
                          {session.guacamoleUrl && (
                            <a
                              href={session.guacamoleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full bg-green-600 hover:bg-green-500 text-white text-center py-2 rounded-lg text-xs font-bold transition-all"
                            >
                              🚀 Open Connection
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center space-x-3 mb-4 text-slate-500">
                      <Monitor size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Browser-Based Access
                      </span>
                    </div>
                    <p className="text-lg font-bold text-white mb-2">Web-Based Interface</p>
                    <p className="text-xs text-slate-500">Connect to Windows machines directly through your web browser with minimal client setup</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center space-x-3 mb-4 text-slate-500">
                      <Network size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Secure Gateway
                      </span>
                    </div>
                    <p className="text-lg font-bold text-blue-500 mb-2">Encrypted Connections</p>
                    <p className="text-xs text-slate-500">All RDP traffic is encrypted and routed through Apache Guacamole for enhanced security</p>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <div className="flex items-center space-x-3 mb-4 text-slate-500">
                      <Zap size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Easy Management
                      </span>
                    </div>
                    <p className="text-lg font-bold text-green-500 mb-2">Centralized Control</p>
                    <p className="text-xs text-slate-500">Manage multiple RDP sessions, save favorite hosts, and control connections from one interface</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'connections' && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">Saved IP Host List</h2>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-blue-500 transition-all"
                  >
                    <Plus size={16} />
                    <span>Register New IP</span>
                  </button>
                </div>
                <div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Default credentials (used when connecting to saved IPs)
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <input
                      type="text"
                      placeholder="Domain (optional)"
                      className="flex-1 min-w-[100px] bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                      value={defaultRdpDomain}
                      onChange={e => setDefaultRdpDomain(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Username (e.g. administrator)"
                      className="flex-1 min-w-[140px] bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                      value={defaultRdpUsername}
                      onChange={e => setDefaultRdpUsername(e.target.value)}
                    />
                    <div className="flex-1 min-w-[140px] relative">
                      <input
                        type={showDefaultRdpPassword ? 'text' : 'password'}
                        placeholder="Password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 pr-10 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                        value={defaultRdpPassword}
                        onChange={e => setDefaultRdpPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDefaultRdpPassword(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        aria-label={showDefaultRdpPassword ? 'Hide' : 'Show'}
                      >
                        {showDefaultRdpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {servers.map(server => (
                    <ServerCard key={server.id} server={server} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'direct' && (
              <div className="max-w-2xl mx-auto py-12">
                <div className="text-center mb-12">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 mx-auto mb-6">
                    <Zap size={32} />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    Instant IP Login
                  </h1>
                  <p className="text-slate-400">
                    Specify an IPv4 address to establish an encrypted RDP tunnel.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                  <form onSubmit={handleQuickConnect} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Destination IP Address
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. 192.168.1.100"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-8 text-blue-400 font-mono text-2xl focus:border-blue-500 outline-none transition-all"
                        value={quickIp}
                        onChange={e => setQuickIp(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="Domain (optional, e.g. WORKGROUP)"
                        className="bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:border-blue-500"
                        value={quickDomain}
                        onChange={e => setQuickDomain(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Username (e.g. administrator)"
                        className="bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:border-blue-500"
                        value={quickUsername}
                        onChange={e => setQuickUsername(e.target.value)}
                      />
                      <div className="relative sm:col-span-1">
                        <input
                          type={showQuickPassword ? 'text' : 'password'}
                          placeholder="Password"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 pr-12 text-white outline-none focus:border-blue-500"
                          value={quickPassword}
                          onChange={e => setQuickPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowQuickPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          aria-label={showQuickPassword ? 'Hide password' : 'Show password'}
                        >
                          {showQuickPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl text-lg flex items-center justify-center space-x-3"
                    >
                      <Power size={22} />
                      <span>Establish Connection</span>
                    </button>
                  </form>
                </div>

                {recentIps.length > 0 && (
                  <div className="mt-12 bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center space-x-2">
                      <Search size={12} className="text-blue-500" />
                      <span>Recent IPs</span>
                    </h4>
                    <div className="space-y-3">
                      {recentIps.map((ip, idx) => (
                        <div
                          key={`${ip}-${idx}`}
                          className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl"
                        >
                          <div className="flex items-center space-x-4">
                            <Monitor size={16} className="text-blue-500" />
                            <span className="font-mono text-white text-sm">{ip}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickIp(ip);
                              setActiveTab('direct');
                            }}
                            className="text-xs font-bold text-blue-500 hover:text-blue-400"
                          >
                            Use
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {apiSessions.length > 0 && (
                  <div className="mt-12 bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center space-x-2">
                      <Play size={12} className="text-emerald-500" />
                      <span>Currently Active Connection List</span>
                    </h4>
                    <div className="space-y-3">
                      {apiSessions.map((session, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl"
                        >
                          <div className="flex items-center space-x-4">
                            <Monitor size={16} className="text-blue-500" />
                            <span className="font-mono text-white text-sm">{session.ip}</span>
                          </div>
                          <button
                            onClick={() => {
                              setFocusedSessionId(session.sessionId);
                              setFocusedSessionData(session);
                            }}
                            className="text-xs font-bold text-blue-500 hover:text-blue-400"
                          >
                            View Session
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'api' && (
              <div className="max-w-4xl">
                <div className="mb-10">
                  <h1 className="text-3xl font-bold text-white mb-2">API Documentation</h1>
                  <p className="text-slate-500">
                    REST API for NetCore. No authentication required.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Base URL
                    </h3>
                    <code className="text-blue-400 font-mono text-sm break-all">
                      http://[SERVER_IP]:7015/api
                    </code>
                    <p className="text-slate-400 text-xs mt-2">
                      Replace <code className="text-blue-400">[SERVER_IP]</code> with your server's IP address
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                      No Authentication Required
                    </h3>
                    <p className="text-slate-400 text-sm">
                      All API endpoints are accessible without authentication tokens.
                    </p>
                  </div>

                  <ApiEndpoint
                    method="GET"
                    path="/sessions/active"
                    auth={false}
                    desc="List all active RDP sessions with connection status."
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/sessions/connect"
                    auth={false}
                    body={{ ip: '<ip>', username: '<username>', password: '<password>', name: '<name> (optional)' }}
                    desc="Create new RDP session. Returns guacamoleUrl for iframe display."
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/sessions/connect"
                    auth
                    body={{ ip: 'string', username: 'string (optional)', password: 'string (optional)', name: 'string (optional)' }}
                    desc="Create an RDP session. Returns guacamoleUrl and rdpFile when configured."
                  />
                  <ApiEndpoint
                    method="GET"
                    path="/health"
                    auth={false}
                    desc="Health check."
                  />
                  <ApiEndpoint
                    method="POST"
                    path="/sessions/disconnect-all"
                    auth={false}
                    body={{}}
                    desc="Disconnect all active sessions. Returns count of disconnected sessions."
                  />

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Example Usage
                    </h3>
                    <p className="text-slate-400 text-xs mb-4">
                      Replace <code className="text-blue-400">[SERVER_IP]</code> with your server's IP address and <code className="text-blue-400">&lt;placeholders&gt;</code> with actual values.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-white font-semibold mb-2">Create Session (Success):</h4>
                        <pre className="bg-slate-950 rounded-lg p-4 text-xs text-blue-400 overflow-x-auto">
{`curl -X POST http://[SERVER_IP]:7015/api/sessions/connect \\
  -H "Content-Type: application/json" \\
  -H "Host: [SERVER_IP]:7015" \\
  -d '{"ip":"<ip>","username":"<username>","password":"<password>"}'`}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-2">List Sessions:</h4>
                        <pre className="bg-slate-950 rounded-lg p-4 text-xs text-blue-400 overflow-x-auto">
{`curl -s http://[SERVER_IP]:7015/api/sessions/active`}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-2">Disconnect All:</h4>
                        <pre className="bg-slate-950 rounded-lg p-4 text-xs text-blue-400 overflow-x-auto">
{`curl -X POST http://[SERVER_IP]:7015/api/sessions/disconnect-all \\
  -H "Content-Type: application/json" \\
  -H "Host: [SERVER_IP]:7015" -d '{}'`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Register Host Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Register Host IP</h2>
            <form onSubmit={handleAddServer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Friendly Label
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                  placeholder="e.g. DC-Primary"
                  value={newServer.name}
                  onChange={e => setNewServer({ ...newServer, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Network IP Address
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono outline-none focus:border-blue-500"
                  placeholder="10.0.x.x"
                  value={newServer.ip}
                  onChange={e => setNewServer({ ...newServer, ip: e.target.value })}
                />
              </div>
              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-slate-800 font-bold py-3 rounded-xl hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 font-bold py-3 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
                >
                  Save Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Management Modal */}
      {apiSessions.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Network className="text-green-500" size={16} />
                <span>Sessions ({apiSessions.length})</span>
              </h3>
              <button
                onClick={loadApiSessions}
                className="text-slate-400 hover:text-white transition-colors"
              >
                🔄
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {apiSessions.slice(0, 3).map(session => (
                <div key={session.sessionId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-mono truncate">{session.ip}</span>
                  <button
                    onClick={() => disconnectApiSession(session.sessionId)}
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {apiSessions.length > 3 && (
                <div className="text-xs text-slate-500 text-center">
                  +{apiSessions.length - 3} more sessions
                </div>
              )}
            </div>

            <button
              onClick={disconnectAllApiSessions}
              className="w-full bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1"
            >
              <Power size={12} />
              <span>Disconnect All Sessions</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
