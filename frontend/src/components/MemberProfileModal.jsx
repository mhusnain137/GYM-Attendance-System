import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MemberProfileModal.css';
import { openWhatsApp, generateWhatsAppReminderText } from '../utils/whatsappUtils';

function MemberProfileModal({ personId, personName, onClose, onOpenRenew, onOpenWhatsApp }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CALENDAR'); // 'CALENDAR' | 'HISTORY' | 'PAYMENTS'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [cropImgError, setCropImgError] = useState(false);

  useEffect(() => {
    if (personId) {
      fetchProfile();
    }
  }, [personId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/people/${personId}/profile`);
      if (res.data && res.data.status === 'success') {
        setProfileData(res.data);
      }
    } catch (e) {
      console.error('Error fetching member profile:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!personId) return null;

  // Calendar Day Calculation for selectedMonth and selectedYear
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 is Sun

  const daysInCurrentMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDayIndex = getFirstDayOfMonth(selectedYear, selectedMonth);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const m = profileData?.membership;
  const metrics = profileData?.metrics || {};
  const calendarMap = profileData?.attendance_calendar || {};

  // Build grid of days
  const calendarDays = [];
  // Empty leading cells
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({ empty: true, key: `empty-${i}` });
  }

  let monthAttendanceCount = 0;
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = calendarMap[dStr];
    const isAttended = !!entry;
    if (isAttended) monthAttendanceCount++;

    calendarDays.push({
      empty: false,
      day: d,
      dateStr: dStr,
      attended: isAttended,
      details: entry,
      key: `day-${d}`
    });
  }

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="profile-modal-header">
          <div className="profile-header-left">
            <div className="profile-avatar-large">
              {!cropImgError ? (
                <img 
                  src={`/api/crop/${personId}?t=${Date.now()}`} 
                  alt="" 
                  onError={() => setCropImgError(true)} 
                />
              ) : (
                <span className="profile-avatar-initial">
                  {personName ? personName.charAt(0).toUpperCase() : 'M'}
                </span>
              )}
            </div>
            <div className="profile-header-titles">
              <h2>{profileData?.person?.name || personName}</h2>
              <div className="profile-id-badges">
                <span className="profile-badge-id">🆔 {personId}</span>
                {profileData?.person?.phone && (
                  <span className="profile-badge-phone">📱 {profileData.person.phone}</span>
                )}
                {m && (
                  <span className={`profile-badge-plan ${m.status === 'ACTIVE' ? 'active' : m.status === 'FROZEN' ? 'frozen' : 'expired'}`}>
                    {m.status === 'FROZEN' ? '❄️ FROZEN' : m.status === 'ACTIVE' ? `🟢 ${m.plan_name || 'Active Pass'}` : '🚨 EXPIRED'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-header-actions">
            {profileData?.person?.phone && (
              <button 
                className="btn-profile-whatsapp"
                title="Send WhatsApp Message"
                onClick={() => {
                  if (onOpenWhatsApp && m) {
                    onClose();
                    onOpenWhatsApp(m);
                  } else {
                    const text = generateWhatsAppReminderText(m || { person_name: personName, person_id: personId }, 'Gym Management');
                    openWhatsApp(profileData.person.phone, text);
                  }
                }}
              >
                💬 WhatsApp
              </button>
            )}
            {m && onOpenRenew && (
              <button 
                className="btn-profile-renew"
                title="Renew Membership Pass"
                onClick={() => {
                  onClose();
                  onOpenRenew(m);
                }}
              >
                🔄 Renew Pass
              </button>
            )}
            <button className="profile-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* 4-Card Hero Consistency Metrics Row */}
        <div className="profile-metrics-row">
          <div className="metric-box streak">
            <div className="metric-icon">🔥</div>
            <div className="metric-data">
              <span className="metric-value">{metrics.current_streak || 0} <small>Days</small></span>
              <span className="metric-label">Current Streak</span>
            </div>
          </div>

          <div className="metric-box best">
            <div className="metric-icon">🏆</div>
            <div className="metric-data">
              <span className="metric-value">{metrics.best_streak || 0} <small>Days</small></span>
              <span className="metric-label">Best Consistency</span>
            </div>
          </div>

          <div className="metric-box month">
            <div className="metric-icon">📅</div>
            <div className="metric-data">
              <span className="metric-value">{metrics.visits_this_month || 0} <small>Days</small></span>
              <span className="metric-label">This Month Visits</span>
            </div>
          </div>

          <div className="metric-box lifetime">
            <div className="metric-icon">💪</div>
            <div className="metric-data">
              <span className="metric-value">{metrics.total_lifetime_visits || 0} <small>Total</small></span>
              <span className="metric-label">Lifetime Workouts</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'CALENDAR' ? 'active' : ''}`}
            onClick={() => setActiveTab('CALENDAR')}
          >
            📆 Workout Calendar Heatmap
          </button>
          <button 
            className={`tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            📋 Attendance Logs ({profileData?.recent_attendance?.length || 0})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'PAYMENTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('PAYMENTS')}
          >
            💳 Pass & Payment History
          </button>
          <button 
            className={`tab-btn ${activeTab === 'CAFE' ? 'active' : ''}`}
            onClick={() => setActiveTab('CAFE')}
          >
            🥤 Cafe & Nutrition ({profileData?.cafe_history?.length || 0})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="profile-modal-body">
          {loading ? (
            <div className="profile-loading-box">
              <div className="spinner"></div>
              <span>Loading Member Profile & Workout Analytics...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: CALENDAR HEATMAP */}
              {activeTab === 'CALENDAR' && (
                <div className="calendar-tab-pane">
                  <div className="calendar-controls-bar">
                    <div className="calendar-month-selector">
                      <button className="month-nav-btn" onClick={handlePrevMonth}>◀</button>
                      <span className="month-display-text">
                        {monthNames[selectedMonth]} {selectedYear}
                      </span>
                      <button className="month-nav-btn" onClick={handleNextMonth}>▶</button>
                    </div>

                    <div className="calendar-summary-pill">
                      <span>Attended: <strong>{monthAttendanceCount} / {daysInCurrentMonth} Days</strong></span>
                      <span className="consistency-rate">
                        ({Math.round((monthAttendanceCount / daysInCurrentMonth) * 100)}% Consistency)
                      </span>
                    </div>
                  </div>

                  {/* Day Names Header */}
                  <div className="calendar-weekdays-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
                      <div key={w} className="weekday-header-cell">{w}</div>
                    ))}
                  </div>

                  {/* Calendar Days Matrix */}
                  <div className="calendar-days-grid">
                    {calendarDays.map((c) => {
                      if (c.empty) {
                        return <div key={c.key} className="day-cell empty"></div>;
                      }
                      return (
                        <div 
                          key={c.key} 
                          className={`day-cell ${c.attended ? 'attended' : 'rest-day'}`}
                          title={c.attended ? `✓ Workout on ${c.dateStr} at ${c.details?.first_detected || ''}` : `Rest day (${c.dateStr})`}
                        >
                          <span className="day-num">{c.day}</span>
                          {c.attended ? (
                            <div className="attended-indicator">
                              <span className="check-icon">✓</span>
                              <span className="time-sub">{c.details?.first_detected?.slice(0, 5)}</span>
                            </div>
                          ) : (
                            <span className="rest-dot">•</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="calendar-legend">
                    <div className="legend-item">
                      <span className="legend-box attended"></span>
                      <span>Gym Workout Day</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-box rest"></span>
                      <span>Rest Day / Absent</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATTENDANCE LOGS */}
              {activeTab === 'HISTORY' && (
                <div className="history-tab-pane">
                  {profileData?.recent_attendance?.length === 0 ? (
                    <div className="empty-tab-state">No attendance records found.</div>
                  ) : (
                    <table className="profile-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Entry Time</th>
                          <th>Status</th>
                          <th>Detected Camera</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData?.recent_attendance?.map((att, idx) => (
                          <tr key={idx}>
                            <td><strong>📅 {att.date}</strong></td>
                            <td>⏱️ {att.first_detected || '--:--'}</td>
                            <td><span className="status-pill-badge-mini active">✓ Present</span></td>
                            <td style={{ color: 'var(--c-slate-light)', fontSize: '0.8rem' }}>
                              📹 {att.camera_name || att.camera_source || 'Main Gate CCTV'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: PAYMENTS & MEMBERSHIPS */}
              {activeTab === 'PAYMENTS' && (
                <div className="payments-tab-pane">
                  {profileData?.all_memberships?.length === 0 ? (
                    <div className="empty-tab-state">No membership records found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {profileData?.all_memberships?.map((mem) => (
                        <div key={mem.membership_id} className="membership-history-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '1rem', color: 'var(--c-slate)' }}>{mem.plan_name || 'Membership Pass'}</strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--c-slate-light)', marginLeft: '8px' }}>({mem.membership_id})</span>
                            </div>
                            <span className={`status-pill-badge-mini ${mem.status === 'ACTIVE' ? 'active' : mem.status === 'FROZEN' ? 'frozen' : 'expired'}`}>
                              {mem.status}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '10px', fontSize: '0.82rem' }}>
                            <div>
                              <span style={{ color: 'var(--c-slate-light)' }}>Period:</span>
                              <div style={{ fontWeight: 700 }}>📅 {mem.start_date} ➔ {mem.expiry_date}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--c-slate-light)' }}>Amount:</span>
                              <div style={{ fontWeight: 800, color: 'var(--c-mocha)' }}>{formatCurrency(mem.amount)}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--c-slate-light)' }}>Payment:</span>
                              <div style={{ fontWeight: 700 }}>{mem.payment_status} • {mem.payment_method || 'CASH'}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--c-slate-light)' }}>Reminders:</span>
                              <div style={{ fontWeight: 700 }}>{mem.reminder_count ? `✓ Sent ${mem.reminder_count}x` : 'None'}</div>
                            </div>
                          </div>

                          {mem.notes && (
                            <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--c-mocha)', background: 'var(--c-mocha-light)', padding: '4px 8px', borderRadius: '4px' }}>
                              📝 Note: {mem.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CAFE & NUTRITION HISTORY */}
              {activeTab === 'CAFE' && (
                <div className="payments-tab-pane">
                  {/* Summary metrics header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>TOTAL SPENT</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                        Rs. {profileData?.cafe_metrics?.total_spent_pkr || 0}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PROTEIN FUEL</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                        ~{profileData?.cafe_metrics?.total_protein_g || 0}g
                      </div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>TOTAL CALORIES</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>
                        ~{profileData?.cafe_metrics?.total_calories_kcal || 0} kcal
                      </div>
                    </div>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>UNPAID TAB / KHATA</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c084fc' }}>
                        Rs. {profileData?.cafe_metrics?.cafe_tab_balance || 0}
                      </div>
                    </div>
                  </div>

                  {/* Settle Khata Button */}
                  {profileData?.cafe_metrics?.cafe_tab_balance > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                      <button
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}
                        onClick={async () => {
                          const curTab = profileData.cafe_metrics.cafe_tab_balance;
                          const payAmount = prompt(`Enter amount paid by ${personName || 'member'} to clear Khata tab (Max Rs. ${curTab}):`, curTab);
                          if (payAmount && !isNaN(payAmount) && Number(payAmount) > 0) {
                            try {
                              await axios.post(`/api/cafe/members/${personId}/settle-tab`, {
                                amount_paid: Number(payAmount),
                                payment_method: 'CASH'
                              });
                              alert(`Successfully settled Rs. ${payAmount} for ${personName || 'member'}`);
                              fetchProfile();
                            } catch (err) {
                              console.error('Error settling tab:', err);
                              alert('Failed to settle tab balance');
                            }
                          }
                        }}
                      >
                        💳 Settle / Clear Khata Balance (Rs. {profileData.cafe_metrics.cafe_tab_balance})
                      </button>
                    </div>
                  )}

                  {/* Orders list */}
                  {(!profileData?.cafe_history || profileData.cafe_history.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--c-slate-light)' }}>
                      No cafe or shake orders recorded for this member yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {profileData.cafe_history.map(order => (
                        <div key={order.id} className="membership-history-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '0.95rem', color: '#fff' }}>#{order.id}</strong>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '8px' }}>
                                {new Date(order.created_at).toLocaleString()}
                              </span>
                            </div>
                            <span className="status-pill-badge-mini active">
                              Rs. {order.total_amount} [{order.payment_method}]
                            </span>
                          </div>

                          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#e2e8f0' }}>
                            {order.items?.map((it, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                <span>• {it.qty}x {it.name} {it.addons?.length > 0 ? `(${it.addons.join(', ')})` : ''}</span>
                                <span style={{ color: '#10b981' }}>Rs. {it.item_total}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberProfileModal;
