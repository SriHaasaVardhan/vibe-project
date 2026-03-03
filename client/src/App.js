import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Play, BookmarkPlus, Settings, Sun, Moon, Palette, Plus, LogOut } from 'lucide-react';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';
import './App.css';

const THEMES = [
  { id: 'dark', label: 'Midnight', icon: Moon },
  { id: 'light', label: 'Daylight', icon: Sun },
  { id: 'sunset', label: 'Sunset', icon: Palette },
  { id: 'ocean', label: 'Deep Ocean', icon: Palette },
];

// ─── Debate Page (protected) ───
function DebatePage({ user, onLogout }) {
  const [topic, setTopic] = useState('');
  const [debate, setDebate] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleA, setRoleA] = useState('');
  const [roleB, setRoleB] = useState('');
  const [savedChats, setSavedChats] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [bgState, setBgState] = useState('idle');
  const [theme, setTheme] = useState(() => localStorage.getItem('debate-theme') || 'dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ai-debate-chats');
    if (stored) try { setSavedChats(JSON.parse(stored)); } catch { }
  }, []);

  useEffect(() => { localStorage.setItem('debate-theme', theme); }, [theme]);

  const persistChats = (chats) => {
    setSavedChats(chats);
    localStorage.setItem('ai-debate-chats', JSON.stringify(chats));
  };

  const saveCurrentDebate = () => {
    if (!topic || !debate) return;
    persistChats([{ id: Date.now(), topic, debate, roleA, roleB, createdAt: new Date().toISOString() }, ...savedChats]);
    setIsSidebarOpen(true);
  };

  const newChat = () => { setTopic(''); setDebate(''); setRoleA(''); setRoleB(''); setBgState('idle'); };

  const loadChat = (chat) => {
    setTopic(chat.topic);
    setDebate((chat.debate || '').replace(/\*\*/g, ''));
    setRoleA(chat.roleA || '');
    setRoleB(chat.roleB || '');
    setIsSidebarOpen(false);
    setBgState('done');
  };

  const conductDebate = async () => {
    if (!topic) return alert("Please enter a topic first!");
    setBgState('loading');
    setLoading(true);
    setDebate('');
    try {
      const response = await axios.post(`${API_URL}/debate`, {
        topic, rounds: 4,
        roles: { debaterA: roleA, debaterB: roleB },
      });
      setDebate((response.data.result || '').replace(/\*\*/g, ''));
      setBgState('done');
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Unknown error.";
      setDebate(`Backend error:\n${msg}\n\nCheck the terminal running server.js for details.`);
      setBgState('idle');
    }
    setLoading(false);
  };

  // Parse debate text into chat messages
  const chatMessages = useMemo(() => {
    if (!debate) return [];
    const actualRoleA = roleA || 'Debater A';
    const lines = debate.split('\n').filter(l => l.trim());
    const messages = [];
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) {
        const sender = line.substring(0, colonIdx).trim();
        const text = line.substring(colonIdx + 1).trim();
        const isA = sender.toLowerCase().includes(actualRoleA.toLowerCase()) ||
          sender.toLowerCase().includes('debater a') ||
          sender.toLowerCase().includes('proponent');
        messages.push({ sender, text, side: isA ? 'a' : 'b' });
      } else if (messages.length > 0) {
        messages[messages.length - 1].text += ' ' + line.trim();
      } else {
        messages.push({ sender: '', text: line, side: 'a' });
      }
    }
    return messages;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate, roleA]);

  const bouncy = { type: "spring", damping: 12, stiffness: 150, mass: 0.6 };
  const extraBouncy = { type: "spring", damping: 8, stiffness: 200, mass: 0.4 };
  const dots = Array.from({ length: 25 });
  const displayRoleA = roleA || 'Debater A';
  const displayRoleB = roleB || 'Debater B';

  return (
    <div className={`App state-${bgState} theme-${theme}`}>
      <div className="blob-container">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
        <div className="blob blob-4" /><div className="blob blob-5" /><div className="blob blob-6" />
        <div className="blob blob-7" />
        <div className="ring ring-1" /><div className="ring ring-2" /><div className="ring ring-3" />
        <div className="ring ring-4" />
        <div className="dot-grid dot-grid-1">{dots.map((_, i) => <span key={i} />)}</div>
        <div className="dot-grid dot-grid-2">{dots.map((_, i) => <span key={i} />)}</div>
      </div>

      {/* Top-left: Menu + New Chat */}
      <div className="top-nav">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }} transition={extraBouncy}
          onClick={() => setIsSidebarOpen(true)} className="menu-btn"><Menu size={22} /></motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }} transition={extraBouncy}
          onClick={newChat} className="menu-btn" title="New Chat"><Plus size={22} /></motion.button>
      </div>

      {/* Top-right: Settings + Logout */}
      <div className="top-nav-right">
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }} transition={extraBouncy}
          onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="menu-btn"><Settings size={22} /></motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }} transition={extraBouncy}
          onClick={onLogout} className="menu-btn" title="Log out"><LogOut size={22} /></motion.button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={bouncy} className="settings-panel">
            <h4>Theme</h4>
            <div className="theme-options">
              {THEMES.map((t) => {
                const Icon = t.icon;
                return (
                  <motion.button key={t.id} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} transition={extraBouncy}
                    onClick={() => { setTheme(t.id); setIsSettingsOpen(false); }}
                    className={`theme-option ${theme === t.id ? 'active' : ''}`}>
                    <Icon size={16} />{t.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Debates Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside initial={{ x: '-100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }} transition={bouncy} className="saved-sidebar">
            <motion.button whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.85 }} transition={extraBouncy}
              onClick={() => setIsSidebarOpen(false)} className="close-btn"><X size={18} /></motion.button>
            <h3>Saved Debates</h3>
            {savedChats.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 14 }}>No debates saved yet.</p>
            ) : (
              <ul className="saved-list">
                {savedChats.map((chat, i) => (
                  <motion.li key={chat.id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ ...bouncy, delay: i * 0.06 }} whileHover={{ x: 6, scale: 1.02 }}
                    onClick={() => loadChat(chat)} className="saved-item">
                    <div className="saved-item-title">{chat.topic || 'Untitled'}</div>
                    <div className="saved-item-meta">{new Date(chat.createdAt).toLocaleString()}</div>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="main-container">
        {/* Left: Configuration */}
        <motion.div className="config-column" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ ...bouncy, delay: 0.05 }}>
          <motion.div className="glass-panel" style={{ flex: 1 }} whileHover={{ scale: 1.005 }} transition={bouncy}>
            <header className="glass-shell-header">
              <motion.div className="pill" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ ...extraBouncy, delay: 0.2 }}>
                <span>🎙️ AI Debate Chamber</span>
              </motion.div>
              <h1>Multi‑perspective AI debates.</h1>
              <p>Welcome, <strong>{user?.name || 'User'}</strong>! Define roles, pick a topic, and watch two AIs clash.</p>
            </header>

            <div style={{ marginBottom: '20px' }}>
              <label className="field-label">Debate Topic</label>
              <motion.input whileFocus={{ scale: 1.01 }} transition={bouncy} type="text"
                placeholder="e.g. Is coffee good for you?" value={topic} onChange={(e) => setTopic(e.target.value)} className="input-glass" />
            </div>

            <div className="roles-row" style={{ marginBottom: '28px' }}>
              <div className="role-column">
                <label className="field-label">Debater A</label>
                <motion.input whileFocus={{ scale: 1.01 }} transition={bouncy} type="text"
                  placeholder="e.g. Health Nut" value={roleA} onChange={(e) => setRoleA(e.target.value)} className="input-glass" />
              </div>
              <div className="role-column">
                <label className="field-label">Debater B</label>
                <motion.input whileFocus={{ scale: 1.01 }} transition={bouncy} type="text"
                  placeholder="e.g. Tired Student" value={roleB} onChange={(e) => setRoleB(e.target.value)} className="input-glass" />
              </div>
            </div>

            <div className="action-row">
              <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }} transition={extraBouncy}
                onClick={conductDebate} disabled={loading} className="btn-primary">
                <Play size={16} fill="#fff" />{loading ? 'Debating...' : 'Start Debate'}
              </motion.button>
              <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }} transition={extraBouncy}
                onClick={saveCurrentDebate} disabled={!topic || !debate} className="btn-secondary">
                <BookmarkPlus size={16} />Save
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Transcript as Chat Bubbles */}
        <motion.div className="transcript-column" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
          transition={{ ...bouncy, delay: 0.15 }}>
          <motion.div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            initial={{ opacity: 0, x: 30, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={bouncy}>
            <div className="debate-panel-header">
              <div className="debater-label label-a">{displayRoleA}</div>
              <div className="debate-panel-title">
                <h2>Debate Transcript</h2>
                <span className={`status-badge ${loading ? 'running' : bgState === 'done' ? 'done' : ''}`}>
                  {loading ? 'Processing…' : bgState === 'done' ? 'Complete' : 'Ready'}
                </span>
              </div>
              <div className="debater-label label-b">{displayRoleB}</div>
            </div>

            <div className="transcript-content">
              {loading && (
                <div className="transcript-placeholder">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                    ⏳ The AI debaters are preparing...
                  </motion.div>
                </div>
              )}
              {!loading && chatMessages.length === 0 && !debate && (
                <div className="transcript-placeholder">Enter a topic and roles, then hit Start Debate.</div>
              )}
              {!loading && debate && chatMessages.length === 0 && (
                <div className="transcript-placeholder">{debate}</div>
              )}
              {chatMessages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...bouncy, delay: i * 0.08 }}
                  className={`chat-bubble debater-${msg.side}`}>
                  {msg.sender && <div className="chat-sender">{msg.sender}</div>}
                  {msg.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Root App with Routing ───
function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('debate-user');
    if (stored) try { return JSON.parse(stored); } catch { }
    return null;
  });

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => { setUser(null); localStorage.removeItem('debate-user'); };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup onLogin={handleLogin} />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword onLogin={handleLogin} />} />
      <Route path="/" element={user ? <DebatePage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
    </Routes>
  );
}

export default App;