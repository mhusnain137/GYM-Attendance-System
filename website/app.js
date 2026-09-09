// ============================================================
// TITAN GYM OS — ENTERPRISE B2B SAAS JAVASCRIPT ENGINE
// Features: Turnstile CCTV Audio Simulator • Dual Currency Engine (PKR/USD)
// Dynamic ROI Engine • Multi-Branch Network Pulse • Comparison Filter • Mobile Drawer
// ============================================================

let isAnnualBilling = false;
let currentCurrency = 'PKR';
let audioEnabled = true;
let audioCtx = null;
let simResetTimer = null;

// Enterprise Pricing Matrix
const PRICING_CONFIG = {
  PKR: {
    symbol: 'PKR',
    displayPrefix: 'Rs. ',
    basic: { monthly: 14999, annual: 11999, annualYear: 143988 },
    pro:   { monthly: 29999, annual: 23999, annualYear: 287988 },
    max:   { monthly: 54999, annual: 43999, annualYear: 527988 },
    feeSlider: { min: 1500, max: 25000, step: 500, defaultVal: 4500, minLabel: 'Rs. 1,500', maxLabel: 'Rs. 25,000+' }
  },
  USD: {
    symbol: 'USD',
    displayPrefix: '$',
    basic: { monthly: 49, annual: 39, annualYear: 468 },
    pro:   { monthly: 99, annual: 79, annualYear: 948 },
    max:   { monthly: 179, annual: 149, annualYear: 1788 },
    feeSlider: { min: 15, max: 150, step: 5, defaultVal: 45, minLabel: '$15', maxLabel: '$150+' }
  }
};

// ============================================================
// 1. MOBILE NAVIGATION DRAWER
// ============================================================
function toggleMobileMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  if (!drawer || !overlay) return;

  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  } else {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

// ============================================================
// 2. REAL-TIME CCTV DIGITAL CLOCK
// ============================================================
function initSimClock() {
  const clockEl = document.getElementById('sim-live-clock');
  function update() {
    if (clockEl) {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      clockEl.innerText = `${h}:${m}:${s}`;
    }
  }
  update();
  setInterval(update, 1000);
}

// ============================================================
// 3. CURRENCY SWITCHER (PKR / USD)
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

  // Update Symbols in cards
  const symBasic = document.getElementById('curr-symbol-basic');
  const symPro = document.getElementById('curr-symbol-pro');
  const symMax = document.getElementById('curr-symbol-max');

  if (symBasic) symBasic.innerText = PRICING_CONFIG[curr].symbol;
  if (symPro) symPro.innerText = PRICING_CONFIG[curr].symbol;
  if (symMax) symMax.innerText = PRICING_CONFIG[curr].symbol;

  // Sync ROI Slider bounds to currency
  const feeSlider = document.getElementById('slider-fee');
  const boundMin = document.getElementById('bound-fee-min');
  const boundMax = document.getElementById('bound-fee-max');
  const sliderConfig = PRICING_CONFIG[curr].feeSlider;

  if (feeSlider) {
    feeSlider.min = sliderConfig.min;
    feeSlider.max = sliderConfig.max;
    feeSlider.step = sliderConfig.step;
    feeSlider.value = sliderConfig.defaultVal;
  }
  if (boundMin) boundMin.innerText = sliderConfig.minLabel;
  if (boundMax) boundMax.innerText = sliderConfig.maxLabel;

  updatePricingDisplay();
  calculateROI();

  // Update quick bar pill
  const quickPill = document.querySelector('.quick-pricing-pill');
  if (quickPill) {
    const basePrice = isAnnualBilling ? PRICING_CONFIG[curr].basic.annual : PRICING_CONFIG[curr].basic.monthly;
    quickPill.innerText = `From ${PRICING_CONFIG[curr].displayPrefix}${basePrice.toLocaleString()}/mo`;
  }
}

