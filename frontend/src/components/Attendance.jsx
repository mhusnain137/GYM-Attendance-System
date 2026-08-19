import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getPersonMembership, calculateMembershipInfo } from '../utils/membershipUtils';
import './Attendance.css';

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [visits, setVisits] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI Controls state
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'visits'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'custom'
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    fetchData();

    // Poll for real-time updates every 2 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [attRes, visRes, memRes] = await Promise.all([
        axios.get('/api/attendance'),
        axios.get('/api/visits').catch(() => ({ data: [] })),
        axios.get('/api/memberships').catch(() => ({ data: [] }))
      ]);
      setAttendance(attRes.data || []);
      setVisits(visRes.data || []);
      setMemberships(memRes.data || []);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
    
    const date = new Date();
    date.setHours(hours, minutes, seconds);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const matchesDateFilter = (recordDate) => {
    if (dateFilter === 'today') return recordDate === getTodayStr();
    if (dateFilter === 'yesterday') return recordDate === getYesterdayStr();
    if (dateFilter === 'custom' && customDate) return recordDate === customDate;
    return true;
  };

  const matchesSearch = (personId, personName) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (personId && personId.toLowerCase().includes(q)) ||
      (personName && personName.toLowerCase().includes(q))
    );
  };

  // 1. Filtered Attendance Data
  const filteredAttendance = attendance.filter(record => 
    matchesDateFilter(record.date) && matchesSearch(record.person_id, record.name)
  );

  // Group Attendance by date
  const groupedAttendance = filteredAttendance.reduce((groups, record) => {
    const date = record.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(record);
    return groups;
  }, {});

  const sortedAttendanceDates = Object.keys(groupedAttendance).sort((a, b) => new Date(b) - new Date(a));

  // 2. Filtered Visits Data
  const filteredVisits = visits.filter(record => 
    matchesDateFilter(record.date) && matchesSearch(record.person_id, record.name)
  );

  const groupedVisits = filteredVisits.reduce((groups, record) => {
    const key = `${record.person_id}_${record.date}`;
    const currentName = record.name || record.person_id;
    if (!groups[key]) {
      groups[key] = {
        person_id: record.person_id,
        name: currentName,
        date: record.date,
        visits: []
      };
    } else if (currentName && !currentName.startsWith("Visitor #") && groups[key].name.startsWith("Visitor #")) {
      groups[key].name = currentName;
    }
    groups[key].visits.push(record);
    return groups;
  }, {});

  const sortedVisitGroups = Object.values(groupedVisits).sort((a, b) => {
    if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
    return a.name.localeCompare(b.name);
  });

  const totalVisitsCount = filteredVisits.length;

  const handleDeleteAttendance = async (record) => {
    if (!window.confirm(`Delete attendance record for ${record.name} on ${record.date}?`)) return;
    try {
      await axios.delete('/api/attendance', {
        params: { person_id: record.person_id, date: record.date }
      });
      fetchData(false);
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      alert('Failed to delete attendance record');
    }
  };

  const renderMembershipBadge = (personId, personName = '') => {
    const mem = getPersonMembership(personId, memberships, personName);
    const info = calculateMembershipInfo(mem);
    return (
      <span className={`membership-pill ${info.badgeClass}`} title={`Membership: ${info.label}`}>
        {info.badgeText}
      </span>
    );
  };

  return (
    <div className="attendance">
      <div className="page-header">
        <div>
          <h1>ATTENDANCE & VISIT TRACKING</h1>
          <p className="page-subtitle">Track daily attendance, camera visits, and active gym memberships</p>
        </div>
      </div>

      {/* Main Tabs Switcher */}
      <div className="main-tab-bar">
        <button 
          className={`main-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <span className="tab-icon">📅</span>
          <div className="tab-text">
            <span className="tab-title">DAILY ATTENDANCE</span>
            <span className="tab-sub">First detection per day ({filteredAttendance.length})</span>
          </div>
        </button>

        <button 
          className={`main-tab-btn ${activeTab === 'visits' ? 'active' : ''}`}
          onClick={() => setActiveTab('visits')}
        >
          <span className="tab-icon">⏱️</span>
          <div className="tab-text">
            <span className="tab-title">VISIT HISTORY & TIMELINE</span>
            <span className="tab-sub">Every camera appearance ({totalVisitsCount})</span>
          </div>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card filter-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="input search-input"
            placeholder="Search by Name or Person ID (e.g. Ahmad, P-000001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="date-filter-group">
          <button 
            className={`filter-chip ${dateFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDateFilter('all')}
          >
            All Dates
          </button>
          <button 
            className={`filter-chip ${dateFilter === 'today' ? 'active' : ''}`}
            onClick={() => setDateFilter('today')}
          >
            Today
          </button>
          <button 
            className={`filter-chip ${dateFilter === 'yesterday' ? 'active' : ''}`}
            onClick={() => setDateFilter('yesterday')}
          >
            Yesterday
          </button>
          <div className="custom-date-picker">
            <input 
              type="date"
              className="input date-input"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilter('custom');
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="no-events">
          <div className="no-events-icon">⏳</div>
          <p>Loading attendance & visit records...</p>
        </div>
      ) : activeTab === 'attendance' ? (
        /* ================= DAILY ATTENDANCE TAB ================= */
        filteredAttendance.length === 0 ? (
          <div className="no-events">
            <div className="no-events-icon">📅</div>
            <p>No daily attendance records found for this search / filter.</p>
          </div>
        ) : (
          <div className="attendance-list">
            {sortedAttendanceDates.map(date => (
              <div key={date} className="attendance-date-group">
                <div className="attendance-date-header">
                  <h2>{formatDate(date)}</h2>
                  <span className="count">{groupedAttendance[date].length} Present Today</span>
                </div>
                <div className="attendance-records-grid">
                  {groupedAttendance[date].map((record, index) => (
                    <div key={index} className="attendance-record-card">
                      <div className="record-header">
                        <div className="record-title">
                          <span className="record-icon">✓</span>
                          <span className="record-name">{record.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="status-badge present">Present</span>
                          <button
                            className="btn-icon-delete"
                            title="Delete Attendance Record"
                            onClick={() => handleDeleteAttendance(record)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="record-details">
                        <div className="record-detail">
                          <span className="detail-label">Person ID:</span>
                          <span className="detail-value highlight">{record.person_id}</span>
                        </div>
                        <div className="record-detail">
                          <span className="detail-label">Gym Membership:</span>
                          {renderMembershipBadge(record.person_id, record.name)}
                        </div>
                        <div className="record-detail">
                          <span className="detail-label">First Attendance:</span>
                          <span className="detail-value time-stamp">{formatTime(record.first_detected)}</span>
                        </div>
                        <div className="record-detail">
                          <span className="detail-label">Camera Source:</span>
                          <span className="detail-value camera-badge">
                            {record.camera_source === 'rtsp' ? `📹 CCTV (${record.camera_name || 'IP Cam'})` : `📷 ${record.camera_name || 'Webcam'}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ================= VISIT HISTORY TAB ================= */
        sortedVisitGroups.length === 0 ? (
          <div className="no-events">
            <div className="no-events-icon">⏱️</div>
            <p>No visit tracking records found for this search / filter.</p>
          </div>
        ) : (
          <div className="visits-list">
            {sortedVisitGroups.map((group, groupIdx) => {
              const attMatch = attendance.find(
                a => a.person_id === group.person_id && a.date === group.date
              );
              const firstTime = attMatch ? attMatch.first_detected : group.visits[0]?.time;

              return (
                <div key={groupIdx} className="card visit-person-card">
                  <div className="visit-card-header">
                    <div className="visit-person-info">
                      <div className="visit-avatar">👤</div>
                      <div>
                        <h3 className="visit-person-name">{group.name}</h3>
                        <span className="visit-person-id">ID: {group.person_id}</span>
                      </div>
                    </div>

                    <div className="visit-summary-badges">
                      {renderMembershipBadge(group.person_id, group.name)}
                      <span className="visit-date-badge">📅 {formatDate(group.date)}</span>
                      <span className="first-time-badge">⭐ First In: {formatTime(firstTime)}</span>
                      <span className="visit-count-badge">🔄 Total Appearances: {group.visits.length}</span>
                    </div>
                  </div>

                  <div className="visit-timeline">
                    {group.visits.map((v, vIdx) => (
                      <div key={vIdx} className="visit-timeline-item">
                        <div className="timeline-node"></div>
                        <div className="timeline-content">
                          <span className="visit-time">⏱️ {formatTime(v.time)}</span>
                          <span className="visit-cam-tag">
                            {v.camera_source === 'rtsp' ? '📹 CCTV' : '📷 Webcam'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default Attendance;