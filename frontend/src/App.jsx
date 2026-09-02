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
import Login from './components/Login';
import { AuthProvider, useAuth, ROLES, ROLE_LABELS } from './context/AuthContext';
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
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  useEffect(() => {
    const handleAvatarUpdated = (e) => {
      setAvatarTimestamp(e.detail?.timestamp || Date.now());
    };
    window.addEventListener('profile-picture-updated', handleAvatarUpdated);
    return () => window.removeEventListener('profile-picture-updated', handleAvatarUpdated);
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
      case 'staff':
        return isAdmin ? <StaffManager /> : <Dashboard systemStatus={systemStatus} />;
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
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;