// ============================================================
// 4. BILLING TOGGLE (MONTHLY VS ANNUAL)
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
// 5. WEB AUDIO API SOUND SYNTHESIZER
// High-grade audio feedback for gate unlock, denial, and trial expiry
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
    if (label) label.innerText = 'Sound: ON';
    if (btn) btn.classList.remove('muted');
    playChime('unlock');
  } else {
    if (label) label.innerText = 'Sound: OFF';
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
      // Clean corporate access chime (E5 -> A5) + relay click
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.1);
      gain2.gain.setValueAtTime(0.22, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.62);

      // Turnstile solenoid mechanical tick
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(130, now);
      clickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.05);
      clickGain.gain.setValueAtTime(0.25, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.07);

    } else if (type === 'warning') {
      // Subtle double alert pulse
      [0, 0.13].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now + delay);
        gain.gain.setValueAtTime(0.15, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.1);
      });

    } else if (type === 'danger') {
      // Crisp security lockout tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(230, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.32);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

    } else if (type === 'sync') {
      // Network sync chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.debug('Audio interaction initialized');
  }
}

// ============================================================
// 6. LIVE TURNSTILE CCTV GATE SIMULATOR
// ============================================================
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

  gateIndicator.className = 'sim-gate-indicator';
  scanBox.style.borderColor = 'rgba(59, 130, 246, 0.5)';
  scanBox.style.boxShadow = 'none';

  if (type === 'active_member') {
    playChime('unlock');

    scanBox.style.borderColor = '#10b981';
    scanBox.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.4)';
    scanTag.style.background = '#064e3b';
    scanTag.style.color = '#34d399';
    scanTag.innerText = 'Verified: Ali Hassan (ID: P-000002 • 99.4% Conf.)';

    gateIndicator.classList.add('unlocked');
    gateIcon.innerText = '🔓';
    gateText.innerText = 'GATE UNLOCKED — ACCESS GRANTED (3.0s)';
    logBar.innerHTML = '<strong style="color:#059669;">RELAY TRIGGERED:</strong> Turnstile barrier unlocked. Member "Ali Hassan" active pass verified. Real-time attendance logged.';

    simResetTimer = setTimeout(() => {
      simulateScan('reset');
    }, 4500);

  } else if (type === 'roaming_denied') {
    playChime('warning');

    scanBox.style.borderColor = '#6366f1';
    scanBox.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.4)';
    scanTag.style.background = '#312e81';
    scanTag.style.color = '#c7d2fe';
    scanTag.innerText = 'Mismatch: Bilal Tariq (Gulberg Facility Pass)';

    gateIndicator.classList.add('locked-denied');
    gateIcon.innerText = '🔒';
    gateText.innerText = 'ACCESS DENIED — ROAMING MISMATCH';
    logBar.innerHTML = '<strong style="color:#dc2626;">SECURITY NOTICE:</strong> Access Denied. Member registered at Gulberg Branch. Pro/Enterprise Roaming Pass required for Main Gate.';

  } else if (type === 'expired_trial') {
    playChime('danger');

    scanBox.style.borderColor = '#ef4444';
    scanBox.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.4)';
    scanTag.style.background = '#7f1d1d';
    scanTag.style.color = '#fca5a5';
    scanTag.innerText = 'Limit Reached: Guest Hamza (Trial 5/5 Days Used)';

    gateIndicator.classList.add('locked-denied');
    gateIcon.innerText = '🔒';
    gateText.innerText = 'ACCESS DENIED — 5-DAY TRIAL EXPIRED';
    logBar.innerHTML = '<strong style="color:#dc2626;">ACCESS RESTRICTED:</strong> Free trial limit reached (5 days). Turnstile locked. Front desk membership purchase required.';

  } else {
    scanBox.style.borderColor = 'rgba(59, 130, 246, 0.5)';
    scanBox.style.boxShadow = 'none';
    scanTag.style.background = 'rgba(15, 23, 42, 0.92)';
    scanTag.style.color = '#cbd5e1';
    scanTag.innerText = 'Monitoring stream...';

    gateIcon.innerText = '🔒';
    gateText.innerText = 'GATE SECURED & LOCKED';
    logBar.innerHTML = 'System Status: Operational. Biometric access relays active.';
  }
}

