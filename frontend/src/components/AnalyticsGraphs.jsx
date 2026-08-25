import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AnalyticsGraphs.css';

function AnalyticsGraphs() {
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

  const monthly = analyticsData?.monthly_revenue || [];
  const hourly = analyticsData?.hourly_rush || [];
  const kpis = analyticsData?.kpis || {};

  // Maximum values for graph scaling
  const maxMonthlyRevenue = Math.max(...monthly.map(m => m.revenue), 10000);
  const maxHourlyCount = Math.max(...hourly.map(h => h.count), 5);

  return (
    <div className="analytics-graphs-section">
      <div className="analytics-section-header">
        <div>
          <h2>📊 GYM INSIGHTS & PERFORMANCE ANALYTICS</h2>
          <p className="analytics-subtitle">
            Live Monthly Financial Collections & 24-Hour Peak Workout Footfall
          </p>
        </div>

        <div className="analytics-kpi-chips">
          <div className="kpi-chip rev">
            <span className="kpi-chip-label">This Month:</span>
            <span className="kpi-chip-val">{formatCurrency(kpis.this_month_revenue)}</span>
            {kpis.growth_percentage !== 0 && (
              <span className={`kpi-growth ${kpis.growth_percentage > 0 ? 'up' : 'down'}`}>
                {kpis.growth_percentage > 0 ? `▲ +${kpis.growth_percentage}%` : `▼ ${kpis.growth_percentage}%`}
              </span>
            )}
          </div>

          <div className="kpi-chip peak">
            <span className="kpi-chip-label">🔥 Peak Rush:</span>
            <span className="kpi-chip-val">{kpis.peak_rush_window || '6:00 PM - 9:00 PM'}</span>
          </div>
        </div>
      </div>

      <div className="analytics-cards-grid">
        {/* Graph 1: Monthly Revenue Bar Chart */}
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

          {loading ? (
            <div className="chart-loading">Loading financial charts...</div>
          ) : (
            <div className="bar-chart-container">
              <div className="bar-chart-canvas">
                {monthly.map((m, idx) => {
                  const heightPercent = Math.max(8, (m.revenue / maxMonthlyRevenue) * 100);
                  const isCurrentMonth = idx === monthly.length - 1;

                  return (
                    <div key={m.month} className="bar-column">
                      <div className="bar-value-tooltip">
                        {formatCurrency(m.revenue)}
                        <div className="bar-tooltip-sub">{m.transactions} passes</div>
                      </div>

                      <div className="bar-track">
                        <div 
                          className={`bar-fill ${isCurrentMonth ? 'current' : ''}`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          {m.revenue > 0 && (
                            <span className="bar-inner-label">{Math.round(m.revenue / 1000)}k</span>
                          )}
                        </div>
                      </div>

                      <span className={`bar-label ${isCurrentMonth ? 'active' : ''}`}>
                        {m.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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

          {loading ? (
            <div className="chart-loading">Loading footfall charts...</div>
          ) : (
            <div className="bar-chart-container">
              <div className="bar-chart-canvas rush-canvas">
                {hourly.map((h) => {
                  const heightPercent = maxHourlyCount > 0 ? Math.max(6, (h.count / maxHourlyCount) * 100) : 6;

                  return (
                    <div key={h.hour} className="bar-column rush-col">
                      <div className="bar-value-tooltip">
                        <strong>{h.label}</strong>
                        <div>{h.count} member check-ins</div>
                        <div className={`rush-intensity-tag ${h.intensity}`}>{h.intensity.toUpperCase()}</div>
                      </div>

                      <div className="bar-track">
                        <div 
                          className={`bar-fill rush-bar ${h.intensity}`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                      </div>

                      <span className="bar-label rush-hour-label">
                        {h.hour % 2 === 0 ? `${h.hour <= 12 ? h.hour : h.hour - 12}${h.hour < 12 ? 'a' : 'p'}` : ''}
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
