import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MemberPortal.css';
import { useAuth } from '../context/AuthContext';
import { calculateMembershipInfo } from '../utils/membershipUtils';

const CAFE_CATEGORIES = [
  { id: 'ALL', label: 'All Items', icon: '⚡' },
  { id: 'SHAKES', label: 'Protein Shakes', icon: '🥤' },
  { id: 'PRE_WORKOUT', label: 'Pre-Workout & Energy', icon: '⚡' },
  { id: 'DIET_MEALS', label: 'Diet Meals & Bowls', icon: '🥗' },
  { id: 'SNACKS', label: 'Bars & Snacks', icon: '🍫' }
];

const MILK_OPTIONS = [
  { id: 'WATER', label: 'Water (Lean)', price: 0, protein: 0, cal: 0 },
  { id: 'SKIM', label: 'Skim Milk', price: 40, protein: 4, cal: 50 },
  { id: 'WHOLE', label: 'Whole Fresh Milk', price: 50, protein: 4, cal: 90 },
  { id: 'ALMOND', label: 'Almond Milk (Vegan)', price: 80, protein: 1, cal: 35 }
];

const ADDONS_OPTIONS = [
  { id: 'CREATINE', label: '+ 5g Creatine Monohydrate', price: 60, protein: 0, cal: 0 },
  { id: 'PEANUT_BUTTER', label: '+ 1 Spoon Peanut Butter', price: 50, protein: 4, cal: 95 },
  { id: 'OATS', label: '+ Rolled Oats (Carbs)', price: 40, protein: 3, cal: 80 },
  { id: 'CHIA', label: '+ Chia Seeds (Omega-3)', price: 40, protein: 2, cal: 50 },
  { id: 'HONEY', label: '+ Organic Raw Honey', price: 30, protein: 0, cal: 60 }
];