// ============================================================
// 7. MULTI-BRANCH CITY NETWORK DEMO PULSE
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

  Object.values(nodes).forEach(n => {
    if (n) n.classList.remove('active', 'pulse-highlight');
  });

  const target = nodes[branchKey];
  if (target) {
    target.classList.add('active', 'pulse-highlight');
    setTimeout(() => {
      target.classList.remove('pulse-highlight');
    }, 1100);
  }

  const logBar = document.getElementById('sim-log-bar');
  if (logBar) {
    logBar.innerHTML = `🌐 <strong style="color:#3b82f6;">ATLAS CLOUD SYNC:</strong> Real-time biometrics replicated with <strong>${branchNames[branchKey] || branchKey}</strong> in 12ms.`;
  }
}

// ============================================================
// 8. COMPARISON TABLE CATEGORY FILTER
// ============================================================
function filterComparison(category, btnEl) {
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
// 9. INTERACTIVE GYM ROI & LEAKAGE CALCULATOR
// ============================================================
function calculateROI() {
  const membersEl = document.getElementById('slider-members');
  const feeEl = document.getElementById('slider-fee');
  const branchesEl = document.getElementById('slider-branches');

  if (!membersEl || !feeEl || !branchesEl) return;

  const members = parseInt(membersEl.value, 10);
  const fee = parseInt(feeEl.value, 10);
  const branches = parseInt(branchesEl.value, 10);

  const prefix = PRICING_CONFIG[currentCurrency].displayPrefix;

  document.getElementById('val-members').innerText = members.toLocaleString();
  document.getElementById('val-fee').innerText = prefix + fee.toLocaleString();
  document.getElementById('val-branches').innerText = branches + (branches === 1 ? ' Branch' : ' Branches');

  // Industry average: 15% fraudulent or shared entries without biometric gates
  const fraudulentEntries = Math.round(members * 0.15);
  const monthlyLeakage = fraudulentEntries * fee;

  document.getElementById('roi-leakage').innerText = prefix + monthlyLeakage.toLocaleString();

  // Tier Recommendation
  let recommendedPlan = '🥉 Basic Plan';
  let softwareCost = currentCurrency === 'USD' ? 49 : 14999;

  if (branches >= 4 || members > 800) {
    recommendedPlan = '🥇 Max Plan';
    softwareCost = currentCurrency === 'USD' ? 179 : 54999;
  } else if (branches >= 2 || members > 300) {
    recommendedPlan = '🥈 Pro Plan';
    softwareCost = currentCurrency === 'USD' ? 99 : 29999;
  }

  const netProfit = monthlyLeakage - softwareCost;
  const daysToPayback = Math.max(1, Math.round((softwareCost / Math.max(1, monthlyLeakage / 30))));

  document.getElementById('roi-plan-badge').innerText = recommendedPlan;
  document.getElementById('roi-software-cost').innerText = `${prefix}${softwareCost.toLocaleString()} / mo`;
  document.getElementById('roi-net-gain').innerText = `+${prefix}${(netProfit > 0 ? netProfit.toLocaleString() : '0')} / mo`;
  document.getElementById('roi-payback-days').innerText = `${daysToPayback} Days!`;
}

// ============================================================
// 10. BOOK LIVE DEMO MODAL & LEAD SUBMISSION
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
    document.body.style.overflow = '';
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
// 11. FAQ ACCORDION TOGGLE
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
// 12. SCROLL EVENT LISTENER FOR QUICK ACTION BAR
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
  initSimClock();
  calculateROI();
  setupScrollListener();

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDemoModal();
      const drawer = document.getElementById('mobile-nav-drawer');
      const overlay = document.getElementById('mobile-drawer-overlay');
      if (drawer && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });
});
