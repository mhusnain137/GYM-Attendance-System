import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Cafe.css';
import { openWhatsApp, generateCafeWhatsAppReceipt } from '../utils/whatsappUtils';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { id: 'ALL', label: 'All Items', icon: '⚡' },
  { id: 'SHAKES', label: 'Shakes & Smoothies', icon: '🥤' },
  { id: 'PRE_WORKOUT', label: 'Pre-Workouts', icon: '💥' },
  { id: 'SNACKS', label: 'Protein Snacks', icon: '🍫' },
  { id: 'MEALS', label: 'Diet Meals', icon: '🥗' },
  { id: 'SUPPLEMENTS', label: 'Supplements', icon: '💊' },
  { id: 'HYDRATION', label: 'Water & Drinks', icon: '💧' }
];

const MILK_OPTIONS = [
  { id: 'WATER', label: 'Water (Light & Fast)', price: 0, calories: 0, protein: 0 },
  { id: 'SKIM', label: 'Skim Milk (+0 Cal)', price: 0, calories: 70, protein: 7 },
  { id: 'WHOLE', label: 'Whole Milk (+Rs. 50)', price: 50, calories: 140, protein: 8 },
  { id: 'ALMOND', label: 'Almond Milk (+Rs. 100)', price: 100, calories: 40, protein: 1 }
];

const ADDON_OPTIONS = [
  { id: 'CREATINE', label: '+1 Scoop Creatine (5g)', price: 120, calories: 0, protein: 0 },
  { id: 'PB', label: '+1 Spoon Peanut Butter', price: 60, calories: 95, protein: 4 },
  { id: 'OATS', label: '+Rolled Oats (30g)', price: 40, calories: 80, protein: 3 },
  { id: 'EXTRA_WHEY', label: '+Extra Whey Scoop', price: 250, calories: 120, protein: 25 }
];

