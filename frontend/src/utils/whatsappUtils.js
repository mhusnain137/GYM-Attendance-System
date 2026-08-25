/**
 * Utility functions for WhatsApp Fee & Expiry Reminders
 */

// Formats any Pakistani / International mobile number to international standard without + or leading 0
export const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  let clean = phone.toString().replace(/[\s\-\(\)\+]/g, '');
  
  // If starts with 03xx, replace leading 0 with 92
  if (clean.startsWith('03') && clean.length === 11) {
    clean = '92' + clean.substring(1);
  } else if (clean.startsWith('3') && clean.length === 10) {
    clean = '92' + clean;
  }
  return clean;
};

// Generates polite, professional WhatsApp message text based on membership status
export const generateWhatsAppReminderText = (membership, gymName = 'Gym Management') => {
  if (!membership) return '';
  
  const name = membership.person_name || 'Member';
  const plan = membership.plan_name || 'Gym Pass';
  const expiry = membership.expiry_date || '';
  const daysLeft = membership.info?.daysLeft ?? 0;
  const isExpired = membership.info?.isExpired || false;
  const isExpiringSoon = membership.info?.isExpiringSoon || false;

  if (isExpired) {
    const daysAgo = Math.abs(daysLeft);
    return `Assalam-o-Alaikum *${name}* Bhai! 🏋️‍♂️\n\n` +
      `This is a friendly reminder from *${gymName}*.\n` +
      `Your *${plan}* membership expired on *${expiry}* (${daysAgo > 0 ? `${daysAgo} days ago` : 'today'}).\n\n` +
      `Kindly renew your membership to continue your daily workouts without disruption. ⚡\n\n` +
      `Thank you!\n*${gymName} Management*`;
  } else if (isExpiringSoon || daysLeft <= 3) {
    const daysText = daysLeft === 0 ? 'today' : `in *${daysLeft} days* (on *${expiry}*)`;
    return `Assalam-o-Alaikum *${name}* Bhai! 🏋️‍♂️\n\n` +
      `This is a friendly reminder from *${gymName}*.\n` +
      `Your *${plan}* gym membership will expire ${daysText}.\n\n` +
      `Please renew your pass in advance for uninterrupted gym access. ⚡\n\n` +
      `Thank you!\n*${gymName} Management*`;
  } else {
    return `Assalam-o-Alaikum *${name}* Bhai! 🏋️‍♂️\n\n` +
      `Greeting from *${gymName}*.\n` +
      `Your *${plan}* is currently active until *${expiry}* (${daysLeft} days remaining).\n\n` +
      `Have a great workout today!\n*${gymName} Management*`;
  }
};

// Formats a custom template replacing placeholders
export const formatTemplateMessage = (template, membership, gymName = 'Gym Management') => {
  if (!template) return generateWhatsAppReminderText(membership, gymName);
  if (!membership) return template;

  const name = membership.person_name || 'Member';
  const plan = membership.plan_name || 'Gym Pass';
  const expiry = membership.expiry_date || '';
  const daysLeft = membership.info?.daysLeft ?? 0;
  const daysText = daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : (daysLeft === 0 ? 'today' : `in ${daysLeft} days`);

  return template
    .replace(/{name}/g, name)
    .replace(/{plan}/g, plan)
    .replace(/{expiry}/g, expiry)
    .replace(/{days_left}/g, daysText)
    .replace(/{gym}/g, gymName);
};

// Filter memberships that are expiring in <= daysThreshold or already expired
export const getExpiringMemberships = (memberships = [], daysThreshold = 3) => {
  return memberships.filter(m => {
    if (!m.info) return false;
    if (m.status === 'FROZEN' || m.status === 'CANCELLED') return false;
    
    // Expired or expiring within daysThreshold
    if (m.info.isExpired) return true;
    if (m.info.daysLeft <= daysThreshold) return true;
    return false;
  });
};

// Opens WhatsApp Web or App directly with prefilled number and message
export const openWhatsApp = (phone, message) => {
  const cleanPhone = formatWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(message);
  
  let url = '';
  if (cleanPhone) {
    url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  } else {
    url = `https://wa.me/?text=${encodedText}`;
  }
  
  window.open(url, '_blank', 'noopener,noreferrer');
};
