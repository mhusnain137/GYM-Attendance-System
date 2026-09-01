import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../App.css';
import './Settings.css';

function Settings() {
  const { canEditSettings, isAdmin } = useAuth();
  const [settings, setSettings] = useState({
    recognition_threshold: 0.52,
    weak_match_threshold: 0.46,
    min_match_margin: 0.08,
    weak_match_required_hits: 5,
    track_refresh_frames: 45,
    track_max_missed_frames: 15,
    enable_auto_register_unknown: true,
    auto_register_required_hits: 3
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  const saveSettings = async () => {
    try {
      await axios.post('/api/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const resetSettings = () => {
    setSettings({
      recognition_threshold: 0.52,
      weak_match_threshold: 0.46,
      min_match_margin: 0.08,
      weak_match_required_hits: 5,
      track_refresh_frames: 45,
      track_max_missed_frames: 15,
      enable_auto_register_unknown: true,
      auto_register_required_hits: 3
    });
    setSaved(false);
  };

  return (
    <div className="settings">
      <div className="page-header">
        <h1>SETTINGS</h1>
        <div className="settings-actions">
          <button className="button button-danger" onClick={resetSettings} disabled={!canEditSettings}>
            RESET
          </button>
          <button className="button button-success" onClick={saveSettings} disabled={!canEditSettings}>
            {saved ? '✓ SAVED' : 'SAVE'}
          </button>
        </div>
      </div>

      {!canEditSettings && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          color: 'var(--warning)',
          fontWeight: 600,
          fontSize: '0.88rem'
        }}>
          🔒 System hardware and AI recognition threshold settings are locked for Super Admin only.
        </div>
      )}

      <div className="settings-grid">
        <div className="card settings-section">
          <h2>RECOGNITION</h2>
          <div className="setting-item">
            <label>
              Strong Threshold
              <span className="setting-value">{settings.recognition_threshold}</span>
            </label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.01"
              value={settings.recognition_threshold}
              onChange={(e) => handleChange('recognition_threshold', parseFloat(e.target.value))}
              className="slider"
            />
            <p className="setting-description">
              Minimum similarity score for immediate recognition
            </p>
          </div>

          <div className="setting-item">
            <label>
              Weak Threshold
              <span className="setting-value">{settings.weak_match_threshold}</span>
            </label>
            <input
              type="range"
              min="0.3"
              max="0.7"
              step="0.01"
              value={settings.weak_match_threshold}
              onChange={(e) => handleChange('weak_match_threshold', parseFloat(e.target.value))}
              className="slider"
            />
            <p className="setting-description">
              Lower bound for weak match candidates
            </p>
          </div>

          <div className="setting-item">
            <label>
              Minimum Margin
              <span className="setting-value">{settings.min_match_margin}</span>
            </label>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              value={settings.min_match_margin}
              onChange={(e) => handleChange('min_match_margin', parseFloat(e.target.value))}
              className="slider"
            />
            <p className="setting-description">
              Required difference between best and second-best match
            </p>
          </div>

          <div className="setting-item">
            <label>
              Weak Match Hits
              <span className="setting-value">{settings.weak_match_required_hits}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={settings.weak_match_required_hits}
              onChange={(e) => handleChange('weak_match_required_hits', parseInt(e.target.value))}
              className="slider"
            />
            <p className="setting-description">
              Consecutive weak matches required for confirmation
            </p>
          </div>
        </div>

        <div className="card settings-section">
          <h2>TRACKING</h2>
          <div className="setting-item">
            <label>
              Track Refresh Frames
              <span className="setting-value">{settings.track_refresh_frames}</span>
            </label>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={settings.track_refresh_frames}
              onChange={(e) => handleChange('track_refresh_frames', parseInt(e.target.value))}
              className="slider"
            />
            <p className="setting-description">
              Frames between recognition refreshes
            </p>
          </div>

          <div className="setting-item">
            <label>
              Track Max Missed Frames
              <span className="setting-value">{settings.track_max_missed_frames}</span>
            </label>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={settings.track_max_missed_frames}
              onChange={(e) => handleChange('track_max_missed_frames', parseInt(e.target.value))}
              className="slider"
            />
            <p className="setting-description">
              Frames before dropping lost track
            </p>
          </div>
        </div>

        <div className="card settings-section">
          <h2>VISITOR AUTO-REGISTRATION</h2>
          <div className="setting-item">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span>Auto-Register Unknown Faces</span>
              <input
                type="checkbox"
                checked={!!settings.enable_auto_register_unknown}
                onChange={(e) => handleChange('enable_auto_register_unknown', e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#10B981' }}
              />
            </label>
            <p className="setting-description">
              Automatically assign a Visitor ID & save face photo when an unregistered person appears in front of the camera
            </p>
          </div>

          <div className="setting-item">
            <label>
              Visitor Detection Frames
              <span className="setting-value">{settings.auto_register_required_hits || 3}</span>
            </label>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={settings.auto_register_required_hits || 3}
              onChange={(e) => handleChange('auto_register_required_hits', parseInt(e.target.value))}
              className="slider"
              disabled={!settings.enable_auto_register_unknown}
            />
            <p className="setting-description">
              Consecutive stable face frames required before auto-creating Visitor profile
            </p>
          </div>
        </div>

        <div className="card settings-section">
          <h2>SYSTEM</h2>
          <div className="system-info">
            <div className="info-item">
              <span className="info-label">Detector</span>
              <span className="info-value">YuNet</span>
            </div>
            <div className="info-item">
              <span className="info-label">Recognizer</span>
              <span className="info-value">SFace</span>
            </div>
            <div className="info-item">
              <span className="info-label">Visitor Mode</span>
              <span className="info-value">{settings.enable_auto_register_unknown ? 'AUTO-ASSIGN' : 'OFF'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Tracking</span>
              <span className="info-value">IOU</span>
            </div>
            <div className="info-item">
              <span className="info-label">Database</span>
              <span className="info-value">JSON</span>
            </div>
            <div className="info-item">
              <span className="info-label">Device</span>
              <span className="info-value">CPU</span>
            </div>
            <div className="info-item">
              <span className="info-label">Camera</span>
              <span className="info-value">Webcam</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;