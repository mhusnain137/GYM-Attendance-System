import React, { useState } from 'react';
import './ExpiredAlertBanner.css';
import { openWhatsApp, generateWhatsAppReminderText } from '../utils/whatsappUtils';

function ExpiredAlertBanner({ alertData, onRenewClick, onDismiss }) {
  const [imgError, setImgError] = useState(false);

  if (!alertData) return null;

  const isExpired = alertData.alert_type === 'EXPIRED';
  const isFrozen = alertData.alert_type === 'FROZEN';
  const isExpiringSoon = alertData.alert_type === 'EXPIRING_SOON';
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
    <div className={`expired-alert-banner ${isExpired ? 'expired' : isFrozen ? 'frozen' : isExpiringSoon ? 'expiring' : 'nopass'}`}>
      <div className="banner-inner-container">
        <div className="banner-left-section">
          <div className="banner-pulse-icon">
            {isExpired ? '🚨' : isFrozen ? '❄️' : isExpiringSoon ? '⚠️' : '👤'}
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
                {isExpired ? 'ACCESS RESTRICTED • EXPIRED' : isFrozen ? 'ACCESS RESTRICTED • FROZEN' : isExpiringSoon ? 'EXPIRING SOON' : 'NO MEMBERSHIP PASS'}
              </span>
              <span className="banner-time">{alertData.timestamp || 'Live Alert'}</span>
            </div>

            <div className="banner-member-name">
              <strong>{alertData.name}</strong> <span className="banner-pid">({alertData.person_id})</span>
            </div>

            <div className="banner-sub-msg">
              {alertData.alert_message || 'Please verify pass status at the reception.'}
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
