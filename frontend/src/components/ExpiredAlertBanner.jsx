import React, { useState } from 'react';
import './ExpiredAlertBanner.css';
import { openWhatsApp, generateWhatsAppReminderText } from '../utils/whatsappUtils';

function ExpiredAlertBanner({ alertData, onRenewClick, onDismiss }) {
  const [imgError, setImgError] = useState(false);

  if (!alertData) return null;

  const isExpired = alertData.alert_type === 'EXPIRED';
  const isFrozen = alertData.alert_type === 'FROZEN';
  const isExpiringSoon = alertData.alert_type === 'EXPIRING_SOON';
  const isTrialExpired = alertData.alert_type === 'TRIAL_EXPIRED';
  const isNoPass = alertData.alert_type === 'NO_PASS';

  const handleWhatsApp = () => {
    const text = generateWhatsAppReminderText({
      person_name: alertData.name,
      person_id: alertData.person_id,
      plan_name: alertData.plan_name || 'Gym Pass',
      expiry_date: alertData.expiry_date,
      days_left: alertData.days_left
    }, 'Gym Management');
    openWhatsApp(alertData.phone || '', text);
  };

  return (
    <div className={`expired-alert-banner ${isExpired ? 'expired' : isFrozen ? 'frozen' : isTrialExpired ? 'trial-expired' : isExpiringSoon ? 'expiring' : 'nopass'}`}>
      <div className="banner-inner-container">
        <div className="banner-left-section">
          <div className="banner-pulse-icon">
            {isExpired ? '🚨' : isFrozen ? '❄️' : isTrialExpired ? '🚫🔒' : isExpiringSoon ? '⚠️' : '👤'}
          </div>

          <div className="banner-avatar">
            {!imgError ? (
              <img 
                src={`/api/crop/${alertData.person_id}?t=${Date.now()}`} 
                alt="" 
                onError={() => setImgError(true)} 
              />
            ) : (
              <span className="banner-avatar-initial">
                {alertData.name ? alertData.name.charAt(0).toUpperCase() : 'M'}
              </span>
            )}
          </div>

          <div className="banner-text-details">
            <div className="banner-title-row">
              <span className="banner-badge">
                {isExpired ? 'DOOR LOCKED • PASS EXPIRED' : 
                 isFrozen ? 'DOOR LOCKED • MEMBERSHIP FROZEN' : 
                 isTrialExpired ? 'DOOR LOCKED • 5-DAY TRIAL EXPIRED' : 
                 isExpiringSoon ? 'DOOR OPEN • EXPIRING SOON' : 'DOOR LOCKED • NO MEMBERSHIP PASS'}
              </span>
              <span className="banner-time">{alertData.timestamp || 'Live Alert'}</span>
            </div>

            <div className="banner-member-name">
              <strong>{alertData.name}</strong> <span className="banner-pid">({alertData.person_id})</span>
            </div>

            <div className="banner-sub-msg">
              {alertData.alert_message || 'Please verify pass status at the reception.'}
            </div>

            {/* Prominent Real-Time Countdown Box */}
            <div className="banner-countdown-box">
              {isTrialExpired ? (
                <span className="countdown-pill trial-expired">
                  ⏳ <strong>0 DAYS REMAINING</strong> • 5 of 5 Free Days Used (Day {alertData.trial_days_used || 6} Attendance)
                </span>
              ) : isExpired ? (
                <span className="countdown-pill expired">
                  ⏳ <strong>{Math.abs(alertData.days_left || 0)} DAYS OVERDUE</strong> • Pass Expired on {alertData.expiry_date || 'N/A'}
                </span>
              ) : isExpiringSoon ? (
                <span className="countdown-pill expiring">
                  ⏳ <strong>{alertData.days_left} DAY{alertData.days_left !== 1 ? 'S' : ''} LEFT</strong> • Expires on {alertData.expiry_date}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="banner-right-actions">
          {alertData.phone && (
            <button 
              className="btn-banner-action whatsapp" 
              title="Send WhatsApp Reminder"
              onClick={handleWhatsApp}
            >
              💬 WhatsApp
            </button>
          )}

          {onRenewClick && (
            <button 
              className="btn-banner-action renew"
              title="Renew Pass Immediately"
              onClick={() => onRenewClick(alertData)}
            >
              🔄 Renew Pass
            </button>
          )}

          <button 
            className="btn-banner-dismiss" 
            onClick={onDismiss}
            title="Dismiss Banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExpiredAlertBanner;
