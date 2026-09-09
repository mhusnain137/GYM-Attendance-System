// ============================================================
// TITAN GYM OS — SAAS PROMOTIONAL WEBSITE JAVASCRIPT
// Interactive Engine: Turnstile Audio Simulator • Currency Engine (PKR/USD)
// Multi-Branch City Network • ROI Calculator • Comparison Filter • Demo Leads
// ============================================================

let isAnnualBilling = false;
let currentCurrency = 'PKR';
let audioEnabled = true;
let audioCtx = null;

// Pricing Configuration (PKR & USD)
const PRICING_CONFIG = {
  PKR: {
    symbol: 'PKR',
    displayPrefix: 'Rs. ',
    basic: { monthly: 14999, annual: 11999, annualYear: 143988 },
    pro:   { monthly: 29999, annual: 23999, annualYear: 287988 },
    max:   { monthly: 54999, annual: 43999, annualYear: 527988 }
  },
  USD: {
    symbol: 'USD',
    displayPrefix: '$',
    basic: { monthly: 49, annual: 39, annualYear: 468 },
    pro:   { monthly: 99, annual: 79, annualYear: 948 },
    max:   { monthly: 179, annual: 149, annualYear: 1788 }
  }
};

// ============================================================
// 1. CURRENCY SWITCHER (PKR / USD)
// ============================================================
function setCurrency(curr) {
  if (!PRICING_CONFIG[curr]) return;
  currentCurrency = curr;

  const btnPkr = document.getElementById('curr-pkr');
  const btnUsd = document.getElementById('curr-usd');

  if (curr === 'PKR') {
    if (btnPkr) btnPkr.classList.add('active');
    if (btnUsd) btnUsd.classList.remove('active');
  } else {
    if (btnUsd) btnUsd.classList.add('active');
    if (btnPkr) btnPkr.classList.remove('active');
  }

  // Update symbols
  const symBasic = document.getElementById('curr-symbol-basic');
  const symPro = document.getElementById('curr-symbol-pro');
  const symMax = document.getElementById('curr-symbol-max');

  if (symBasic) symBasic.innerText = PRICING_CONFIG[curr].symbol;
  if (symPro) symPro.innerText = PRICING_CONFIG[curr].symbol;
  if (symMax) symMax.innerText = PRICING_CONFIG[curr].symbol;

  updatePricingDisplay();
  calculateROI();

  // Update quick bar pricing pill
  const quickPill = document.querySelector('.quick-pricing-pill');
  if (quickPill) {
    const basePrice = isAnnualBilling ? PRICING_CONFIG[curr].basic.annual : PRICING_CONFIG[curr].basic.monthly;
    quickPill.innerText = `From ${PRICING_CONFIG[curr].displayPrefix}${basePrice.toLocaleString()}/mo`;
  }
}

// ============================================================
// 2. BILLING TOGGLE (MONTHLY VS ANNUAL)
// ============================================================
function toggleBilling() {
  isAnnualBilling = !isAnnualBilling;
  const toggleBtn = document.getElementById('billing-toggle');
  const labelMonthly = document.getElementById('label-monthly');
  const labelAnnual = document.getElementById('label-annual');

  if (isAnnualBilling) {
    if (toggleBtn) toggleBtn.classList.add('annual');
    if (labelAnnual) labelAnnual.style.color = '#34d399';
    if (labelMonthly) labelMonthly.style.color = '#94a3b8';
  } else {
    if (toggleBtn) toggleBtn.classList.remove('annual');
    if (labelMonthly) labelMonthly.style.color = '#ffffff';
    if (labelAnnual) labelAnnual.style.color = '#94a3b8';
  }

  updatePricingDisplay();
}

function updatePricingDisplay() {
  const data = PRICING_CONFIG[currentCurrency];
  const pfx = data.displayPrefix;

  const basicEl = document.getElementById('price-basic');
  const proEl = document.getElementById('price-pro');
  const maxEl = document.getElementById('price-max');

  const subBasic = document.getElementById('subtext-basic');
  const subPro = document.getElementById('subtext-pro');
  const subMax = document.getElementById('subtext-max');

  if (isAnnualBilling) {
    if (basicEl) basicEl.innerText = Number(data.basic.annual).toLocaleString();
    if (proEl) proEl.innerText = Number(data.pro.annual).toLocaleString();
    if (maxEl) maxEl.innerText = Number(data.max.annual).toLocaleString();

    if (subBasic) subBasic.innerText = `Billed annually (${pfx}${data.basic.annualYear.toLocaleString()}/yr) • Save 20%`;
    if (subPro) subPro.innerText = `Billed annually (${pfx}${data.pro.annualYear.toLocaleString()}/yr) • Save 20%`;
    if (subMax) subMax.innerText = `Billed annually (${pfx}${data.max.annualYear.toLocaleString()}/yr) • Save 20%`;
  } else {
    if (basicEl) basicEl.innerText = Number(data.basic.monthly).toLocaleString();
    if (proEl) proEl.innerText = Number(data.pro.monthly).toLocaleString();
    if (maxEl) maxEl.innerText = Number(data.max.monthly).toLocaleString();

    if (subBasic) subBasic.innerText = 'Billed monthly • 1 Gym Branch';
    if (subPro) subPro.innerText = 'Billed monthly • Up to 3 Branches';
    if (subMax) subMax.innerText = 'Billed monthly • Unlimited Branches';
  }
}

