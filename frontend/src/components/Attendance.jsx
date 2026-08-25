import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getPersonMembership, calculateMembershipInfo } from '../utils/membershipUtils';
import MemberProfileModal from './MemberProfileModal';
import './Attendance.css';

// Dedicated avatar component that handles face crops with graceful fallback
function PersonAvatar({ name, personId, size = 44, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const initial = name && name.trim() ? name.trim().charAt(0).toUpperCase() : '?';
  const cropUrl = `/api/face-crops/${personId}.jpg`;

  return (
    <div 
      className={`member-avatar ${className}`}
      style={{ width: size, height: size, minWidth: size, maxWidth: size }}
    >
      {!imgError ? (
        <img 
          src={cropUrl} 
          alt="" 
          className="member-crop-img" 
          onError={() => setImgError(true)} 
        />
      ) : (
        <span className="member-avatar-initial">{initial}</span>
      )}
    </div>
  );
}

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [visits, setVisits] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI Controls state
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'visits'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [customDate, setCustomDate] = useState('');

  // Profile Modal State
  const [selectedProfilePerson, setSelectedProfilePerson] = useState(null); // { id, name }

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
    if (!recordDate) return false;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (dateFilter === 'today') return recordDate === todayStr;
    if (dateFilter === 'yesterday') return recordDate === getYesterdayStr();
    
    if (dateFilter === 'week') {
      const recDate = new Date(recordDate + 'T00:00:00');
      const diffTime = today - recDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    
    if (dateFilter === 'month') {
      const currentYearMonth = todayStr.substring(0, 7); // 'YYYY-MM'
      return recordDate.startsWith(currentYearMonth);
    }
    
    if (dateFilter === 'custom' && customDate) {
      return recordDate === customDate;
    }
    
    return true; // 'all'
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

  // KPI Calculations
  const todayStr = getTodayStr();
  const todayVisitsList = visits.filter(v => v.date === todayStr);
  const todayUniqueMembersCount = new Set(todayVisitsList.map(v => v.person_id)).size;

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

  // CSV Export Function
  const exportToCSV = () => {
    if (sortedVisitGroups.length === 0) {
      alert('No visit records to export for this filter.');
      return;
    }

    const headers = ['Person ID', 'Name', 'Date', 'First Detected', 'Last Sighting', 'Total Sightings', 'Camera Source', 'Membership Status'];
    const rows = sortedVisitGroups.map(group => {
      const attMatch = attendance.find(a => a.person_id === group.person_id && a.date === group.date);
      const firstTime = attMatch ? attMatch.first_detected : group.visits[0]?.time;
      const lastTime = group.visits[group.visits.length - 1]?.time || firstTime;
      const camSource = group.visits[0]?.camera_source === 'rtsp' ? `CCTV (${group.visits[0]?.camera_name || 'Camera'})` : 'Webcam';
      const mem = getPersonMembership(group.person_id, memberships, group.name);
      const info = calculateMembershipInfo(mem);

      return [
        `"${group.person_id}"`,
        `"${group.name}"`,
        `"${group.date}"`,
        `"${formatTime(firstTime)}"`,
        `"${formatTime(lastTime)}"`,
        `"${group.visits.length}"`,
        `"${camSource}"`,
        `"${info.label}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gym_visits_report_${dateFilter}_${getTodayStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {/* 📊 3-Card Simplified Top Summary Ribbon (Visits Page) */}
      {activeTab === 'visits' && (
        <div className="visits-kpi-ribbon">
          <div className="kpi-card kpi-card-green">
            <div className="kpi-icon-wrap">🟢</div>
            <div className="kpi-content">
              <span className="kpi-label">UNIQUE MEMBERS TODAY</span>
              <h3 className="kpi-value">{todayUniqueMembersCount} <span className="kpi-unit">Members</span></h3>
              <p className="kpi-subtext">Active distinct footfall today</p>
            </div>
          </div>

          <div className="kpi-card kpi-card-blue">
            <div className="kpi-icon-wrap">👥</div>
            <div className="kpi-content">
              <span className="kpi-label">TOTAL CAMERA SIGHTINGS</span>
              <h3 className="kpi-value">{totalVisitsCount} <span className="kpi-unit">Appearances</span></h3>
              <p className="kpi-subtext">Detection events in selected filter</p>
            </div>
          </div>

          <div className="kpi-card kpi-card-amber">
            <div className="kpi-icon-wrap">📋</div>
            <div className="kpi-content">
              <span className="kpi-label">MATCHING SESSIONS</span>
              <h3 className="kpi-value">{sortedVisitGroups.length} <span className="kpi-unit">Records</span></h3>
              <p className="kpi-subtext">Grouped member sessions</p>
            </div>
          </div>
        </div>
      )}

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
          <button 
            className={`filter-chip ${dateFilter === 'week' ? 'active' : ''}`}
            onClick={() => setDateFilter('week')}
          >
            This Week
          </button>
          <button 
            className={`filter-chip ${dateFilter === 'month' ? 'active' : ''}`}
            onClick={() => setDateFilter('month')}
          >
            This Month
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
              title="Filter by custom date"
            />
          </div>
        </div>

        {/* Dual View Toggle & CSV Export for Visits Tab */}
        {activeTab === 'visits' && (
          <div className="visits-toolbar-actions">
            <div className="view-toggle-group">
              <button 
                className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Cards Grid View"
              >
                🪟 Cards
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Data Table View"
              >
                📊 Table
              </button>
            </div>

            <button 
              className="btn-export-csv"
              onClick={exportToCSV}
              title="Download filtered records as CSV/Excel"
            >
              📥 Export CSV
            </button>
          </div>
        )}
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
                    <div 
                      key={index} 
                      className="attendance-record-card"
                      onClick={() => setSelectedProfilePerson({ id: record.person_id, name: record.name })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="record-header">
                        <div className="record-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <PersonAvatar name={record.name} personId={record.person_id} size={40} />
                          <div>
                            <span className="record-name">{record.name}</span>
                            <span className="record-pid-sub">({record.person_id})</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="status-badge present">Present</span>
                          <button
                            className="btn-icon-delete"
                            title="Delete Attendance Record"
                            onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(record); }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="record-details">
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
        /* ================= VISIT HISTORY TAB (DUAL VIEWS) ================= */
        sortedVisitGroups.length === 0 ? (
          <div className="no-events">
            <div className="no-events-icon">⏱️</div>
            <p>No visit tracking records found for this search / filter.</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Style A: 🪟 Session Cards View (Visual & Modern Grid) */
          <div className="visits-list">
            {sortedVisitGroups.map((group, groupIdx) => {
              const attMatch = attendance.find(
                a => a.person_id === group.person_id && a.date === group.date
              );
              const firstTime = attMatch ? attMatch.first_detected : group.visits[0]?.time;
              const lastTime = group.visits[group.visits.length - 1]?.time || firstTime;

              return (
                <div 
                  key={groupIdx} 
                  className="card visit-person-card clickable-session-card"
                  onClick={() => setSelectedProfilePerson({ id: group.person_id, name: group.name })}
                >
                  <div className="visit-card-header">
                    <div className="visit-person-info">
                      <PersonAvatar name={group.name} personId={group.person_id} size={50} />
                      <div>
                        <div className="visit-name-row">
                          <h3 className="visit-person-name">{group.name}</h3>
                          <span className="visit-person-id">{group.person_id}</span>
                        </div>
                        <div className="visit-header-tags">
                          {renderMembershipBadge(group.person_id, group.name)}
                          <span className="visit-cam-tag">
                            {group.visits[0]?.camera_source === 'rtsp' ? `📹 CCTV` : '📷 Webcam'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="visit-summary-badges">
                      <span className="visit-date-badge">📅 {formatDate(group.date)}</span>
                      <span className="first-time-badge">⭐ First In: {formatTime(firstTime)}</span>
                      <span className="last-time-badge">🚪 Last Seen: {formatTime(lastTime)}</span>
                      <span className="visit-count-badge">🔄 Total Sightings: {group.visits.length}</span>
                      <button 
                        className="btn-card-profile" 
                        onClick={(e) => { e.stopPropagation(); setSelectedProfilePerson({ id: group.person_id, name: group.name }); }}
                      >
                        👁️ Profile
                      </button>
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
        ) : (
          /* Style B: 📊 Audit Data Table View (Tabular Format) */
          <div className="card audit-table-container">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>DATE</th>
                  <th>FIRST DETECTED</th>
                  <th>LAST SIGHTING</th>
                  <th>TOTAL SIGHTINGS</th>
                  <th>MEMBERSHIP</th>
                  <th>CAMERA</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sortedVisitGroups.map((group, groupIdx) => {
                  const attMatch = attendance.find(
                    a => a.person_id === group.person_id && a.date === group.date
                  );
                  const firstTime = attMatch ? attMatch.first_detected : group.visits[0]?.time;
                  const lastTime = group.visits[group.visits.length - 1]?.time || firstTime;

                  return (
                    <tr 
                      key={groupIdx} 
                      className="audit-row"
                      onClick={() => setSelectedProfilePerson({ id: group.person_id, name: group.name })}
                    >
                      <td>
                        <div className="audit-member-cell">
                          <PersonAvatar name={group.name} personId={group.person_id} size={36} />
                          <div>
                            <strong className="audit-member-name">{group.name}</strong>
                            <span className="audit-member-id">{group.person_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="audit-date-cell">{formatDate(group.date)}</td>
                      <td className="audit-time-cell">
                        <span className="time-pill first">⭐ {formatTime(firstTime)}</span>
                      </td>
                      <td className="audit-time-cell">
                        <span className="time-pill last">🚪 {formatTime(lastTime)}</span>
                      </td>
                      <td>
                        <span className="sightings-pill">
                          🔄 {group.visits.length} {group.visits.length === 1 ? 'sighting' : 'sightings'}
                        </span>
                      </td>
                      <td>{renderMembershipBadge(group.person_id, group.name)}</td>
                      <td>
                        <span className="audit-cam-badge">
                          {group.visits[0]?.camera_source === 'rtsp' ? '📹 CCTV' : '📷 Webcam'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-audit-profile" 
                          onClick={(e) => { e.stopPropagation(); setSelectedProfilePerson({ id: group.person_id, name: group.name }); }}
                          title="View Member Profile & Calendar"
                        >
                          👁️ Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Member Detailed Profile & Workout Calendar Heatmap Modal */}
      {selectedProfilePerson && (
        <MemberProfileModal
          personId={selectedProfilePerson.id}
          personName={selectedProfilePerson.name}
          onClose={() => setSelectedProfilePerson(null)}
        />
      )}
    </div>
  );
}

export default Attendance;