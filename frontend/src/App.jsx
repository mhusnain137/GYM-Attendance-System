import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import People from './components/People';
import Settings from './components/Settings';
import Activity from './components/Activity';
import Attendance from './components/Attendance';
import Membership from './components/Membership';
import Cafe from './components/Cafe';
import StaffManager from './components/StaffManager';
import MemberPortal from './components/MemberPortal';
import MemberWorkouts from './components/MemberWorkouts';
import BranchManager from './components/BranchManager';
import DemoLeadsManager from './components/DemoLeadsManager';
import Login from './components/Login';
import { AuthProvider, useAuth, ROLES, ROLE_LABELS } from './context/AuthContext';
import { BranchProvider, useBranch } from './context/BranchContext';
import './App.css';

const THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'slate', label: 'Slate' },
  { value: 'light', label: 'Light' },
  { value: 'high-contrast', label: 'High Contrast' }
];

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          <h3>⚠️ Something went wrong loading this section</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{this.state.error?.message}</p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
          >
            Reload Section
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { isAuthenticated, role, user, logout, isAdmin, isManager, isReceptionist, isMember, canManageStaff } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState({
    camera: false,
    fps: 0,
    faces_detected: 0,
    active_tracks: 0,
    registered_people: 0
  });
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  const [unreadLeadsCount, setUnreadLeadsCount] = useState(0);
  const [latestLead, setLatestLead] = useState(null);
  const [showLeadsDropdown, setShowLeadsDropdown] = useState(false);
  const [leadToast, setLeadToast] = useState({ show: false, lead: null });

  const playLeadNotificationChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // AudioContext policy
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const checkLeads = async () => {
      try {
        const res = await fetch('/api/saas/leads/unread-count');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUnreadLeadsCount(prev => {
              if (data.unread_count > prev && data.latest) {
                playLeadNotificationChime();
                setLeadToast({ show: true, lead: data.latest });
                setTimeout(() => setLeadToast(p => ({ ...p, show: false })), 7000);
              }
              return data.unread_count;
            });
            setLatestLead(data.latest);
          }
        }
      } catch (err) {
        // network drop ignored
      }
    };

    checkLeads();
    const leadsInterval = setInterval(checkLeads, 15000);

    const handleLeadsUpdated = () => checkLeads();
    window.addEventListener('saas-leads-updated', handleLeadsUpdated);

    return () => {
      clearInterval(leadsInterval);
      window.removeEventListener('saas-leads-updated', handleLeadsUpdated);
    };
  }, [isAdmin]);

  useEffect(() => {
    const handleAvatarUpdated = (e) => {
      setAvatarTimestamp(e.detail?.timestamp || Date.now());
    };
    const handleCamStatus = (e) => {
      if (e.detail && typeof e.detail.active === 'boolean') {
        setSystemStatus(prev => ({ ...prev, camera: e.detail.active }));
      }
    };
    window.addEventListener('profile-picture-updated', handleAvatarUpdated);
    window.addEventListener('camera-active-status', handleCamStatus);
    return () => {
      window.removeEventListener('profile-picture-updated', handleAvatarUpdated);
      window.removeEventListener('camera-active-status', handleCamStatus);
    };
  }, []);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('personIdentityTheme');
      if (savedTheme && THEMES.some(t => t.value === savedTheme)) {
        setCurrentTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        setSystemStatus(data);
      } catch (error) {
        // Silently catch network drops
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleThemeChange = (themeValue) => {
    setCurrentTheme(themeValue);
    document.documentElement.setAttribute('data-theme', themeValue);
    try {
      localStorage.setItem('personIdentityTheme', themeValue);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
    setShowThemeDropdown(false);
  };

  // If not authenticated, render Login Screen
  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    if (isMember) {
      return (
        <ErrorBoundary>
          <MemberPortal />
        </ErrorBoundary>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard systemStatus={systemStatus} />;
      case 'member-workouts':
        return (
          <ErrorBoundary>
            <MemberWorkouts />
          </ErrorBoundary>
        );
      case 'member-portal':
        return (
          <ErrorBoundary>
            <MemberPortal />
          </ErrorBoundary>
        );
      case 'people':
        return <People />;
      case 'membership':
        return <Membership />;
      case 'cafe':
        return <Cafe />;
      case 'attendance':
        return <Attendance />;
      case 'activity':
        return isAdmin ? <Activity /> : <Dashboard systemStatus={systemStatus} />;
      case 'branches':
        return isAdmin ? <BranchManager /> : <Dashboard systemStatus={systemStatus} />;
      case 'staff':
        return isAdmin ? <StaffManager /> : <Dashboard systemStatus={systemStatus} />;
      case 'leads':
        return isAdmin ? <DemoLeadsManager /> : <Dashboard systemStatus={systemStatus} />;
      case 'settings':
        return isAdmin ? <Settings /> : <Dashboard systemStatus={systemStatus} />;
      default:
        return <Dashboard systemStatus={systemStatus} />;
    }
  };

  return (
    <div className="app">
      {/* Top Bar / Header */}
      <header className="app-header-top">
        <div className="brand-section">
          <div className="brand-logo">🛡️</div>
          <div className="brand-title-group">
            <h1>TITAN GYM SYSTEM</h1>
            <p>Smart AI Recognition & POS Solution</p>
          </div>
        </div>

        {/* Authenticated User Profile & Header Actions */}
        <div className="header-status-group">
          {/* Logged in User Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--c-sand-light, #FAF8F5)',
            border: '1.5px solid var(--c-sand, #D8D2C8)',
            padding: '4px 14px 4px 6px',
            borderRadius: '9999px'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#8b5cf6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800,
              flexShrink: 0,
              position: 'relative'
            }}>
              {(user?.member_id || user?.user_id) ? (
                <img 
                  src={`/api/face-crops/${user.member_id || user.user_id}.jpg?t=${avatarTimestamp}`}
                  alt=""
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : null}
              <span style={{ position: 'relative', zIndex: 1 }}>{(user?.name || user?.username || 'U').charAt(0).toUpperCase()}</span>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--c-slate, #344054)', fontWeight: 700 }}>
              {user?.name || user?.username || 'Logged In'}
            </span>
            <span style={{
              background: 'var(--c-mocha-light, #F5EBE6)',
              color: 'var(--c-mocha, #875F45)',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              textTransform: 'uppercase'
            }}>
              {role}
            </span>
          </div>

          {/* AI Camera Status */}
          <div className="status-pill-badge">
            <span className={`status-dot ${systemStatus.camera ? 'online' : ''}`}></span>
            <span>{systemStatus.camera ? 'AI CAMERA LIVE' : 'CAMERA OFFLINE'}</span>
          </div>

          {/* Multi-Branch Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                color: '#059669',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              title="Switch Active Gym Branch"
            >
              <span>🏢</span>
              <span>
                {selectedBranchId === 'all'
                  ? 'All Branches'
                  : (branches.find(b => b.branch_id === selectedBranchId)?.name ||
                     branches.find(b => b.branch_id === selectedBranchId)?.branch_name ||
                     'Current Branch')}
              </span>
              <span style={{ fontSize: '0.65rem' }}>▼</span>
            </button>

            {showBranchDropdown && (
              <div className="theme-dropdown" style={{ minWidth: '240px', right: 0, left: 'auto' }}>
                <button
                  className={`theme-option ${selectedBranchId === 'all' ? 'active' : ''}`}
                  onClick={() => { setSelectedBranchId('all'); setShowBranchDropdown(false); }}
                >
                  🏢 All Branches (Consolidated)
                </button>
                <div style={{ height: '1px', background: 'var(--c-border-light, #e2e8f0)', margin: '4px 0' }} />
                {branches.map(b => {
                  const bName = b.name || b.branch_name || 'Gym Branch';
                  return (
                    <button
                      key={b.branch_id}
                      className={`theme-option ${selectedBranchId === b.branch_id ? 'active' : ''}`}
                      onClick={() => { setSelectedBranchId(b.branch_id); setShowBranchDropdown(false); }}
                    >
                      📍 {bName} <small style={{ color: '#64748b' }}>({b.city || 'City'})</small>
                    </button>
                  );
                })}
                {isAdmin && (
                  <>
                    <div style={{ height: '1px', background: 'var(--c-border-light, #e2e8f0)', margin: '4px 0' }} />
                    <button
                      className="theme-option"
                      style={{ color: '#10b981', fontWeight: 700 }}
                      onClick={() => { setCurrentPage('branches'); setShowBranchDropdown(false); }}
                    >
                      ⚙️ Manage Branches...
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* SaaS Demo Leads Notification Bell (Admin Only) */}
          {isAdmin && (
            <div style={{ position: 'relative' }}>
              <button 
                style={{
                  background: unreadLeadsCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--c-sand-light, #FAF8F5)',
                  border: unreadLeadsCount > 0 ? '1.5px solid #ef4444' : '1.5px solid var(--c-sand, #D8D2C8)',
                  color: unreadLeadsCount > 0 ? '#dc2626' : 'var(--c-slate, #344054)',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative'
                }}
                onClick={() => setShowLeadsDropdown(!showLeadsDropdown)}
                title="SaaS Demo Inquiries"
              >
                🔔
                {unreadLeadsCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    lineHeight: '1.2'
                  }}>
                    {unreadLeadsCount} NEW
                  </span>
                )}
              </button>

              {showLeadsDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  background: 'var(--bg-surface, #ffffff)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                  zIndex: 1000,
                  padding: '14px',
                  color: 'var(--text-primary, #0f172a)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Demo Inquiries</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>
                      {unreadLeadsCount} Unread
                    </span>
                  </div>

                  {latestLead ? (
                    <div style={{
                      background: 'var(--bg-surface-alt, #f8fafc)',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      borderRadius: '8px',
                      padding: '10px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                        {latestLead.gym_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {latestLead.contact_name} • {latestLead.city}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 700, marginTop: '4px' }}>
                        {latestLead.interested_plan || 'PRO'} Plan Request
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '8px 0' }}>No pending inquiries</p>
                  )}

                  <button
                    style={{
                      width: '100%',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setCurrentPage('leads');
                      setShowLeadsDropdown(false);
                    }}
                  >
                    Open Full CRM Leads ➔
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Theme Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              style={{
                background: 'var(--c-sand-light, #FAF8F5)',
                border: '1.5px solid var(--c-sand, #D8D2C8)',
                color: 'var(--c-slate, #344054)',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              title="Change UI Color Theme"
            >
              🎨 {THEMES.find(t => t.value === currentTheme)?.label || 'Theme'}
            </button>

            {showThemeDropdown && (
              <div className="theme-dropdown" style={{ minWidth: '150px' }}>
                {THEMES.map(theme => (
                  <button
                    key={theme.value}
                    className={`theme-option ${currentTheme === theme.value ? 'active' : ''}`}
                    onClick={() => handleThemeChange(theme.value)}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1.5px solid rgba(239, 68, 68, 0.3)',
              color: '#B91C1C',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onClick={logout}
            title="Log out of current session"
          >
            🚪 Log Out
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="app-body">
        {/* Sidebar Navigation — Role Guarded */}
        {!isMember && (
          <nav className="sidebar">
            <div className="sidebar-nav">
              <div 
                className={`sidebar-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('dashboard')}
              >
                <span className="nav-item-icon">📺</span>
                <span>{isReceptionist ? 'Front Desk Arrival' : 'Live Dashboard'}</span>
              </div>

              <div 
                className={`sidebar-nav-item ${currentPage === 'people' ? 'active' : ''}`}
                onClick={() => setCurrentPage('people')}
              >
                <span className="nav-item-icon">👥</span>
                <span>People Directory</span>
              </div>

              <div 
                className={`sidebar-nav-item ${currentPage === 'membership' ? 'active' : ''}`}
                onClick={() => setCurrentPage('membership')}
              >
                <span className="nav-item-icon">💳</span>
                <span>Gym Memberships</span>
              </div>

              <div 
                className={`sidebar-nav-item ${currentPage === 'cafe' ? 'active' : ''}`}
                onClick={() => setCurrentPage('cafe')}
              >
                <span className="nav-item-icon">🥤</span>
                <span>Gym Cafe & POS</span>
              </div>

              <div 
                className={`sidebar-nav-item ${currentPage === 'attendance' ? 'active' : ''}`}
                onClick={() => setCurrentPage('attendance')}
              >
                <span className="nav-item-icon">📅</span>
                <span>Attendance & Visits</span>
              </div>

              <div 
                className={`sidebar-nav-item ${currentPage === 'member-workouts' ? 'active' : ''}`}
                onClick={() => setCurrentPage('member-workouts')}
              >
                <span className="nav-item-icon">🏋️</span>
                <span>Member Workouts</span>
              </div>

              {/* Admin Only Navigation Links */}
              {isAdmin && (
                <>
                  <div 
                    className={`sidebar-nav-item ${currentPage === 'branches' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('branches')}
                  >
                    <span className="nav-item-icon">🏢</span>
                    <span>Branch Network</span>
                  </div>

                  <div 
                    className={`sidebar-nav-item ${currentPage === 'staff' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('staff')}
                  >
                    <span className="nav-item-icon">👔</span>
                    <span>Staff & Roles</span>
                  </div>

                  <div 
                    className={`sidebar-nav-item ${currentPage === 'activity' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('activity')}
                  >
                    <span className="nav-item-icon">📋</span>
                    <span>Activity Audit Log</span>
                  </div>

                  <div 
                    className={`sidebar-nav-item ${currentPage === 'leads' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('leads')}
                  >
                    <span className="nav-item-icon">📬</span>
                    <span>Demo Leads CRM</span>
                    {unreadLeadsCount > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '1px 6px',
                        borderRadius: '9999px'
                      }}>
                        {unreadLeadsCount}
                      </span>
                    )}
                  </div>

                  <div 
                    className={`sidebar-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('settings')}
                  >
                    <span className="nav-item-icon">⚙️</span>
                    <span>System Settings</span>
                  </div>
                </>
              )}
            </div>
          </nav>
        )}

        <main className="main-content">
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Real-Time Demo Lead Toast Banner */}
      {leadToast.show && leadToast.lead && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 20px 30px -10px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideInRight 0.3s ease'
        }}>
          <div style={{ fontSize: '1.8rem' }}>🎉</div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
              New Demo Request Received!
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
              {leadToast.lead.gym_name} ({leadToast.lead.city})
            </div>
            <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
              {leadToast.lead.contact_name} • {leadToast.lead.interested_plan || 'PRO'} Plan
            </div>
          </div>
          <button
            onClick={() => {
              setCurrentPage('leads');
              setLeadToast({ show: false, lead: null });
            }}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            View Lead
          </button>
          <button
            onClick={() => setLeadToast({ show: false, lead: null })}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1rem',
              cursor: 'pointer',
              padding: '0 4px'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <AppContent />
      </BranchProvider>
    </AuthProvider>
  );
}

export default App;