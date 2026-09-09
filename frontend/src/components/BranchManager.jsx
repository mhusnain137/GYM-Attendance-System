import React, { useState } from 'react';
import axios from 'axios';
import { useBranch } from '../context/BranchContext';
import './BranchManager.css';

export default function BranchManager() {
  const { branches, selectedBranchId, setSelectedBranchId, refreshBranches, loading } = useBranch();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    city: 'Lahore',
    address: '',
    phone: '',
    manager_name: '',
    manager_email: '',
    capacity: 250,
    camera_name: 'Main Turnstile',
    camera_rtsp: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      city: 'Lahore',
      address: '',
      phone: '',
      manager_name: '',
      manager_email: '',
      capacity: 250,
      camera_name: 'Main Turnstile',
      camera_rtsp: ''
    });
    setEditingBranch(null);
    setErrorMsg('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || branch.branch_name || '',
      city: branch.city || 'Lahore',
      address: branch.address || '',
      phone: branch.phone || '',
      manager_name: branch.manager_name || '',
      manager_email: branch.manager_email || '',
      capacity: branch.capacity || 250,
      camera_name: branch.cameras?.[0]?.name || 'Main Turnstile',
      camera_rtsp: branch.cameras?.[0]?.rtsp_url || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        name: formData.name,
        city: formData.city,
        address: formData.address,
        phone: formData.phone,
        manager_name: formData.manager_name,
        manager_email: formData.manager_email,
        capacity: Number(formData.capacity) || 200,
        cameras: formData.camera_rtsp
          ? [
              {
                camera_id: `cam_${Date.now().toString().slice(-4)}`,
                name: formData.camera_name || 'Front Desk Turnstile',
                rtsp_url: formData.camera_rtsp,
                type: 'CCTV_RTSP',
                status: 'ONLINE'
              }
            ]
          : (editingBranch?.cameras || [])
      };

      if (editingBranch) {
        await axios.put(`/api/branches/${editingBranch.branch_id}`, payload);
        setSuccessMsg(`Branch "${formData.name}" updated successfully!`);
      } else {
        await axios.post('/api/branches', payload);
        setSuccessMsg(`Branch "${formData.name}" created successfully!`);
      }

      await refreshBranches();
      setShowAddModal(false);
      resetForm();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save branch');
    }
  };

  const handleDelete = async (branchId, branchName) => {
    if (branchId === 'branch_main' || branchId === 'BR-MAIN-001') {
      alert('The primary headquarters branch cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to deactivate branch "${branchName}"?`)) {
      return;
    }
    try {
      await axios.delete(`/api/branches/${branchId}`);
      if (selectedBranchId === branchId) {
        setSelectedBranchId('all');
      }
      await refreshBranches();
      setSuccessMsg(`Branch "${branchName}" deleted.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete branch');
    }
  };

  // Calculated totals
  const totalBranches = branches.length;
  const totalMembers = branches.reduce((acc, b) => acc + (b.members_count || 0), 0);
  const totalVisitsToday = branches.reduce((acc, b) => acc + (b.today_visits_count || 0), 0);
  const totalCameras = branches.reduce((acc, b) => acc + (b.active_cameras_count || (b.cameras?.length || 0)), 0);

  return (
    <div className="branch-manager-container">
      {/* Header */}
      <div className="branch-header">
        <div className="branch-title-group">
          <h2>🏢 Multi-Branch Network Manager</h2>
          <p>Configure gym locations, local RTSP turnstile cameras, staff assignment, and cross-branch roaming.</p>
        </div>
        <div className="branch-actions">
          <button className="btn-add-branch" onClick={handleOpenAdd}>
            <span>➕</span> Add New Branch
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#059669', borderRadius: '10px', marginBottom: '1.5rem', fontWeight: 700 }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Stats Ribbon */}
      <div className="branch-stats-ribbon">
        <div className="branch-stat-card">
          <div className="branch-stat-icon">🏢</div>
          <div className="branch-stat-info">
            <h4>Active Branches</h4>
            <div className="stat-value">{totalBranches}</div>
          </div>
        </div>

        <div className="branch-stat-card">
          <div className="branch-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>👥</div>
          <div className="branch-stat-info">
            <h4>Total Network Members</h4>
            <div className="stat-value">{totalMembers}</div>
          </div>
        </div>

        <div className="branch-stat-card">
          <div className="branch-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>🏃</div>
          <div className="branch-stat-info">
            <h4>Network Visits Today</h4>
            <div className="stat-value">{totalVisitsToday}</div>
          </div>
        </div>

        <div className="branch-stat-card">
          <div className="branch-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>📹</div>
          <div className="branch-stat-info">
            <h4>RTSP Cameras Active</h4>
            <div className="stat-value">{totalCameras}</div>
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          Loading gym branches...
        </div>
      ) : (
        <div className="branches-grid">
          {branches.map((branch) => {
            const isCurrent = selectedBranchId === branch.branch_id;
            const bName = branch.name || branch.branch_name || 'Gym Branch';
            return (
              <div key={branch.branch_id} className={`branch-card ${isCurrent ? 'active-selected' : ''}`}>
                <div className="branch-card-header">
                  <div className="branch-card-title-group">
                    <h3>{bName}</h3>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className="branch-city-pill">📍 {branch.city || 'Lahore'}</span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                          CURRENT VIEW
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="active-pill">
                    {branch.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="branch-card-body">
                  <div className="branch-meta-row">
                    <span>🏢</span>
                    <span>{branch.address || 'Address not set'}</span>
                  </div>
                  <div className="branch-meta-row">
                    <span>📞</span>
                    <span>{branch.phone || 'No phone'} | Manager: {branch.manager_name || 'Staff'}</span>
                  </div>

                  {/* KPIs */}
                  <div className="branch-kpi-row">
                    <div className="branch-kpi-item">
                      <span>Members</span>
                      <strong>{branch.members_count || 0}</strong>
                    </div>
                    <div className="branch-kpi-item">
                      <span>Today Check-ins</span>
                      <strong>{branch.today_visits_count || 0}</strong>
                    </div>
                    <div className="branch-kpi-item">
                      <span>Capacity</span>
                      <strong>{branch.capacity || 200}</strong>
                    </div>
                  </div>

                  {/* Cameras Preview */}
                  <div className="branch-cameras-section">
                    <h5>
                      <span>📹 Turnstiles & Cameras</span>
                      <span>{(branch.cameras || []).length} Configured</span>
                    </h5>
                    {(branch.cameras && branch.cameras.length > 0) ? (
                      branch.cameras.map((cam, idx) => (
                        <div key={idx} className="cam-badge-item">
                          <span style={{ fontWeight: 600 }}>{cam.name || `Camera ${idx + 1}`}</span>
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontFamily: 'monospace' }}>
                            {cam.type || 'RTSP'} • {cam.status || 'READY'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        No local RTSP camera configured yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="branch-card-footer">
                  <button
                    className={`btn-switch-branch ${isCurrent ? 'current' : ''}`}
                    onClick={() => setSelectedBranchId(branch.branch_id)}
                  >
                    {isCurrent ? '✓ Viewing This Branch' : 'Switch To This Branch'}
                  </button>
                  <button className="btn-edit-branch" onClick={() => handleOpenEdit(branch)} title="Edit Branch">
                    ✏️
                  </button>
                  {branch.branch_id !== 'branch_main' && branch.branch_id !== 'BR-MAIN-001' && (
                    <button
                      className="btn-edit-branch"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDelete(branch.branch_id, bName)}
                      title="Delete Branch"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="branch-modal-overlay">
          <div className="branch-modal-content">
            <div className="branch-modal-header">
              <h3>{editingBranch ? '✏️ Edit Gym Branch' : '➕ Add New Gym Branch'}</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {errorMsg && (
              <div style={{ margin: '1rem 1.5rem 0', padding: '0.6rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <form className="branch-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Titan Gym - DHA Phase 5"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lahore, Faisalabad, Islamabad"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Physical Address</label>
                <input
                  type="text"
                  placeholder="Full branch street address"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+92 300 0000000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Branch Manager</label>
                  <input
                    type="text"
                    placeholder="Manager Name"
                    value={formData.manager_name}
                    onChange={e => setFormData({ ...formData, manager_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                  📹 Primary RTSP Turnstile Camera (Optional)
                </h4>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Camera Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Entrance Gate"
                      value={formData.camera_name}
                      onChange={e => setFormData({ ...formData, camera_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>RTSP Stream URL</label>
                    <input
                      type="text"
                      placeholder="rtsp://admin:pass@192.168.x.x:554/..."
                      value={formData.camera_rtsp}
                      onChange={e => setFormData({ ...formData, camera_rtsp: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
