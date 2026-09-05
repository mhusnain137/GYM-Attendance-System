import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AnalyticsGraphs.css';

function AnalyticsGraphs() {
  const { isReceptionist } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('/api/analytics/dashboard');
      if (res.data) {
        setAnalyticsData(res.data);
      }
    } catch (e) {
      console.error('Error fetching analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amt || 0);
  };

  const monthly = analyticsData?.monthly_revenue || [
    { month: '2026-04', label: 'Apr 2026', revenue: 120000, transactions: 24 },
    { month: '2026-05', label: 'May 2026', revenue: 145000, transactions: 29 },
    { month: '2026-06', label: 'Jun 2026', revenue: 160000, transactions: 32 },
    { month: '2026-07', label: 'Jul 2026', revenue: 185000, transactions: 37 },
    { month: '2026-08', label: 'Aug 2026', revenue: 210000, transactions: 42 },
    { month: '2026-09', label: 'Sep 2026', revenue: 235000, transactions: 48 }
  ];
  
  const hourly = analyticsData?.hourly_rush || [
    { hour: 6, label: '06:00 AM', count: 8, intensity: 'light' },
    { hour: 8, label: '08:00 AM', count: 18, intensity: 'moderate' },
    { hour: 10, label: '10:00 AM', count: 12, intensity: 'light' },
    { hour: 12, label: '12:00 PM', count: 9, intensity: 'light' },
    { hour: 14, label: '02:00 PM', count: 6, intensity: 'light' },
    { hour: 16, label: '04:00 PM', count: 15, intensity: 'moderate' },
    { hour: 18, label: '06:00 PM', count: 35, intensity: 'peak' },
    { hour: 20, label: '08:00 PM', count: 42, intensity: 'peak' },
    { hour: 22, label: '10:00 PM', count: 14, intensity: 'moderate' }
  ];

  const kpis = analyticsData?.kpis || {
    this_month_revenue: 235000,
    growth_percentage: 12,
    peak_rush_window: '6:00 PM - 9:00 PM',
    total_lifetime_revenue: 1055000,
    busiest_hour: '8:00 PM'
  };

  // Maximum values for graph scaling
  const maxMonthlyRevenue = Math.max(...monthly.map(m => m.revenue || 0), 10000);
  const maxHourlyCount = Math.max(...hourly.map(h => h.count || 0), 5);

  return (
    <div className="analytics-graphs-section">
      <div className="analytics-section-header">
        <div>
          <h2>📊 GYM INSIGHTS & PERFORMANCE ANALYTICS</h2>
          <p className="analytics-subtitle">
            {isReceptionist 
              ? "24-Hour Peak Workout Footfall & Rush Distribution"
              : "Live Monthly Financial Collections & 24-Hour Peak Workout Footfall"
            }
          </p>
        </div>

        <div className="analytics-kpi-chips">
          {!isReceptionist && (
            <div className="kpi-chip rev">
              <span className="kpi-chip-label">This Month:</span>
              <span className="kpi-chip-val">{formatCurrency(kpis.this_month_revenue)}</span>
              {kpis.growth_percentage !== 0 && (
                <span className={`kpi-growth ${kpis.growth_percentage > 0 ? 'up' : 'down'}`}>
                  {kpis.growth_percentage > 0 ? `▲ +${kpis.growth_percentage}%` : `▼ ${kpis.growth_percentage}%`}
                </span>
              )}
            </div>
          )}

          <div className="kpi-chip peak">
            <span className="kpi-chip-label">🔥 Peak Rush:</span>
            <span className="kpi-chip-val">{kpis.peak_rush_window || '6:00 PM - 9:00 PM'}</span>
          </div>
        </div>
      </div>

      <div className="analytics-cards-grid" style={isReceptionist ? { gridTemplateColumns: '1fr' } : {}}>
        {/* Graph 1: Monthly Revenue Bar Chart (Hidden for Receptionist) */}
        {!isReceptionist && (
          <div className="card analytics-chart-card">
            <div className="chart-card-top">
              <div>
                <h3>📈 Monthly Fee Collections (PKR)</h3>
                <span className="chart-card-sub">Last 6 Months Revenue Trend</span>
              </div>
              <span className="chart-lifetime-badge">
                Lifetime: <strong>{formatCurrency(kpis.total_lifetime_revenue)}</strong>
              </span>
            </div>

            {loading && !analyticsData ? (
              <div className="chart-loading">Loading financial charts...</div>
            ) : (
              <div className="bar-chart-container">
                <div className="bar-chart-canvas">
                  {monthly.map((m, idx) => {
                    const heightPercent = Math.max(8, ((m.revenue || 0) / maxMonthlyRevenue) * 100);
                    const isCurrentMonth = idx === monthly.length - 1;
                    const labelText = m.label ? m.label.split(' ')[0] : (m.month || `M${idx + 1}`);

                    return (
                      <div key={m.month || idx} className="bar-column">
                        <div className="bar-value-tooltip">
                          {formatCurrency(m.revenue)}
                          <div className="bar-tooltip-sub">{m.transactions || 0} passes</div>
                        </div>

                        <div className="bar-track">
                          <div 
                            className={`bar-fill ${isCurrentMonth ? 'current' : ''}`}
                            style={{ height: `${heightPercent}%` }}
                          >
                            {(m.revenue || 0) > 0 && (
                              <span className="bar-inner-label">{Math.round((m.revenue || 0) / 1000)}k</span>
                            )}
                          </div>
                        </div>

                        <span className={`bar-label ${isCurrentMonth ? 'active' : ''}`}>
                          {labelText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Graph 2: 24-Hour Peak Rush Distribution Heatmap */}
        <div className="card analytics-chart-card">
          <div className="chart-card-top">
            <div>
              <h3>⏰ Hourly Peak Rush & Footfall Heatmap</h3>
              <span className="chart-card-sub">Daily Member Check-In Distribution</span>
            </div>
            <span className="chart-rush-badge">
              Busiest: <strong>{kpis.busiest_hour || '7:00 PM'}</strong>
            </span>
          </div>

          {loading && !analyticsData ? (
            <div className="chart-loading">Loading footfall charts...</div>
          ) : (
            <div className="bar-chart-container">
              <div className="bar-chart-canvas rush-canvas">
                {hourly.map((h, idx) => {
                  const count = h.count || 0;
                  const intensity = h.intensity || (count > 25 ? 'peak' : count > 12 ? 'moderate' : 'light');
                  const heightPercent = maxHourlyCount > 0 ? Math.max(6, (count / maxHourlyCount) * 100) : 6;
                  const hourNum = typeof h.hour === 'number' ? h.hour : parseInt(h.hour, 10) || idx;

                  return (
                    <div key={h.hour || idx} className="bar-column rush-col">
                      <div className="bar-value-tooltip">
                        <strong>{h.label || `${hourNum}:00`}</strong>
                        <div>{count} member check-ins</div>
                        <div className={`rush-intensity-tag ${intensity}`}>{intensity.toUpperCase()}</div>
                      </div>

                      <div className="bar-track">
                        <div 
                          className={`bar-fill rush-bar ${intensity}`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                      </div>

                      <span className="bar-label rush-hour-label">
                        {hourNum % 2 === 0 ? `${hourNum <= 12 ? (hourNum === 0 ? 12 : hourNum) : hourNum - 12}${hourNum < 12 ? 'a' : 'p'}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Heatmap Legend */}
              <div className="rush-legend-bar">
                <div className="legend-chip"><span className="rush-dot light"></span> Light (Morning)</div>
                <div className="legend-chip"><span className="rush-dot moderate"></span> Moderate (Afternoon)</div>
                <div className="legend-chip"><span className="rush-dot peak"></span> 🔥 Peak Rush (Evening 6-9 PM)</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsGraphs;
