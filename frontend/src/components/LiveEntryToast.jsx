import React, { useEffect, useState } from 'react';
import './LiveEntryToast.css';

function LiveEntryToast({ entry, onProfileClick, onDismiss }) {
  const [isClosing, setIsClosing] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 6000);

    return () => clearTimeout(timer);
  }, [entry]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onDismiss) onDismiss(entry.id || entry.person_id);
    }, 350);
  };

  const isNoPass = entry.membership_status === 'NO_PASS';
  const isExpired = entry.membership_status === 'EXPIRED';
  const isFrozen = entry.membership_status === 'FROZEN';
  const isExpiringSoon = entry.membership_status === 'EXPIRING_SOON';
  const isTrial = entry.membership_status === 'TRIAL';
  const isTrialExpired = entry.membership_status === 'TRIAL_EXPIRED';

  return (
    <div 
      className={`live-entry-toast ${isClosing ? 'slide-out' : 'slide-in'} ${isTrialExpired ? 'expired-alert' : isNoPass ? 'nopass-alert' : isExpired ? 'expired-alert' : isFrozen ? 'frozen-alert' : isExpiringSoon ? 'expiring-alert' : isTrial ? 'trial-entry' : 'active-entry'}`}
      onClick={() => onProfileClick && onProfileClick(entry.person_id || entry.id, entry.name)}
    >
      <div className="toast-left-avatar">
        {!imgError ? (
          <img 
            src={`/api/crop/${entry.person_id || entry.id}?t=${Date.now()}`} 
            alt="" 
            onError={() => setImgError(true)} 
          />
        ) : (
          <span className="toast-avatar-char">
            {entry.name ? entry.name.charAt(0).toUpperCase() : 'M'}
          </span>
        )}
      </div>

      <div className="toast-body-info">
        <div className="toast-top-meta">
          <span className="toast-verified-tag">
            {isTrialExpired ? '🚫 5-DAY TRIAL EXPIRED • DOOR LOCKED' : 
             isNoPass ? '🚫 NO MEMBERSHIP PASS' : 
             isExpired ? '🚨 PASS EXPIRED • DOOR LOCKED' : 
             isFrozen ? '❄️ PASS FROZEN • DOOR LOCKED' : 
             isTrial ? '🚪🟢 TRIAL ACCESS • DOOR OPEN' : 
             isExpiringSoon ? '⚠️ EXPIRING SOON • DOOR OPEN' : '✨ ENTRY VERIFIED • DOOR OPEN'}
          </span>
          <span className="toast-timestamp">{entry.time || 'Just now'}</span>
        </div>

        <h4 className="toast-member-name">{entry.name || 'Member'}</h4>

        <div className="toast-bottom-tags">
          <span className="toast-id-pill">🆔 {entry.person_id || entry.id}</span>
          <span className="toast-plan-pill">
            {entry.plan_name ? entry.plan_name : (isNoPass ? 'No Active Plan' : 'Standard Pass')}
            {entry.days_left !== undefined && entry.days_left !== null && ` • ${entry.days_left >= 0 ? `${entry.days_left}d left` : `${Math.abs(entry.days_left)}d overdue`}`}
          </span>
          {isTrial && (
            <span className="toast-trial-pill">
              ⏳ Day {entry.trial_days_used || 1}/5 ({entry.trial_days_left !== undefined ? entry.trial_days_left : (5 - (entry.trial_days_used || 1))}d left)
            </span>
          )}
          {isTrialExpired && (
            <span className="toast-trial-pill expired">
              🚨 0d left (5/5 Used)
            </span>
          )}
        </div>
      </div>

      <button 
        className="toast-close-btn" 
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export default LiveEntryToast;
