import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getPersonMembership, calculateMembershipInfo } from '../utils/membershipUtils';
import MemberProfileModal from './MemberProfileModal';
import { useAuth } from '../context/AuthContext';
import './People.css';

// Dedicated avatar component that handles face crops with graceful fallback
function PersonAvatar({ name, personId, size = 54, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const initial = name && name.trim() ? name.trim().charAt(0).toUpperCase() : '?';
  const cropUrl = `/api/face-crops/${personId}.jpg`;

  return (
    <div 
      className={`person-avatar-circle ${className}`}
      style={{ width: size, height: size, minWidth: size, maxWidth: size }}
    >
      {!imgError ? (
        <img 
          src={cropUrl} 
          alt="" 
          className="person-crop-img" 
          onError={() => setImgError(true)} 
        />
      ) : (
        <span className="person-avatar-initial">{initial}</span>
      )}
    </div>
  );
}

function People() {
  const { canDelete, isAdmin, isManager, isReceptionist } = useAuth();
  const [people, setPeople] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfilePerson, setSelectedProfilePerson] = useState(null); // { id, name }

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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [existingSamples, setExistingSamples] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadMsg, setPhotoUploadMsg] = useState('');
  const [photoUploadStatus, setPhotoUploadStatus] = useState('');

  // Gallery Modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [personForGallery, setPersonForGallery] = useState(null);

  // Live Webcam Capture State
  const [photoInputMode, setPhotoInputMode] = useState('file'); // 'file' | 'webcam'
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const fetchFaceSamples = async (personId) => {
    try {
      const res = await axios.get(`/api/people/${personId}/face-samples`);
      setExistingSamples(res.data || []);
    } catch (err) {
      console.error('Error fetching face samples:', err);
    }
  };

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
    setSelectedFiles([]);
    setFilePreviews([]);
    setPhotoUploadMsg('');
    setPhotoUploadStatus('');
    setPhotoInputMode('file');
    setShowPhotoModal(true);
  };

  const startModalWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsWebcamActive(true);
    } catch (err) {
      console.error('Error starting modal webcam:', err);
      alert('Could not access laptop webcam. Please check camera permissions.');
    }
  };

  const stopModalWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  };

  const handleClosePhotoModal = () => {
    stopModalWebcam();
    setShowPhotoModal(false);
    setPersonForPhoto(null);
    setSelectedFiles([]);
    setFilePreviews([]);
    setPhotoUploadMsg('');
    setPhotoUploadStatus('');
    setPhotoInputMode('file');
  };

  const handleOpenGalleryModal = (person) => {
    setPersonForGallery(person);
    const pid = person.person_id || person.id;
    fetchFaceSamples(pid);
    setShowGalleryModal(true);
  };

  const handleCloseGalleryModal = () => {
    setShowGalleryModal(false);
    setPersonForGallery(null);
  };

  const handleDeleteSample = async (sampleIdx) => {
    const targetPerson = personForGallery || personForPhoto;
    if (!targetPerson) return;
    const personId = targetPerson.person_id || targetPerson.id;

    if (existingSamples.length <= 1) {
      alert("Cannot delete the last remaining face sample. Person must have at least 1 face sample!");
      return;
    }

    try {
      setPhotoUploadMsg('⏳ Deleting face sample...');
      setPhotoUploadStatus('');
      const res = await axios.delete(`/api/people/${personId}/face-samples/${sampleIdx}`);
      if (res.data.success) {
        setPhotoUploadStatus('success');
        setPhotoUploadMsg(`✓ ${res.data.message}`);
        await fetchFaceSamples(personId);
        await fetchData();
      } else {
        setPhotoUploadStatus('error');
        setPhotoUploadMsg(`✕ ${res.data.message}`);
      }
    } catch (err) {
      console.error('Error deleting face sample:', err);
      setPhotoUploadStatus('error');
      setPhotoUploadMsg('✕ Failed to delete face sample.');
    }
  };

  const handleSetPrimarySample = async (sampleIdx) => {
    const targetPerson = personForGallery || personForPhoto;
    if (!targetPerson) return;
    const personId = targetPerson.person_id || targetPerson.id;

    if (sampleIdx === 0) return;

    try {
      setPhotoUploadMsg('⏳ Setting primary face photo...');
      setPhotoUploadStatus('');
      const res = await axios.put(`/api/people/${personId}/primary-face-sample/${sampleIdx}`);
      if (res.data.success) {
        setPhotoUploadStatus('success');
        setPhotoUploadMsg(`✓ ${res.data.message}`);
        await fetchFaceSamples(personId);
        await fetchData();
      } else {
        setPhotoUploadStatus('error');
        setPhotoUploadMsg(`✕ ${res.data.message}`);
      }
    } catch (err) {
      console.error('Error setting primary face sample:', err);
      setPhotoUploadStatus('error');
      setPhotoUploadMsg('✕ Failed to set primary face photo.');
    }
  };

  const handleRemoveNewFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setFilePreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const captureWebcamSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `cam_snapshot_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);
        
        setSelectedFiles(prev => [...prev, file]);
        setFilePreviews(prev => [...prev, previewUrl]);
        setPhotoUploadMsg(`📸 Captured snapshot #${selectedFiles.length + 1}!`);
        setPhotoUploadStatus('success');
      }
    }, 'image/jpeg', 0.92);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      const previews = files.map(f => URL.createObjectURL(f));
      setFilePreviews(previews);
      setPhotoUploadMsg('');
      setPhotoUploadStatus('');
    }
  };

  const handleUploadPhoto = async () => {
    if (!personForPhoto || selectedFiles.length === 0) return;

    const personId = personForPhoto.person_id || personForPhoto.id;
    setIsUploadingPhoto(true);
    setPhotoUploadMsg(`⏳ Processing ${selectedFiles.length} photo(s) & extracting face embeddings...`);
    setPhotoUploadStatus('');

    try {
      let response;
      if (selectedFiles.length === 1) {
        const formData = new FormData();
        formData.append('file', selectedFiles[0]);
        response = await axios.post(`/api/people/${personId}/face-image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        const formData = new FormData();
        selectedFiles.forEach(f => formData.append('files', f));
        response = await axios.post(`/api/people/${personId}/batch-face-images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (response.data.success) {
        setPhotoUploadStatus('success');
        setPhotoUploadMsg(`✓ ${response.data.message}`);
        await fetchData();
        setTimeout(() => {
          stopModalWebcam();
          setShowPhotoModal(false);
          setPersonForPhoto(null);
          setSelectedFiles([]);
          setFilePreviews([]);
        }, 2200);
      } else {
        setPhotoUploadStatus('error');
        setPhotoUploadMsg(`✕ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error uploading face photo:', error);
      setPhotoUploadStatus('error');
      setPhotoUploadMsg('✕ Error uploading photos. Please try again.');
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
          <p className="people-subtitle">Manage registered face embeddings, CCTV multi-angle samples, and gym passes</p>
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
          <div className="kpi-info">
            <span className="kpi-label">Total Persons</span>
            <span className="kpi-value">{totalRegistered}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">🟢</div>
          <div className="kpi-info">
            <span className="kpi-label">Active Members</span>
            <span className="kpi-value">{totalActiveMembers}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">📹</div>
          <div className="kpi-info">
            <span className="kpi-label">CCTV Multi-Angle</span>
            <span className="kpi-value">{totalMultiAngle}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon yellow">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-label">Expiring Soon</span>
            <span className="kpi-value warning-text">{totalExpiringSoon}</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Filters, View Mode & Sort */}
      <div className="people-controls-bar">
        <div className="controls-top-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or Person ID (e.g. Ahmad, P-000001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>}
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
              <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Name (A-Z)</option>
                <option value="id">Person ID</option>
                <option value="membership">Membership Status</option>
              </select>
            </div>
          </div>
        </div>

        <div className="filter-tabs">
          <button className={`tab-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
            <span>All</span>
            <span className="tab-count-badge">{enrichedPeople.length}</span>
          </button>
          <button className={`tab-btn ${filter === 'ACTIVE_MEMBER' ? 'active' : ''}`} onClick={() => setFilter('ACTIVE_MEMBER')}>
            <span>🟢 Active Members</span>
            <span className="tab-count-badge">{totalActiveMembers}</span>
          </button>
          <button className={`tab-btn warning ${filter === 'EXPIRING_SOON' ? 'active' : ''}`} onClick={() => setFilter('EXPIRING_SOON')}>
            <span>⚠️ Expiring Soon</span>
            <span className="tab-count-badge">{totalExpiringSoon}</span>
          </button>
          <button className={`tab-btn ${filter === 'VISITORS' ? 'active' : ''}`} onClick={() => setFilter('VISITORS')}>
            <span>👤 Auto Visitors</span>
            <span className="tab-count-badge">{enrichedPeople.filter(p => p.name?.toLowerCase().startsWith('visitor') || p.is_auto_registered).length}</span>
          </button>
          <button className={`tab-btn ${filter === 'NO_MEMBERSHIP' ? 'active' : ''}`} onClick={() => setFilter('NO_MEMBERSHIP')}>
            <span>⚪ No Membership</span>
            <span className="tab-count-badge">{enrichedPeople.filter(p => p.memInfo.status === 'NO_MEMBERSHIP').length}</span>
          </button>
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
            return (
              <div key={person.person_id} className="person-card">
                {/* Top-Right Quick Delete Icon Button (Admin Only) */}
                {canDelete && (
                  <button
                    className="btn-card-top-delete"
                    title="Remove Person from Database (Admin Only)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnregisterClick(person);
                    }}
                    disabled={isDeleting}
                  >
                    🗑️
                  </button>
                )}

                {/* Header Avatar & Basic Info */}
                <div 
                  className="card-header"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedProfilePerson({ id: person.person_id, name: person.name })}
                  title="Click to view Workout Calendar Heatmap & Full Profile"
                >
                  <PersonAvatar name={person.name} personId={person.person_id} size={54} />
                  <div className="person-main-info">
                    <h3 className="person-name" title={person.name}>{person.name}</h3>
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
                <div className="person-details-box">
                  <div className="detail-row">
                    <span className="detail-label">Database Status</span>
                    <span className="detail-value status-online">● Registered</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Gym Pass</span>
                    <span className="detail-value">{person.memInfo.label}</span>
                  </div>
                </div>

                {/* Stored Photos Count Badge & Manage Link - Render ONLY if person has > 1 face photos */}
                {person.sampleCount > 1 && (
                  <div className="card-samples-strip">
                    <span className="strip-label">🖼️ <strong>{person.sampleCount}</strong> Stored Face Photos</span>
                    <button className="btn-manage-photos-link" onClick={() => handleOpenGalleryModal(person)}>
                      Manage All ➔
                    </button>
                  </div>
                )}

                {/* Actions Toolbar (2 Balanced Buttons: Add Photo & Rename) */}
                <div className="card-actions-row" style={isReceptionist ? { gridTemplateColumns: '1fr' } : {}}>
                  <button
                    className="btn-card-action btn-add-photo"
                    title="Add Extra Face Photo Sample"
                    onClick={() => handleAddPhotoClick(person)}
                  >
                    <span>📸</span>
                    <span>Add Photo</span>
                  </button>
                  {!isReceptionist && (
                    <button
                      className="btn-card-action btn-rename"
                      title="Rename Person Name"
                      onClick={() => handleRenameClick(person)}
                    >
                      <span>✏️</span>
                      <span>Rename</span>
                    </button>
                  )}
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
                return (
                  <tr key={person.person_id}>
                    <td>
                      <PersonAvatar name={person.name} personId={person.person_id} size={42} />
                    </td>
                    <td>
                      <span className="table-member-name">{person.name}</span>
                    </td>
                    <td>
                      <span className="person-id-badge">{person.person_id}</span>
                    </td>
                    <td>
                      <span className="embedding-tag">
                        {person.sampleCount > 1 ? `📹 ${person.sampleCount} CCTV Angles` : `📷 1 Sample`}
                      </span>
                    </td>
                    <td>
                      <span className={`membership-pill ${person.memInfo.badgeClass}`}>
                        {person.memInfo.badgeText}
                      </span>
                    </td>
                    <td>
                      <span className="detail-value status-online">● REGISTERED</span>
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <button
                          className="btn-card-action btn-add-photo table-btn"
                          title="Add Face Photo Sample"
                          onClick={() => handleAddPhotoClick(person)}
                        >
                          📸 Photo
                        </button>
                        {!isReceptionist && (
                          <button
                            className="btn-card-action btn-rename table-btn"
                            title="Rename Person"
                            onClick={() => handleRenameClick(person)}
                          >
                            ✏️ Rename
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn-card-action btn-unregister table-btn"
                            title="Remove Person from Database"
                            onClick={() => handleUnregisterClick(person)}
                            disabled={isDeleting}
                          >
                            🗑️ Remove
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
      )}

      {/* Rename Modal */}
      {showRenameModal && personToRename && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>✏️ Rename Person</h2>
              <button className="close-btn" onClick={() => setShowRenameModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <PersonAvatar name={personToRename.name} personId={personToRename.person_id} size={70} />
              <div style={{ textAlign: 'center' }}>
                <span className="person-id-badge">{personToRename.person_id}</span>
                <p style={{ margin: '6px 0 0 0', color: 'var(--c-slate-light)', fontSize: '0.86rem', fontWeight: 600 }}>
                  Update name for this recognized member
                </p>
              </div>
              <div style={{ width: '100%' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.84rem', color: 'var(--c-slate)', fontWeight: 700 }}>
                  Enter Full Name:
                </label>
                <input 
                  type="text" 
                  className="search-input"
                  placeholder="e.g. Ahmad Saeed" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="button button-secondary" onClick={() => setShowRenameModal(false)} disabled={isRenaming}>
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
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>🗑️ Unregister Person</h2>
              <button className="close-btn" onClick={handleCancelUnregister}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--c-slate)', fontSize: '0.95rem', marginBottom: '14px', fontWeight: 600 }}>
                Are you sure you want to unregister this person from the system?
              </p>
              <div className="confirm-person-box">
                <PersonAvatar name={personToDelete.name} personId={personToDelete.id || personToDelete.person_id} size={48} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-slate)' }}>{personToDelete.name}</h4>
                  <span className="person-id-badge">{personToDelete.id || personToDelete.person_id}</span>
                </div>
              </div>
              <p className="warning-text" style={{ marginTop: '14px', color: 'var(--color-danger)', fontSize: '0.84rem', fontWeight: 600 }}>
                ⚠️ Warning: This will permanently remove their stored face embeddings from the recognition database.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="button button-secondary"
                onClick={handleCancelUnregister}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="button button-danger"
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
              <button className="close-btn" onClick={handleClosePhotoModal} disabled={isUploadingPhoto}>✕</button>
            </div>
            <div className="modal-body photo-modal-body">
              <div className="photo-person-info">
                <PersonAvatar name={personForPhoto.name} personId={personForPhoto.person_id || personForPhoto.id} size={40} />
                <div>
                  <span className="person-id-badge">{personForPhoto.person_id || personForPhoto.id}</span>
                  <h3 style={{ display: 'inline-block', marginLeft: '8px' }}>{personForPhoto.name}</h3>
                </div>
                <span className="sample-count-info">
                  Stored Samples: <strong>{hasMultiEmbeddings(personForPhoto)} / 5</strong>
                </span>
              </div>

              {/* Existing Stored Samples Gallery */}
              {existingSamples && existingSamples.length > 0 && (
                <div className="existing-samples-section">
                  <span className="section-title">🖼️ Currently Stored Face Photos ({existingSamples.length}/5):</span>
                  <div className="multi-preview-grid">
                    {existingSamples.map((sample) => (
                      <div key={sample.index} className="preview-thumb-box stored-thumb-box">
                        <img 
                          src={sample.url} 
                          alt={`Sample ${sample.index + 1}`} 
                          className="photo-preview-img stored-img" 
                          onError={(e) => { e.target.src = `/api/face-crops/${personForPhoto.person_id || personForPhoto.id}.jpg`; }}
                        />
                        <span className="thumb-label">
                          {sample.is_primary ? '⭐ Primary' : `Sample #${sample.index + 1}`}
                        </span>
                        {existingSamples.length > 1 && (
                          <button 
                            className="btn-delete-sample-icon" 
                            title="Delete this stored face photo sample"
                            onClick={() => handleDeleteSample(sample.index)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode Switcher Tabs */}
              <div className="photo-mode-tabs">
                <button
                  className={`photo-mode-btn ${photoInputMode === 'file' ? 'active' : ''}`}
                  onClick={() => { stopModalWebcam(); setPhotoInputMode('file'); }}
                >
                  📁 Upload Files from PC
                </button>
                <button
                  className={`photo-mode-btn ${photoInputMode === 'webcam' ? 'active' : ''}`}
                  onClick={() => { setPhotoInputMode('webcam'); startModalWebcam(); }}
                >
                  📷 Live Webcam Snapshots
                </button>
              </div>

              {/* Mode 1: File Input & Preview Area */}
              {photoInputMode === 'file' && (
                <div className="photo-upload-box">
                  {filePreviews.length > 0 ? (
                    <div className="photo-preview-container">
                      <div className="multi-preview-grid">
                        {filePreviews.map((previewSrc, idx) => (
                          <div key={idx} className="preview-thumb-box">
                            <img src={previewSrc} alt={`Selected ${idx+1}`} className="photo-preview-img" />
                            <span className="thumb-label">Photo #{idx+1}</span>
                            <button 
                              className="btn-remove-new-icon"
                              title="Remove from selection"
                              onClick={() => handleRemoveNewFile(idx)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <button className="btn-change-photo" onClick={() => { setSelectedFiles([]); setFilePreviews([]); }}>
                        🔄 Clear All Selections
                      </button>
                    </div>
                  ) : (
                    <label className="photo-drop-zone">
                      <input type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                      <div className="drop-zone-content">
                        <span className="upload-icon">📁</span>
                        <span className="upload-title">Click to Select 1 or Multiple Face Photos</span>
                        <span className="upload-subtitle">Select multiple photos at once (JPG, PNG or WEBP)</span>
                      </div>
                    </label>
                  )}
                </div>
              )}

              {/* Mode 2: Live Webcam Capture Area */}
              {photoInputMode === 'webcam' && (
                <div className="webcam-capture-box">
                  <div className="modal-video-container">
                    <video ref={videoRef} autoPlay playsInline muted className="modal-webcam-feed" />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>
                  <div className="webcam-actions-row">
                    <button
                      className="button button-success btn-capture"
                      onClick={captureWebcamSnapshot}
                      disabled={!isWebcamActive}
                    >
                      📸 CAPTURE PHOTO (#{selectedFiles.length + 1})
                    </button>
                  </div>

                  {filePreviews.length > 0 && (
                    <div className="photo-preview-container" style={{ marginTop: '12px' }}>
                      <span className="section-title">Captured Snapshots ({filePreviews.length}):</span>
                      <div className="multi-preview-grid">
                        {filePreviews.map((previewSrc, idx) => (
                          <div key={idx} className="preview-thumb-box">
                            <img src={previewSrc} alt={`Snapshot ${idx+1}`} className="photo-preview-img" />
                            <span className="thumb-label">Snap #{idx+1}</span>
                            <button 
                              className="btn-remove-new-icon"
                              title="Remove snapshot"
                              onClick={() => handleRemoveNewFile(idx)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Status Notification */}
              {photoUploadMsg && (
                <div className={`photo-status-alert ${photoUploadStatus}`}>
                  {photoUploadMsg}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="button button-secondary" 
                onClick={handleClosePhotoModal} 
                disabled={isUploadingPhoto}
              >
                Cancel
              </button>
              <button 
                className="button button-primary" 
                onClick={handleUploadPhoto} 
                disabled={isUploadingPhoto || selectedFiles.length === 0}
              >
                {isUploadingPhoto ? '⏳ Extracting Features...' : `✨ Upload ${selectedFiles.length > 1 ? `${selectedFiles.length} Photos` : 'Photo'} & Extract Embeddings`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View & Manage Face Photos Gallery Modal */}
      {showGalleryModal && personForGallery && (
        <div className="modal-overlay">
          <div className="modal-content gallery-modal-content">
            <div className="modal-header">
              <h2>🖼️ Stored Face Photos — {personForGallery.name}</h2>
              <button className="close-btn" onClick={handleCloseGalleryModal}>✕</button>
            </div>
            <div className="modal-body gallery-modal-body">
              <div className="photo-person-info">
                <PersonAvatar name={personForGallery.name} personId={personForGallery.person_id || personForGallery.id} size={40} />
                <div>
                  <span className="person-id-badge">{personForGallery.person_id || personForGallery.id}</span>
                  <h3 style={{ display: 'inline-block', marginLeft: '8px' }}>{personForGallery.name}</h3>
                </div>
                <span className="sample-count-info">
                  Total Samples: <strong>{existingSamples.length} / 5</strong>
                </span>
              </div>

              {/* High-res Photos Grid with Delete Buttons */}
              <div className="gallery-grid">
                {existingSamples.map((sample) => (
                  <div key={sample.index} className="gallery-item-card">
                    <div className="gallery-img-box">
                      <img 
                        src={sample.url} 
                        alt={`Face Sample ${sample.index + 1}`} 
                        className="gallery-img" 
                        onError={(e) => { e.target.src = `/api/face-crops/${personForGallery.person_id || personForGallery.id}.jpg`; }}
                      />
                      <span className={`sample-badge ${sample.is_primary ? 'primary' : ''}`}>
                        {sample.is_primary ? '⭐ Primary' : `Sample #${sample.index + 1}`}
                      </span>
                    </div>
                    <div className="gallery-item-actions">
                      {sample.is_primary ? (
                        <span className="primary-active-tag">⭐ Main Face</span>
                      ) : (
                        <button 
                          className="btn-make-primary"
                          title="Set as main primary face photo for this person"
                          onClick={() => handleSetPrimarySample(sample.index)}
                        >
                          ⭐ Make Primary
                        </button>
                      )}

                      {existingSamples.length > 1 && (
                        <button 
                          className="btn-delete-sample"
                          title="Delete this face sample"
                          onClick={() => handleDeleteSample(sample.index)}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Notification */}
              {photoUploadMsg && (
                <div className={`photo-status-alert ${photoUploadStatus}`} style={{ marginTop: '10px' }}>
                  {photoUploadMsg}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button 
                className="button button-primary" 
                onClick={() => {
                  handleCloseGalleryModal();
                  handleAddPhotoClick(personForGallery);
                }}
              >
                📸 Add New Face Photo
              </button>
              <button className="button button-secondary" onClick={handleCloseGalleryModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detailed Profile & Workout Calendar Heatmap Modal */}
      {selectedProfilePerson && (
        <MemberProfileModal
          personId={selectedProfilePerson.id}
          personName={selectedProfilePerson.name}
          onClose={() => setSelectedProfilePerson(null)}
        />
      )}
    </div>
  );
}

export default People;