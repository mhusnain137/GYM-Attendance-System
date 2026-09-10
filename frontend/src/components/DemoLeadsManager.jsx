import React, { useState, useEffect } from 'react';
import './DemoLeadsManager.css';

export default function DemoLeadsManager() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/saas/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch SaaS leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      setActionLoading(leadId);
      const res = await fetch(`/api/saas/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, is_read: true })
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.lead_id === leadId ? { ...l, status: newStatus, is_read: true } : l));
        window.dispatchEvent(new CustomEvent('saas-leads-updated'));
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/saas/leads/mark-all-read', { method: 'POST' });
      if (res.ok) {
        setLeads(prev => prev.map(l => ({ ...l, is_read: true })));
        window.dispatchEvent(new CustomEvent('saas-leads-updated'));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to remove this lead inquiry?')) return;
    try {
      setActionLoading(leadId);
      const res = await fetch(`/api/saas/leads/${leadId}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.lead_id !== leadId));
        window.dispatchEvent(new CustomEvent('saas-leads-updated'));
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getWhatsAppLink = (lead) => {
    const cleanPhone = (lead.phone || '').replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const msg = encodeURIComponent(
      `Assalam o Alaikum ${lead.contact_name}! This is Titan Gym OS executive team regarding your ${lead.interested_plan || 'Pro'} Plan demo inquiry for ${lead.gym_name} (${lead.city}). Would you like to schedule an interactive turnstile demo today?`
    );
    return `https://wa.me/${intlPhone}?text=${msg}`;
  };

  // Metrics
  const totalCount = leads.length;
  const newCount = leads.filter(l => !l.is_read || l.status === 'NEW').length;
  const scheduledCount = leads.filter(l => l.status === 'DEMO_SCHEDULED').length;
  const convertedCount = leads.filter(l => l.status === 'CONVERTED').length;

  const filteredLeads = leads.filter(l => {
    if (filter === 'NEW') return !l.is_read || l.status === 'NEW';
    if (filter === 'CONTACTED') return l.status === 'CONTACTED';
    if (filter === 'DEMO_SCHEDULED') return l.status === 'DEMO_SCHEDULED';
    if (filter === 'CONVERTED') return l.status === 'CONVERTED';
    return true;
  }).filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.gym_name || '').toLowerCase().includes(q) ||
      (l.contact_name || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q) ||
      (l.interested_plan || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="crm-leads-container">
      {/* Top Header */}
      <div className="crm-header">
        <div>
          <div className="crm-breadcrumb">
            <span>Enterprise B2B</span>
            <span className="sep">/</span>
            <span className="active">SaaS Demo Inquiries & Leads CRM</span>
          </div>
          <h2 className="crm-title">Commercial Demo Leads</h2>
          <p className="crm-subtitle">
            Incoming inquiries from gym owners requesting live facial turnstile demonstrations.
          </p>
        </div>

        <div className="crm-header-actions">
          {newCount > 0 && (
            <button className="crm-btn-secondary" onClick={handleMarkAllRead}>
              ✓ Mark All as Read ({newCount})
            </button>
          )}
          <button className="crm-btn-primary" onClick={fetchLeads} disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh Leads'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="crm-stats-grid">
        <div className="crm-stat-card">
          <div className="stat-label">TOTAL INQUIRIES</div>
          <div className="stat-val">{totalCount}</div>
          <div className="stat-hint">Registered via SaaS Website</div>
        </div>

        <div className="crm-stat-card highlight-amber">
          <div className="stat-label">NEW / UNREAD LEADS</div>
          <div className="stat-val">{newCount}</div>
          <div className="stat-hint">Requires immediate follow-up</div>
        </div>

        <div className="crm-stat-card highlight-blue">
          <div className="stat-label">DEMOS SCHEDULED</div>
          <div className="stat-val">{scheduledCount}</div>
          <div className="stat-hint">Active turnstile presentations</div>
        </div>

        <div className="crm-stat-card highlight-green">
          <div className="stat-label">CONVERTED CLIENTS</div>
          <div className="stat-val">{convertedCount}</div>
          <div className="stat-hint">Active Titan Gym subscribers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="crm-controls-bar">
        <div className="crm-tabs">
          {[
            { id: 'ALL', label: `All Inquiries (${totalCount})` },
            { id: 'NEW', label: `New / Unread (${newCount})` },
            { id: 'CONTACTED', label: 'Contacted' },
            { id: 'DEMO_SCHEDULED', label: 'Demo Scheduled' },
            { id: 'CONVERTED', label: 'Converted' },
          ].map(t => (
            <button
              key={t.id}
              className={`crm-tab-btn ${filter === t.id ? 'active' : ''}`}
              onClick={() => setFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="crm-search-box">
          <input
            type="text"
            placeholder="Search gym, owner, city, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="crm-empty-state">
          <div className="crm-spinner"></div>
          <p>Loading demo inquiries...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="crm-empty-state">
          <div className="empty-icon">📬</div>
          <h3>No leads found in this view</h3>
          <p>When prospective gym owners submit the demo form on your SaaS website, they will appear here in real-time.</p>
        </div>
      ) : (
        <div className="crm-leads-grid">
          {filteredLeads.map((lead) => {
            const isUnread = !lead.is_read || lead.status === 'NEW';
            const dateStr = lead.created_at ? new Date(lead.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Just now';

            return (
              <div key={lead.lead_id} className={`crm-lead-card ${isUnread ? 'unread-card' : ''}`}>
                <div className="card-top-row">
                  <div className="card-id-pill">
                    {lead.lead_id}
                    {isUnread && <span className="new-dot-pill">NEW</span>}
                  </div>
                  <span className="card-time">{dateStr}</span>
                </div>

                <div className="card-gym-name">{lead.gym_name || 'Unnamed Gym'}</div>

                <div className="card-details-grid">
                  <div className="detail-row">
                    <span className="d-label">Director / Owner:</span>
                    <span className="d-val strong">{lead.contact_name}</span>
                  </div>

                  <div className="detail-row">
                    <span className="d-label">Location:</span>
                    <span className="d-val">{lead.city || 'Pakistan'} • {lead.branch_count || 1} Branch{(lead.branch_count || 1) > 1 ? 'es' : ''}</span>
                  </div>

                  <div className="detail-row">
                    <span className="d-label">Contact:</span>
                    <span className="d-val phone-val">{lead.phone}</span>
                  </div>

                  <div className="detail-row">
                    <span className="d-label">Plan Interest:</span>
                    <span className={`plan-badge ${lead.interested_plan?.toLowerCase() || 'pro'}`}>
                      {lead.interested_plan || 'PRO'} PLAN
                    </span>
                  </div>
                </div>

                {lead.notes && (
                  <div className="card-notes-box">
                    <strong>Setup Notes:</strong> {lead.notes}
                  </div>
                )}

                {/* Pipeline Status Select & Quick Actions */}
                <div className="card-footer-actions">
                  <div className="status-selector-wrap">
                    <label>Status:</label>
                    <select
                      value={lead.status || 'NEW'}
                      disabled={actionLoading === lead.lead_id}
                      onChange={(e) => handleStatusChange(lead.lead_id, e.target.value)}
                    >
                      <option value="NEW">New Inquiry</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                      <option value="CONVERTED">Converted / Paid</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  <div className="buttons-group">
                    <a
                      href={getWhatsAppLink(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-action-wa"
                      title="Open WhatsApp Chat"
                      onClick={() => handleStatusChange(lead.lead_id, lead.status === 'NEW' ? 'CONTACTED' : lead.status)}
                    >
                      💬 WhatsApp
                    </a>

                    <a
                      href={`tel:${lead.phone}`}
                      className="btn-action-call"
                      title="Call Owner"
                    >
                      📞 Call
                    </a>

                    <button
                      className="btn-action-del"
                      title="Delete Lead"
                      disabled={actionLoading === lead.lead_id}
                      onClick={() => handleDeleteLead(lead.lead_id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
