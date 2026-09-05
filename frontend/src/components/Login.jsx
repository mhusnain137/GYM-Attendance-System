import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl, setApiBaseUrl } from '../utils/apiConfig';

function Login() {
  const { login, loginAsMember } = useAuth();
  const [activeTab, setActiveTab] = useState('STAFF'); // 'STAFF' | 'MEMBER'
  
  // Staff Form
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  // Member Form
  const [memberInput, setMemberInput] = useState('');
  const [peopleList, setPeopleList] = useState([]);

  // Server Settings
  const isCloudHosted = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const [serverUrl, setServerUrl] = useState(() => getApiBaseUrl() || (isCloudHosted ? '' : 'http://localhost:8000'));
  const [showServerConfig, setShowServerConfig] = useState(() => isCloudHosted && !getApiBaseUrl());
  const [serverSavedMsg, setServerSavedMsg] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPeople();
  }, [serverUrl]);

  const fetchPeople = async () => {
    try {
      const res = await axios.get('/api/people');
      let list = [];
      if (res.data && Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data && res.data.people) {
        list = res.data.people;
      }
      setPeopleList(list);
      if (list.length > 0 && !memberInput) {
        setMemberInput(list[0].id || list[0].person_id);
      }
    } catch (e) {
      // Silently catch in case of offline
    }
  };

  const handleSaveServerUrl = (e) => {
    e?.preventDefault();
    setApiBaseUrl(serverUrl);
    axios.defaults.baseURL = serverUrl.trim().replace(/\/+$/, '');
    setServerSavedMsg('✅ Server URL connected!');
    setTimeout(() => setServerSavedMsg(''), 3000);
    fetchPeople();
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (!result.success) {
      if (result.message && result.message.includes('405')) {
        setError('405 Error: Frontend is not connected to Gym Backend. Please configure Backend URL below.');
        setShowServerConfig(true);
      } else {
        setError(result.message || 'Login failed. Please check credentials.');
      }
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberInput.trim()) {
      setError('Please enter your Member ID or Phone number.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await loginAsMember(memberInput);
    setLoading(false);
    if (!result.success) {
      if (result.message && result.message.includes('405')) {
        setError('405 Error: Frontend is not connected to Gym Backend. Please configure Backend URL below.');
        setShowServerConfig(true);
      } else {
        setError(result.message || 'Member account not found in system.');
      }
    }
  };

  const fillStaffDemo = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  const fillMemberDemo = (id) => {
    setMemberInput(id);
    setError('');
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-brand-logo">🛡️</div>
          <h2>TITAN GYM SYSTEM</h2>
          <p>Secure Role-Based Access & Customer Portal</p>
        </div>

        {/* Dual Mode Tabs */}
        <div className="login-tabs-row">
          <button 
            className={`login-tab-btn ${activeTab === 'STAFF' ? 'active' : ''}`}
            onClick={() => { setActiveTab('STAFF'); setError(''); }}
          >
            👔 Staff & Admin Access
          </button>
          <button 
            className={`login-tab-btn ${activeTab === 'MEMBER' ? 'active' : ''}`}
            onClick={() => { setActiveTab('MEMBER'); setError(''); }}
          >
            🏋️ Member Customer Portal
          </button>
        </div>

        {/* Tab 1: Staff Login */}
        {activeTab === 'STAFF' && (
          <form onSubmit={handleStaffSubmit} className="login-body">
            {error && <div className="login-error-alert">⚠️ {error}</div>}

            <div className="login-field-group">
              <label>Staff Username</label>
              <input 
                type="text" 
                required
                placeholder="e.g. admin, manager, reception"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                autoFocus
              />
            </div>

            <div className="login-field-group">
              <label>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: 'var(--c-slate-light, #475467)'
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Authenticating...' : '🔑 Sign In as Staff'}
            </button>

            {/* Quick-Fill Demo Chips */}
            <div className="demo-quickfill-box">
              <span className="demo-quickfill-title">⚡ Instant Demo 1-Click Login:</span>
              <div className="demo-chips-row">
                <button 
                  type="button" 
                  className="demo-chip-btn"
                  onClick={() => fillStaffDemo('admin', 'admin123')}
                >
                  👑 Super Admin
                </button>
                <button 
                  type="button" 
                  className="demo-chip-btn"
                  onClick={() => fillStaffDemo('manager', 'manager123')}
                >
                  👔 Floor Manager
                </button>
                <button 
                  type="button" 
                  className="demo-chip-btn"
                  onClick={() => fillStaffDemo('reception', 'reception123')}
                >
                  🛎️ Receptionist
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Member Portal Login */}
        {activeTab === 'MEMBER' && (
          <form onSubmit={handleMemberSubmit} className="login-body">
            {error && <div className="login-error-alert">⚠️ {error}</div>}

            <div className="login-field-group">
              <label>Enter Your Member ID or Registered Phone</label>
              <input 
                type="text" 
                required
                placeholder="e.g. P-0001 or 03001234567"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                className="login-input"
                autoFocus
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Looking up member...' : '📲 Open My Customer Portal'}
            </button>

            {/* Member Quick-Fill Chips */}
            {peopleList.length > 0 && (
              <div className="demo-quickfill-box">
                <span className="demo-quickfill-title">⚡ Quick Member Selector:</span>
                <div className="demo-chips-row">
                  {peopleList.slice(0, 4).map(p => (
                    <button 
                      key={p.id || p.person_id}
                      type="button" 
                      className="demo-chip-btn"
                      onClick={() => fillMemberDemo(p.id || p.person_id)}
                    >
                      👤 {p.name} ({p.id || p.person_id})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* Server Connection Bar */}
        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color, #334155)',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--c-slate-light, #94a3b8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: serverUrl || !isCloudHosted ? '#10b981' : '#f59e0b',
                display: 'inline-block'
              }}></span>
              Backend: {getApiBaseUrl() || (isCloudHosted ? 'Cloud Default' : 'http://localhost:8000')}
            </span>
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--c-brand-cyan, #06b6d4)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                textDecoration: 'underline'
              }}
            >
              {showServerConfig ? 'Hide Config' : '⚙️ Server URL'}
            </button>
          </div>

          {showServerConfig && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                Backend API Server URL (e.g. Tunnel URL or Local URL):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="e.g. https://your-tunnel.trycloudflare.com or http://localhost:8000"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '0.8rem'
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveServerUrl}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--c-brand-cyan, #06b6d4)',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Save
                </button>
              </div>
              {serverSavedMsg && (
                <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '4px' }}>
                  {serverSavedMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
