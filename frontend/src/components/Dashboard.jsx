import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getPersonMembership, calculateMembershipInfo } from '../utils/membershipUtils';
import ExpiredAlertBanner from './ExpiredAlertBanner';
import LiveEntryToast from './LiveEntryToast';
import AnalyticsGraphs from './AnalyticsGraphs';
import MemberProfileModal from './MemberProfileModal';
import '../App.css';
import './Dashboard.css';

function Dashboard({ systemStatus }) {
  const [cameraRunning, setCameraRunning] = useState(false);
  const [recognitionState, setRecognitionState] = useState({
    camera: false,
    fps: 0,
    faces_detected: 0,
    active_tracks: 0,
    registered_people: 0,
    people: [],
    active_alerts: []
  });
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationName, setRegistrationName] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);
  const [memberships, setMemberships] = useState([]);
  
  // Alert & Toast States
  const [currentAlert, setCurrentAlert] = useState(null);
  const [dismissedAlertPid, setDismissedAlertPid] = useState(null);
  const [liveToasts, setLiveToasts] = useState([]);
  const recentToastsRef = useRef({});
  const isFirstPollRef = useRef(true);

  // Profile Modal State
  const [selectedProfilePerson, setSelectedProfilePerson] = useState(null); // { id, name }

  const DEFAULT_RTSP_URL = 'rtsp://admin:12345abc@192.168.2.253:554/cam/realmonitor?channel=2&subtype=0';

  // Camera source state
  const [cameraSource, setCameraSource] = useState('webcam');
  const [rtspUrl, setRtspUrl] = useState(DEFAULT_RTSP_URL);
  const [cameraName, setCameraName] = useState('');
  const [cameraStatus, setCameraStatus] = useState({ source: 'webcam', name: 'Webcam', status: 'disconnected' });
  const [applyStatus, setApplyStatus] = useState(null); // null | 'applying' | 'success' | 'error'
  const [applyMessage, setApplyMessage] = useState('');

  useEffect(() => {
    // Poll recognition state every 200ms for real-time updates
    const interval = setInterval(async () => {
      try {
        const response = await axios.get('/api/state');
        const data = response.data || {};
        setRecognitionState(data);
        setCameraRunning(!!data.camera);

        if (!data.camera) {
          // Camera is stopped or offline: clear any active alert banners and toasts
          setCurrentAlert(null);
          setLiveToasts([]);
          return;
        }

        // Check for active alerts while camera is running
        if (data.active_alerts && data.active_alerts.length > 0) {
          const topAlert = data.active_alerts[0];
          if (topAlert.person_id !== dismissedAlertPid) {
            setCurrentAlert(topAlert);
          }
        } else {
          setCurrentAlert(null);
        }

        // Check for confirmed person to trigger live arrival toast
        if (data.people && data.people.length > 0) {
          const now = Date.now();
          if (isFirstPollRef.current) {
            // Seed recentToasts on initial load so page refresh doesn't trigger duplicate popups
            data.people.forEach(p => {
              if (p.person_id) {
                recentToastsRef.current[p.person_id] = now;
              }
            });
            isFirstPollRef.current = false;
          } else {
            data.people.forEach(p => {
              if (p.confirmed && p.person_id && p.person_id !== 'Unknown') {
                const lastToasted = recentToastsRef.current[p.person_id] || 0;
                if (now - lastToasted > 12000) { // 12 second throttle per member
                  recentToastsRef.current[p.person_id] = now;
                  const newToast = {
                    id: p.person_id,
                    person_id: p.person_id,
                    name: p.name,
                    plan_name: p.plan_name,
                    membership_status: p.membership_status,
                    days_left: p.days_left,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  };
                  setLiveToasts(prev => [newToast, ...prev.slice(0, 2)]);
                }
              }
            });
          }
        } else {
          isFirstPollRef.current = false;
        }
      } catch (error) {
        console.error('Error fetching state:', error);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [dismissedAlertPid]);

  useEffect(() => {
    const fetchAttendanceVisitsAndMemberships = async () => {
      try {
        const [attRes, visRes, memRes] = await Promise.all([
          axios.get('/api/attendance/today'),
          axios.get('/api/visits/today').catch(() => ({ data: [] })),
          axios.get('/api/memberships').catch(() => ({ data: [] }))
        ]);
        setTodayAttendance(attRes.data || []);
        setTodayVisits(visRes.data || []);
        setMemberships(memRes.data || []);
      } catch (error) {
        console.error('Error fetching today attendance, visits & memberships:', error);
      }
    };

    const interval = setInterval(fetchAttendanceVisitsAndMemberships, 2000);
    fetchAttendanceVisitsAndMemberships();

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    axios.get('/api/camera/status')
      .then(response => {
        if (response.data) {
          setCameraStatus(response.data);
          if (response.data.source) setCameraSource(response.data.source);
          if (response.data.rtsp_url) setRtspUrl(response.data.rtsp_url);
          if (response.data.name) setCameraName(response.data.name);
        }
      })
      .catch(error => console.error('Error fetching initial camera status:', error));

    const interval = setInterval(async () => {
      try {
        const response = await axios.get('/api/camera/status');
        setCameraStatus(response.data);
      } catch (error) {
        console.error('Error fetching camera status:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const applyCameraSource = async (sourceType) => {
    const selectedSource = sourceType || cameraSource;
    setApplyStatus('applying');
    setApplyMessage('');
    try {
      await axios.post('/api/camera/source', {
        source: selectedSource,
        rtsp_url: selectedSource === 'rtsp' ? rtspUrl : '',
        camera_name: selectedSource === 'rtsp' ? cameraName : ''
      });
      const response = await axios.get('/api/camera/status');
      setCameraStatus(response.data);
      
      setApplyStatus('success');
      const camNameStr = selectedSource === 'rtsp' && cameraName ? ` ("${cameraName}")` : '';
      setApplyMessage(`RTSP Stream URL Applied & Configured Successfully!${camNameStr}`);
      
      setTimeout(() => {
        setApplyStatus(null);
      }, 4000);
    } catch (error) {
      console.error('Error applying camera source:', error);
      setApplyStatus('error');
      setApplyMessage('Failed to apply RTSP URL. Please check connection.');
      setTimeout(() => {
        setApplyStatus(null);
      }, 4000);
    }
  };

  const startCamera = async () => {
    try {
      await applyCameraSource();
      await axios.post('/api/camera/start');
      setCameraRunning(true);
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  };

  const stopCamera = async () => {
    try {
      await axios.post('/api/camera/stop');
      setCameraRunning(false);
    } catch (error) {
      console.error('Error stopping camera:', error);
    }
  };

  const handleCameraSourceChange = async (source) => {
    setCameraSource(source);
    await applyCameraSource(source);
    
    if (cameraRunning) {
      await stopCamera();
      await startCamera();
    }
  };

  const startRegistration = async () => {
    if (!registrationName.trim()) {
      alert('Please enter a name');
      return;
    }
    try {
      const response = await axios.post('/api/register/start', {
        name: registrationName
      });
      if (response.data.success) {
        setRegistrationStatus('Registration in progress...');
        setShowRegistrationModal(false);
      }
    } catch (error) {
      console.error('Error starting registration:', error);
    }
  };

  const cancelRegistration = async () => {
    try {
      await axios.post('/api/register/cancel');
      setRegistrationStatus('');
      setShowRegistrationModal(false);
    } catch (error) {
      console.error('Error cancelling registration:', error);
    }
  };

  const renderMembershipBadge = (personId, record = null) => {
    const mem = getPersonMembership(personId, memberships);
    const info = calculateMembershipInfo(mem, record);
    return (
      <span className={`membership-pill ${info.badgeClass}`} title={`Membership: ${info.label}`}>
        {info.badgeText}
      </span>
    );
  };

  return (
    <div className="dashboard">
      {/* Live Arrival Floating Toast Queue */}
      <div className="live-entry-toast-container">
        {liveToasts.map(toast => (
          <LiveEntryToast
            key={`${toast.id}-${toast.time}`}
            entry={toast}
            onProfileClick={(pid, name) => setSelectedProfilePerson({ id: pid, name })}
            onDismiss={(pid) => setLiveToasts(prev => prev.filter(t => t.id !== pid))}
          />
        ))}
      </div>

      {/* Page Header */}
      <div className="dashboard-header">
        <div>
          <h1>GYM DASHBOARD</h1>
          <p style={{ color: 'var(--c-slate-light)', fontSize: '0.88rem', fontWeight: 600, marginTop: '2px' }}>
            Live Stream, Face Recognition & Today's Attendance Feed
          </p>
        </div>
        <div className="camera-controls">
          <button
            className={`button ${cameraRunning ? 'button-danger' : 'button-success'}`}
            onClick={cameraRunning ? stopCamera : startCamera}
          >
            {cameraRunning ? '⏹ STOP CAMERA' : '▶ START CAMERA'}
          </button>
          <button
            className="button button-primary"
            onClick={() => setShowRegistrationModal(true)}
            disabled={!cameraRunning}
          >
            + REGISTER PERSON
          </button>
        </div>
      </div>

      {/* Live Expired / Frozen Member Alert Banner */}
      {currentAlert && (
        <ExpiredAlertBanner
          alertData={currentAlert}
          onRenewClick={(alert) => setSelectedProfilePerson({ id: alert.person_id, name: alert.name })}
          onDismiss={() => {
            setDismissedAlertPid(currentAlert?.person_id);
            setCurrentAlert(null);
          }}
        />
      )}

      {registrationStatus && (
        <div className="card" style={{ padding: '14px 20px', background: 'var(--c-mocha-light)', borderColor: 'var(--c-mocha)', color: 'var(--c-mocha)', fontWeight: 700, textAlign: 'center' }}>
          {registrationStatus}
        </div>
      )}

      {/* Main Grid: Left Video Stream & Right Feeds */}
      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="camera-section">
          {/* Camera Source Selector Box */}
          <div className="card camera-source-panel">
            <h2>⚙️ CAMERA CONFIGURATION & RTSP SOURCE</h2>

            <div className="source-toggle-group">
              <button
                type="button"
                className={`source-toggle-btn ${cameraSource === 'webcam' ? 'active' : ''}`}
                onClick={() => handleCameraSourceChange('webcam')}
                disabled={cameraRunning}
              >
                📷 Local Laptop / USB Webcam
              </button>
              <button
                type="button"
                className={`source-toggle-btn ${cameraSource === 'rtsp' ? 'active' : ''}`}
                onClick={() => handleCameraSourceChange('rtsp')}
                disabled={cameraRunning}
              >
                📹 CCTV / IP Camera (RTSP)
              </button>
            </div>

            {cameraSource === 'rtsp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-slate)' }}>Camera Label (Optional):</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Gym Main Gate Camera"
                    value={cameraName}
                    onChange={(e) => setCameraName(e.target.value)}
                    disabled={cameraRunning}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-slate)' }}>RTSP Network Stream URL:</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="rtsp://admin:password@ip:554/cam/realmonitor?channel=1"
                      value={rtspUrl}
                      onChange={(e) => setRtspUrl(e.target.value)}
                      disabled={cameraRunning}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="button button-primary"
                      onClick={() => applyCameraSource('rtsp')}
                      disabled={cameraRunning || applyStatus === 'applying'}
                      style={{ minWidth: '130px' }}
                    >
                      {applyStatus === 'applying' && '⏳ APPLYING...'}
                      {applyStatus === 'success' && '✓ SAVED!'}
                      {applyStatus === 'error' && '❌ FAILED'}
                      {!applyStatus && '⚡ APPLY URL'}
                    </button>
                  </div>
                </div>

                {applyStatus === 'success' && (
                  <div className="url-apply-toast success-toast">
                    <span>✨</span>
                    <span>{applyMessage}</span>
                  </div>
                )}
                {applyStatus === 'error' && (
                  <div className="url-apply-toast error-toast">
                    <span>⚠️</span>
                    <span>{applyMessage}</span>
                  </div>
                )}
              </div>
            )}

            <div className="camera-status-bar">
              <span className="camera-status-indicator">
                <span className={`status-dot ${cameraStatus?.status === 'connected' || cameraStatus?.status === 'ready' ? 'active' : ''}`} />
                <span>Active Device: {cameraStatus?.name || 'Camera'} ({(cameraStatus?.source || 'webcam').toUpperCase()})</span>
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--c-mocha)' }}>
                {cameraStatus?.status === 'connected' || cameraStatus?.status === 'ready' ? 'CONNECTED & READY' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Live Camera Box */}
          <div className="card camera-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>
                <span>📹 LIVE FEED</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--c-slate-light)', fontWeight: 600 }}>({cameraStatus?.name || 'Camera'})</span>
              </h2>
              <div className="status-pill-badge" style={{ padding: '4px 12px' }}>
                <span className={`status-dot ${cameraRunning ? 'active' : ''}`} />
                <span>{cameraRunning ? 'STREAMING' : 'IDLE'}</span>
              </div>
            </div>

            {/* Smart Door Access Status Bar */}
            <div className={`door-access-indicator ${recognitionState?.door_status?.open ? 'door-unlocked' : (recognitionState?.door_status?.status === 'LOCKED' ? 'door-denied' : 'door-idle')}`}>
              <div className="door-indicator-left">
                <div className="door-indicator-icon">
                  {recognitionState?.door_status?.open ? '🚪🔓' : (recognitionState?.door_status?.status === 'LOCKED' ? '🚫🔒' : '🚪🔒')}
                </div>
                <div>
                  <div className="door-indicator-title">
                    <span className="door-indicator-badge">{recognitionState?.door_status?.badge || '🔒 DOOR SECURED'}</span>
                    {recognitionState?.door_status?.person_name && (
                      <span className="door-indicator-name">— {recognitionState.door_status.person_name}</span>
                    )}
                  </div>
                  <div className="door-indicator-msg">
                    {recognitionState?.door_status?.message || 'Access Control System Ready'}
                  </div>
                </div>
              </div>
              <div className="door-pulse-indicator">
                {recognitionState?.door_status?.trial_info && (
                  <span className="door-countdown-badge">
                    ⏳ {recognitionState.door_status.trial_info}
                  </span>
                )}
                <span className={`door-light ${recognitionState?.door_status?.open ? 'green' : (recognitionState?.door_status?.status === 'LOCKED' ? 'red' : 'gray')}`} />
              </div>
            </div>

            <div className="camera-container">
              {cameraRunning ? (
                <img
                  src="/video"
                  alt="Live Camera"
                  className="camera-feed"
                />
              ) : (
                <div className="camera-placeholder">
                  <div className="placeholder-icon">📷</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E2E8F0' }}>Camera is Offline</p>
                  <p className="placeholder-hint">Click "START CAMERA" to begin live AI facial detection</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="sidebar-section">
          {/* Today's Attendance Feed Card */}
          <div className="card detected-people-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>📅 TODAY'S LOGS</h2>
              <span className="count-badge">{(todayAttendance || []).length} Entries</span>
            </div>

            <div className="detected-people-list">
              {(todayAttendance || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--c-slate-light)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📋</div>
                  <p style={{ fontWeight: 700, color: 'var(--c-slate)' }}>No Attendance Yet Today</p>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Members passing the camera will appear here</p>
                </div>
              ) : (
                (todayAttendance || []).map((record, index) => (
                  <div 
                    key={index} 
                    className="person-card-compact"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedProfilePerson({ id: record.person_id, name: record.name })}
                    title="Click to view Member Workout Heatmap & Profile"
                  >
                    <div className="person-compact-avatar">
                      {record.name ? record.name.charAt(0).toUpperCase() : '👤'}
                    </div>
                    <div className="person-compact-info">
                      <div className="person-compact-name">{record.name}</div>
                      <div className="person-compact-meta">
                        <span>🆔 {record.person_id}</span>
                        <span>•</span>
                        <span>⏱️ {record.first_detected}</span>
                      </div>
                    </div>
                    <div>
                      {renderMembershipBadge(record.person_id, record)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System AI Health Monitor Card */}
          <div className="card">
            <h2>🧠 AI SYSTEM HEALTH</h2>
            <div className="system-status-list">
              <div className="system-status-item">
                <span className="system-status-label">Face Detector (YuNet)</span>
                <span className="system-status-pill ready">READY (ONNX)</span>
              </div>
              <div className="system-status-item">
                <span className="system-status-label">Feature Extractor (SFace)</span>
                <span className="system-status-pill ready">READY (128-D)</span>
              </div>
              <div className="system-status-item">
                <span className="system-status-label">Camera Video Engine</span>
                <span className={`system-status-pill ${cameraRunning ? 'active' : 'offline'}`}>
                  {cameraRunning ? 'ONLINE' : 'STOPPED'}
                </span>
              </div>
              <div className="system-status-item">
                <span className="system-status-label">IoU Face Tracker</span>
                <span className={`system-status-pill ${cameraRunning ? 'active' : 'offline'}`}>
                  {cameraRunning ? `${recognitionState?.active_tracks || 0} ACTIVE` : 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Card Hero Stats Ribbon */}
      <div className="stats-ribbon">
        <div className="stat-ribbon-card">
          <div className="stat-ribbon-icon-box sage">📅</div>
          <div className="stat-ribbon-info">
            <span className="stat-ribbon-value">{(todayAttendance || []).length}</span>
            <span className="stat-ribbon-label">Today's Attendance</span>
          </div>
        </div>

        <div className="stat-ribbon-card">
          <div className="stat-ribbon-icon-box mocha">⏱️</div>
          <div className="stat-ribbon-info">
            <span className="stat-ribbon-value">{(todayVisits || []).length}</span>
            <span className="stat-ribbon-label">Total Sightings</span>
          </div>
        </div>

        <div className="stat-ribbon-card">
          <div className="stat-ribbon-icon-box slate">👥</div>
          <div className="stat-ribbon-info">
            <span className="stat-ribbon-value">{recognitionState?.registered_people || systemStatus?.registered_people || 0}</span>
            <span className="stat-ribbon-label">Registered Members</span>
          </div>
        </div>

        <div className="stat-ribbon-card">
          <div className="stat-ribbon-icon-box ochre">⚡</div>
          <div className="stat-ribbon-info">
            <span className="stat-ribbon-value">{Number(recognitionState?.fps || 0).toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--c-slate-light)' }}>FPS</span></span>
            <span className="stat-ribbon-label">{recognitionState?.active_tracks || 0} Active Faces</span>
          </div>
        </div>
      </div>

      {/* Live Financial & Peak Workout Analytics Graphs Section */}
      <AnalyticsGraphs />

      {/* Detailed Member Profile & Calendar Heatmap Modal */}
      {selectedProfilePerson && (
        <MemberProfileModal
          personId={selectedProfilePerson.id}
          personName={selectedProfilePerson.name}
          onClose={() => setSelectedProfilePerson(null)}
        />
      )}

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>REGISTER NEW PERSON</h2>
            <p className="modal-description">
              Please stand in front of the camera and enter the person's name.
              The system will collect face embeddings to register the person.
            </p>
            <div className="form-group">
              <label>Person Name:</label>
              <input
                type="text"
                className="input"
                placeholder="Enter full name"
                value={registrationName}
                onChange={(e) => setRegistrationName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={cancelRegistration}
              >
                CANCEL
              </button>
              <button
                className="button button-primary"
                onClick={startRegistration}
              >
                START REGISTRATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;