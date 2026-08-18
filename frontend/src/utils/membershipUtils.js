/**
 * Utility functions for Membership calculation and formatting
 */

export const calculateMembershipInfo = (membership) => {
  if (!membership || !membership.expiry_date) {
    return {
      status: 'NO_MEMBERSHIP',
      label: 'No Active Membership',
      badgeText: 'No Plan',
      daysLeft: 0,
      badgeClass: 'badge-muted',
      color: '#94a3b8',
      isExpiringSoon: false,
      isExpired: false,
      isFrozen: false,
      isActive: false
    };
  }

  const rawStatus = (membership.status || 'ACTIVE').toUpperCase();

  if (rawStatus === 'FROZEN') {
    return {
      status: 'FROZEN',
      label: 'Membership Frozen',
      badgeText: '❄️ Frozen',
      daysLeft: 0,
      badgeClass: 'badge-warning',
      color: '#f59e0b',
      isExpiringSoon: false,
      isExpired: false,
      isFrozen: true,
      isActive: false
    };
  }

  if (rawStatus === 'CANCELLED') {
    return {
      status: 'CANCELLED',
      label: 'Membership Cancelled',
      badgeText: '🚫 Cancelled',
      daysLeft: 0,
      badgeClass: 'badge-danger',
      color: '#ef4444',
      isExpiringSoon: false,
      isExpired: false,
      isFrozen: false,
      isActive: false
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(membership.expiry_date);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (isNaN(daysLeft)) {
    return {
      status: 'EXPIRED',
      label: 'Expired',
      badgeText: '🚨 Expired',
      daysLeft: 0,
      badgeClass: 'badge-danger',
      color: '#ef4444',
      isExpiringSoon: false,
      isExpired: true,
      isFrozen: false,
      isActive: false
    };
  }

  if (daysLeft < 0) {
    const ago = Math.abs(daysLeft);
    return {
      status: 'EXPIRED',
      label: `Expired ${ago} ${ago === 1 ? 'day' : 'days'} ago`,
      badgeText: `🚨 Expired (${ago}d ago)`,
      daysLeft: daysLeft,
      badgeClass: 'badge-danger',
      color: '#ef4444',
      isExpiringSoon: false,
      isExpired: true,
      isFrozen: false,
      isActive: false
    };
  } else if (daysLeft === 0) {
    return {
      status: 'EXPIRING_SOON',
      label: 'Expires Today!',
      badgeText: '⚠️ Expires Today!',
      daysLeft: 0,
      badgeClass: 'badge-warning',
      color: '#f59e0b',
      isExpiringSoon: true,
      isExpired: false,
      isFrozen: false,
      isActive: true
    };
  } else if (daysLeft <= 7) {
    return {
      status: 'EXPIRING_SOON',
      label: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} remaining`,
      badgeText: `⚠️ ${daysLeft}d left`,
      daysLeft: daysLeft,
      badgeClass: 'badge-warning',
      color: '#f59e0b',
      isExpiringSoon: true,
      isExpired: false,
      isFrozen: false,
      isActive: true
    };
  } else {
    return {
      status: 'ACTIVE',
      label: `${daysLeft} days remaining`,
      badgeText: `🟢 ${daysLeft}d left`,
      daysLeft: daysLeft,
      badgeClass: 'badge-success',
      color: '#10b981',
      isExpiringSoon: false,
      isExpired: false,
      isFrozen: false,
      isActive: true
    };
  }
};

/**
 * Finds person's active/latest membership from memberships array
 */
export const getPersonMembership = (personId, membershipsList = [], personName = '') => {
  if ((!personId && !personName) || !membershipsList.length) return null;
  
  const cleanId = (personId || '').trim().toLowerCase();
  const cleanName = (personName || '').trim().toLowerCase();

  const personMemberships = membershipsList.filter(m => {
    const mId = (m.person_id || '').trim().toLowerCase();
    const mName = (m.person_name || '').trim().toLowerCase();

    // 1. Direct ID match
    if (cleanId && mId === cleanId) return true;

    // 2. Direct Name match
    if (cleanName && (mName === cleanName || mId === cleanName)) return true;

    // 3. Substring match (e.g., handles "Ahsan ()" matching "Ahsan" or "P-000002")
    if (cleanName && (mId.includes(cleanName) || mName.includes(cleanName))) return true;
    if (cleanId && (mId.includes(cleanId) || mName.includes(cleanId))) return true;

    return false;
  });
  
  if (!personMemberships.length) return null;
  
  // Sort by expiry_date descending
  personMemberships.sort((a, b) => new Date(b.expiry_date || 0) - new Date(a.expiry_date || 0));
  return personMemberships[0];
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0
  }).format(amount || 0).replace('PKR', 'Rs.');
};
