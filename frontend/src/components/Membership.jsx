import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { calculateMembershipInfo, formatCurrency } from '../utils/membershipUtils';
import { formatWhatsAppNumber, generateWhatsAppReminderText, openWhatsApp, formatTemplateMessage, getExpiringMemberships } from '../utils/whatsappUtils';
import MemberProfileModal from './MemberProfileModal';
import { useAuth } from '../context/AuthContext';
import './Membership.css';

// Dedicated avatar component that handles face crops with graceful fallback
function PersonAvatar({ name, personId, size = 52, className = '' }) {
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

const DEFAULT_MEMBERSHIP_PLANS = [
  { plan_id: 'daily', name: 'Daily Pass', duration: 1, duration_unit: 'day', price: 300 },
  { plan_id: 'weekly', name: 'Weekly Pass', duration: 7, duration_unit: 'day', price: 1500 },
  { plan_id: 'monthly', name: 'Monthly Standard', duration: 1, duration_unit: 'month', price: 5000 },
  { plan_id: '3months', name: '3 Months (Quarterly)', duration: 3, duration_unit: 'month', price: 13500 },
  { plan_id: '6months', name: '6 Months (Half-Yearly)', duration: 6, duration_unit: 'month', price: 25000 },
  { plan_id: 'yearly', name: '1 Year VIP Annual', duration: 1, duration_unit: 'year', price: 45000 }
];

function Membership() {
  const { canDelete, canFreezePass, isReceptionist } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [plans, setPlans] = useState(DEFAULT_MEMBERSHIP_PLANS);
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
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const [selectedMembership, setSelectedMembership] = useState(null);
  const [selectedProfilePerson, setSelectedProfilePerson] = useState(null); // { id, name }
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [whatsAppData, setWhatsAppData] = useState({
    phone: '',
    message: '',
    membership: null
  });

  // Bulk Broadcast States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkThreshold, setBulkThreshold] = useState(3); // 3 days by default
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [bulkPhoneOverrides, setBulkPhoneOverrides] = useState({});
  const [bulkTemplate, setBulkTemplate] = useState(
    "Assalam-o-Alaikum *{name}* Bhai! 🏋️‍♂️\n\nThis is a friendly reminder from *Gym Management*.\nYour *{plan}* membership expires {days_left} ({expiry}).\n\nKindly renew your pass in advance for uninterrupted gym access. ⚡\n\nThank you!\n*Gym Management*"
  );
  const [queueIndex, setQueueIndex] = useState(null); // null, 0..N, or 'DONE'
  const [queueSentIds, setQueueSentIds] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  const [formData, setFormData] = useState({
    person_id: '',
    plan_id: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    amount: 5000,
    payment_status: 'PAID',
    payment_method: 'CASH',
    reference_id: '',
    phone: '',
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
      setPlans((plansRes.data && plansRes.data.length > 0) ? plansRes.data : DEFAULT_MEMBERSHIP_PLANS);
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
      phone: '',
      notes: '',
      freeze_reason: ''
    });
    setSelectedMembership(null);
  };

  const openAddModal = () => {
    resetForm();
    const firstPlan = plans[0] || DEFAULT_MEMBERSHIP_PLANS[0];
    const planId = firstPlan.plan_id || 'monthly';
    const planPrice = firstPlan.price || 5000;
    const today = new Date().toISOString().split('T')[0];
    const expiry = calculateExpiryDate(today, planId);

    if (people.length > 0) {
      const firstPerson = people[0].id || people[0].person_id;
      setFormData(prev => ({
        ...prev,
        person_id: firstPerson,
        plan_id: planId,
        amount: planPrice,
        start_date: today,
        expiry_date: expiry
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        plan_id: planId,
        amount: planPrice,
        start_date: today,
        expiry_date: expiry
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
      phone: m.phone || '',
      notes: m.notes || '',
      freeze_reason: ''
    });
    setShowEditModal(true);
  };

  const openRenewModal = (m) => {
    setSelectedMembership(m);
    const today = new Date().toISOString().split('T')[0];
    const startDate = m.expiry_date && m.expiry_date < today ? today : m.expiry_date || today;
    const planId = m.plan_id || 'monthly';
    const expiryDate = calculateExpiryDate(startDate, planId);
    const planObj = plans.find(p => p.plan_id === planId) || DEFAULT_MEMBERSHIP_PLANS.find(p => p.plan_id === planId);
    const planPrice = planObj ? planObj.price : (m.amount || 5000);

    setFormData({
      person_id: m.person_id,
      plan_id: planId,
      start_date: startDate,
      expiry_date: expiryDate,
      amount: planPrice,
      payment_status: 'PAID',
      payment_method: 'CASH',
      reference_id: '',
      phone: m.phone || '',
      notes: '',
      freeze_reason: ''
    });
    setShowRenewModal(true);
  };

  const openWhatsAppModal = (m) => {
    const text = generateWhatsAppReminderText(m, 'Gym Management');
    setWhatsAppData({
      phone: m.phone || '',
      message: text,
      membership: m
    });
    setShowWhatsAppModal(true);
  };

  const handleSendWhatsApp = async () => {
    if (whatsAppData.membership) {
      try {
        if (whatsAppData.phone !== whatsAppData.membership.phone) {
          await axios.put(`/api/memberships/${whatsAppData.membership.membership_id}`, {
            phone: whatsAppData.phone
          });
        }
        await axios.post(`/api/memberships/${whatsAppData.membership.membership_id}/reminder-sent`);
        fetchAllData();
      } catch (err) {
        console.error('Error recording reminder sent:', err);
      }
    }
    openWhatsApp(whatsAppData.phone, whatsAppData.message);
    setShowWhatsAppModal(false);
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

  // Bulk Broadcast Helpers
  const getTargetMembers = (threshold) => {
    if (threshold === 'EXPIRED') {
      return enrichedMemberships.filter(m => m.info.isExpired && m.status !== 'FROZEN' && m.status !== 'CANCELLED');
    }
    if (threshold === 'ALL_ACTIVE') {
      return enrichedMemberships.filter(m => m.status !== 'FROZEN' && m.status !== 'CANCELLED');
    }
    const numDays = parseInt(threshold, 10) || 3;
    return enrichedMemberships.filter(m => {
      if (m.status === 'FROZEN' || m.status === 'CANCELLED') return false;
      return m.info.isExpired || (m.info.daysLeft <= numDays);
    });
  };

  const currentTargetMembers = getTargetMembers(bulkThreshold);
  const expiring3DaysCount = getTargetMembers(3).length;
  const selectedMembersList = currentTargetMembers.filter(m => selectedMemberIds.includes(m.membership_id));

  const openBulkBroadcastModal = () => {
    const targets = getTargetMembers(3);
    setBulkThreshold(3);
    setSelectedMemberIds(targets.map(m => m.membership_id));
    const phones = {};
    targets.forEach(m => {
      phones[m.membership_id] = m.phone || '';
    });
    setBulkPhoneOverrides(phones);
    setQueueIndex(null);
    setQueueSentIds([]);
    setShowBulkModal(true);
  };

  const handleThresholdChange = (newThreshold) => {
    setBulkThreshold(newThreshold);
    const targets = getTargetMembers(newThreshold);
    setSelectedMemberIds(targets.map(m => m.membership_id));
    setQueueIndex(null);
  };

  const handleToggleSelectAll = () => {
    if (selectedMemberIds.length === currentTargetMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(currentTargetMembers.map(m => m.membership_id));
    }
  };

  const handleToggleMember = (memId) => {
    if (selectedMemberIds.includes(memId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== memId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memId]);
    }
  };

  const handleSendSingleInBulk = async (m) => {
    const phone = bulkPhoneOverrides[m.membership_id] !== undefined ? bulkPhoneOverrides[m.membership_id] : (m.phone || '');
    try {
      if (phone && phone !== m.phone) {
        await axios.put(`/api/memberships/${m.membership_id}`, { phone });
      }
      await axios.post(`/api/memberships/${m.membership_id}/reminder-sent`);
      fetchAllData();
    } catch (e) {
      console.error('Error recording bulk reminder:', e);
    }
    const msg = formatTemplateMessage(bulkTemplate, m, 'Gym Management');
    openWhatsApp(phone, msg);
    if (!queueSentIds.includes(m.membership_id)) {
      setQueueSentIds(prev => [...prev, m.membership_id]);
    }
  };

  const handleStartQueue = () => {
    if (selectedMembersList.length === 0) {
      alert('Please select at least one member.');
      return;
    }
    setQueueIndex(0);
    const first = selectedMembersList[0];
    handleSendSingleInBulk(first);
  };

  const handleNextQueueMember = () => {
    if (queueIndex === null || queueIndex === 'DONE') return;
    const nextIdx = queueIndex + 1;
    if (nextIdx < selectedMembersList.length) {
      setQueueIndex(nextIdx);
      const nextMember = selectedMembersList[nextIdx];
      handleSendSingleInBulk(nextMember);
    } else {
      setQueueIndex('DONE');
    }
  };

  const handleSkipQueueMember = () => {
    if (queueIndex === null || queueIndex === 'DONE') return;
    const nextIdx = queueIndex + 1;
    if (nextIdx < selectedMembersList.length) {
      setQueueIndex(nextIdx);
    } else {
      setQueueIndex('DONE');
    }
  };

  const handleCopyAllNumbers = () => {
    const phones = selectedMembersList
      .map(m => bulkPhoneOverrides[m.membership_id] || m.phone || '')
      .filter(p => !!p.trim());
    if (phones.length === 0) {
      alert('No phone numbers found for selected members.');
      return;
    }
    navigator.clipboard.writeText(phones.join(', '));
    setToastMessage(`✓ Copied ${phones.length} phone numbers to clipboard!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filter & Sort
  const filteredMemberships = enrichedMemberships
    .filter(m => {
      const q = (searchTerm || '').toLowerCase().trim();
      const pName = (m.person_name || '').toLowerCase();
      const pId = (m.person_id || '').toLowerCase();
      const mId = (m.membership_id || m.id || '').toLowerCase();
      const matchesSearch = !q || pName.includes(q) || pId.includes(q) || mId.includes(q);

      if (!matchesSearch) return false;

      if (filter === 'ACTIVE') return m.info?.isActive && !m.info?.isExpiringSoon;
      if (filter === 'EXPIRING_SOON') return m.info?.isExpiringSoon;
      if (filter === 'EXPIRED') return m.info?.isExpired;
      if (filter === 'FROZEN') return m.info?.isFrozen;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'expiry_date') return new Date(a.expiry_date || 0) - new Date(b.expiry_date || 0);
      if (sortBy === 'name') return (a.person_name || '').localeCompare(b.person_name || '');
      if (sortBy === 'amount') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'remaining_days') return (a.info?.daysLeft || 0) - (b.info?.daysLeft || 0);
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
        <div className="membership-header-actions">
          <button 
            className={`btn-broadcast-expiring ${expiring3DaysCount > 0 ? 'highlighted' : ''}`}
            onClick={openBulkBroadcastModal}
            title="Send WhatsApp reminders to members expiring in ≤ 3 days or expired"
          >
            <span>📢 Broadcast Reminders</span>
            <span className="broadcast-count-pill">{expiring3DaysCount} Due</span>
          </button>
          <button className="btn-primary" onClick={openAddModal}>
            ➕ Add New Membership
          </button>
        </div>
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
        <div className="controls-top-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by member name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>}
          </div>

          <div className="sort-box">
            <span>Sort By:</span>
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="expiry_date">Expiry Date (Soonest)</option>
              <option value="remaining_days">Remaining Days</option>
              <option value="name">Member Name</option>
              <option value="amount">Amount</option>
            </select>
          </div>
        </div>

        <div className="filter-tabs">
          <button className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
            <span>All</span>
            <span className="tab-count-badge">{enrichedMemberships.length}</span>
          </button>
          <button className={`tab-btn ${filter === 'ACTIVE' ? 'active' : ''}`} onClick={() => setFilter('ACTIVE')}>
            <span>🟢 Active</span>
            <span className="tab-count-badge">{enrichedMemberships.filter(m => m.info.isActive && !m.info.isExpiringSoon).length}</span>
          </button>
          <button className={`tab-btn warning ${filter === 'EXPIRING_SOON' ? 'active' : ''}`} onClick={() => setFilter('EXPIRING_SOON')}>
            <span>⚠️ Expiring Soon</span>
            <span className="tab-count-badge">{enrichedMemberships.filter(m => m.info.isExpiringSoon).length}</span>
          </button>
          <button className={`tab-btn danger ${filter === 'EXPIRED' ? 'active' : ''}`} onClick={() => setFilter('EXPIRED')}>
            <span>🚨 Expired</span>
            <span className="tab-count-badge">{enrichedMemberships.filter(m => m.info.isExpired).length}</span>
          </button>
          <button className={`tab-btn ${filter === 'FROZEN' ? 'active' : ''}`} onClick={() => setFilter('FROZEN')}>
            <span>❄️ Frozen</span>
            <span className="tab-count-badge">{enrichedMemberships.filter(m => m.info.isFrozen).length}</span>
          </button>
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
        <div className="membership-cards-grid" onClick={() => activeMenuId && setActiveMenuId(null)}>
          {filteredMemberships.map((m) => {
            const isMenuOpen = activeMenuId === m.membership_id;

            return (
              <div key={m.membership_id || index} className={`membership-card ${(m.info?.status || 'active').toLowerCase()}`}>
                {/* Top Member Header & 3-Dot Action Menu */}
                <div 
                  className="card-top" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedProfilePerson({ id: m.person_id, name: m.person_name })}
                  title="Click to view Member Workout Heatmap & Profile"
                >
                  <PersonAvatar name={m.person_name} personId={m.person_id} size={52} />
                  <div className="member-meta">
                    <h3 className="member-name" title={m.person_name}>{m.person_name}</h3>
                    <div className="member-ids">
                      <span className="person-id" title="Person ID">{m.person_id}</span>
                      <span className="membership-id" title="Membership ID">{m.membership_id}</span>
                      {m.phone && (
                        <span className="phone-badge" title="Phone / WhatsApp">📱 {m.phone}</span>
                      )}
                      {m.reminder_count > 0 && (
                        <span 
                          className="reminder-sent-badge" 
                          title={`Last reminded: ${m.last_reminder_sent ? new Date(m.last_reminder_sent).toLocaleDateString() : ''}`}
                        >
                          ✓ Reminded {m.reminder_count > 1 ? `(${m.reminder_count}x)` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3-Dot Dropdown for Management Actions */}
                  <div className="card-menu-container" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className={`card-menu-btn ${isMenuOpen ? 'active' : ''}`}
                      title="Manage Pass (Edit, Freeze, History, Delete)"
                      onClick={() => setActiveMenuId(isMenuOpen ? null : m.membership_id)}
                    >
                      ⋮
                    </button>
                    {isMenuOpen && (
                      <div className="card-dropdown-menu">
                        <button onClick={() => { setActiveMenuId(null); openEditModal(m); }}>
                          ✏️ Edit Details
                        </button>
                        {canFreezePass && (
                          m.status === 'FROZEN' ? (
                            <button onClick={() => { setActiveMenuId(null); handleUnfreezeMembership(m.membership_id); }}>
                              ☀️ Unfreeze Pass
                            </button>
                          ) : (
                            <button onClick={() => { setActiveMenuId(null); setSelectedMembership(m); setShowFreezeModal(true); }}>
                              ❄️ Freeze Pass
                            </button>
                          )
                        )}
                        <button onClick={() => { setActiveMenuId(null); openHistoryModal(m); }}>
                          📜 Payment History
                        </button>
                        {canDelete && (
                          <button className="menu-delete-btn" onClick={() => { setActiveMenuId(null); handleDeleteMembership(m.membership_id); }}>
                            🗑️ Delete Record
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expiry / Countdown Status Banner */}
                <div className={`status-banner ${m.info.badgeClass}`}>
                  <span className="status-text">{m.info.label}</span>
                  <span className="status-sublabel">{m.info.badgeText}</span>
                </div>

                {/* Structured Info Grid */}
                <div className="card-info-grid">
                  <div className="info-row">
                    <span className="info-label">Plan & Price</span>
                    <span className="info-value highlight">{m.plan_name || m.plan_id} • {formatCurrency(m.amount)}</span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Period</span>
                    <span className="info-value dates">
                      📅 {m.start_date} <span className="arrow">→</span> {m.expiry_date}
                    </span>
                  </div>

                  <div className="info-row">
                    <span className="info-label">Payment</span>
                    <span className={`payment-badge ${(m.payment_status || 'PAID').toLowerCase()}`}>
                      {m.payment_status || 'PAID'} • {m.payment_method || 'CASH'}
                    </span>
                  </div>

                  {m.notes && (
                    <div className="notes-box">
                      📝 {m.notes}
                    </div>
                  )}
                </div>

                {/* Primary Spacious Actions (Renew & WhatsApp) */}
                <div className="card-primary-actions">
                  <button className="btn-card-action renew" title="Renew Membership" onClick={() => openRenewModal(m)}>
                    🔄 Renew Pass
                  </button>
                  <button className="btn-card-action whatsapp" title="Send WhatsApp Reminder" onClick={() => openWhatsAppModal(m)}>
                    💬 WhatsApp
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
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Member:</label>
                    <select
                      value={formData.person_id}
                      onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Member --</option>
                      {people.map(p => (
                        <option key={p.id || p.person_id} value={p.id || p.person_id}>
                          {p.name} ({p.id || p.person_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Phone / WhatsApp Number:</label>
                    <input
                      type="text"
                      placeholder="e.g. 03001234567"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
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
                          {p.name}
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Notes / Comments:</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes..."
                  />
                </div>
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
              <div className="modal-body">
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

                <div className="form-group">
                  <label>Phone / WhatsApp Number:</label>
                  <input
                    type="text"
                    placeholder="e.g. 03001234567"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Notes:</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes..."
                  />
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
              <div className="modal-body">
                <div className="form-group">
                  <label>Renewal Plan:</label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => handlePlanChange(e.target.value, formData.start_date)}
                  >
                    {plans.map(p => (
                      <option key={p.plan_id} value={p.plan_id}>
                        {p.name}
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Renewal Amount (PKR):</label>
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
              <div className="modal-body">
                <p className="modal-description">
                  Freezing will pause the membership status for member <strong>{selectedMembership?.person_name}</strong>.
                </p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Reason for Freeze:</label>
                  <textarea
                    rows="3"
                    value={formData.freeze_reason}
                    onChange={(e) => setFormData({ ...formData, freeze_reason: e.target.value })}
                    placeholder="e.g. Traveling / Medical reason"
                    required
                  />
                </div>
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
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>📜 Payment & Renewal History</h2>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="history-body">
              <div className="history-member-info">
                <h3>{selectedMembership.person_name}</h3>
                <p>Person ID: {selectedMembership.person_id} • Membership ID: {selectedMembership.membership_id}</p>
              </div>

              <span className="summary-label" style={{ marginTop: '4px' }}>Payment Records:</span>
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
                          <td><code>{p.payment_id}</code></td>
                          <td>{p.payment_date}</td>
                          <td><strong>{formatCurrency(p.amount)}</strong></td>
                          <td><span className="payment-badge paid">{p.payment_status}</span></td>
                          <td>{p.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: 'var(--c-slate-light)', fontSize: '0.86rem', margin: 0 }}>
                  No prior payment history recorded for this membership.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Reminder Modal */}
      {showWhatsAppModal && whatsAppData.membership && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h2>💬 Send WhatsApp Fee Reminder</h2>
              <button className="close-btn" onClick={() => setShowWhatsAppModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="history-member-info" style={{ marginBottom: '14px' }}>
                <h3>{whatsAppData.membership.person_name}</h3>
                <p>Plan: {whatsAppData.membership.plan_name} • Expiry: {whatsAppData.membership.expiry_date} ({whatsAppData.membership.info?.badgeText})</p>
              </div>

              <div className="form-group">
                <label>Member Phone / WhatsApp Number:</label>
                <input
                  type="text"
                  placeholder="e.g. 03001234567 or +923001234567"
                  value={whatsAppData.phone}
                  onChange={(e) => setWhatsAppData({ ...whatsAppData, phone: e.target.value })}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--c-slate-light)' }}>
                  * Format: 03001234567 (Pakistan) or international (+92300...)
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Custom Reminder Message (Editable Preview):</label>
                <textarea
                  rows="6"
                  style={{ fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: '1.45' }}
                  value={whatsAppData.message}
                  onChange={(e) => setWhatsAppData({ ...whatsAppData, message: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowWhatsAppModal(false)}>Cancel</button>
              <button type="button" className="btn-whatsapp-direct" onClick={handleSendWhatsApp}>
                🚀 Open in WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Broadcast Modal */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h2>📢 Bulk WhatsApp Fee Reminder Broadcast</h2>
              <button className="close-btn" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {toastMessage && (
                <div style={{ padding: '8px 12px', background: '#D1FAE5', border: '1px solid #10B981', color: '#065F46', borderRadius: '8px', marginBottom: '12px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  {toastMessage}
                </div>
              )}

              {/* Threshold Selection Tabs */}
              <div className="bulk-threshold-tabs">
                <button 
                  className={`threshold-tab ${bulkThreshold === 3 ? 'active' : ''}`}
                  onClick={() => handleThresholdChange(3)}
                >
                  ⏰ ≤ 3 Days Left ({getTargetMembers(3).length})
                </button>
                <button 
                  className={`threshold-tab ${bulkThreshold === 7 ? 'active' : ''}`}
                  onClick={() => handleThresholdChange(7)}
                >
                  ⏰ ≤ 7 Days Left ({getTargetMembers(7).length})
                </button>
                <button 
                  className={`threshold-tab ${bulkThreshold === 'EXPIRED' ? 'active' : ''}`}
                  onClick={() => handleThresholdChange('EXPIRED')}
                >
                  🚨 Already Expired ({getTargetMembers('EXPIRED').length})
                </button>
                <button 
                  className={`threshold-tab ${bulkThreshold === 'ALL_ACTIVE' ? 'active' : ''}`}
                  onClick={() => handleThresholdChange('ALL_ACTIVE')}
                >
                  ⭐ All Members ({getTargetMembers('ALL_ACTIVE').length})
                </button>
              </div>

              {/* Queue Mode View */}
              {queueIndex !== null ? (
                <div className="queue-box">
                  {queueIndex === 'DONE' ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
                      <h3 style={{ margin: '0 0 6px 0', color: '#065F46' }}>Broadcast Complete!</h3>
                      <p style={{ margin: '0 0 14px 0', color: 'var(--c-slate-light)', fontSize: '0.88rem' }}>
                        All {selectedMembersList.length} reminders processed successfully.
                      </p>
                      <button className="btn-secondary" onClick={() => setQueueIndex(null)}>
                        Back to List
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="queue-step-info">
                        <span>
                          Step {queueIndex + 1} of {selectedMembersList.length}: <strong>{selectedMembersList[queueIndex]?.person_name}</strong>
                        </span>
                        <span>{Math.round(((queueIndex + 1) / selectedMembersList.length) * 100)}% Complete</span>
                      </div>

                      <div className="queue-progress-bar-bg">
                        <div 
                          className="queue-progress-bar-fill" 
                          style={{ width: `${((queueIndex + 1) / selectedMembersList.length) * 100}%` }}
                        />
                      </div>

                      <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid var(--c-sand)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '800', color: 'var(--c-slate)' }}>
                            {selectedMembersList[queueIndex]?.person_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--c-slate-light)', marginTop: '2px' }}>
                            📱 {bulkPhoneOverrides[selectedMembersList[queueIndex]?.membership_id] || selectedMembersList[queueIndex]?.phone || 'No Phone Entered'} • Pass: {selectedMembersList[queueIndex]?.plan_name} ({selectedMembersList[queueIndex]?.info?.badgeText})
                          </div>
                        </div>
                        <span className="payment-badge paid">
                          {queueSentIds.includes(selectedMembersList[queueIndex]?.membership_id) ? '✓ Opened' : 'Pending'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <button className="btn-secondary" onClick={handleSkipQueueMember}>
                          Skip ⏭️
                        </button>
                        <button className="btn-send-step" onClick={handleNextQueueMember}>
                          {queueIndex + 1 >= selectedMembersList.length ? '✓ Finish Broadcast' : '🚀 Open & Next Member ➡️'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Target Members Table View */
                <>
                  <div className="bulk-table-wrapper">
                    {currentTargetMembers.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-slate-light)', fontSize: '0.88rem' }}>
                        ✓ No members match this filter right now.
                      </div>
                    ) : (
                      <table className="bulk-table">
                        <thead>
                          <tr>
                            <th style={{ width: '36px', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedMemberIds.length === currentTargetMembers.length && currentTargetMembers.length > 0}
                                onChange={handleToggleSelectAll}
                              />
                            </th>
                            <th>Member</th>
                            <th>Status / Expiry</th>
                            <th>WhatsApp Number</th>
                            <th>Reminder History</th>
                            <th style={{ textAlign: 'center', width: '80px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTargetMembers.map((m) => {
                            const isSelected = selectedMemberIds.includes(m.membership_id);
                            const phoneVal = bulkPhoneOverrides[m.membership_id] !== undefined ? bulkPhoneOverrides[m.membership_id] : (m.phone || '');
                            const isSent = queueSentIds.includes(m.membership_id);

                            return (
                              <tr key={m.membership_id}>
                                <td style={{ textAlign: 'center' }}>
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleMember(m.membership_id)}
                                  />
                                </td>
                                <td>
                                  <strong>{m.person_name}</strong>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--c-slate-light)' }}>{m.person_id}</div>
                                </td>
                                <td>
                                  <span className={`status-pill-badge-mini ${m.info.badgeClass}`}>
                                    {m.info.badgeText}
                                  </span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--c-slate-light)', marginTop: '2px' }}>
                                    📅 {m.expiry_date}
                                  </div>
                                </td>
                                <td>
                                  <input 
                                    type="text" 
                                    className="bulk-phone-input"
                                    placeholder="03001234567"
                                    value={phoneVal}
                                    onChange={(e) => setBulkPhoneOverrides({ ...bulkPhoneOverrides, [m.membership_id]: e.target.value })}
                                  />
                                </td>
                                <td>
                                  {m.reminder_count > 0 ? (
                                    <span className="reminder-sent-badge" title={`Last sent: ${m.last_reminder_sent ? new Date(m.last_reminder_sent).toLocaleDateString() : ''}`}>
                                      ✓ Sent {m.reminder_count}x
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                                      Not sent yet
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button 
                                    className={`action-btn whatsapp ${isSent ? 'sent' : ''}`}
                                    style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                                    title="Send individual WhatsApp message"
                                    onClick={() => handleSendSingleInBulk(m)}
                                  >
                                    {isSent ? '✓ Sent' : '💬 Send'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Template Message Box */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Broadcast Message Template (Applied to all):</label>
                    <textarea
                      rows="4"
                      style={{ fontFamily: 'inherit', fontSize: '0.84rem', lineHeight: '1.4' }}
                      value={bulkTemplate}
                      onChange={(e) => setBulkTemplate(e.target.value)}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-slate-light)' }}>
                      * Placeholders supported: <code>{'{name}'}</code>, <code>{'{plan}'}</code>, <code>{'{expiry}'}</code>, <code>{'{days_left}'}</code>
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleCopyAllNumbers}
                title="Copy all selected phone numbers to clipboard"
              >
                📋 Copy Numbers ({selectedMembersList.length})
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowBulkModal(false)}>
                  Close
                </button>
                {queueIndex === null && (
                  <button 
                    type="button" 
                    className="btn-whatsapp-direct" 
                    onClick={handleStartQueue}
                    disabled={selectedMembersList.length === 0}
                  >
                    ⚡ Launch 1-Click Send Queue ({selectedMembersList.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Detailed Member Profile & Workout Calendar Heatmap Modal */}
      {selectedProfilePerson && (
        <MemberProfileModal
          personId={selectedProfilePerson.id}
          personName={selectedProfilePerson.name}
          onClose={() => setSelectedProfilePerson(null)}
          onOpenRenew={(mem) => openRenewModal(mem)}
          onOpenWhatsApp={(mem) => openWhatsAppModal(mem)}
        />
      )}
    </div>
  );
}

export default Membership;
