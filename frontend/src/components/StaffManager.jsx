import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StaffManager.css';
import { useAuth } from '../context/AuthContext';

function StaffManager() {
  const { canManageStaff, isSuperAdmin, isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Create Account Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'RECEPTIONIST'
  });

  // Password Change Modal
  const [passwordModal, setPasswordModal] = useState({ show: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/auth/users');
      if (res.data) {
        if (Array.isArray(res.data)) {
          setUsers(res.data);
        } else if (res.data.users) {
          setUsers(res.data.users);
        }
      }
    } catch (err) {
      console.error('Error fetching staff users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/users', form);
      setShowCreateModal(false);
      setForm({ username: '', password: '', name: '', role: 'RECEPTIONIST' });
      fetchUsers();
    } catch (err) {
      console.error('Error creating staff user:', err);
      alert('Failed to create staff account: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this staff account?')) return;
    try {
      await axios.delete(`/api/auth/users/${userId}`);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting staff user:', err);
      alert('Failed to delete staff account: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Open Password Modal
  const openPasswordModal = (targetUser) => {
    setPasswordModal({ show: true, user: targetUser });
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setShowPasswordText(false);
  };

  // Submit Password Change
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please retype carefully.');
      return;
    }

    setSavingPassword(true);
    try {
      const targetId = passwordModal.user.user_id || passwordModal.user.username;
      const res = await axios.put(`/api/auth/users/${targetId}/password`, {
        password: newPassword
      });

      try {
        if (passwordModal.user?.username) {
          localStorage.setItem(`gym_pwd_${passwordModal.user.username.toLowerCase()}`, newPassword);
        }
      } catch (e) {}

      setPasswordSuccess(res.data?.message || 'Password updated successfully!');
      setTimeout(() => {
        setPasswordModal({ show: false, user: null });
        fetchUsers();
      }, 1400);
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError(err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Check if current logged-in user has permission to change target user's password
  const canChangePasswordFor = (targetUser) => {
    if (!currentUser) return false;
    // Both Super Admin and Gym Owner (Admin) can change any user's password (including their own)
    return isSuperAdmin || isAdmin;
  };

  // Check if current logged in user can delete target user
  const canDeleteUser = (targetUser) => {
    if (!currentUser) return false;
    // Cannot delete yourself
    const isSelf = targetUser.user_id === currentUser.user_id || 
                   (targetUser.username && targetUser.username.toLowerCase() === currentUser.username?.toLowerCase());
    if (isSelf) return false;

    // Super Admin accounts can never be deleted by normal Admin
    if (targetUser.role === 'SUPER_ADMIN') return false;

    if (isSuperAdmin) return true;
    if (isAdmin) {
      // Normal admin cannot delete other admins
      return targetUser.role !== 'ADMIN';
    }

    return false;
  };

  if (!canManageStaff) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger, #ef4444)' }}>
        <h3>🔒 Access Restricted</h3>
        <p>Only Admin or Super Admin can manage staff accounts.</p>
      </div>
    );
  }

  return (
    <div className="staff-container">
      <div className="staff-header-bar">
        <div className="staff-title-group">
          <h2>👔 Staff & User Management</h2>
          <p>
            {isSuperAdmin 
              ? '👑 Super Admin Console: Manage all Gym Owners, Supervisors, and Receptionists.' 
              : '🏢 Gym Owner Dashboard: Manage your Gym Managers, Receptionists, and credentials.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Change Own Password Quick Button */}
          {currentUser && (
            <button 
              className="checkout-btn"
              style={{
                margin: 0,
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                border: '1.5px solid rgba(59, 130, 246, 0.4)'
              }}
              onClick={() => openPasswordModal(currentUser)}
            >
              🔑 Change My Password
            </button>
          )}

          <button 
            className="checkout-btn" 
            style={{ margin: 0, padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
            onClick={() => setShowCreateModal(true)}
          >
            + Add Staff Account
          </button>
        </div>
      </div>

      <div className="staff-table-card">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Username</th>
              <th>System Role</th>
              <th>Status</th>
              <th>Created Date</th>
              <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter(u => isSuperAdmin || u.role !== 'SUPER_ADMIN')
              .map(u => {
              const isSelf = currentUser && (u.user_id === currentUser.user_id || u.username === currentUser.username);
              const hasPasswordAccess = canChangePasswordFor(u);
              const hasDeleteAccess = canDeleteUser(u);

              return (
                <tr key={u.user_id || u.username}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {u.name}
                      {isSelf && (
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          YOU
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.user_id}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--accent, #3b82f6)', fontWeight: 600 }}>
                    @{u.username}
                  </td>
                  <td>
                    <span className={`role-badge ${(u.role || 'RECEPTIONIST').toLowerCase()}`} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {u.role === 'SUPER_ADMIN' && '👑 Super Admin'}
                      {u.role === 'ADMIN' && '🏢 Gym Owner'}
                      {u.role === 'MANAGER' && '👔 Manager'}
                      {u.role === 'RECEPTIONIST' && '🛎️ Receptionist'}
                      {!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(u.role) && u.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--success, #10b981)', fontWeight: 600, fontSize: '0.8rem' }}>
                      ● Active
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      {/* Change Password Button */}
                      {hasPasswordAccess ? (
                        <button 
                          style={{
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: '#d97706',
                            borderRadius: '6px',
                            padding: '0.35rem 0.65rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => openPasswordModal(u)}
                          title={`Change password for ${u.name}`}
                        >
                          🔑 Password
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          🔒 Protected
                        </span>
                      )}

                      {/* Delete Button */}
                      {hasDeleteAccess && (
                        <button 
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: 'var(--danger, #ef4444)',
                            borderRadius: '6px',
                            padding: '0.35rem 0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                          onClick={() => handleDeleteUser(u.user_id)}
                          title={`Delete account ${u.username}`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 1. CHANGE PASSWORD MODAL */}
      {/* ======================================================== */}
      {passwordModal.show && passwordModal.user && (
        <div className="staff-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPasswordModal({ show: false, user: null }); }}>
          <div className="staff-modal-card">
            <div className="staff-modal-header">
              <div>
                <h3>🔑 Update Password</h3>
                <div style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--c-slate-light, #64748b)' }}>
                  User: <strong style={{ color: 'var(--c-slate, #1e293b)' }}>{passwordModal.user.name}</strong> 
                  <span style={{ marginLeft: '6px', fontFamily: 'monospace', color: 'var(--c-mocha, #875F45)', fontWeight: 700 }}>
                    @{passwordModal.user.username}
                  </span>
                </div>
              </div>
              <button 
                className="staff-modal-close-btn"
                onClick={() => setPasswordModal({ show: false, user: null })}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="staff-modal-body">
              {passwordError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1.5px solid #ef4444',
                  color: '#dc2626',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 600
                }}>
                  ⚠️ {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1.5px solid #10b981',
                  color: '#059669',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 600
                }}>
                  ✅ {passwordSuccess}
                </div>
              )}

              <div className="staff-field-group">
                <label className="staff-field-label">
                  🔑 New Password <span className="req">*</span>
                </label>
                <div className="staff-input-wrapper">
                  <input 
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min. 4 characters)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="staff-modal-input"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="staff-eye-btn"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    title={showPasswordText ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordText ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="staff-field-group">
                <label className="staff-field-label">
                  🔒 Confirm New Password <span className="req">*</span>
                </label>
                <div className="staff-input-wrapper">
                  <input 
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    placeholder="Re-type new password to confirm"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="staff-modal-input"
                  />
                  <button
                    type="button"
                    className="staff-eye-btn"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    title={showPasswordText ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordText ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  newPassword === confirmPassword ? (
                    <div className="staff-validation-hint valid">
                      ✓ Passwords match
                    </div>
                  ) : (
                    <div className="staff-validation-hint invalid">
                      ⚠️ Passwords do not match yet
                    </div>
                  )
                )}
              </div>

              <div className="staff-modal-footer" style={{ margin: '0.5rem -1.5rem -1.5rem -1.5rem' }}>
                <button 
                  type="button"
                  className="staff-btn-cancel"
                  onClick={() => setPasswordModal({ show: false, user: null })}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="staff-btn-save" 
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Updating...' : '💾 Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CREATE STAFF MODAL */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="staff-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="staff-modal-card">
            <div className="staff-modal-header">
              <h3>👔 Add New Staff Account</h3>
              <button 
                className="staff-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="staff-modal-body">
              <div className="staff-field-group">
                <label className="staff-field-label">Full Name <span className="req">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Usman Ali"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="staff-modal-input"
                  style={{ paddingRight: '1rem' }}
                />
              </div>

              <div className="staff-field-group">
                <label className="staff-field-label">Username <span className="req">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. usman_manager"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="staff-modal-input"
                  style={{ paddingRight: '1rem' }}
                />
              </div>

              <div className="staff-field-group">
                <label className="staff-field-label">Password <span className="req">*</span></label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="staff-modal-input"
                  style={{ paddingRight: '1rem' }}
                />
              </div>

              <div className="staff-field-group">
                <label className="staff-field-label">System Role <span className="req">*</span></label>
                <select 
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="staff-modal-input"
                  style={{ paddingRight: '1rem', cursor: 'pointer' }}
                >
                  <option value="RECEPTIONIST">🛎️ Receptionist (Front Desk & Billing)</option>
                  <option value="MANAGER">👔 Manager (Gym Floor Supervisor)</option>
                  {isSuperAdmin && (
                    <option value="ADMIN">🏢 Gym Owner (Admin Authority)</option>
                  )}
                </select>
              </div>

              <div className="staff-modal-footer" style={{ margin: '0.5rem -1.5rem -1.5rem -1.5rem' }}>
                <button 
                  type="button"
                  className="staff-btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="staff-btn-save">
                  + Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffManager;
