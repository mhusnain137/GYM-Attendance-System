import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StaffManager.css';
import { useAuth } from '../context/AuthContext';

function StaffManager() {
  const { canManageStaff } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'RECEPTIONIST'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/auth/users');
      if (res.data && res.data.users) {
        setUsers(res.data.users);
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
      setShowModal(false);
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

  if (!canManageStaff) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)' }}>
        <h3>🔒 Access Restricted</h3>
        <p>Only Super Admin can manage staff accounts.</p>
      </div>
    );
  }

  return (
    <div className="staff-container">
      <div className="staff-header-bar">
        <div className="staff-title-group">
          <h2>👔 Staff & User Management</h2>
          <p>Create and manage system access accounts for Managers and Receptionists.</p>
        </div>

        <button 
          className="checkout-btn" 
          style={{ margin: 0, padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
          onClick={() => setShowModal(true)}
        >
          + Add New Staff Account
        </button>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.user_id}</div>
                </td>
                <td style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>@{u.username}</td>
                <td>
                  <span className={`role-badge ${u.role.toLowerCase()}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}>
                    Active
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td>
                  {u.role !== 'ADMIN' && (
                    <button 
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--danger)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.78rem'
                      }}
                      onClick={() => handleDeleteUser(u.user_id)}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE STAFF MODAL */}
      {showModal && (
        <div className="customizer-backdrop">
          <div className="customizer-card" style={{ maxWidth: '420px' }}>
            <div className="customizer-header">
              <h3>Add New Staff Account</h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="customizer-body">
              <div>
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Usman Ali"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. usman_reception"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Role</label>
                <select 
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="form-select"
                >
                  <option value="RECEPTIONIST">🛎️ Receptionist (Front Desk & Billing)</option>
                  <option value="MANAGER">👔 Manager (Gym Floor Supervisor)</option>
                  <option value="ADMIN">👑 Admin (Full Authority)</option>
                </select>
              </div>

              <div className="customizer-footer" style={{ padding: '0.5rem 0 0 0' }}>
                <button 
                  type="button"
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="checkout-btn" style={{ margin: 0, padding: '0.5rem 1.25rem' }}>
                  Create Account
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