function Cafe() {
  const { canDelete, isReceptionist } = useAuth();
  const [activeTab, setActiveTab] = useState('POS'); // 'POS' | 'ORDERS' | 'INVENTORY' | 'ANALYTICS'
  
  // Pre-Order Approval Modal State
  const [approvingOrder, setApprovingOrder] = useState(null);
  const [approvalPaymentMethod, setApprovalPaymentMethod] = useState('CASH');

  // Data States
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);

  // POS State
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [customerType, setCustomerType] = useState('MEMBER'); // 'MEMBER' | 'WALKIN'
  const [selectedMember, setSelectedMember] = useState(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' | 'CARD' | 'QR_ONLINE' | 'MEMBER_TAB'
  const [discount, setDiscount] = useState(0);

  // Customizer Modal State
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedMilk, setSelectedMilk] = useState(MILK_OPTIONS[0]);
  const [selectedAddons, setSelectedAddons] = useState([]);

  // Receipt / Success Modal State
  const [completedOrder, setCompletedOrder] = useState(null);
  const [receiptPhone, setReceiptPhone] = useState('');

  // Live Orders Custom WhatsApp Modal State
  const [whatsappModalOrder, setWhatsappModalOrder] = useState(null);
  const [whatsappModalPhone, setWhatsappModalPhone] = useState('');

  // Inventory Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    category: 'SHAKES',
    price: 450,
    cost_price: 280,
    calories: 200,
    protein_g: 25,
    stock: 20,
    min_stock_alert: 5,
    description: '',
    customizable: false
  });

  // Orders Filter State
  const [ordersDateFilter, setOrdersDateFilter] = useState('today');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('ALL');
  const [ordersSearchQuery, setOrdersSearchQuery] = useState('');

  // Keyboard Shortcuts (ESC to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setCustomizingProduct(null);
        setCompletedOrder(null);
        setShowProductModal(false);
        setWhatsappModalOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchAnalytics();
    fetchPeople();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/cafe/products');
      if (res.data) {
        if (Array.isArray(res.data)) {
          setProducts(res.data);
        } else if (res.data.products && Array.isArray(res.data.products)) {
          setProducts(res.data.products);
        }
      }
    } catch (err) {
      console.error('Error fetching cafe products:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/cafe/orders');
      if (res.data) {
        if (Array.isArray(res.data)) {
          setOrders(res.data);
        } else if (res.data.orders && Array.isArray(res.data.orders)) {
          setOrders(res.data.orders);
        }
      }
    } catch (err) {
      console.error('Error fetching cafe orders:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('/api/cafe/analytics');
      if (res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Error fetching cafe analytics:', err);
    }
  };

  const fetchPeople = async () => {
    try {
      const res = await axios.get('/api/people');
      if (res.data && Array.isArray(res.data)) {
        setPeople(res.data);
      } else if (res.data && res.data.people) {
        setPeople(res.data.people);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  // ============================================================
  // CART ACTIONS
  // ============================================================
  const handleAddToCart = (product) => {
    if (product.customizable) {
      setCustomizingProduct(product);
      setSelectedMilk(MILK_OPTIONS[0]);
      setSelectedAddons([]);
    } else {
      addProductDirectlyToCart(product);
    }
  };

  const addProductDirectlyToCart = (product) => {
    const existingIndex = cart.findIndex(
      item => item.product_id === product.id && (!item.addons || item.addons.length === 0)
    );

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].qty += 1;
      newCart[existingIndex].item_total = newCart[existingIndex].qty * newCart[existingIndex].unit_price;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        qty: 1,
        unit_price: product.price,
        calories: product.calories || 0,
        protein_g: product.protein_g || 0,
        addons: [],
        item_total: product.price
      }]);
    }
  };

  const confirmCustomizedProduct = () => {
    if (!customizingProduct) return;

    let addonPrice = selectedMilk.price;
    let addonCalories = selectedMilk.calories;
    let addonProtein = selectedMilk.protein;
    const addonNames = [];

    if (selectedMilk.id !== 'WATER') {
      addonNames.push(`Base: ${selectedMilk.label}`);
    }

    selectedAddons.forEach(a => {
      addonPrice += a.price;
      addonCalories += a.calories;
      addonProtein += a.protein;
      addonNames.push(a.label);
    });

    const finalUnitPrice = customizingProduct.price + addonPrice;
    const finalCalories = customizingProduct.calories + addonCalories;
    const finalProtein = customizingProduct.protein_g + addonProtein;

    setCart([...cart, {
      product_id: customizingProduct.id,
      name: customizingProduct.name,
      qty: 1,
      unit_price: finalUnitPrice,
      calories: finalCalories,
      protein_g: finalProtein,
      addons: addonNames,
      item_total: finalUnitPrice
    }]);

    setCustomizingProduct(null);
  };

  const updateCartQty = (index, delta) => {
    const newCart = [...cart];
    const newQty = newCart[index].qty + delta;
    if (newQty <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].qty = newQty;
      newCart[index].item_total = newQty * newCart[index].unit_price;
    }
    setCart(newCart);
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  // Export Sales CSV
  const exportCafeSalesCSV = () => {
    if (!orders || orders.length === 0) {
      alert('No order records available to export.');
      return;
    }
    const headers = ['Order ID', 'Date & Time', 'Customer Name', 'Phone', 'Items', 'Total (PKR)', 'Payment Method', 'Status', 'Served By'];
    const rows = orders.map(o => [
      o.id,
      `"${new Date(o.created_at).toLocaleString()}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_phone || ''}"`,
      `"${(o.items || []).map(i => `${i.qty}x ${i.name}`).join('; ')}"`,
      o.total_amount,
      o.payment_method,
      o.order_status,
      `"${o.served_by || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cafe_Sales_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Restock Function
  const handleQuickRestock = async (product, addQty) => {
    try {
      const newStock = (product.stock || 0) + addQty;
      await axios.put(`/api/cafe/products/${product.id}`, { stock: newStock });
      fetchProducts();
      fetchAnalytics();
    } catch (err) {
      console.error('Error updating stock:', err);
      alert('Failed to update stock');
    }
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.item_total, 0);
  const cartTotalAmount = Math.max(0, cartSubtotal - Number(discount || 0));
  const cartTotalProtein = cart.reduce((sum, item) => sum + (item.protein_g * item.qty), 0);
  const cartTotalCalories = cart.reduce((sum, item) => sum + (item.calories * item.qty), 0);

  // ============================================================
  // CHECKOUT
  // ============================================================
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (customerType === 'MEMBER' && !selectedMember) {
      alert('Please select a gym member or switch to Walk-in customer.');
      return;
    }

    if (paymentMethod === 'MEMBER_TAB' && customerType !== 'MEMBER') {
      alert('Member Tab (Khata) is only available for registered gym members.');
      return;
    }

    const custName = customerType === 'MEMBER' 
      ? (selectedMember.name || `Member ${selectedMember.id}`) 
      : (walkinName.trim() || 'Walk-in Guest');
      
    const custPhone = customerType === 'MEMBER' 
      ? (selectedMember.phone || '') 
      : (walkinPhone.trim() || '');

    const personId = customerType === 'MEMBER' ? (selectedMember.id || selectedMember.person_id) : null;

    const payload = {
      person_id: personId,
      customer_name: custName,
      customer_phone: custPhone,
      items: cart,
      subtotal: cartSubtotal,
      discount: Number(discount || 0),
      total_amount: cartTotalAmount,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'MEMBER_TAB' ? 'UNPAID_TAB' : 'PAID',
      order_status: 'COMPLETED',
      notes: '',
      served_by: 'Front Desk Staff' // RBAC ready
    };

    setLoading(true);
    try {
      const res = await axios.post('/api/cafe/orders', payload);
      if (res.data && res.data.order) {
        setCompletedOrder(res.data.order);
        setReceiptPhone(res.data.order.customer_phone || '');
        clearCart();
        fetchProducts(); // Refresh stock
        fetchOrders();
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Error placing order:', err);
      alert('Failed to place order: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ORDERS QUEUE STATUS UPDATE
  // ============================================================
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`/api/cafe/orders/${orderId}/status`, { order_status: newStatus });
      fetchOrders();
      fetchProducts();
      fetchAnalytics();
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Failed to update order status');
    }
  };

  const handleApprovePreOrder = async () => {
    if (!approvingOrder) return;
    try {
      const res = await axios.post(`/api/cafe/orders/${approvingOrder.id}/approve`, {
        payment_method: approvalPaymentMethod,
        approved_by: 'Reception Staff'
      });
      alert(res.data.message || 'Pre-order approved!');
      setApprovingOrder(null);
      fetchOrders();
      fetchProducts();
      fetchAnalytics();
    } catch (err) {
      alert('Failed to approve order: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRejectPreOrder = async (orderId) => {
    if (!window.confirm('Decline / reject this member pre-order?')) return;
    try {
      const res = await axios.post(`/api/cafe/orders/${orderId}/reject`);
      alert(res.data.message || 'Order rejected.');
      fetchOrders();
    } catch (err) {
      alert('Failed to reject order: ' + (err.response?.data?.detail || err.message));
    }
  };

  // ============================================================
  // INVENTORY PRODUCT FORM ACTIONS
  // ============================================================
  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProdForm({
        name: product.name,
        category: product.category,
        price: product.price,
        cost_price: product.cost_price || 0,
        calories: product.calories || 0,
        protein_g: product.protein_g || 0,
        stock: product.stock || 0,
        min_stock_alert: product.min_stock_alert || 5,
        description: product.description || '',
        customizable: !!product.customizable
      });
    } else {
      setEditingProduct(null);
      setProdForm({
        name: '',
        category: 'SHAKES',
        price: 450,
        cost_price: 280,
        calories: 200,
        protein_g: 25,
        stock: 20,
        min_stock_alert: 5,
        description: '',
        customizable: false
      });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await axios.put(`/api/cafe/products/${editingProduct.id}`, prodForm);
      } else {
        await axios.post('/api/cafe/products', prodForm);
      }
      setShowProductModal(false);
      fetchProducts();
      fetchAnalytics();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to remove this item from the active cafe catalog?')) return;
    try {
      await axios.delete(`/api/cafe/products/${productId}`);
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  // Filtered Products for POS
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchSearch = !searchQuery || (p.name || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    return matchCat && matchSearch;
  });

  const currentTab = (activeTab || 'POS').toUpperCase();

  return (
    <div className="cafe-container">
      {/* Top Header Bar */}
      <div className="cafe-header">
        <div>
          <h2>🏋️ TITAN NUTRITION & CAFE POS</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Protein Bar, Pre-Workout Smoothies & Health Supplement Counter
          </p>
        </div>
        <div className="cafe-tabs cafe-header-actions">
          <button 
            className={`cafe-tab-btn tab-btn ${currentTab === 'POS' ? 'active' : ''}`}
            onClick={() => setActiveTab('POS')}
          >
            🛒 POS Register
          </button>
          <button 
            className={`cafe-tab-btn tab-btn ${currentTab === 'ORDERS' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ORDERS'); fetchOrders(); }}
          >
            📋 Orders Feed {orders.filter(o => o.order_status === 'PENDING_APPROVAL').length > 0 && (
              <span className="cafe-badge cafe-badge-danger badge-count">{orders.filter(o => o.order_status === 'PENDING_APPROVAL').length}</span>
            )}
          </button>
          <button 
            className={`cafe-tab-btn tab-btn ${currentTab === 'INVENTORY' ? 'active' : ''}`}
            onClick={() => { setActiveTab('INVENTORY'); fetchProducts(); }}
          >
            📦 Inventory & Menu
          </button>
          <button 
            className={`cafe-tab-btn tab-btn ${currentTab === 'ANALYTICS' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ANALYTICS'); fetchAnalytics(); }}
          >
            📊 Cafe Insights
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {currentTab === 'POS' && (
        <div className="pos-layout">
          {/* Left: Product Catalog */}
          <div className="pos-products-panel pos-catalog-panel">
            {/* Search & Category Filter */}
            <div className="pos-filters-bar pos-filters-row">
              <div className="pos-search-box search-box">
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Search protein shakes, pre-workouts, snacks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && <button type="button" onClick={() => setSearchQuery('')}>✕</button>}
              </div>

              <div className="pos-category-pills category-chips">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    type="button"
                    className={`cat-pill cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="pos-products-grid">
              {filteredProducts.map(prod => {
                const stockTagClass = (prod.stock_status || (prod.stock <= 0 ? 'out_of_stock' : (prod.stock <= (prod.min_stock_alert || 5) ? 'low_stock' : 'in_stock'))).toLowerCase().replace('_', '-');
                return (
                  <div 
                    key={prod.id} 
                    className={`product-card ${prod.stock <= 0 ? 'out-of-stock' : ''}`}
                    onClick={() => prod.stock > 0 && handleAddToCart(prod)}
                  >
                    <div className="prod-header">
                      <span className="prod-category-tag">{prod.category}</span>
                      <span className={`stock-tag ${stockTagClass}`}>
                        {prod.stock <= 0 ? 'Out of Stock' : `${prod.stock} left`}
                      </span>
                    </div>

                    <h4 className="prod-name">{prod.name}</h4>

                    <div className="prod-macros-bar">
                      {prod.protein_g > 0 && (
                        <span className="macro-chip protein">⚡ {prod.protein_g}g Pro</span>
                      )}
                      {prod.calories > 0 && (
                        <span className="macro-chip calories">🔥 {prod.calories} kcal</span>
                      )}
                    </div>

                    <div className="prod-footer">
                      <div className="prod-price">Rs. {prod.price}</div>
                      <button 
                        className="prod-add-btn" 
                        disabled={prod.stock <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (prod.stock > 0) handleAddToCart(prod);
                        }}
                      >
                        {prod.customizable ? 'Customize +' : '+ Add'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No items found in this category.
                </div>
              )}
            </div>
          </div>

          {/* Cart Drawer */}
          <div className="pos-cart-panel">
            <div className="cart-header">
              <h3>🛒 Current Order</h3>
              {cart.length > 0 && (
                <button className="clear-cart-btn" onClick={clearCart}>Clear All</button>
              )}
            </div>

            {/* Customer Selector */}
            <div className="cart-customer-selector">
              <div className="customer-type-radios">
                <button 
                  className={`cust-radio-btn ${customerType === 'MEMBER' ? 'active' : ''}`}
                  onClick={() => setCustomerType('MEMBER')}
                >
                  🏋️ Gym Member
                </button>
                <button 
                  className={`cust-radio-btn ${customerType === 'WALKIN' ? 'active' : ''}`}
                  onClick={() => setCustomerType('WALKIN')}
                >
                  🚶 Walk-in Guest
                </button>
              </div>

              {customerType === 'MEMBER' ? (
                <div className="member-search-select">
                  <select 
                    value={selectedMember ? (selectedMember.id || selectedMember.person_id) : ''}
                    onChange={(e) => {
                      const m = people.find(p => (p.id || p.person_id) === e.target.value);
                      setSelectedMember(m || null);
                    }}
                  >
                    <option value="">-- Choose Member (ID / Name) --</option>
                    {people.map(p => (
                      <option key={p.id || p.person_id} value={p.id || p.person_id}>
                        {p.name} ({p.id || p.person_id})
                      </option>
                    ))}
                  </select>

                  {selectedMember && (
                    <div className="member-tab-info">
                      <span>👤 {selectedMember.name}</span>
                      <span>Phone: {selectedMember.phone || 'N/A'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="walkin-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input 
                    type="text" 
                    placeholder="Guest Name (e.g. Bilal)"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="WhatsApp Phone (Optional)"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="cart-items-list">
              {cart.length === 0 ? (
                <div className="empty-cart-message">
                  <div className="empty-cart-icon">🛒</div>
                  <p>Cart is empty. Tap any shake or supplement to start ordering.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="cart-item-card">
                    <div className="cart-item-top">
                      <div>
                        <div className="cart-item-name">{item.name}</div>
                        {item.addons && item.addons.length > 0 && (
                          <div className="cart-item-addons">{item.addons.join(' • ')}</div>
                        )}
                      </div>
                      <div className="cart-item-price">Rs. {item.item_total}</div>
                    </div>

                    <div className="cart-item-controls">
                      <div className="cart-item-macros">
                        ⚡ ~{Math.round(item.protein_g * item.qty)}g Pro • {item.calories * item.qty} kcal
                      </div>

                      <div className="qty-stepper">
                        <button className="qty-btn" onClick={() => updateCartQty(idx, -1)}>−</button>
                        <span className="qty-number">{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateCartQty(idx, 1)}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            {cart.length > 0 && (
              <>
                <div className="cart-payment-methods">
                  <button 
                    className={`pay-method-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('CASH')}
                  >
                    💵 Cash
                  </button>
                  <button 
                    className={`pay-method-btn ${paymentMethod === 'CARD' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('CARD')}
                  >
                    💳 Card
                  </button>
                  <button 
                    className={`pay-method-btn ${paymentMethod === 'QR_ONLINE' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('QR_ONLINE')}
                  >
                    📱 QR Online
                  </button>
                  <button 
                    className={`pay-method-btn member-tab ${paymentMethod === 'MEMBER_TAB' ? 'active' : ''}`}
                    onClick={() => {
                      if (customerType !== 'MEMBER') {
                        setCustomerType('MEMBER');
                      }
                      setPaymentMethod('MEMBER_TAB');
                    }}
                  >
                    👤 Member Tab
                  </button>
                </div>

                {/* Summary & Checkout */}
                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>Rs. {cartSubtotal}</span>
                  </div>

                  <div className="summary-row" style={{ alignItems: 'center' }}>
                    <span>Discount (Rs):</span>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <input 
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="form-input"
                        style={{
                          width: '70px',
                          padding: '2px 6px',
                          textAlign: 'right'
                        }}
                      />
                    </div>
                  </div>

                  {/* Discount Quick Presets */}
                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', marginBottom: '0.2rem' }}>
                    <button 
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => setDiscount(Math.round(cartSubtotal * 0.05))}
                    >
                      5%
                    </button>
                    <button 
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => setDiscount(Math.round(cartSubtotal * 0.10))}
                    >
                      10%
                    </button>
                    <button 
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => setDiscount(50)}
                    >
                      Rs 50
                    </button>
                    {discount > 0 && (
                      <button 
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => setDiscount(0)}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="summary-row">
                    <span>Total Protein Fuel:</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>~{Math.round(cartTotalProtein)}g Protein</span>
                  </div>

                  <div className="summary-row total-row">
                    <span>Total Bill:</span>
                    <span style={{ color: 'var(--success)' }}>Rs. {cartTotalAmount}</span>
                  </div>

                  <button 
                    className="checkout-btn"
                    disabled={loading || cart.length === 0}
                    onClick={handleCheckout}
                  >
                    {loading ? 'Processing...' : `Confirm & Bill (Rs. ${cartTotalAmount})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: LIVE ORDERS QUEUE
          ============================================================ */}
      {currentTab === 'ORDERS' && (
        <div className="orders-view-container">
          <div className="orders-filters-bar">
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className={`cat-pill ${ordersDateFilter === 'today' ? 'active' : ''}`}
                onClick={() => setOrdersDateFilter('today')}
              >
                📅 Today's Orders
              </button>
              <button 
                className={`cat-pill ${ordersDateFilter === 'all' ? 'active' : ''}`}
                onClick={() => setOrdersDateFilter('all')}
              >
                All Time
              </button>
              <button 
                style={{
                  background: 'var(--success)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={exportCafeSalesCSV}
              >
                📥 Export Sales CSV
              </button>
            </div>

            <div className="pos-search-box" style={{ maxWidth: '240px' }}>
              <span>🔍</span>
              <input 
                type="text"
                placeholder="Search order ID / customer..."
                value={ordersSearchQuery}
                onChange={(e) => setOrdersSearchQuery(e.target.value)}
              />
              {ordersSearchQuery && (
                <button onClick={() => setOrdersSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PENDING_APPROVAL', label: 'Pending' },
                { id: 'PREPARING', label: 'Preparing' },
                { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
                { id: 'PICKED_UP', label: 'Picked Up' },
                { id: 'COMPLETED', label: 'Completed' },
                { id: 'CANCELLED', label: 'Cancelled' }
              ].map(st => (
                <button
                  key={st.id}
                  className={`cat-pill ${ordersStatusFilter === st.id ? 'active' : ''}`}
                  onClick={() => setOrdersStatusFilter(st.id)}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="orders-grid">
            {orders
              .filter(o => {
                const isToday = (o.created_at || '').startsWith(new Date().toISOString().substring(0, 10));
                const matchDate = ordersDateFilter === 'today' ? isToday : true;
                const matchStatus = ordersStatusFilter === 'ALL' || o.order_status === ordersStatusFilter;
                const matchSearch = !ordersSearchQuery || 
                  o.id.toLowerCase().includes(ordersSearchQuery.toLowerCase()) || 
                  (o.customer_name || '').toLowerCase().includes(ordersSearchQuery.toLowerCase());
                return matchDate && matchStatus && matchSearch;
              })
              .map(ord => (
                <div key={ord.id} className="order-ticket-card">
                  <div className="order-ticket-header">
                    <div>
                      <span className="order-id-badge">{ord.id}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className={`order-status-pill ${ord.order_status.toLowerCase()}`}>
                      {ord.order_status === 'READY_FOR_PICKUP' ? '🟢 Ready for Pickup' :
                       ord.order_status === 'PICKED_UP' ? '✓ Picked Up' :
                       ord.order_status === 'PENDING_APPROVAL' ? '🟡 Pending Approval' :
                       ord.order_status}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    👤 {ord.customer_name} {ord.person_id ? `(${ord.person_id})` : ''}
                  </div>

                  {ord.order_status === 'CANCELLED' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.3rem 0.5rem', borderRadius: '6px' }}>
                      ✕ Cancelled by: <strong>{ord.cancelled_by || 'Customer'}</strong> {ord.cancelled_at ? `(${new Date(ord.cancelled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                    </div>
                  )}

                  {ord.order_status === 'PICKED_UP' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.3rem 0.5rem', borderRadius: '6px' }}>
                      ✓ Picked up by: <strong>{ord.picked_up_by || 'Customer'}</strong> {ord.picked_up_at ? `(${new Date(ord.picked_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                    </div>
                  )}

                  <div className="order-items-compact">
                    {ord.items.map((itm, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{itm.qty}x {itm.name} {itm.addons && it.addons.length > 0 ? `(${itm.addons.join(', ')})` : ''}</span>
                        <span style={{ color: 'var(--success)' }}>Rs. {itm.item_total}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-ticket-footer">
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total: </span>
                      <strong style={{ color: 'var(--success)', fontSize: '1rem' }}>Rs. {ord.total_amount}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>
                        [{ord.payment_method}] • {ord.payment_status}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {ord.order_status === 'PENDING_APPROVAL' && (
                        <>
                          <button 
                            style={{
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                            }}
                            onClick={() => {
                              setApprovingOrder(ord);
                              setApprovalPaymentMethod(ord.payment_method === 'MEMBER_TAB' ? 'MEMBER_TAB' : 'CASH');
                            }}
                          >
                            ✓ Approve & Pay
                          </button>
                          <button 
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: 'var(--danger)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.78rem',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleRejectPreOrder(ord.id)}
                          >
                            ✕ Decline
                          </button>
                        </>
                      )}

                      <button 
                        className="whatsapp-receipt-btn" 
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                        onClick={() => {
                          if (ord.customer_phone && ord.customer_phone.trim()) {
                            const msg = generateCafeWhatsAppReceipt(ord);
                            openWhatsApp(ord.customer_phone.trim(), msg);
                          } else {
                            setWhatsappModalOrder(ord);
                            setWhatsappModalPhone('');
                          }
                        }}
                      >
                        📲 WhatsApp
                      </button>

                      {ord.order_status === 'PREPARING' && (
                        <>
                          <button 
                            style={{
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            onClick={() => handleUpdateOrderStatus(ord.id, 'READY_FOR_PICKUP')}
                          >
                            🟢 Ready
                          </button>
                          <button 
                            className="prod-add-btn"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                            onClick={() => handleUpdateOrderStatus(ord.id, 'COMPLETED')}
                          >
                            ✓ Complete
                          </button>
                        </>
                      )}

                      {ord.order_status === 'READY_FOR_PICKUP' && (
                        <button 
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          onClick={() => handleUpdateOrderStatus(ord.id, 'PICKED_UP')}
                        >
                          ✓ Hand Over / Picked Up
                        </button>
                      )}

                      {ord.order_status !== 'CANCELLED' && ord.order_status !== 'PENDING_APPROVAL' && ord.order_status !== 'PICKED_UP' && ord.order_status !== 'COMPLETED' && (
                        <button 
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: 'var(--danger)',
                            borderRadius: '6px',
                            padding: '0.35rem 0.6rem',
                            fontSize: '0.78rem',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            if (window.confirm('Cancel order and return items to stock?')) {
                              handleUpdateOrderStatus(ord.id, 'CANCELLED');
                            }
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No cafe orders recorded yet.
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 3: INVENTORY & STOCK MANAGER
          ============================================================ */}
      {currentTab === 'INVENTORY' && (
        <div className="inventory-container">
          <div className="inventory-header-bar">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Cafe Catalog & Stock Tracking</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Manage pricing, nutritional values, and monitor low inventory thresholds.
              </p>
            </div>

            <button 
              className="checkout-btn" 
              style={{ margin: 0, padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
              onClick={() => handleOpenProductModal(null)}
            >
              + Add New Item
            </button>
          </div>

          <div className="inventory-table-card">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Selling Price</th>
                  <th>Cost Price</th>
                  <th>Macros</th>
                  <th>Stock Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => (
                  <tr key={prod.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prod.id}</div>
                    </td>
                    <td>
                      <span className="prod-category-tag">{prod.category}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>Rs. {prod.price}</td>
                    <td style={{ color: 'var(--text-muted)' }}>Rs. {prod.cost_price || 0}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
                        {prod.protein_g}g Pro | {prod.calories} kcal
                      </span>
                    </td>
                    <td>
                      <span className={`stock-tag ${(prod.stock_status || (prod.stock <= 0 ? 'out_of_stock' : (prod.stock <= (prod.min_stock_alert || 5) ? 'low_stock' : 'in_stock'))).toLowerCase().replace('_', '-')}`}>
                        {prod.stock} Units {prod.stock <= (prod.min_stock_alert || 5) && '⚠️ Low'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button 
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: 'var(--success)',
                            borderRadius: '6px',
                            padding: '0.3rem 0.55rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                          onClick={() => handleQuickRestock(prod, 10)}
                        >
                          +10 Stock
                        </button>
                        <button 
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '6px',
                            padding: '0.3rem 0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem'
                          }}
                          onClick={() => handleOpenProductModal(prod)}
                        >
                          ✏️ Edit
                        </button>
                        {canDelete && (
                          <button 
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: 'var(--danger)',
                              borderRadius: '6px',
                              padding: '0.3rem 0.6rem',
                              cursor: 'pointer',
                              fontSize: '0.78rem'
                            }}
                            onClick={() => handleDeleteProduct(prod.id)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: CAFE ANALYTICS
          ============================================================ */}
      {currentTab === 'ANALYTICS' && analytics && (
        <div>
          {/* Top Metric Cards */}
          <div className="analytics-grid">
            <div className="analytic-card">
              <span className="analytic-card-title">Today's Cafe Revenue</span>
              <div className="analytic-card-value">Rs. {analytics.today?.revenue || 0}</div>
              <span className="analytic-card-sub">{analytics.today?.orders || 0} orders processed</span>
            </div>

            {!isReceptionist && (
              <div className="analytic-card">
                <span className="analytic-card-title">Today's Net Profit</span>
                <div className="analytic-card-value" style={{ color: 'var(--success)' }}>
                  Rs. {analytics.today?.profit || 0}
                </div>
                <span className="analytic-card-sub" style={{ color: 'var(--text-muted)' }}>Owner margin analytics</span>
              </div>
            )}

            <div className="analytic-card">
              <span className="analytic-card-title">This Month's Revenue</span>
              <div className="analytic-card-value">Rs. {analytics.month?.revenue || 0}</div>
              <span className="analytic-card-sub">{analytics.month?.orders || 0} orders this month</span>
            </div>

            <div className="analytic-card">
              <span className="analytic-card-title">All-Time Sales</span>
              <div className="analytic-card-value" style={{ color: 'var(--accent)' }}>
                Rs. {analytics.total?.revenue || 0}
              </div>
              <span className="analytic-card-sub">{analytics.total?.orders || 0} lifetime orders</span>
            </div>
          </div>

          <div className="analytics-sections-row">
            {/* Top Selling Products */}
            <div className="analytics-subcard">
              <h3>🏆 Top Selling Recovery Shakes & Items</h3>
              <div className="top-products-list">
                {(analytics.top_selling || []).map((item, idx) => (
                  <div key={idx} className="top-prod-row">
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>#{idx + 1} {item.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Sold: {item.qty} units
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                      Rs. {item.revenue}
                    </div>
                  </div>
                ))}
                {(!analytics.top_selling || analytics.top_selling.length === 0) && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No sales data recorded yet.</div>
                )}
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="analytics-subcard">
              <h3>💳 Payment Methods Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(analytics.payment_breakdown || {}).map(([key, data]) => (
                  <div key={key} className="top-prod-row">
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{key.replace('_', ' ')}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {data.count} transactions
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      Rs. {data.amount}
                    </div>
                  </div>
                ))}
              </div>

              {/* Low Stock Alerts Box */}
              {analytics.low_stock_alerts?.count > 0 && (
                <div style={{
                  marginTop: '1.25rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  padding: '0.85rem'
                }}>
                  <strong style={{ color: 'var(--danger)' }}>⚠️ Low Stock Warning:</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.3rem' }}>
                    {analytics.low_stock_alerts.items.map(i => `${i.name} (${i.stock} left)`).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SHAKE CUSTOMIZER MODAL
          ============================================================ */}
      {customizingProduct && (
        <div className="customizer-backdrop">
          <div className="customizer-card">
            <div className="customizer-header">
              <div>
                <h3>🥤 Customize: {customizingProduct.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Base: Rs. {customizingProduct.price} • {customizingProduct.protein_g}g Protein
                </span>
              </div>
              <button 
                onClick={() => setCustomizingProduct(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="customizer-body">
              {/* Milk Choice */}
              <div>
                <div className="cust-section-title">1. Choose Liquid Base</div>
                <div className="milk-base-options">
                  {MILK_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      className={`milk-option-btn ${selectedMilk.id === opt.id ? 'selected' : ''}`}
                      onClick={() => setSelectedMilk(opt)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Addons Checklist */}
              <div>
                <div className="cust-section-title">2. Gym Power Add-ons</div>
                <div className="addons-list">
                  {ADDON_OPTIONS.map(addon => {
                    const isChecked = selectedAddons.some(a => a.id === addon.id);
                    return (
                      <div
                        key={addon.id}
                        className={`addon-checkbox-label ${isChecked ? 'selected' : ''}`}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
                          } else {
                            setSelectedAddons([...selectedAddons, addon]);
                          }
                        }}
                      >
                        <span>{isChecked ? '☑' : '☐'} {addon.label}</span>
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>+Rs. {addon.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Totals Banner */}
              {(() => {
                const totalAddonPrice = selectedMilk.price + selectedAddons.reduce((s, a) => s + a.price, 0);
                const totalProt = customizingProduct.protein_g + selectedMilk.protein + selectedAddons.reduce((s, a) => s + a.protein, 0);
                const totalCal = customizingProduct.calories + selectedMilk.calories + selectedAddons.reduce((s, a) => s + a.calories, 0);
                return (
                  <div className="customizer-totals-banner">
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Fuel: ~{Math.round(totalProt)}g Protein</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>~{totalCal} Calories</div>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>
                      Total: Rs. {customizingProduct.price + totalAddonPrice}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="customizer-footer">
              <button 
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => setCustomizingProduct(null)}
              >
                Cancel
              </button>
              <button 
                className="checkout-btn"
                style={{ margin: 0, padding: '0.5rem 1.25rem' }}
                onClick={confirmCustomizedProduct}
              >
                Add Customized Shake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          RECEIPT / SUCCESS MODAL
          ============================================================ */}
      {completedOrder && (
        <div className="customizer-backdrop">
          <div className="receipt-modal-card">
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>✅</span>
              <h3 style={{ margin: '0.4rem 0 0 0', color: 'var(--text-primary)' }}>Order Processed!</h3>
              <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Stock deducted & order recorded successfully.
              </p>
            </div>

            {/* Receipt Slip Preview (Prints directly on thermal printer) */}
            <div className="receipt-slip-preview" id="thermal-receipt">
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                TITAN GYM CAFE & NUTRITION<br />
                --------------------------------
              </div>
              <div>Receipt: #{completedOrder.id}</div>
              <div>Date: {new Date(completedOrder.created_at).toLocaleString()}</div>
              <div>Customer: {completedOrder.customer_name}</div>
              <div>--------------------------------</div>
              {completedOrder.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{it.qty}x {it.name}</span>
                  <span>Rs. {it.item_total}</span>
                </div>
              ))}
              <div>--------------------------------</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>TOTAL BILL:</span>
                <span>Rs. {completedOrder.total_amount}</span>
              </div>
              <div>Mode: [{completedOrder.payment_method}] ({completedOrder.payment_status})</div>
              <div>Server: {completedOrder.served_by}</div>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.75rem' }}>
                Fuel your workout & recovery! 💪
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                📱 Customer WhatsApp Phone (Edit if unsaved):
              </label>
              <input 
                type="text" 
                placeholder="Enter phone number (e.g. 03001234567)"
                value={receiptPhone}
                onChange={(e) => setReceiptPhone(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.88rem', padding: '0.45rem 0.75rem' }}
              />
            </div>

            <div className="receipt-actions-row">
              <button 
                className="whatsapp-receipt-btn"
                onClick={() => {
                  const targetPhone = receiptPhone || completedOrder.customer_phone;
                  if (!targetPhone) {
                    alert('Please enter a WhatsApp phone number to send the receipt.');
                    return;
                  }
                  const msg = generateCafeWhatsAppReceipt(completedOrder);
                  openWhatsApp(targetPhone, msg);
                }}
              >
                📲 Send WhatsApp Receipt
              </button>
              <button 
                className="print-receipt-btn"
                onClick={() => window.print()}
              >
                🖨️ Print Slip
              </button>
            </div>

            <button 
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.6rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
              onClick={() => setCompletedOrder(null)}
            >
              Done / Next Order
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          CUSTOM WHATSAPP PHONE MODAL FOR LIVE ORDERS QUEUE
          ============================================================ */}
      {whatsappModalOrder && (
        <div className="customizer-backdrop">
          <div className="receipt-modal-card" style={{ maxWidth: '400px' }}>
            <div className="customizer-header" style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  📲 Send WhatsApp Receipt
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Order #{whatsappModalOrder.id} • {whatsappModalOrder.customer_name}
                </span>
              </div>
              <button 
                onClick={() => setWhatsappModalOrder(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Enter Customer WhatsApp Phone Number:
              </label>
              <input 
                type="text" 
                placeholder="e.g. 03001234567 or 923001234567"
                value={whatsappModalPhone}
                onChange={(e) => setWhatsappModalPhone(e.target.value)}
                className="form-input"
                autoFocus
                style={{ fontSize: '0.9rem', padding: '0.55rem 0.75rem' }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Enter phone number to generate and send WhatsApp bill.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
              <button 
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                onClick={() => setWhatsappModalOrder(null)}
              >
                Cancel
              </button>
              <button 
                className="whatsapp-receipt-btn"
                style={{ flex: 1.5 }}
                onClick={() => {
                  if (!whatsappModalPhone.trim()) {
                    alert('Please enter a WhatsApp phone number.');
                    return;
                  }
                  const msg = generateCafeWhatsAppReceipt(whatsappModalOrder);
                  openWhatsApp(whatsappModalPhone.trim(), msg);
                  setWhatsappModalOrder(null);
                }}
              >
                📲 Send Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ADD / EDIT PRODUCT MODAL
          ============================================================ */}
      {showProductModal && (
        <div className="customizer-backdrop">
          <div className="customizer-card">
            <div className="customizer-header">
              <h3>{editingProduct ? 'Edit Cafe Product' : 'Add New Cafe Product'}</h3>
              <button 
                onClick={() => setShowProductModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="customizer-body">
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Product Name</label>
                <input 
                  type="text" 
                  required
                  value={prodForm.name} 
                  onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select 
                    value={prodForm.category}
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                  >
                    <option value="SHAKES">Shakes & Smoothies</option>
                    <option value="PRE_WORKOUT">Pre-Workout</option>
                    <option value="SNACKS">Protein Snacks</option>
                    <option value="MEALS">Diet Meals</option>
                    <option value="SUPPLEMENTS">Supplements</option>
                    <option value="HYDRATION">Hydration</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Selling Price (PKR)</label>
                  <input 
                    type="number" 
                    required
                    value={prodForm.price} 
                    onChange={e => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                    style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cost Price (PKR)</label>
                  <input 
                    type="number" 
                    value={prodForm.cost_price} 
                    onChange={e => setProdForm({ ...prodForm, cost_price: Number(e.target.value) })}
                    style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Current Stock</label>
                  <input 
                    type="number" 
                    required
                    value={prodForm.stock} 
                    onChange={e => setProdForm({ ...prodForm, stock: Number(e.target.value) })}
                    style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Protein (grams)</label>
                  <input 
                    type="number" 
                    value={prodForm.protein_g} 
                    onChange={e => setProdForm({ ...prodForm, protein_g: Number(e.target.value) })}
                    style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Calories (kcal)</label>
                  <input 
                    type="number" 
                    value={prodForm.calories} 
                    onChange={e => setProdForm({ ...prodForm, calories: Number(e.target.value) })}
                    style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                <input 
                  type="checkbox"
                  id="customizable-check"
                  checked={prodForm.customizable}
                  onChange={e => setProdForm({ ...prodForm, customizable: e.target.checked })}
                />
                <label htmlFor="customizable-check" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Customizable Shake (allow milk & add-ons selection)
                </label>
              </div>

              <div className="customizer-footer" style={{ padding: '0.5rem 0 0 0' }}>
                <button 
                  type="button"
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => setShowProductModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="checkout-btn" style={{ margin: 0, padding: '0.5rem 1.25rem' }}>
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          PRE-ORDER APPROVAL & PAYMENT MODAL
          ============================================================ */}
      {approvingOrder && (
        <div className="modal-backdrop" onClick={() => setApprovingOrder(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Approve Pre-Order #{approvingOrder.id}</h3>
              <button className="modal-close-btn" onClick={() => setApprovingOrder(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '10px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  👤 {approvingOrder.customer_name} {approvingOrder.person_id ? `(${approvingOrder.person_id})` : ''}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {approvingOrder.items?.map((it, idx) => (
                    <div key={idx}>• {it.qty}x {it.name} (Rs. {it.item_total})</div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Total Amount Due:</span>
                  <span style={{ color: 'var(--success)', fontSize: '1.1rem' }}>Rs. {approvingOrder.total_amount}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Select Received Payment Method:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    style={{
                      background: approvalPaymentMethod === 'CASH' ? 'rgba(16, 185, 129, 0.25)' : 'var(--bg-tertiary)',
                      border: approvalPaymentMethod === 'CASH' ? '2px solid #10b981' : '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.82rem'
                    }}
                    onClick={() => setApprovalPaymentMethod('CASH')}
                  >
                    💵 Cash Paid
                  </button>

                  <button
                    type="button"
                    style={{
                      background: approvalPaymentMethod === 'CARD' ? 'rgba(59, 130, 246, 0.25)' : 'var(--bg-tertiary)',
                      border: approvalPaymentMethod === 'CARD' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.82rem'
                    }}
                    onClick={() => setApprovalPaymentMethod('CARD')}
                  >
                    💳 Card POS
                  </button>

                  <button
                    type="button"
                    style={{
                      background: approvalPaymentMethod === 'MEMBER_TAB' ? 'rgba(192, 132, 252, 0.25)' : 'var(--bg-tertiary)',
                      border: approvalPaymentMethod === 'MEMBER_TAB' ? '2px solid #c084fc' : '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.82rem'
                    }}
                    onClick={() => setApprovalPaymentMethod('MEMBER_TAB')}
                  >
                    👤 Member Tab (Khata)
                  </button>

                  <button
                    type="button"
                    style={{
                      background: approvalPaymentMethod === 'ONLINE_QR' ? 'rgba(245, 158, 11, 0.25)' : 'var(--bg-tertiary)',
                      border: approvalPaymentMethod === 'ONLINE_QR' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.82rem'
                    }}
                    onClick={() => setApprovalPaymentMethod('ONLINE_QR')}
                  >
                    📱 QR / Online
                  </button>
                </div>
              </div>

              <button
                className="checkout-btn"
                style={{ width: '100%', margin: 0, padding: '0.85rem', fontWeight: 800, fontSize: '0.95rem' }}
                onClick={handleApprovePreOrder}
              >
                ✓ Confirm Payment & Send to Kitchen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cafe;