function MemberPortal() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CARD'); // 'CARD' | 'STREAKS' | 'PASS' | 'CAFE'

  // Member Cafe Ordering State
  const [cafeView, setCafeView] = useState('ORDER'); // 'ORDER' | 'HISTORY'
  const [cafeProducts, setCafeProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [paymentIntent, setPaymentIntent] = useState('PAY_AT_COUNTER'); // 'PAY_AT_COUNTER' | 'MEMBER_TAB'
  const [activePreorders, setActivePreorders] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');

  // Customizer Modal State
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedMilk, setSelectedMilk] = useState(MILK_OPTIONS[0]);
  const [selectedAddons, setSelectedAddons] = useState([]);

  const memberId = user?.member_id || user?.user_id || 'P-0001';

  useEffect(() => {
    if (memberId) {
      fetchMemberData(memberId);
      fetchCafeProducts();
      fetchActivePreorders(memberId);
    }

    // Auto-poll active pre-orders every 3 seconds for live kitchen updates
    const interval = setInterval(() => {
      if (memberId) {
        fetchActivePreorders(memberId);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [memberId]);

  const fetchMemberData = async (memId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/people/${memId}/profile`);
      if (res.data && res.data.status === 'success') {
        setProfileData(res.data);
      }
    } catch (e) {
      console.error('Error fetching member portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCafeProducts = async () => {
    try {
      const res = await axios.get('/api/cafe/products');
      if (res.data && res.data.products) {
        setCafeProducts(res.data.products.filter(p => p.is_active !== false));
      }
    } catch (e) {
      console.error('Error fetching cafe products:', e);
    }
  };

  const fetchActivePreorders = async (memId) => {
    try {
      const res = await axios.get(`/api/cafe/members/${memId}/active-preorders`);
      if (res.data && res.data.active_orders) {
        setActivePreorders(res.data.active_orders);
      }
    } catch (e) {
      // Silently catch polling
    }
  };

  // Cart Management
  const handleOpenCustomizer = (prod) => {
    setCustomizingProduct(prod);
    setSelectedMilk(MILK_OPTIONS[0]);
    setSelectedAddons([]);
  };

  const handleToggleAddon = (addon) => {
    if (selectedAddons.some(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleAddCustomizedToCart = () => {
    if (!customizingProduct) return;
    const milkPrice = selectedMilk.price || 0;
    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = customizingProduct.price + milkPrice + addonsPrice;

    const extraProtein = (selectedMilk.protein || 0) + selectedAddons.reduce((sum, a) => sum + a.protein, 0);
    const extraCal = (selectedMilk.cal || 0) + selectedAddons.reduce((sum, a) => sum + a.cal, 0);

    const addonLabels = [
      `Base: ${selectedMilk.label}`,
      ...selectedAddons.map(a => a.label)
    ];

    const cartItem = {
      cart_id: `${customizingProduct.id}-${Date.now()}`,
      product_id: customizingProduct.id,
      name: customizingProduct.name,
      qty: 1,
      unit_price: unitPrice,
      protein_g: (customizingProduct.protein_g || 0) + extraProtein,
      calories: (customizingProduct.calories || 0) + extraCal,
      addons: addonLabels,
      item_total: unitPrice
    };

    setCart([...cart, cartItem]);
    setCustomizingProduct(null);
  };

  const handleAddSimpleToCart = (prod) => {
    const existing = cart.find(c => c.product_id === prod.id && (!c.addons || c.addons.length === 0));
    if (existing) {
      setCart(cart.map(c => c.cart_id === existing.cart_id ? {
        ...c,
        qty: c.qty + 1,
        item_total: (c.qty + 1) * c.unit_price
      } : c));
    } else {
      setCart([...cart, {
        cart_id: `${prod.id}-${Date.now()}`,
        product_id: prod.id,
        name: prod.name,
        qty: 1,
        unit_price: prod.price,
        protein_g: prod.protein_g || 0,
        calories: prod.calories || 0,
        addons: [],
        item_total: prod.price
      }]);
    }
  };

  const handleUpdateCartQty = (cartId, delta) => {
    setCart(cart.map(c => {
      if (c.cart_id === cartId) {
        const newQty = c.qty + delta;
        return newQty > 0 ? { ...c, qty: newQty, item_total: newQty * c.unit_price } : null;
      }
      return c;
    }).filter(Boolean));
  };

  const cartSubtotal = cart.reduce((sum, itm) => sum + itm.item_total, 0);

  const handlePlacePreOrder = async () => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    setOrderSuccessMsg('');

    try {
      const payload = {
        person_id: memberId,
        customer_name: person.name || user?.name || 'Member',
        customer_phone: person.phone || '',
        items: cart,
        subtotal: cartSubtotal,
        discount: 0,
        total_amount: cartSubtotal,
        payment_intent: paymentIntent,
        notes: `Pre-ordered via Member Portal (${paymentIntent === 'MEMBER_TAB' ? 'Charge Khata Tab' : 'Pay at Counter'})`
      };

      const res = await axios.post('/api/cafe/orders/pre-order', payload);
      if (res.data && res.data.status === 'success') {
        setCart([]);
        setOrderSuccessMsg(`✓ Order #${res.data.order?.id} placed! Please confirm / pay at the front desk.`);
        fetchActivePreorders(memberId);
        fetchMemberData(memberId);
        setTimeout(() => setOrderSuccessMsg(''), 6000);
      }
    } catch (err) {
      alert('Failed to place pre-order: ' + (err.response?.data?.detail || err.message));
    } finally {
      setPlacingOrder(false);
    }
  };

  const person = profileData?.person || {};
  const membership = profileData?.membership;
  const metrics = profileData?.metrics || {};
  const cafeMetrics = profileData?.cafe_metrics || {};

  const memInfo = calculateMembershipInfo(membership);
  const hasActivePass = !!membership && (membership.status === 'ACTIVE' || membership.status === 'FROZEN');

  const filteredProducts = selectedCategory === 'ALL'
    ? cafeProducts
    : cafeProducts.filter(p => p.category === selectedCategory);

  return (
    <div className="portal-container">
      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--card-background, #111827)',
        border: '1px solid var(--border-color, #1f2937)',
        borderRadius: '14px',
        padding: '0.75rem 1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🏋️</span>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary, #ffffff)', fontSize: '1.05rem', fontWeight: 800 }}>
              Welcome, {person.name || user?.name || 'Gym Member'}!
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
              Your Private Fitness Dashboard & Digital Membership Card
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--accent, #38bdf8)', fontWeight: 700 }}>
          Member ID: {memberId}
        </div>
      </div>

      {/* Hero ID Banner */}
      <div className="digital-id-hero">
        <div className="hero-left">
          <div className="member-avatar-box">
            {person.person_id || person.id ? (
              <img 
                src={`/api/face-crops/${person.person_id || person.id}.jpg`} 
                alt="" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : null}
            <span>🏋️‍♂️</span>
          </div>

          <div className="hero-info-group">
            <h1>{person.name || user?.name || 'Member'}</h1>
            <p>Member ID: <strong style={{ color: '#c084fc' }}>{memberId}</strong> • Verified Gym Member</p>
            
            <div className="hero-badges-row">
              <span className={`status-pill-badge-mini ${hasActivePass ? 'active' : 'expired'}`}>
                {hasActivePass ? memInfo.label : (membership?.status === 'EXPIRED' ? 'EXPIRED PASS' : 'NO ACTIVE PASS')}
              </span>
              <span className="prod-category-tag" style={hasActivePass ? { color: '#38bdf8', background: 'rgba(59, 130, 246, 0.2)' } : { color: '#f87171', background: 'rgba(239, 68, 68, 0.15)' }}>
                {hasActivePass ? (membership.plan_name || 'Active Pass') : 'No Pass Issued'}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-right-metrics">
          <div className="metric-pill-box">
            <div className="num" style={{ color: '#f59e0b' }}>🔥 {metrics.current_streak || 0}</div>
            <div className="label">Day Streak</div>
          </div>
          <div className="metric-pill-box">
            <div className="num" style={{ color: '#38bdf8' }}>{metrics.visits_this_month || 0}</div>
            <div className="label">Month Visits</div>
          </div>
          <div className="metric-pill-box">
            <div className="num" style={{ color: '#10b981' }}>~{cafeMetrics.total_protein_g || 0}g</div>
            <div className="label">Protein Fuel</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="portal-tabs-nav">
        <button 
          className={`portal-tab-btn ${activeTab === 'CARD' ? 'active' : ''}`}
          onClick={() => setActiveTab('CARD')}
        >
          🪪 Digital Gym Card
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'STREAKS' ? 'active' : ''}`}
          onClick={() => setActiveTab('STREAKS')}
        >
          🔥 Streaks & Attendance
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'PASS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PASS')}
        >
          💳 My Membership Pass
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'CAFE' ? 'active' : ''}`}
          onClick={() => setActiveTab('CAFE')}
        >
          🥤 Order Cafe & Nutrition {activePreorders.length > 0 && `(${activePreorders.length} Active)`}
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading your member portal data...
          </div>
        ) : (
          <>
            {/* TAB 1: DIGITAL CARD */}
            {activeTab === 'CARD' && (
              <div style={{ padding: '1rem 0' }}>
                <div className="digital-card-visual">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c084fc' }}>TITAN GYM CLUB</span>
                    <span className={`status-pill-badge-mini ${hasActivePass ? 'active' : 'expired'}`}>
                      {hasActivePass ? 'VERIFIED MEMBER' : 'PASS INACTIVE'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', overflow: 'hidden' }}>
                      {person.person_id || person.id ? (
                        <img 
                          src={`/api/face-crops/${person.person_id || person.id}.jpg`} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                      👤
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>{person.name || user?.name}</h3>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {memberId}</div>
                      <div style={{ fontSize: '0.78rem', color: hasActivePass ? '#38bdf8' : '#f87171', marginTop: '2px' }}>
                        Pass: {hasActivePass ? (membership.plan_name || 'Active Pass') : 'No Active Membership Pass'}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{hasActivePass ? `Valid Until: ${membership.expiry_date}` : 'Validity: Not Issued'}</span>
                    <span style={{ color: hasActivePass ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                      {hasActivePass ? memInfo.label : 'Inactive'}
                    </span>
                  </div>

                  <div className="card-barcode-placeholder">
                    |||| | |||||| | ||||
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STREAKS & ATTENDANCE */}
            {activeTab === 'STREAKS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="analytics-grid">
                  <div className="analytic-card">
                    <span className="analytic-card-title">Current Workout Streak</span>
                    <div className="analytic-card-value" style={{ color: '#f59e0b' }}>
                      🔥 {metrics.current_streak || 0} Days
                    </div>
                    <span className="analytic-card-sub">Best Streak: {metrics.best_streak || 0} Days</span>
                  </div>

                  <div className="analytic-card">
                    <span className="analytic-card-title">Visits This Month</span>
                    <div className="analytic-card-value" style={{ color: '#38bdf8' }}>
                      {metrics.visits_this_month || 0} Workouts
                    </div>
                    <span className="analytic-card-sub">Consistency Score: 85%</span>
                  </div>

                  <div className="analytic-card">
                    <span className="analytic-card-title">Lifetime Workouts</span>
                    <div className="analytic-card-value" style={{ color: '#10b981' }}>
                      {metrics.total_lifetime_visits || 0} Days
                    </div>
                    <span className="analytic-card-sub">Last Visit: {metrics.last_visit_date || 'Today'}</span>
                  </div>
                </div>

                <div className="inventory-table-card" style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Recent Check-in Logs</h3>
                  {(!profileData?.recent_attendance || profileData.recent_attendance.length === 0) ? (
                    <div style={{ color: 'var(--text-muted)' }}>No recent check-in records found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {profileData.recent_attendance.map((att, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <span>📅 {att.date} at {att.first_detected || att.timestamp || 'Check-in'}</span>
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Verified AI Check-in</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: MEMBERSHIP PASS */}
            {activeTab === 'PASS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {hasActivePass ? (
                  <div className="analytic-card" style={{ maxWidth: '500px' }}>
                    <span className="analytic-card-title">Active Membership Pass</span>
                    <div className="analytic-card-value" style={{ color: '#38bdf8' }}>
                      {membership.plan_name || 'Standard Pass'}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div>Validity: <strong>{membership.start_date || 'N/A'} ➔ {membership.expiry_date || 'N/A'}</strong></div>
                      <div style={{ marginTop: '4px' }}>
                        Status: <strong style={{ color: 'var(--success)' }}>{memInfo.label}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1.5px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    maxWidth: '550px'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                    <h3 style={{ margin: 0, color: 'var(--danger)' }}>No Active Gym Membership Pass</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.5rem 0 0 0' }}>
                      You do not have an active membership pass recorded in the system. Please visit the front desk reception to subscribe or renew your gym membership pass.
                    </p>
                  </div>
                )}

                <div className="inventory-table-card" style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Payment History</h3>
                  {(!profileData?.payments_history || profileData.payments_history.length === 0) ? (
                    <div style={{ color: 'var(--text-muted)' }}>No payment transactions recorded yet.</div>
                  ) : (
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Receipt #</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.payments_history.map((p, idx) => (
                          <tr key={idx}>
                            <td>{p.date || 'N/A'}</td>
                            <td style={{ fontFamily: 'monospace' }}>{p.payment_id || `REC-${idx + 1}`}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 700 }}>Rs. {p.amount}</td>
                            <td>{p.payment_method || 'CASH'}</td>
                            <td><span className="status-pill-badge-mini active">PAID</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: CAFE ORDERING & NUTRITION */}
            {activeTab === 'CAFE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Live Pre-Order Status Tracker (If any active orders) */}
                {activePreorders.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activePreorders.map(order => (
                      <div key={order.id} className="preorder-tracker-card">
                        <div className="preorder-tracker-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '1.3rem' }}>🔔</span>
                            <div>
                              <strong style={{ color: '#fff', fontSize: '0.95rem' }}>Pre-Order #{order.id}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '8px' }}>
                                Total: <strong style={{ color: 'var(--success)' }}>Rs. {order.total_amount}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Live Status Badges */}
                          {order.order_status === 'PENDING_APPROVAL' && (
                            <span className="preorder-pulse-badge pending">
                              🟡 ⏳ Awaiting Front Desk Payment & Approval
                            </span>
                          )}
                          {order.order_status === 'PREPARING' && (
                            <span className="preorder-pulse-badge preparing">
                              🔵 🥤 Approved! Kitchen is Preparing your order
                            </span>
                          )}
                          {order.order_status === 'READY_FOR_PICKUP' && (
                            <span className="preorder-pulse-badge ready">
                              🟢 ✅ READY FOR PICKUP at Cafe Counter!
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.85rem', borderRadius: '8px' }}>
                          <strong>Items:</strong> {order.items?.map((it, idx) => (
                            <span key={idx}> {it.qty}x {it.name} {it.addons && it.addons.length > 0 ? `(${it.addons.join(', ')})` : ''} • </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cafe Sub-Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <button 
                    style={{
                      background: cafeView === 'ORDER' ? 'var(--accent, #38bdf8)' : 'var(--bg-tertiary)',
                      color: cafeView === 'ORDER' ? '#000' : 'var(--text-primary)',
                      border: 'none',
                      padding: '0.5rem 1.1rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.88rem'
                    }}
                    onClick={() => setCafeView('ORDER')}
                  >
                    🛍️ Order Shakes & Nutrition
                  </button>
                  <button 
                    style={{
                      background: cafeView === 'HISTORY' ? 'var(--accent, #38bdf8)' : 'var(--bg-tertiary)',
                      color: cafeView === 'HISTORY' ? '#000' : 'var(--text-primary)',
                      border: 'none',
                      padding: '0.5rem 1.1rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.88rem'
                    }}
                    onClick={() => setCafeView('HISTORY')}
                  >
                    📊 My Nutrition Stats & History
                  </button>
                </div>

                {orderSuccessMsg && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.92rem'
                  }}>
                    {orderSuccessMsg}
                  </div>
                )}

                {/* VIEW 1: SELF-ORDERING MENU */}
                {cafeView === 'ORDER' && (
                  <div className="member-order-layout">
                    {/* Left: Product Catalog */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Categories Bar */}
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {CAFE_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            style={{
                              background: selectedCategory === cat.id ? '#8b5cf6' : 'var(--bg-tertiary)',
                              color: '#fff',
                              border: '1px solid var(--border-color)',
                              padding: '0.45rem 0.85rem',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedCategory(cat.id)}
                          >
                            {cat.icon} {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Products Grid */}
                      <div className="member-product-grid">
                        {filteredProducts.map(prod => (
                          <div 
                            key={prod.id} 
                            className={`member-product-card ${prod.stock <= 0 ? 'out-of-stock' : ''}`}
                            onClick={() => {
                              if (prod.stock <= 0) return;
                              if (prod.customizable) handleOpenCustomizer(prod);
                              else handleAddSimpleToCart(prod);
                            }}
                          >
                            <div>
                              <span className="prod-category-tag">{prod.category}</span>
                              <h4 style={{ margin: '0.4rem 0 0.2rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{prod.name}</h4>
                              <div style={{ fontSize: '0.78rem', color: '#38bdf8' }}>
                                {prod.protein_g > 0 && `⚡ ${prod.protein_g}g Pro `}
                                {prod.calories > 0 && `• 🔥 ${prod.calories} kcal`}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                              <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1rem' }}>Rs. {prod.price}</span>
                              <button 
                                style={{
                                  background: '#8b5cf6',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                disabled={prod.stock <= 0}
                              >
                                {prod.customizable ? 'Customize +' : '+ Add'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Cart & Submit Pre-Order */}
                    <div className="member-cart-box">
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                        🛒 Your Pre-Order Cart
                      </h4>

                      {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Your cart is empty. Click items on the menu to add shakes & meals.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                            {cart.map(item => (
                              <div key={item.cart_id} className="member-cart-item">
                                <div style={{ flex: 1 }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Rs. {item.unit_price} each • {item.protein_g}g Pro
                                    {item.addons?.map((a, i) => <div key={i} style={{ color: '#c084fc' }}>• {a}</div>)}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #374151', background: '#1f2937', color: '#fff', cursor: 'pointer' }} onClick={() => handleUpdateCartQty(item.cart_id, -1)}>-</button>
                                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.qty}</span>
                                  <button style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #374151', background: '#1f2937', color: '#fff', cursor: 'pointer' }} onClick={() => handleUpdateCartQty(item.cart_id, 1)}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                            <span>Total Bill:</span>
                            <span style={{ color: 'var(--success)' }}>Rs. {cartSubtotal}</span>
                          </div>

                          {/* Payment Intent Selector */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>How will you pay?</label>
                            <select 
                              value={paymentIntent}
                              onChange={(e) => setPaymentIntent(e.target.value)}
                              style={{
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem'
                              }}
                            >
                              <option value="PAY_AT_COUNTER">💵 Pay at Counter on Pickup (Cash/Card/QR)</option>
                              <option value="MEMBER_TAB">👤 Charge to my Member Khata Tab</option>
                            </select>
                          </div>

                          <button 
                            className="member-order-btn"
                            disabled={placingOrder}
                            onClick={handlePlacePreOrder}
                          >
                            {placingOrder ? 'Sending Pre-Order...' : '🚀 Place Pre-Order Now'}
                          </button>

                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            * Orders are confirmed when front desk staff approves payment.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* VIEW 2: NUTRITION STATS & ORDER HISTORY */}
                {cafeView === 'HISTORY' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="analytics-grid">
                      <div className="analytic-card">
                        <span className="analytic-card-title">Total Cafe Spent</span>
                        <div className="analytic-card-value" style={{ color: '#10b981' }}>
                          Rs. {cafeMetrics.total_spent_pkr || 0}
                        </div>
                      </div>
                      <div className="analytic-card">
                        <span className="analytic-card-title">Total Protein Fuel</span>
                        <div className="analytic-card-value" style={{ color: '#38bdf8' }}>
                          ~{cafeMetrics.total_protein_g || 0}g
                        </div>
                      </div>
                      <div className="analytic-card">
                        <span className="analytic-card-title">Unpaid Khata Tab</span>
                        <div className="analytic-card-value" style={{ color: '#c084fc' }}>
                          Rs. {cafeMetrics.cafe_tab_balance || 0}
                        </div>
                      </div>
                    </div>

                    <div className="inventory-table-card" style={{ padding: '1rem' }}>
                      <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Past Orders & Shakes</h3>
                      {(!profileData?.cafe_history || profileData.cafe_history.length === 0) ? (
                        <div style={{ color: 'var(--text-muted)' }}>No past cafe orders recorded yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {profileData.cafe_history.map(ord => (
                            <div key={ord.id} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>#{ord.id}</strong>
                                <span style={{ color: 'var(--success)', fontWeight: 700 }}>Rs. {ord.total_amount}</span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {ord.items?.map((it, idx) => (
                                  <span key={idx}>• {it.qty}x {it.name} </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* SHAKE CUSTOMIZER MODAL */}
      {customizingProduct && (
        <div className="modal-overlay" onClick={() => setCustomizingProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3>Customize {customizingProduct.name}</h3>
              <button className="modal-close-btn" onClick={() => setCustomizingProduct(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Milk Base */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Choose Liquid Base:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.3rem' }}>
                  {MILK_OPTIONS.map(m => (
                    <label key={m.id} style={{ display: 'flex', justifyContent: 'space-between', background: selectedMilk.id === m.id ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-tertiary)', border: selectedMilk.id === m.id ? '1px solid #8b5cf6' : '1px solid var(--border-color)', padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <span>
                        <input type="radio" name="milk" checked={selectedMilk.id === m.id} onChange={() => setSelectedMilk(m)} style={{ marginRight: '6px' }} />
                        {m.label}
                      </span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>{m.price > 0 ? `+Rs. ${m.price}` : 'Free'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Addons */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Extra Gym Add-ons & Fuel:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.3rem' }}>
                  {ADDONS_OPTIONS.map(a => {
                    const isChecked = selectedAddons.some(x => x.id === a.id);
                    return (
                      <label key={a.id} style={{ display: 'flex', justifyContent: 'space-between', background: isChecked ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-tertiary)', border: isChecked ? '1px solid #10b981' : '1px solid var(--border-color)', padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <span>
                          <input type="checkbox" checked={isChecked} onChange={() => handleToggleAddon(a)} style={{ marginRight: '6px' }} />
                          {a.label}
                        </span>
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>+Rs. {a.price}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Price / Protein Summary */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Nutrition:</div>
                  <strong style={{ color: '#38bdf8' }}>
                    {(customizingProduct.protein_g || 0) + (selectedMilk.protein || 0) + selectedAddons.reduce((s, a) => s + a.protein, 0)}g Protein
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Price:</div>
                  <strong style={{ color: 'var(--success)', fontSize: '1.15rem' }}>
                    Rs. {customizingProduct.price + (selectedMilk.price || 0) + selectedAddons.reduce((s, a) => s + a.price, 0)}
                  </strong>
                </div>
              </div>

              <button className="member-order-btn" onClick={handleAddCustomizedToCart}>
                ✓ Add Customized Shake to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberPortal;
