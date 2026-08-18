import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { calculateMembershipInfo, formatCurrency } from '../utils/membershipUtils';
import './Membership.css';

function Membership() {
  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState([]);
  const [people, setPeople] = useState([]);
  const [summary, setSummary] = useState({
    total_memberships: 0,
    active_memberships: 0,
    expiring_soon: 0,
    expired_memberships: 0,
    total_revenue: 0
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'FROZEN'
  const [sortBy, setSortBy] = useState('expiry_date');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [selectedMembership, setSelectedMembership] = useState(null);
  const [formData, setFormData] = useState({
    person_id: '',
    plan_id: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    amount: 5000,
    payment_status: 'PAID',
    payment_method: 'CASH',
    reference_id: '',
    notes: '',
    freeze_reason: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [memRes, plansRes, peopleRes, sumRes] = await Promise.all([
        axios.get('/api/memberships'),
        axios.get('/api/membership-plans'),
        axios.get('/api/people'),
        axios.get('/api/memberships/summary')
      ]);

      setMemberships(memRes.data || []);
      setPlans(plansRes.data || []);
      setPeople(peopleRes.data || []);
      setSummary(sumRes.data || {});
    } catch (error) {
      console.error('Error fetching membership data:', error);
    }
  };

  const calculateExpiryDate = (startDate, planId) => {
    if (!startDate || !planId || planId === 'custom') return '';
    const plan = plans.find(p => p.plan_id === planId);
    const start = new Date(startDate);
    let expiry;

    if (plan) {
      switch (plan.duration_unit) {
        case 'day':
          expiry = new Date(start.getTime() + plan.duration * 24 * 60 * 60 * 1000);
          break;
        case 'week':
          expiry = new Date(start.getTime() + plan.duration * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          expiry = new Date(start);
          expiry.setMonth(expiry.getMonth() + plan.duration);
          break;
        case 'year':
          expiry = new Date(start);
          expiry.setFullYear(expiry.getFullYear() + plan.duration);
          break;
        default:
          expiry = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      if (planId === 'daily') expiry = new Date(start.getTime() + 1 * 24 * 60 * 60 * 1000);
      else if (planId === 'weekly') expiry = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      else if (planId === 'yearly') expiry = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
      else expiry = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    return expiry ? expiry.toISOString().split('T')[0] : '';
  };

  const handlePlanChange = (planId, currentStartDate) => {
    const selectedPlan = plans.find(p => p.plan_id === planId);
    let amount = 5000;
    if (selectedPlan) {
      amount = selectedPlan.price === 0 ? '' : selectedPlan.price;
    }
    const expiry = calculateExpiryDate(currentStartDate, planId);

    setFormData(prev => ({
      ...prev,
      plan_id: planId,
      amount: amount,
      expiry_date: expiry
    }));
  };

  const handleAddMembership = async (e) => {
    e.preventDefault();
    if (!formData.person_id) {
      alert('Please select a member');
      return;
    }

    try {
      const expiry = formData.expiry_date || calculateExpiryDate(formData.start_date, formData.plan_id);
      const payload = { 
        ...formData, 
        amount: parseFloat(formData.amount) || 0,
        expiry_date: expiry 
      };

      const res = await axios.post('/api/memberships', payload);
      if (res.data.status === 'success' || res.data.membership_id) {
        setShowAddModal(false);
        resetForm();
        fetchAllData();
      } else {
        alert(res.data.message || 'Failed to create membership');
      }
    } catch (error) {
      console.error('Error adding membership:', error);
      alert('Error creating membership');
    }
  };

  const handleUpdateMembership = async (e) => {
    e.preventDefault();
    if (!selectedMembership) return;

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount) || 0
      };
      const res = await axios.put(`/api/memberships/${selectedMembership.membership_id}`, payload);
      if (res.data.status === 'success') {
        setShowEditModal(false);
        resetForm();
        fetchAllData();
      } else {
        alert(res.data.message || 'Failed to update membership');
      }
    } catch (error) {
      console.error('Error updating membership:', error);
      alert('Error updating membership');
    }
  };

  const handleRenewMembership = async (e) => {
    e.preventDefault();
    if (!selectedMembership) return;

    try {
      const expiry = formData.expiry_date || calculateExpiryDate(formData.start_date, formData.plan_id);
      const payload = { 
        ...formData, 
        amount: parseFloat(formData.amount) || 0,
        expiry_date: expiry 
      };

      const res = await axios.post(`/api/memberships/${selectedMembership.membership_id}/renew`, payload);
      if (res.data.status === 'success') {
        setShowRenewModal(false);
        resetForm();
        fetchAllData();
      } else {
        alert(res.data.message || 'Failed to renew membership');
      }
    } catch (error) {
      console.error('Error renewing membership:', error);
      alert('Error renewing membership');
    }
  };

  const handleFreezeMembership = async (e) => {
    e.preventDefault();
    if (!selectedMembership) return;

    try {
      const res = await axios.post(`/api/memberships/${selectedMembership.membership_id}/freeze`, {
        reason: formData.freeze_reason
      });
      if (res.data.status === 'success') {
        setShowFreezeModal(false);
        resetForm();
        fetchAllData();
      } else {
        alert(res.data.message || 'Failed to freeze membership');
      }
    } catch (error) {
      console.error('Error freezing membership:', error);
      alert('Error freezing membership');
    }
  };

  const handleUnfreezeMembership = async (membershipId) => {
    try {
      const res = await axios.post(`/api/memberships/${membershipId}/unfreeze`);
      if (res.data.status === 'success') {
        fetchAllData();
      }
    } catch (error) {
      console.error('Error unfreezing membership:', error);
    }
  };

  const handleDeleteMembership = async (membershipId) => {
    if (!window.confirm('Are you sure you want to delete this membership record?')) return;
    try {
      await axios.delete(`/api/memberships/${membershipId}`);
      fetchAllData();
    } catch (error) {
      console.error('Error deleting membership:', error);
      alert('Failed to delete membership');
    }
  };

  const openHistoryModal = async (membership) => {
    setSelectedMembership(membership);
    try {
      const res = await axios.get(`/api/memberships/${membership.membership_id}/history`);
      setSelectedMembership({ ...membership, history: res.data });
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error fetching history:', error);
      setShowHistoryModal(true);
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      person_id: '',
      plan_id: 'monthly',
      start_date: today,
      expiry_date: calculateExpiryDate(today, 'monthly'),
      amount: 5000,
      payment_status: 'PAID',
      payment_method: 'CASH',
      reference_id: '',
      notes: '',
      freeze_reason: ''
    });
    setSelectedMembership(null);
  };

  const openAddModal = () => {
    resetForm();
    if (people.length > 0) {
      const firstPerson = people[0].id || people[0].person_id;
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        person_id: firstPerson,
        start_date: today,
        expiry_date: calculateExpiryDate(today, 'monthly')
      }));
    }
    setShowAddModal(true);
  };

  const openEditModal = (m) => {
    setSelectedMembership(m);
    setFormData({
      person_id: m.person_id || '',
      plan_id: m.plan_id || 'monthly',
      start_date: m.start_date || new Date().toISOString().split('T')[0],
      expiry_date: m.expiry_date || '',
      amount: m.amount || 0,
      payment_status: m.payment_status || 'PAID',
      payment_method: 'CASH',
      reference_id: '',
      notes: m.notes || '',
      freeze_reason: ''
    });
    setShowEditModal(true);
  };

  const openRenewModal = (m) => {
    setSelectedMembership(m);
    const today = new Date().toISOString().split('T')[0];
    const startDate = m.expiry_date && m.expiry_date < today ? today : m.expiry_date || today;
    const expiryDate = calculateExpiryDate(startDate, m.plan_id || 'monthly');

    setFormData({
      person_id: m.person_id,
      plan_id: m.plan_id || 'monthly',
      start_date: startDate,
      expiry_date: expiryDate,
      amount: m.amount || 5000,
      payment_status: 'PAID',
      payment_method: 'CASH',
      reference_id: '',
      notes: 'Renewal',
      freeze_reason: ''
    });
    setShowRenewModal(true);
  };

  // Enrich memberships with calculated info
  const enrichedMemberships = memberships.map(m => {
    const info = calculateMembershipInfo(m);
    const personObj = people.find(p => p.id === m.person_id || p.person_id === m.person_id);
    const personName = m.person_name || personObj?.name || m.person_id || 'Member';

    return {
      ...m,
      person_name: personName,
      info
    };
  });

  // Filter & Sort
  const filteredMemberships = enrichedMemberships
    .filter(m => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        m.person_name.toLowerCase().includes(q) ||
        m.person_id.toLowerCase().includes(q) ||
        m.membership_id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filter === 'ACTIVE') return m.info.isActive && !m.info.isExpiringSoon;
      if (filter === 'EXPIRING_SOON') return m.info.isExpiringSoon;
      if (filter === 'EXPIRED') return m.info.isExpired;
      if (filter === 'FROZEN') return m.info.isFrozen;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'expiry_date') return new Date(a.expiry_date || 0) - new Date(b.expiry_date || 0);
      if (sortBy === 'name') return a.person_name.localeCompare(b.person_name);
      if (sortBy === 'amount') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'remaining_days') return a.info.daysLeft - b.info.daysLeft;
      return 0;
    });

  return (
    <div className="membership-container">
      {/* Top Header Banner */}
      <div className="membership-header">
        <div>
          <h1 className="membership-title">💳 Membership Management</h1>
          <p className="membership-subtitle">Track gym passes, renewal dates, and payment history</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          ➕ Add New Membership
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon blue">👥</div>
          <div>
            <span className="summary-label">Total Members</span>
            <div className="summary-value">{summary.total_memberships || memberships.length}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon green">🟢</div>
          <div>
            <span className="summary-label">Active Memberships</span>
            <div className="summary-value">{summary.active_memberships || enrichedMemberships.filter(m => m.info.isActive).length}</div>
          </div>
        </div>

        <div className="summary-card clickable" onClick={() => setFilter('EXPIRING_SOON')}>
          <div className="summary-icon yellow">⚠️</div>
          <div>
            <span className="summary-label">Expiring Soon (7d)</span>
            <div className="summary-value warning-text">{summary.expiring_soon || enrichedMemberships.filter(m => m.info.isExpiringSoon).length}</div>
          </div>
        </div>

        <div className="summary-card clickable" onClick={() => setFilter('EXPIRED')}>
          <div className="summary-icon red">🚨</div>
          <div>
            <span className="summary-label">Expired</span>
            <div className="summary-value danger-text">{summary.expired_memberships || enrichedMemberships.filter(m => m.info.isExpired).length}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon purple">💰</div>
          <div>
            <span className="summary-label">Total Revenue</span>
            <div className="summary-value">{formatCurrency(summary.total_revenue || 0)}</div>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Filter Tabs & Sort */}
      <div className="controls-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by member name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>}
        </div>

        <div className="filter-tabs">
          <button className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
            All ({enrichedMemberships.length})
          </button>
          <button className={`tab-btn ${filter === 'ACTIVE' ? 'active' : ''}`} onClick={() => setFilter('ACTIVE')}>
            Active
          </button>
          <button className={`tab-btn warning ${filter === 'EXPIRING_SOON' ? 'active' : ''}`} onClick={() => setFilter('EXPIRING_SOON')}>
            ⚠️ Expiring Soon
          </button>
          <button className={`tab-btn danger ${filter === 'EXPIRED' ? 'active' : ''}`} onClick={() => setFilter('EXPIRED')}>
            🚨 Expired
          </button>
          <button className={`tab-btn ${filter === 'FROZEN' ? 'active' : ''}`} onClick={() => setFilter('FROZEN')}>
            ❄️ Frozen
          </button>
        </div>

        <div className="sort-box">
          <span>Sort By:</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="expiry_date">Expiry Date (Soonest)</option>
            <option value="remaining_days">Remaining Days</option>
            <option value="name">Member Name</option>
            <option value="amount">Amount</option>
          </select>
        </div>
      </div>

      {/* Memberships Grid Cards */}
      {filteredMemberships.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Memberships Found</h3>
          <p>No membership records match your search query or selected filter.</p>
          <button className="btn-secondary" onClick={() => { setSearchTerm(''); setFilter('ALL'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredMemberships.map((m) => {
            const initial = m.person_name ? m.person_name.charAt(0).toUpperCase() : '?';
            return (
              <div key={m.membership_id} className={`membership-card ${m.info.status.toLowerCase()}`}>
                {/* Top Member Header */}
                <div className="card-top">
                  <div className="member-avatar">
                    <span>{initial}</span>
                  </div>
                  <div className="member-meta">
                    <h3 className="member-name">{m.person_name}</h3>
                    <div className="member-ids">
                      <span className="person-id">{m.person_id}</span>
                      <span className="membership-id">{m.membership_id}</span>
                    </div>
                  </div>
                </div>

                {/* Expiry / Countdown Status Banner */}
                <div className={`status-banner ${m.info.badgeClass}`}>
                  <span className="status-text">{m.info.badgeText}</span>
                  <span className="status-sublabel">{m.info.label}</span>
                </div>

                {/* Info Fields Grid */}
                <div className="card-info-grid">
                  <div className="info-item">
                    <span className="info-label">Plan</span>
                    <span className="info-value highlight">{m.plan_name || m.plan_id}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Amount</span>
                    <span className="info-value">{formatCurrency(m.amount)}</span>
                  </div>

                  <div className="info-item full">
                    <span className="info-label">Membership Period</span>
                    <span className="info-value dates">
                      📅 {m.start_date} <span className="arrow">→</span> {m.expiry_date}
                    </span>
                  </div>

                  <div className="info-item">
                    <span className="info-label">Payment</span>
                    <span className={`payment-badge ${(m.payment_status || 'PAID').toLowerCase()}`}>
                      {m.payment_status || 'PAID'}
                    </span>
                  </div>

                  {m.notes && (
                    <div className="info-item full notes">
                      <span className="info-label">Notes</span>
                      <span className="info-value text-muted">{m.notes}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons Toolbar */}
                <div className="card-actions">
                  <button className="action-btn renew" title="Renew Membership" onClick={() => openRenewModal(m)}>
                    🔄 Renew
                  </button>

                  <button className="action-btn edit" title="Edit Details" onClick={() => openEditModal(m)}>
                    ✏️ Edit
                  </button>

                  {m.status === 'FROZEN' ? (
                    <button className="action-btn unfreeze" title="Unfreeze Membership" onClick={() => handleUnfreezeMembership(m.membership_id)}>
                      ☀️ Unfreeze
                    </button>
                  ) : (
                    <button className="action-btn freeze" title="Freeze Membership" onClick={() => { setSelectedMembership(m); setShowFreezeModal(true); }}>
                      ❄️ Freeze
                    </button>
                  )}

                  <button className="action-btn history" title="View History" onClick={() => openHistoryModal(m)}>
                    📜 History
                  </button>

                  <button className="action-btn delete" title="Delete Record" onClick={() => handleDeleteMembership(m.membership_id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Membership Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>➕ Add New Membership</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMembership}>
              <div className="form-group">
                <label>Select Member:</label>
                <select
                  value={formData.person_id}
                  onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                  required
                >
                  {people.map(p => (
                    <option key={p.id || p.person_id} value={p.id || p.person_id}>
                      {p.name} ({p.id || p.person_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Membership Plan:</label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => handlePlanChange(e.target.value, formData.start_date)}
                  >
                    {plans.map(p => (
                      <option key={p.plan_id} value={p.plan_id}>
                        {p.name} ({formatCurrency(p.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (PKR):</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, amount: val === '' ? '' : (isNaN(parseFloat(val)) ? '' : val) });
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date:</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const expiry = calculateExpiryDate(newStart, formData.plan_id);
                      setFormData({ ...formData, start_date: newStart, expiry_date: expiry });
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date:</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Payment Status:</label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  >
                    <option value="PAID">PAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Method:</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  >
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                    <option value="BANK TRANSFER">BANK TRANSFER</option>
                    <option value="EASYPAISA / JAZZCASH">EASYPAISA / JAZZCASH</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notes / Comments:</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Membership</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>✏️ Edit Membership</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateMembership}>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date:</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Expiry Date:</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount:</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, amount: val === '' ? '' : (isNaN(parseFloat(val)) ? '' : val) });
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Payment Status:</label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  >
                    <option value="PAID">PAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Membership</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>🔄 Renew Membership</h2>
              <button className="close-btn" onClick={() => setShowRenewModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRenewMembership}>
              <div className="form-group">
                <label>Renewal Plan:</label>
                <select
                  value={formData.plan_id}
                  onChange={(e) => handlePlanChange(e.target.value, formData.start_date)}
                >
                  {plans.map(p => (
                    <option key={p.plan_id} value={p.plan_id}>
                      {p.name} ({formatCurrency(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>New Start Date:</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const expiry = calculateExpiryDate(newStart, formData.plan_id);
                      setFormData({ ...formData, start_date: newStart, expiry_date: expiry });
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>New Expiry Date:</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Renewal Amount:</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, amount: val === '' ? '' : (isNaN(parseFloat(val)) ? '' : val) });
                  }}
                  placeholder="0"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowRenewModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Confirm Renewal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Freeze Modal */}
      {showFreezeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>❄️ Freeze Membership</h2>
              <button className="close-btn" onClick={() => setShowFreezeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFreezeMembership}>
              <p className="modal-description">
                Freezing will pause the membership status for member {selectedMembership?.person_name}.
              </p>
              <div className="form-group">
                <label>Reason for Freeze:</label>
                <textarea
                  rows="3"
                  value={formData.freeze_reason}
                  onChange={(e) => setFormData({ ...formData, freeze_reason: e.target.value })}
                  placeholder="e.g. Traveling / Medical reason"
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFreezeModal(false)}>Cancel</button>
                <button type="submit" className="btn-warning">Freeze Now</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedMembership && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📜 Membership & Payment History</h2>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="history-body">
              <div className="history-member-info">
                <h3>{selectedMembership.person_name} ({selectedMembership.person_id})</h3>
                <p>Membership ID: {selectedMembership.membership_id}</p>
              </div>

              <h4>Payment Records</h4>
              {selectedMembership.history && selectedMembership.history.length > 0 ? (
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Payment ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMembership.history.map(p => (
                        <tr key={p.payment_id}>
                          <td>{p.payment_id}</td>
                          <td>{p.payment_date}</td>
                          <td>{formatCurrency(p.amount)}</td>
                          <td><span className="payment-badge paid">{p.payment_status}</span></td>
                          <td>{p.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No prior payment history recorded for this membership.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Membership;
