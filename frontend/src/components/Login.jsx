import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';
import { useAuth } from '../context/AuthContext';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPeople();
  }, []);

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

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (!result.success) {
      setError(result.message || 'Login failed. Please check credentials.');
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
      setError(result.message || 'Member account not found in system.');
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
      </div>
    </div>
  );
}

export default Login;
