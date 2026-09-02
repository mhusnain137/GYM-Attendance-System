import React, { useState, useEffect, useMemo } from 'react';
import './MemberWorkouts.css';

export default function MemberWorkouts() {
  const [logs, setLogs] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState('ALL');
  const [searchExercise, setSearchExercise] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [collapsedMap, setCollapsedMap] = useState({});

  const toggleCard = (logId) => {
    setCollapsedMap(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [logsRes, peopleRes] = await Promise.all([
        fetch('/api/workout/admin/all-logs'),
        fetch('/api/people')
      ]);
      const logsData = await logsRes.json();
      const peopleData = await peopleRes.json();

      if (logsData.status === 'success' && Array.isArray(logsData.logs)) {
        setLogs(logsData.logs);
      }
      if (Array.isArray(peopleData)) {
        setPeople(peopleData);
      }
    } catch (err) {
      console.error('Error loading member workouts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Member filter
      if (selectedMember !== 'ALL' && log.member_id !== selectedMember) {
        return false;
      }
      // Date filter
      if (dateFilter === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (log.date !== todayStr) return false;
      } else if (dateFilter === 'WEEK') {
        const d = new Date(log.date || log.timestamp);
        const now = new Date();
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateFilter === 'MONTH') {
        const d = new Date(log.date || log.timestamp);
        const now = new Date();
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
      // Exercise search
      if (searchExercise.trim()) {
        const q = searchExercise.toLowerCase();
        const hasEx = (log.exercises || []).some(ex => 
          ex.name.toLowerCase().includes(q) || (ex.category || '').toLowerCase().includes(q)
        );
        const hasRoutine = (log.template_name || '').toLowerCase().includes(q);
        if (!hasEx && !hasRoutine) return false;
      }
      return true;
    });
  }, [logs, selectedMember, searchExercise, dateFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalSessions = logs.length;
    const uniqueMembers = new Set(logs.map(l => l.member_id)).size;
    const totalVolume = logs.reduce((acc, l) => acc + (l.total_volume_kg || 0), 0);
    
    // Top routine
    const routineCounts = {};
    logs.forEach(l => {
      const name = l.template_name || 'Workout';
      routineCounts[name] = (routineCounts[name] || 0) + 1;
    });
    let topRoutine = 'None';
    let maxC = 0;
    for (const [r, count] of Object.entries(routineCounts)) {
      if (count > maxC) {
        maxC = count;
        topRoutine = r;
      }
    }

    return {
      totalSessions,
      uniqueMembers,
      totalVolume: Math.round(totalVolume),
      topRoutine
    };
  }, [logs]);

  return (
    <div className="member-workouts-container">
      {/* Header */}
      <div className="mw-header-row">
        <div>
          <h2 className="mw-title">
            <span className="mw-icon">🏋️</span> Member Workout & Exercise Activity
          </h2>
          <p className="mw-subtitle">
            Track which member performed which exercises, sets, weights, reps, and overall lifting volume.
          </p>
        </div>
        <button className="mw-refresh-btn" onClick={fetchLogs} disabled={loading}>
          {loading ? '⏳ Loading...' : '🔄 Refresh Activity'}
        </button>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="mw-stats-ribbon">
        <div className="mw-stat-card">
          <span className="mw-stat-icon">📝</span>
          <div className="mw-stat-info">
            <span className="mw-stat-label">Total Sessions Logged</span>
            <span className="mw-stat-value">{stats.totalSessions}</span>
          </div>
        </div>

        <div className="mw-stat-card">
          <span className="mw-stat-icon">👥</span>
          <div className="mw-stat-info">
            <span className="mw-stat-label">Active Lifters</span>
            <span className="mw-stat-value">{stats.uniqueMembers} Members</span>
          </div>
        </div>

        <div className="mw-stat-card">
          <span className="mw-stat-icon">🔥</span>
          <div className="mw-stat-info">
            <span className="mw-stat-label">Total Gym Volume</span>
            <span className="mw-stat-value">{stats.totalVolume.toLocaleString()} kg</span>
          </div>
        </div>

        <div className="mw-stat-card">
          <span className="mw-stat-icon">⚡</span>
          <div className="mw-stat-info">
            <span className="mw-stat-label">Most Popular Routine</span>
            <span className="mw-stat-value">{stats.topRoutine}</span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="mw-filters-bar">
        <div className="mw-filter-group">
          <label>Filter by Member:</label>
          <select 
            value={selectedMember} 
            onChange={(e) => setSelectedMember(e.target.value)}
            className="mw-select"
          >
            <option value="ALL">🌟 All Gym Members ({people.length})</option>
            {people.map(p => {
              const id = p.person_id || p.id;
              return (
                <option key={id} value={id}>
                  {p.name} ({id})
                </option>
              );
            })}
          </select>
        </div>

        <div className="mw-filter-group" style={{ flex: 1, minWidth: '220px' }}>
          <label>Search Exercise:</label>
          <input
            type="text"
            placeholder="Search exercise (e.g. Bench Press, Squats, Incline)..."
            value={searchExercise}
            onChange={(e) => setSearchExercise(e.target.value)}
            className="mw-input"
          />
        </div>

        <div className="mw-filter-group">
          <label>Date Range:</label>
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="mw-select"
          >
            <option value="ALL">📅 All Time</option>
            <option value="TODAY">☀️ Today Only</option>
            <option value="WEEK">⚡ Last 7 Days</option>
            <option value="MONTH">🗓️ Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Sessions Activity List */}
      <div className="mw-content-area">
        {loading ? (
          <div className="mw-empty-box">
            <span style={{ fontSize: '2.5rem' }}>⏳</span>
            <p>Loading member workout logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="mw-empty-box">
            <span style={{ fontSize: '2.8rem' }}>📋</span>
            <h3 style={{ margin: '0.5rem 0', color: 'var(--c-slate, #344054)' }}>No Workout Sessions Found</h3>
            <p style={{ margin: 0, color: 'var(--text-muted, #667085)', fontSize: '0.9rem' }}>
              {selectedMember !== 'ALL' || searchExercise
                ? 'No workouts matched your selected member or exercise filter.'
                : 'No member has logged a workout session yet. When members complete workouts, their exercises will show up here.'}
            </p>
          </div>
        ) : (
          <div className="mw-logs-list">
            {filteredLogs.map(log => {
              const isExpanded = !collapsedMap[log.id];
              const formattedDate = log.date || (log.timestamp ? log.timestamp.slice(0, 10) : 'N/A');
              const formattedTime = log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div key={log.id} className={`mw-log-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
                  {/* Card Header Row */}
                  <div className="mw-log-header" onClick={() => toggleCard(log.id)}>
                    <div className="mw-member-ident">
                      <div className="mw-avatar-circle">
                        {(log.member_name || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="mw-member-name-row">
                          <h4 className="mw-member-name">{log.member_name}</h4>
                          <span className="mw-member-id-badge">{log.member_id}</span>
                        </div>
                        <div className="mw-session-meta">
                          <span className="mw-routine-tag">⚡ {log.template_name}</span>
                          <span>📅 {formattedDate} {formattedTime && `• ⏰ ${formattedTime}`}</span>
                          <span>⏱️ {log.duration_minutes || 45} mins</span>
                        </div>
                      </div>
                    </div>

                    <div className="mw-summary-stats">
                      <div className="mw-sum-item">
                        <span className="mw-sum-label">Volume Lifted</span>
                        <strong className="mw-sum-val mw-vol">{(log.total_volume_kg || 0).toLocaleString()} kg</strong>
                      </div>
                      <div className="mw-sum-item">
                        <span className="mw-sum-label">Completed Sets</span>
                        <strong className="mw-sum-val mw-sets">{log.total_sets || 0} Sets ({log.total_reps || 0} Reps)</strong>
                      </div>
                      <div className="mw-sum-item">
                        <span className="mw-sum-label">Exercises</span>
                        <strong className="mw-sum-val">{log.exercises?.length || log.exercises_count || 0} Done</strong>
                      </div>
                      <button 
                        type="button" 
                        className="mw-toggle-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCard(log.id);
                        }}
                      >
                        {isExpanded ? '▲ Hide Details' : '▼ View Exercises'}
                      </button>
                    </div>
                  </div>

                  {/* Exercises Details Table / List (Collapsible) */}
                  {isExpanded && (
                    <div className="mw-exercises-section">
                      <div className="mw-section-title">
                        <span>🏋️ Exercises Performed During This Session:</span>
                      </div>

                      <div className="mw-exercises-grid">
                        {(log.exercises || []).map((ex, exIdx) => {
                          const completedCount = (ex.sets || []).filter(s => s.is_completed).length;

                          return (
                            <div key={exIdx} className="mw-exercise-box">
                              <div className="mw-ex-head">
                                <div className="mw-ex-name">
                                  <span className="mw-ex-num">{exIdx + 1}</span>
                                  <strong>{ex.name}</strong>
                                </div>
                                <span className="mw-ex-cat">{ex.category || 'General'}</span>
                              </div>

                              {/* Sets breakdown */}
                              <div className="mw-sets-row">
                                {(ex.sets || []).map((set, sIdx) => (
                                  <div 
                                    key={sIdx} 
                                    className={`mw-set-pill ${set.is_completed ? 'completed' : 'uncompleted'}`}
                                    title={set.is_completed ? 'Completed set' : 'Planned set'}
                                  >
                                    <span className="mw-set-num">S{set.set_num || sIdx + 1}</span>
                                    <strong className="mw-set-wt">{set.weight_kg}kg</strong>
                                    <span className="mw-set-reps">× {set.reps} reps</span>
                                    <span className="mw-set-status">{set.is_completed ? '✓' : '○'}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="mw-ex-footer">
                                <span>Completed: <strong>{completedCount} of {ex.sets?.length || 0} sets</strong></span>
                                {ex.total_volume_kg > 0 && (
                                  <span className="mw-ex-vol">Vol: {ex.total_volume_kg} kg</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Member Notes if provided */}
                      {log.notes && (
                        <div className="mw-notes-box">
                          💬 <strong>Member Reflection / Note:</strong> <em>"{log.notes}"</em>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
