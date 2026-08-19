import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getPersonMembership, calculateMembershipInfo } from '../utils/membershipUtils';
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
    people: []
  });
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationName, setRegistrationName] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [todayVisits, setTodayVisits] = useState([]);
  const [memberships, setMemberships] = useState([]);
  
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
        setRecognitionState(response.data);
        setCameraRunning(response.data.camera);
      } catch (error) {
        console.error('Error fetching state:', error);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

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

  const renderMembershipBadge = (personId) => {
    const mem = getPersonMembership(personId, memberships);
    const info = calculateMembershipInfo(mem);
    return (
      <span className={`membership-pill ${info.badgeClass}`} title={`Membership: ${info.label}`}>
        {info.badgeText}
      </span>
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>DASHBOARD</h1>
        <div className="camera-controls">
          <button
            className={`button ${cameraRunning ? 'button-danger' : 'button-success'}`}
            onClick={cameraRunning ? stopCamera : startCamera}
          >
            {cameraRunning ? 'STOP CAMERA' : 'START CAMERA'}
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

      {registrationStatus && (
        <div className="registration-status">
          {registrationStatus}
        </div>
      )}

      {/* Camera Source Selector */}
      <div className="card">
        <h2>CAMERA SOURCE</h2>
        <div className="camera-source-section">
          <div className="form-group">
            <label>Source:</label>
            <select
              className="input"
              value={cameraSource}
              onChange={(e) => handleCameraSourceChange(e.target.value)}
              disabled={cameraRunning}
            >
              <option value="webcam">Webcam</option>
              <option value="rtsp">CCTV / RTSP</option>
            </select>
          </div>
          
          {cameraSource === 'rtsp' && (
            <>
              <div className="form-group">
                <label>Camera Name (Optional):</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Put Camera Name"
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  disabled={cameraRunning}
                />
              </div>
              <div className="form-group">
                <label>RTSP URL:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="rtsp://admin:12345abc@192.168.2.253:554/cam/realmonitor?channel=2&subtype=0"
                    value={rtspUrl}
                    onChange={(e) => setRtspUrl(e.target.value)}
                    disabled={cameraRunning}
                    style={{ flex: 1 }}
                  />
                  <button
                    className={`button ${applyStatus === 'success' ? 'button-success-applied' : 'button-primary'}`}
                    onClick={() => applyCameraSource('rtsp')}
                    disabled={cameraRunning || applyStatus === 'applying'}
                    style={{ minWidth: '120px', transition: 'all 0.3s ease' }}
                  >
                    {applyStatus === 'applying' && '⏳ APPLYING...'}
                    {applyStatus === 'success' && '✓ APPLIED!'}
                    {applyStatus === 'error' && '❌ ERROR'}
                    {!applyStatus && '⚡ APPLY URL'}
                  </button>
                </div>
              </div>

              {/* Success / Error Feedback Banner */}
              {applyStatus === 'success' && (
                <div className="url-apply-toast success-toast">
                  <span className="toast-icon">✨</span>
                  <span className="toast-text">{applyMessage}</span>
                </div>
              )}
              {applyStatus === 'error' && (
                <div className="url-apply-toast error-toast">
                  <span className="toast-icon">⚠️</span>
                  <span className="toast-text">{applyMessage}</span>
                </div>
              )}
            </>
          )}
          
          <div className="camera-status-display">
            <span className={`status-indicator ${cameraStatus.status === 'connected' ? 'online' : 'offline'}`}>
              {cameraStatus.status === 'connected' ? '●' : '○'}
            </span>
            <span className="camera-status-text">
              {cameraStatus.name} - {cameraStatus.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="camera-section">
          <div className="card camera-card">
            <h2>LIVE CAMERA - {cameraStatus.name}</h2>
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
                  <p>Camera is offline</p>
                  <p className="placeholder-hint">Click "START CAMERA" to begin</p>
                </div>
              )}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-value">{todayAttendance.length}</div>
              <div className="stat-label">Attendance Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-value">{todayVisits.length}</div>
              <div className="stat-label">Visits Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">●</div>
              <div className="stat-value">{recognitionState.active_tracks}</div>
              <div className="stat-label">Active Tracks</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-value">{recognitionState.fps.toFixed(1)}</div>
              <div className="stat-label">FPS</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{recognitionState.registered_people}</div>
              <div className="stat-label">Registered</div>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="card system-status-card">
            <h2>SYSTEM STATUS</h2>
            <div className="status-list">
              <div className="status-item">
                <span className="status-label">Camera</span>
                <span className={`status-value ${cameraRunning ? 'online' : 'offline'}`}>
                  {cameraRunning ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">YuNet</span>
                <span className="status-value online">READY</span>
              </div>
              <div className="status-item">
                <span className="status-label">SFace</span>
                <span className="status-value online">READY</span>
              </div>
              <div className="status-item">
                <span className="status-label">Database</span>
                <span className="status-value online">READY</span>
              </div>
              <div className="status-item">
                <span className="status-label">Tracking</span>
                <span className={`status-value ${cameraRunning ? 'online' : 'offline'}`}>
                  {cameraRunning ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>

          <div className="card detected-people-card">
            <h2>TODAY'S ATTENDANCE <span className="count">{todayAttendance.length}</span></h2>
            <div className="detected-people-list">
              {todayAttendance.length === 0 ? (
                <div className="no-detections">
                  <div className="no-detections-icon">📅</div>
                  <p>No attendance recorded today</p>
                </div>
              ) : (
                todayAttendance.map((record, index) => (
                  <div key={index} className="person-card">
                    <div className="person-header">
                      <span className="person-status-icon">✓</span>
                      <span className="person-name">{record.name}</span>
                    </div>
                    <div className="person-details">
                      <div className="person-detail">
                        <span className="detail-label">ID:</span>
                        <span className="detail-value">{record.person_id}</span>
                      </div>
                      <div className="person-detail">
                        <span className="detail-label">First Time:</span>
                        <span className="detail-value">{record.first_detected}</span>
                      </div>
                      <div className="person-detail">
                        <span className="detail-label">Gym Pass:</span>
                        {renderMembershipBadge(record.person_id)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

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