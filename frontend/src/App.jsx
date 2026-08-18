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
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>PERSON IDENTITY SYSTEM</h1>
          <div className={`status-indicator ${systemStatus.camera ? 'online' : 'offline'}`}>
            {systemStatus.camera ? '● SYSTEM ONLINE' : '○ SYSTEM OFFLINE'}
          </div>
          <div className="theme-selector">
            <button 
              className="theme-button"
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            >
              <span className="theme-icon">🎨</span>
              <span className="theme-label">Theme</span>
              <span className="theme-arrow">▼</span>
            </button>
            {showThemeDropdown && (
              <div className="theme-dropdown">
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
        </div>
        <ul className="sidebar-nav">
          <li className={currentPage === 'dashboard' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('dashboard')}>
              ▣ Dashboard
            </button>
          </li>
          <li className={currentPage === 'people' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('people')}>
              👥 People
            </button>
          </li>
          <li className={currentPage === 'membership' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('membership')}>
              💳 Membership
            </button>
          </li>
          <li className={currentPage === 'attendance' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('attendance')}>
              📅 Attendance
            </button>
          </li>
          <li className={currentPage === 'activity' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('activity')}>
              📋 Activity
            </button>
          </li>
          <li className={currentPage === 'settings' ? 'active' : ''}>
            <button onClick={() => setCurrentPage('settings')}>
              ⚙ Settings
            </button>
          </li>
        </ul>
      </nav>
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;