// ============================================================
// 3. WEB AUDIO API TURNSTILE SOUND SYNTHESIS
// Zero latency, rich tone generator for Turnstile access events
// ============================================================
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const label = document.getElementById('audio-status-label');
  const btn = document.getElementById('audio-toggle-btn');

  if (audioEnabled) {
    if (label) label.innerText = 'ON';
    if (btn) btn.classList.remove('muted');
    playChime('unlock');
  } else {
    if (label) label.innerText = 'OFF';
    if (btn) btn.classList.add('muted');
  }
}

function playChime(type) {
  if (!audioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'unlock') {
      // Pleasant dual-frequency door unlock chime (E5 -> A5) + relay click
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.32);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12); // A5
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.68);

      // Low mechanical turnstile solenoid click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(140, now);
      clickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.06);
      clickGain.gain.setValueAtTime(0.3, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.08);

    } else if (type === 'warning') {
      // Double short buzzer alert
      [0, 0.14].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now + delay);
        gain.gain.setValueAtTime(0.18, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.11);
      });

    } else if (type === 'danger') {
      // Urgent denial alarm tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);

    } else if (type === 'sync') {
      // High-tech sync pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (e) {
    console.debug('Web Audio API not allowed or supported:', e);
  }
}

// ============================================================
// 4. INTERACTIVE TURNSTILE GATE SIMULATOR
// ============================================================
let simResetTimer = null;

function simulateScan(type) {
  if (simResetTimer) {
    clearTimeout(simResetTimer);
    simResetTimer = null;
  }

  const scanBox = document.getElementById('scan-box');
  const scanTag = document.getElementById('scan-tag');
  const gateIndicator = document.getElementById('sim-gate-indicator');
  const gateIcon = document.getElementById('gate-icon');
  const gateText = document.getElementById('gate-text');
  const logBar = document.getElementById('sim-log-bar');

  if (!scanBox || !gateIndicator) return;

  // Reset classes
  gateIndicator.className = 'sim-gate-indicator';
  scanBox.style.borderColor = 'rgba(16, 185, 129, 0.5)';

  if (type === 'active_member') {
    playChime('unlock');

    scanBox.style.borderColor = '#10b981';
    scanBox.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.7)';
    scanTag.style.background = '#065f46';
    scanTag.style.color = '#34d399';
    scanTag.innerText = '✓ P-000002 • Ali Hassan (99.4% Biometric Conf.)';

    gateIndicator.classList.add('unlocked');
    gateIcon.innerText = '🚪🔓';
    gateText.innerText = 'GATE UNLOCKED — ACCESS GRANTED (3.0s)';
    logBar.innerHTML = '⚡ <strong style="color:#34d399;">RELAY TRIGGERED:</strong> Turnstile barrier unlocked. Member "Ali Hassan" active pass verified. Real-time attendance logged.';

    simResetTimer = setTimeout(() => {
      simulateScan('reset');
    }, 4500);

  } else if (type === 'roaming_denied') {
    playChime('warning');

    scanBox.style.borderColor = '#c084fc';
    scanBox.style.boxShadow = '0 0 22px rgba(192, 132, 252, 0.6)';
    scanTag.style.background = '#581c87';
    scanTag.style.color = '#e9d5ff';
    scanTag.innerText = '⚠️ P-000041 • Bilal Tariq (Single Branch Pass)';

    gateIndicator.classList.add('locked-denied');
    gateIcon.innerText = '🚫🔒';
    gateText.innerText = 'DOOR LOCKED — ROAMING DENIED';
    logBar.innerHTML = '🚫 <strong style="color:#f43f5e;">SECURITY ALERT:</strong> Access Denied. Member registered at Gulberg Branch. Pro/Max Roaming Pass required for Main Gate.';

  } else if (type === 'expired_trial') {
    playChime('danger');

    scanBox.style.borderColor = '#f43f5e';
    scanBox.style.boxShadow = '0 0 25px rgba(244, 63, 94, 0.7)';
    scanTag.style.background = '#881337';
    scanTag.style.color = '#fda4af';
    scanTag.innerText = '🚨 Guest-918 • Hamza (Trial 5/5 Days Used)';

    gateIndicator.classList.add('locked-denied');
    gateIcon.innerText = '🚫🔒';
    gateText.innerText = 'DOOR LOCKED — 5-DAY TRIAL EXPIRED';
    logBar.innerHTML = '⚠️ <strong style="color:#f43f5e;">TRIAL EXPIRED:</strong> Free guest visited 5 days. Turnstile barrier locked. Front desk membership purchase required.';

  } else {
    // Reset state
    scanBox.style.borderColor = 'rgba(16, 185, 129, 0.5)';
    scanBox.style.boxShadow = 'none';
    scanTag.style.background = 'rgba(15, 23, 42, 0.85)';
    scanTag.style.color = '#cbd5e1';
    scanTag.innerText = 'Waiting for face...';

    gateIcon.innerText = '🚪🔒';
    gateText.innerText = 'GATE SECURED & LOCKED';
    logBar.innerHTML = 'ℹ️ System Status: Ready. Electronic turnstile relays connected.';
  }
}

