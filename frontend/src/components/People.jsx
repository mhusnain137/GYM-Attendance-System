import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getPersonMembership, calculateMembershipInfo } from '../utils/membershipUtils';
import './People.css';

function People() {
  const [people, setPeople] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'ACTIVE_MEMBER' | 'EXPIRING_SOON' | 'NO_MEMBERSHIP' | 'VISITORS'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'id' | 'membership'

  // Confirm dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [personToRename, setPersonToRename] = useState(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Photo upload modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [personForPhoto, setPersonForPhoto] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadMsg, setPhotoUploadMsg] = useState('');
  const [photoUploadStatus, setPhotoUploadStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [peopleRes, memRes] = await Promise.all([
        axios.get('/api/people'),
        axios.get('/api/memberships').catch(() => ({ data: [] }))
      ]);
      setPeople(peopleRes.data || []);
      setMemberships(memRes.data || []);
    } catch (error) {
      console.error('Error fetching people and memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnregisterClick = (person) => {
    setPersonToDelete(person);
    setShowConfirmDialog(true);
    setDeleteMessage('');
  };

  const handleConfirmUnregister = async () => {
    if (!personToDelete) return;

    setIsDeleting(true);
    setDeleteMessage('');

    try {
      const personId = personToDelete.id || personToDelete.person_id;
      const response = await axios.delete(`/api/people/${personId}`);
      
      if (response.data.success) {
        setDeleteMessage(`✓ ${personToDelete.name} (${personId}) unregistered successfully`);
        await fetchData();
        setTimeout(() => {
          setDeleteMessage('');
        }, 3500);
      } else {
        setDeleteMessage(`✕ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error unregistering person:', error);
      setDeleteMessage('✕ Failed to unregister person. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
      setPersonToDelete(null);
    }
  };

  const handleCancelUnregister = () => {
    setShowConfirmDialog(false);
    setPersonToDelete(null);
    setDeleteMessage('');
  };

  // Rename Handlers
  const handleRenameClick = (person) => {
    setPersonToRename(person);
    setNewName(person.name || '');
    setShowRenameModal(true);
  };

  const handleConfirmRename = async () => {
    if (!personToRename || !newName.trim()) return;

    setIsRenaming(true);
    try {
      const personId = personToRename.id || personToRename.person_id;
      const response = await axios.put(`/api/people/${personId}`, { name: newName.trim() });
      if (response.data.success) {
        setDeleteMessage(`✓ Successfully renamed to "${newName.trim()}"`);
        await fetchData();
        setShowRenameModal(false);
        setPersonToRename(null);
        setTimeout(() => setDeleteMessage(''), 3500);
      } else {
        alert(response.data.message || 'Failed to rename person');
      }
    } catch (error) {
      console.error('Error renaming person:', error);
      alert('Failed to rename person. Please try again.');
    } finally {
      setIsRenaming(false);
    }
  };

  // Photo Upload Handlers
  const handleAddPhotoClick = (person) => {
    setPersonForPhoto(person);
    setSelectedFile(null);
    setFilePreview(null);
    setPhotoUploadMsg('');
    setPhotoUploadStatus('');
    setShowPhotoModal(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setPhotoUploadMsg('');
      setPhotoUploadStatus('');
    }
  };

  const handleUploadPhoto = async () => {
    if (!personForPhoto || !selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploadingPhoto(true);
    setPhotoUploadMsg('⏳ Processing photo & extracting face embeddings...');
    setPhotoUploadStatus('');

    try {
      const personId = personForPhoto.person_id || personForPhoto.id;
      const response = await axios.post(`/api/people/${personId}/face-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setPhotoUploadStatus('success');
        setPhotoUploadMsg(`✓ ${response.data.message}`);
        await fetchData();
        setTimeout(() => {
          setShowPhotoModal(false);
          setPersonForPhoto(null);
          setSelectedFile(null);
          setFilePreview(null);
        }, 2200);
      } else {
        setPhotoUploadStatus('error');
        setPhotoUploadMsg(`✕ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error uploading face photo:', error);
      setPhotoUploadStatus('error');
      setPhotoUploadMsg('✕ Error uploading photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Helper to determine if a person has multi-angle CCTV embeddings
  const hasMultiEmbeddings = (person) => {
    if (person.embeddings && Array.isArray(person.embeddings) && person.embeddings.length > 1) {
      return person.embeddings.length;
    }
    if (person.embedding_count && person.embedding_count > 1) {
      return person.embedding_count;
    }
    return 1;
  };

  // Enrich people list with membership & embedding metadata
  const enrichedPeople = people.map(p => {
    const personId = p.id || p.person_id;
    const mem = getPersonMembership(personId, memberships, p.name);
    const memInfo = calculateMembershipInfo(mem);
    const sampleCount = hasMultiEmbeddings(p);

    return {
      ...p,
      person_id: personId,
      memInfo,
      sampleCount
    };
  });

  // Filter & Sort
  const filteredPeople = enrichedPeople
    .filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        p.name?.toLowerCase().includes(q) ||
        p.person_id?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filter === 'ACTIVE_MEMBER') return p.memInfo.isActive;
      if (filter === 'EXPIRING_SOON') return p.memInfo.isExpiringSoon;
      if (filter === 'NO_MEMBERSHIP') return p.memInfo.status === 'NO_MEMBERSHIP';
      if (filter === 'VISITORS') return p.name?.toLowerCase().startsWith('visitor') || p.is_auto_registered;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'id') return (a.person_id || '').localeCompare(b.person_id || '');
      if (sortBy === 'membership') return a.memInfo.status.localeCompare(b.memInfo.status);
      return 0;
    });

  // Summary Metrics
  const totalRegistered = people.length;
  const totalActiveMembers = enrichedPeople.filter(p => p.memInfo.isActive).length;
  const totalMultiAngle = enrichedPeople.filter(p => p.sampleCount > 1).length;
  const totalExpiringSoon = enrichedPeople.filter(p => p.memInfo.isExpiringSoon).length;

  return (
    <div className="people-container">
      {/* Top Header */}
      <div className="people-header">
        <div>
          <h1 className="people-title">👥 Registered Persons Directory</h1>
          <p className="people-subtitle">Manage registered face embeddings, CCTV samples, and gym passes</p>
        </div>
      </div>

      {/* Alert Banner */}
      {deleteMessage && (
        <div className={`alert-banner ${deleteMessage.startsWith('✓') ? 'success' : 'error'}`}>
          {deleteMessage}
        </div>
      )}

      {/* KPI Summary Banner */}
      <div className="people-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">👥</div>
          <div>
            <span className="kpi-label">Total Persons</span>
            <span className="kpi-value">{totalRegistered}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">🟢</div>
          <div>
            <span className="kpi-label">Active Members</span>
            <span className="kpi-value">{totalActiveMembers}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">📹</div>
          <div>
            <span className="kpi-label">CCTV Multi-Angle</span>
            <span className="kpi-value">{totalMultiAngle}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon yellow">⚠️</div>
          <div>
            <span className="kpi-label">Expiring Soon</span>
            <span className="kpi-value warning-text">{totalExpiringSoon}</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Filters, View Mode & Sort */}
      <div className="people-controls-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or Person ID (e.g. Ahmad, P-000001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>}
        </div>

        <div className="filter-tabs">
          <button className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
            All ({enrichedPeople.length})
          </button>
          <button className={`tab-btn ${filter === 'ACTIVE_MEMBER' ? 'active' : ''}`} onClick={() => setFilter('ACTIVE_MEMBER')}>
            Active Members
          </button>
          <button className={`tab-btn warning ${filter === 'EXPIRING_SOON' ? 'active' : ''}`} onClick={() => setFilter('EXPIRING_SOON')}>
            ⚠️ Expiring Soon
          </button>
          <button className={`tab-btn ${filter === 'VISITORS' ? 'active' : ''}`} onClick={() => setFilter('VISITORS')}>
            👤 Auto Visitors
          </button>
          <button className={`tab-btn ${filter === 'NO_MEMBERSHIP' ? 'active' : ''}`} onClick={() => setFilter('NO_MEMBERSHIP')}>
            ⚪ No Membership
          </button>
        </div>

        <div className="controls-right">
          <div className="view-switcher">
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} title="Grid View" onClick={() => setViewMode('grid')}>
              🪟 Grid
            </button>
            <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} title="Table View" onClick={() => setViewMode('table')}>
              📊 Table
            </button>
          </div>

          <div className="sort-box">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Name (A-Z)</option>
              <option value="id">Person ID</option>
              <option value="membership">Membership Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h3>Loading Registered Persons...</h3>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No Persons Found</h3>
          <p>No registered people match your search query or filter selection.</p>
          <button className="button button-primary" onClick={() => { setSearchTerm(''); setFilter('ALL'); }}>
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ================= CARDS GRID VIEW ================= */
        <div className="people-cards-grid">
          {filteredPeople.map((person) => {
            const initial = person.name ? person.name.charAt(0).toUpperCase() : '?';
            const cropUrl = `/api/face-crops/${person.person_id}.jpg`;
            return (
              <div key={person.person_id} className="person-card">
                {/* Header Avatar & Basic Info */}
                <div className="card-header">
                  <div className="person-avatar-circle">
                    <img 
                      src={cropUrl} 
                      alt={person.name} 
                      className="person-crop-img" 
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} 
                    />
                    <span style={{ display: 'none' }}>{initial}</span>
                  </div>
                  <div className="person-main-info">
                    <h3 className="person-name">{person.name}</h3>
                    <span className="person-id-badge">{person.person_id}</span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="card-badges-row">
                  {/* Gym Membership Badge */}
                  <span className={`membership-pill ${person.memInfo.badgeClass}`}>
                    {person.memInfo.badgeText}
                  </span>

                  {/* Embedding CCTV Tag */}
                  <span className="embedding-tag" title={`${person.sampleCount} face embedding samples stored`}>
                    {person.sampleCount > 1 ? `📹 ${person.sampleCount} CCTV Angles` : `📷 1 Sample`}
                  </span>
                </div>

                {/* Person Meta Details */}
                <div className="person-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Database Status</span>
                    <span className="detail-value status-online">● Registered</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Gym Pass</span>
                    <span className="detail-value">{person.memInfo.label}</span>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="card-actions-row">
                  <button
                    className="btn-add-photo"
                    title="Add Extra Face Photo Sample"
                    onClick={() => handleAddPhotoClick(person)}
                  >
                    📸 Add Photo
                  </button>
                  <button
                    className="btn-rename"
                    title="Rename Person Name"
                    onClick={() => handleRenameClick(person)}
                  >
                    ✏️ Rename
                  </button>
                  <button
                    className="btn-unregister"
                    title="Remove Person from Database"
                    onClick={() => handleUnregisterClick(person)}
                    disabled={isDeleting}
                  >
                    <span className="btn-icon">🗑️</span>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE LIST VIEW ================= */
        <div className="people-table-container">
          <table className="people-table">
            <thead>
              <tr>
                <th>Face Photo</th>
                <th>Member</th>
                <th>Person ID</th>
                <th>Face Embedding Type</th>
                <th>Gym Membership Pass</th>
                <th>System Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.map((person) => {
                const initial = person.name ? person.name.charAt(0).toUpperCase() : '?';
                const cropUrl = `/api/face-crops/${person.person_id}.jpg`;
                return (
                  <tr key={person.person_id}>
                    <td>
                      <div className="table-avatar-box">
                        <img 
                          src={cropUrl} 
                          alt={person.name} 
                          className="table-crop-img" 
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} 
                        />
                        <span className="table-avatar" style={{ display: 'none' }}>{initial}</span>
                      </div>
                    </td>
                    <td>
                      <span className="table-member-name">{person.name}</span>
                    </td>
                    <td>
                      <span className="person-id-badge">{person.person_id}</span>
                    </td>
                    <td>
                      <span className="embedding-tag">
                        {person.sampleCount > 1 ? `📹 ${person.sampleCount} CCTV Multi-Angles` : `📷 1 Camera Sample`}
                      </span>
                    </td>
                    <td>
                      <span className={`membership-pill ${person.memInfo.badgeClass}`}>
                        {person.memInfo.badgeText}
                      </span>
                    </td>
                    <td>
                      <span className="status-online">● REGISTERED</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-add-photo table-btn"
                          title="Add Face Photo Sample"
                          onClick={() => handleAddPhotoClick(person)}
                        >
                          📸 Photo
                        </button>
                        <button
                          className="btn-rename table-btn"
                          title="Rename Person"
                          onClick={() => handleRenameClick(person)}
                        >
                          ✏️ Rename
                        </button>
                        <button
                          className="btn-unregister table-btn"
                          title="Remove Person from Database"
                          onClick={() => handleUnregisterClick(person)}
                          disabled={isDeleting}
                        >
                          <span className="btn-icon">🗑️</span>
                          <span>Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && personToRename && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>✏️ Assign / Rename Person</h2>
              <button className="close-btn" onClick={() => setShowRenameModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px' }}>
              <div className="rename-face-preview">
                <img 
                  src={`/api/face-crops/${personToRename.person_id}.jpg`} 
                  alt={personToRename.name} 
                  className="rename-face-img"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
                <div className="rename-avatar-fallback" style={{ display: 'none' }}>
                  {personToRename.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className="person-id-badge">{personToRename.person_id}</span>
                <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Change name for this recognized person
                </p>
              </div>
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Enter Full Name:
                </label>
                <input 
                  type="text" 
                  className="rename-input"
                  placeholder="e.g. Zeeshan Ahmad" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#f8fafc',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRenameModal(false)} disabled={isRenaming}>
                Cancel
              </button>
              <button className="button button-primary" onClick={handleConfirmRename} disabled={isRenaming || !newName.trim()}>
                {isRenaming ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Unregister Modal */}
      {showConfirmDialog && personToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>🗑️ Unregister Person</h2>
              <button className="close-btn" onClick={handleCancelUnregister}>✕</button>
            </div>
            <div className="confirm-body">
              <p>Are you sure you want to unregister this person?</p>
              <div className="confirm-person-box">
                <div className="confirm-avatar">{personToDelete.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <h4>{personToDelete.name}</h4>
                  <span className="person-id-badge">{personToDelete.id || personToDelete.person_id}</span>
                </div>
              </div>
              <p className="warning-text">
                ⚠️ Warning: This will permanently remove their stored face embedding from the recognition database.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCancelUnregister}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleConfirmUnregister}
                disabled={isDeleting}
              >
                {isDeleting ? 'Unregistering...' : 'Yes, Unregister'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoModal && personForPhoto && (
        <div className="modal-overlay">
          <div className="modal-content photo-modal-content">
            <div className="modal-header">
              <h2>📸 Add Extra Face Photo Sample</h2>
              <button className="close-btn" onClick={() => setShowPhotoModal(false)} disabled={isUploadingPhoto}>✕</button>
            </div>
            <div className="modal-body photo-modal-body">
              <div className="photo-person-info">
                <span className="person-id-badge">{personForPhoto.person_id || personForPhoto.id}</span>
                <h3>{personForPhoto.name}</h3>
                <span className="sample-count-info">
                  Stored Embedding Samples: <strong>{hasMultiEmbeddings(personForPhoto)} / 5</strong>
                </span>
              </div>

              {/* Upload Input & Preview Area */}
              <div className="photo-upload-box">
                {filePreview ? (
                  <div className="photo-preview-container">
                    <img src={filePreview} alt="Selected Face Preview" className="photo-preview-img" />
                    <button className="btn-change-photo" onClick={() => { setSelectedFile(null); setFilePreview(null); }}>
                      🔄 Choose Different Photo
                    </button>
                  </div>
                ) : (
                  <label className="photo-drop-zone">
                    <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                    <div className="drop-zone-content">
                      <span className="upload-icon">📷</span>
                      <span className="upload-title">Click to Select Clear Face Photo</span>
                      <span className="upload-subtitle">JPG, PNG or WEBP (Ensure 1 clear face under good lighting)</span>
                    </div>
                  </label>
                )}
              </div>

              {/* Upload Status Notification */}
              {photoUploadMsg && (
                <div className={`photo-status-alert ${photoUploadStatus}`}>
                  {photoUploadMsg}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowPhotoModal(false)} 
                disabled={isUploadingPhoto}
              >
                Cancel
              </button>
              <button 
                className="button button-primary" 
                onClick={handleUploadPhoto} 
                disabled={isUploadingPhoto || !selectedFile}
              >
                {isUploadingPhoto ? '⏳ Extracting Features...' : '✨ Upload & Extract Embedding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default People;