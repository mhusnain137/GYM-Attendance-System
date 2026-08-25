import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import People from './components/People';
import Settings from './components/Settings';
import Activity from './components/Activity';
import Attendance from './components/Attendance';
import Membership from './components/Membership';
import './App.css';

const THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'slate', label: 'Slate' },
  { value: 'light', label: 'Light' },
  { value: 'high-contrast', label: 'High Contrast' }
];

function App() {
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

  useEffect(() => {
    // Load saved theme from localStorage
    try {
      const savedTheme = localStorage.getItem('personIdentityTheme');
      if (savedTheme && THEMES.some(t => t.value === savedTheme)) {
        setCurrentTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
      // Use default theme if localStorage fails
    }

    // Poll system status every second
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        setSystemStatus(data);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showThemeDropdown && !event.target.closest('.theme-selector')) {
        setShowThemeDropdown(false);
      }
    };

    if (showThemeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showThemeDropdown]);

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('personIdentityTheme', theme);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
    setShowThemeDropdown(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard systemStatus={systemStatus} />;
      case 'people':
        return <People />;
      case 'membership':
        return <Membership />;
      case 'attendance':
        return <Attendance />;
      case 'activity':
        return <Activity />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard systemStatus={systemStatus} />;
    }
  };

  return (
    <div className="app">
      {/* Top Header Bar */}
      <header className="app-header-top">
        <div className="brand-section">
          <div className="brand-logo">🏋️</div>
          <div className="brand-title-group">
            <h1>GYM ATTENDANCE & BIOMETRICS</h1>
            <p>AI Identity System • YuNet & SFace Engine</p>
          </div>
        </div>

        <div className="header-status-group">
          <div className="status-pill-badge">
            <span className={`status-dot ${systemStatus.camera ? 'active' : ''}`} />
            <span>{systemStatus.camera ? 'CAMERA ONLINE' : 'CAMERA OFFLINE'}</span>
          </div>

          <div className="status-pill-badge" style={{ color: 'var(--color-primary)' }}>
            <span>🧠 Registered: {systemStatus.registered_people || 0} Members</span>
          </div>

          <div className="theme-selector">
            <button 
              className="button button-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            >
              🎨 Theme ▼
            </button>
            {showThemeDropdown && (
              <div className="theme-dropdown" style={{ position: 'absolute', right: 28, top: 60, background: 'var(--bg-dark-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 8, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {THEMES.map(theme => (
                  <button
                    key={theme.value}
                    className={`button button-secondary ${currentTheme === theme.value ? 'button-primary' : ''}`}
                    style={{ padding: '6px 12px', justifyContent: 'flex-start', fontSize: '0.8rem' }}
                    onClick={() => handleThemeChange(theme.value)}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="app-body">
        <nav className="sidebar">
          <div className="sidebar-nav">
            <div 
              className={`sidebar-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              <span className="nav-item-icon">📺</span>
              <span>Live Dashboard</span>
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
              className={`sidebar-nav-item ${currentPage === 'attendance' ? 'active' : ''}`}
              onClick={() => setCurrentPage('attendance')}
            >
              <span className="nav-item-icon">📅</span>
              <span>Attendance & Visits</span>
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
          </div>
        </nav>

        <main className="main-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;