// ============================================================
// 5. MULTI-BRANCH CITY NETWORK DEMO PULSE
// ============================================================
function triggerBranchPulse(branchKey) {
  playChime('sync');

  const nodes = {
    MAIN: document.getElementById('node-main'),
    GULBERG: document.getElementById('node-gulberg'),
    DHA: document.getElementById('node-dha')
  };

  const branchNames = {
    MAIN: 'Main HQ Branch',
    GULBERG: 'Gulberg Branch',
    DHA: 'DHA Phase 5'
  };

  // Remove existing active states
  Object.values(nodes).forEach(n => {
    if (n) {
      n.classList.remove('active', 'pulse-highlight');
    }
  });

  const target = nodes[branchKey];
  if (target) {
    target.classList.add('active', 'pulse-highlight');
    setTimeout(() => {
      target.classList.remove('pulse-highlight');
    }, 1200);
  }

  // Update simulator log bar with roaming telemetry
  const logBar = document.getElementById('sim-log-bar');
  if (logBar) {
    logBar.innerHTML = `🌐 <strong style="color:#34d399;">ATLAS REPLICATION:</strong> Real-time biometrics synchronized with <strong>${branchNames[branchKey] || branchKey}</strong> in 14ms.`;
  }
}

// ============================================================
// 6. DETAILED COMPARISON TABLE CATEGORY FILTER
// ============================================================
function filterComparison(category, btnEl) {
  // Update active chip state
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(c => c.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const rows = document.querySelectorAll('.comparison-table tbody tr');
  rows.forEach(row => {
    const rowCat = row.getAttribute('data-cat');
    if (category === 'all') {
      row.style.display = '';
    } else {
      if (rowCat === category) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
}

// ============================================================
// 7. INTERACTIVE GYM ROI & LEAKAGE CALCULATOR
// ============================================================
function calculateROI() {
  const membersEl = document.getElementById('slider-members');
  const feeEl = document.getElementById('slider-fee');
  const branchesEl = document.getElementById('slider-branches');

  if (!membersEl || !feeEl || !branchesEl) return;

  const members = parseInt(membersEl.value, 10);
  const fee = parseInt(feeEl.value, 10);
  const branches = parseInt(branchesEl.value, 10);

  const isUsd = currentCurrency === 'USD';
  const prefix = isUsd ? '$' : 'Rs. ';

  // If USD, fee slider is scaled appropriately
  const effectiveFee = isUsd ? Math.round(fee / 280) : fee;

  document.getElementById('val-members').innerText = members.toLocaleString();
  document.getElementById('val-fee').innerText = prefix + effectiveFee.toLocaleString();
  document.getElementById('val-branches').innerText = branches + (branches === 1 ? ' Branch' : ' Branches');

  // Industry average: 15% fraudulent or unpaid visits without biometrics
  const fraudulentEntries = Math.round(members * 0.15);
  const monthlyLeakage = fraudulentEntries * effectiveFee;

  document.getElementById('roi-leakage').innerText = prefix + monthlyLeakage.toLocaleString();

  // Tier Recommendation
  let recommendedPlan = '🥉 Basic Plan';
  let softwareCost = isUsd ? 49 : 14999;

  if (branches >= 4 || members > 800) {
    recommendedPlan = '🥇 Max Plan';
    softwareCost = isUsd ? 179 : 54999;
  } else if (branches >= 2 || members > 300) {
    recommendedPlan = '🥈 Pro Plan';
    softwareCost = isUsd ? 99 : 29999;
  }

  const netProfit = monthlyLeakage - softwareCost;
  const daysToPayback = Math.max(1, Math.round((softwareCost / Math.max(1, monthlyLeakage / 30))));

  document.getElementById('roi-plan-badge').innerText = recommendedPlan;
  document.getElementById('roi-software-cost').innerText = `${prefix}${softwareCost.toLocaleString()} / mo`;
  document.getElementById('roi-net-gain').innerText = `+${prefix}${(netProfit > 0 ? netProfit.toLocaleString() : '0')} / mo`;
  document.getElementById('roi-payback-days').innerText = `${daysToPayback} Days!`;
}

// ============================================================
// 8. BOOK LIVE DEMO MODAL & LEAD SUBMISSION
// ============================================================
function openDemoModal(preselectedPlan = 'PRO') {
  const modal = document.getElementById('demo-modal');
  const planSelect = document.getElementById('lead-plan');
  if (planSelect) {
    planSelect.value = preselectedPlan.toUpperCase();
  }
  const feedback = document.getElementById('demo-form-feedback');
  if (feedback) {
    feedback.style.display = 'none';
    feedback.className = 'form-feedback';
  }
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeDemoModal(event) {
  if (event && event.target && event.target.id !== 'demo-modal' && !event.target.classList.contains('modal-close')) {
    return;
  }
  const modal = document.getElementById('demo-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = 'auto';
  }
}

async function submitDemoForm(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-submit-lead');
  const feedback = document.getElementById('demo-form-feedback');

  const gymName = document.getElementById('lead-gym-name').value;
  const contactName = document.getElementById('lead-contact-name').value;
  const phone = document.getElementById('lead-phone').value;
  const city = document.getElementById('lead-city').value;
  const branches = parseInt(document.getElementById('lead-branches').value, 10);
  const plan = document.getElementById('lead-plan').value;
  const notes = document.getElementById('lead-notes').value;

  btn.disabled = true;
  btn.innerText = '⏳ Submitting Request...';

  const payload = {
    gym_name: gymName,
    contact_name: contactName,
    phone: phone,
    city: city,
    branch_count: branches,
    interested_plan: plan,
    notes: notes
  };

  try {
    const response = await fetch('http://localhost:8000/api/saas/demo-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    feedback.className = 'form-feedback success';
    feedback.innerText = `✓ Demo requested! Thank you ${contactName}. Opening WhatsApp VIP Concierge...`;
    feedback.style.display = 'block';

    const waText = encodeURIComponent(
      `Assalam o Alaikum! I would like to book a Live Turnstile Demo of Titan Gym OS (${plan} Plan) for ${gymName} (${city}, ${branches} branches). Name: ${contactName}, Phone: ${phone}.`
    );

    setTimeout(() => {
      window.open(`https://wa.me/923001234567?text=${waText}`, '_blank');
      closeDemoModal();
      btn.disabled = false;
      btn.innerText = '✓ Confirm & Request Live Demo';
      document.getElementById('demo-form').reset();
    }, 1200);

  } catch (err) {
    console.warn('Backend offline, connecting via direct WhatsApp lead:', err);
    const waText = encodeURIComponent(
      `Assalam o Alaikum! I would like to book a Live Turnstile Demo of Titan Gym OS (${plan} Plan) for ${gymName} (${city}, ${branches} branches). Contact: ${contactName}, Phone: ${phone}.`
    );
    window.open(`https://wa.me/923001234567?text=${waText}`, '_blank');
    closeDemoModal();
    btn.disabled = false;
    btn.innerText = '✓ Confirm & Request Live Demo';
  }
}

// ============================================================
// 9. FAQ ACCORDION TOGGLE
// ============================================================
function toggleFaq(buttonEl) {
  const item = buttonEl.parentElement;
  const isActive = item.classList.contains('active');

  document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));

  if (!isActive) {
    item.classList.add('active');
  }
}

// ============================================================
// 10. SCROLL EVENT LISTENER FOR FLOATING QUICK ACTION BAR
// ============================================================
function setupScrollListener() {
  const quickBar = document.getElementById('quick-bar');
  if (!quickBar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 420) {
      quickBar.classList.add('show');
    } else {
      quickBar.classList.remove('show');
    }
  }, { passive: true });
}

// ============================================================
// INITIALIZATION ON DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  calculateROI();
  setupScrollListener();

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDemoModal();
    }
  });
});
