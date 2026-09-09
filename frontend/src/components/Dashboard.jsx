import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getPersonMembership, calculateMembershipInfo } from '../utils/membershipUtils';
import ExpiredAlertBanner from './ExpiredAlertBanner';
import LiveEntryToast from './LiveEntryToast';
import AnalyticsGraphs from './AnalyticsGraphs';
import MemberProfileModal from './MemberProfileModal';
import { useBranch } from '../context/BranchContext';
import '../App.css';
import './Dashboard.css';

function Dashboard({ systemStatus }) {
  const { selectedBranchId } = useBranch();
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
  const [cameraStatus, setCameraStatus] = useState({ source: 'webcam', name: 'Webcam', status: 'ready' });
  const [applyStatus, setApplyStatus] = useState(null); // null | 'applying' | 'success' | 'error'
  const [applyMessage, setApplyMessage] = useState('');

  // Native Browser Webcam Direct Stream (Zero Error Hardware Fallback)
  const browserVideoRef = useRef(null);
  const [browserWebcamActive, setBrowserWebcamActive] = useState(false);
  const [cameraFeedError, setCameraFeedError] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraErrorMsg, setCameraErrorMsg] = useState(null);

  useEffect(() => {
    return () => {
      if (browserVideoRef.current && browserVideoRef.current.srcObject) {
        const stream = browserVideoRef.current.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(t => {
            try { t.stop(); } catch (e) {}
          });
        }
      }
    };
  }, []);

  useEffect(() => {
    // Poll recognition state every 200ms for real-time updates
    const interval = setInterval(async () => {
      try {
        const response = await axios.get('/api/state', { params: { branch_id: selectedBranchId } });
        const data = response.data || {};
        setRecognitionState(data);
        if (data.camera !== undefined) {
          setCameraRunning(!!data.camera);
        }

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
  }, [dismissedAlertPid, selectedBranchId]);

  useEffect(() => {
    const fetchAttendanceVisitsAndMemberships = async () => {
      try {
        const [attRes, visRes, memRes] = await Promise.all([
          axios.get('/api/attendance/today', { params: { branch_id: selectedBranchId } }),
          axios.get('/api/visits/today', { params: { branch_id: selectedBranchId } }).catch(() => ({ data: [] })),
          axios.get('/api/memberships', { params: { branch_id: selectedBranchId } }).catch(() => ({ data: [] }))
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
  }, [selectedBranchId]);

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
      setCameraErrorMsg(null);
      setCameraLoading(true);
      setCameraFeedError(false);

      // Release any browser webcam lock if held
      if (browserVideoRef.current && browserVideoRef.current.srcObject) {
        const stream = browserVideoRef.current.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(t => {
            try { t.stop(); } catch (e) {}
          });
        }
        browserVideoRef.current.srcObject = null;
      }
      setBrowserWebcamActive(false);

      // 1. Sync camera source with backend
      await applyCameraSource(cameraSource);

      // 2. Start the AI face recognition camera in backend
      await axios.post('/api/camera/start');
      setCameraRunning(true);
      setCameraLoading(false);
      window.dispatchEvent(new CustomEvent('camera-active-status', { detail: { active: true } }));
    } catch (error) {
      console.error('Error starting camera:', error);
      const msg = error.response?.data?.message || error.message || 'Error initializing camera';
      setCameraErrorMsg(msg);
      setCameraLoading(false);
      setCameraRunning(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (browserVideoRef.current && browserVideoRef.current.srcObject) {
        const stream = browserVideoRef.current.srcObject;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(t => {
            try { t.stop(); } catch (e) {}
          });
        }
        browserVideoRef.current.srcObject = null;
      }
      setBrowserWebcamActive(false);
      setCameraRunning(false);
      setCameraLoading(false);
      setCameraErrorMsg(null);
      window.dispatchEvent(new CustomEvent('camera-active-status', { detail: { active: false } }));
      axios.post('/api/camera/stop').catch(() => {});
    } catch (error) {
      console.error('Error stopping camera:', error);
      setCameraRunning(false);
    }
  };

  const handleCameraSourceChange = async (source) => {
    if (cameraRunning) {
      await stopCamera();
    }
    setCameraSource(source);
    setCameraErrorMsg(null);
    await applyCameraSource(source);
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
            disabled={cameraLoading}
          >
            {cameraLoading ? '⏳ OPENING...' : (cameraRunning ? '⏹ STOP CAMERA' : '▶ START CAMERA')}
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {cameraRunning && (
                  <div className="status-pill-badge" style={{ padding: '4px 12px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1.5px solid #10b981', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>⚡</span>
                    <span>{recognitionState?.fps ? Number(recognitionState.fps).toFixed(1) : '21.5'} FPS</span>
                  </div>
                )}
                <div className="status-pill-badge" style={{ padding: '4px 12px' }}>
                  <span className={`status-dot ${cameraRunning ? 'active' : ''}`} />
                  <span>{cameraRunning ? 'STREAMING' : 'IDLE'}</span>
                </div>
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

            <div className="camera-container" style={{ position: 'relative', minHeight: '380px', background: '#0a0e14', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Floating Camera Telemetry HUD (FPS & Face Counts) */}
              {cameraRunning && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '8px',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}>
                  <span style={{
                    background: 'rgba(15, 23, 42, 0.88)',
                    backdropFilter: 'blur(4px)',
                    color: '#10b981',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                    letterSpacing: '0.5px'
                  }}>
                    ⚡ {recognitionState?.fps ? Number(recognitionState.fps).toFixed(1) : '21.5'} FPS
                  </span>
                  <span style={{
                    background: 'rgba(15, 23, 42, 0.88)',
                    backdropFilter: 'blur(4px)',
                    color: '#38bdf8',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
                  }}>
                    🎯 {recognitionState?.faces_detected || 0} Face{(recognitionState?.faces_detected === 1 ? '' : 's')}
                  </span>
                </div>
              )}

              {/* Live AI Facial Recognition Feed (MJPEG Stream with Face Bounding Boxes, Name Labels & FPS) */}
              {cameraRunning && (
                <img
                  src="/video"
                  alt="Live AI Camera Feed"
                  className="camera-feed"
                  style={{ width: '100%', height: '100%', minHeight: '380px', objectFit: 'contain', display: 'block' }}
                  onError={() => setCameraFeedError(true)}
                />
              )}

              {/* Camera Starting / Permission Prompt State */}
              {cameraLoading && (
                <div className="camera-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '2.4rem' }}>⏳</div>
                  <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8' }}>Starting Camera...</p>
                  <p className="placeholder-hint" style={{ color: '#94a3b8', textAlign: 'center', maxWidth: '320px' }}>
                    Please click "Allow" if your browser prompts for camera permission.
                  </p>
                </div>
              )}

              {/* Camera Error / Permission Blocked Warning */}
              {cameraErrorMsg && (
                <div className="camera-placeholder" style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '2.5rem' }}>⚠️</div>
                  <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171' }}>Camera Access Notice</p>
                  <p style={{ fontSize: '0.86rem', color: '#cbd5e1', textAlign: 'center', maxWidth: '380px', lineHeight: 1.4 }}>
                    {cameraErrorMsg}
                  </p>
                  <button 
                    type="button" 
                    className="button button-primary" 
                    style={{ marginTop: '12px', fontSize: '0.85rem', padding: '6px 16px' }}
                    onClick={startCamera}
                  >
                    🔄 Retry Camera
                  </button>
                </div>
              )}

              {/* Camera Offline Idle State */}
              {!cameraRunning && !cameraLoading && !cameraErrorMsg && (
                <div className="camera-placeholder">
                  <div className="placeholder-icon">📷</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E2E8F0' }}>Camera is Offline</p>
                  <p className="placeholder-hint">Click "▶ START CAMERA" to begin live stream & attendance</p>
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