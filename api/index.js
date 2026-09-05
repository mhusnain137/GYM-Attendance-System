export default function handler(req, res) {
  // Global CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-User-Role, X-User-Id'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = req.url || '';
  const method = req.method;

  const DEFAULT_USERS = [
    {
      user_id: 'USR-001',
      username: 'admin',
      password: 'admin123',
      name: 'Gym Owner (Super Admin)',
      role: 'ADMIN',
      is_active: true
    },
    {
      user_id: 'USR-002',
      username: 'manager',
      password: 'manager123',
      name: 'Ali Supervisor (Manager)',
      role: 'MANAGER',
      is_active: true
    },
    {
      user_id: 'USR-003',
      username: 'reception',
      password: 'reception123',
      name: 'Sara Counter (Receptionist)',
      role: 'RECEPTIONIST',
      is_active: true
    }
  ];

  // 1. Health Status
  if (url.includes('/status') && !url.includes('/camera/status')) {
    return res.status(200).json({
      status: 'online',
      camera: false,
      fps: 0,
      faces_detected: 0,
      active_tracks: 0,
      registered_people: 3,
      service: 'Titan Gym Cloud API',
      mode: 'cloud_serverless',
      timestamp: new Date().toISOString()
    });
  }

  // 2. Camera Status & Controls
  if (url.includes('/camera/status')) {
    return res.status(200).json({
      source: 'webcam',
      name: 'Webcam',
      status: 'ready',
      rtsp_url: ''
    });
  }

  if (url.includes('/camera/source') || url.includes('/camera/start') || url.includes('/camera/stop')) {
    return res.status(200).json({
      success: true,
      message: 'Camera setting updated'
    });
  }

  // 3. State Endpoint (Real-time polling)
  if (url.includes('/state')) {
    return res.status(200).json({
      camera: false,
      fps: 0,
      faces_detected: 0,
      active_tracks: 0,
      registered_people: 3,
      people: [],
      active_alerts: [],
      door_status: {
        open: false,
        status: 'SECURED',
        badge: '🔒 DOOR SECURED',
        message: 'Smart Access Control Ready'
      }
    });
  }

  // 4. Analytics Dashboard
  if (url.includes('/analytics/dashboard') || url.includes('/analytics')) {
    return res.status(200).json({
      monthly_revenue: [
        { month: 'Apr', revenue: 120000 },
        { month: 'May', revenue: 145000 },
        { month: 'Jun', revenue: 160000 },
        { month: 'Jul', revenue: 185000 },
        { month: 'Aug', revenue: 210000 },
        { month: 'Sep', revenue: 235000 }
      ],
      hourly_rush: [
        { hour: '06:00', count: 12 },
        { hour: '08:00', count: 28 },
        { hour: '10:00', count: 15 },
        { hour: '12:00', count: 10 },
        { hour: '14:00', count: 8 },
        { hour: '16:00', count: 22 },
        { hour: '18:00', count: 45 },
        { hour: '20:00', count: 52 },
        { hour: '22:00', count: 18 }
      ],
      kpis: {
        this_month_revenue: 235000,
        growth_percentage: 12,
        peak_rush_window: '6:00 PM - 9:00 PM',
        total_lifetime_revenue: 1055000
      }
    });
  }

  // 5. Authentication / Login
  if (url.includes('/auth/login') || url.includes('/login')) {
    if (method === 'POST') {
      const { username, password } = req.body || {};
      const cleanUser = (username || '').trim().toLowerCase();

      // Check Staff
      const found = DEFAULT_USERS.find(u => u.username.toLowerCase() === cleanUser);
      if (found) {
        if (found.password === (password || '').trim()) {
          return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token: `token-${found.user_id}-cloud`,
            user: found
          });
        } else {
          return res.status(401).json({ detail: 'Invalid username or password' });
        }
      }

      // Check Member login fallback
      return res.status(200).json({
        status: 'success',
        message: 'Member Login successful',
        token: `token-MEM-${cleanUser}`,
        user: {
          user_id: cleanUser.toUpperCase(),
          username: cleanUser,
          name: `Member ${cleanUser.toUpperCase()}`,
          role: 'MEMBER'
        }
      });
    }
  }

  // 6. People / Members List
  if (url.includes('/people')) {
    return res.status(200).json([
      { id: 'P-000001', name: 'Muhammad Husnain', phone: '03001234567', status: 'active', registered_at: '2026-09-01' },
      { id: 'P-000002', name: 'Ali Khan', phone: '03007654321', status: 'active', registered_at: '2026-09-01' },
      { id: 'P-000003', name: 'Hamza Ahmed', phone: '03112233445', status: 'active', registered_at: '2026-09-01' }
    ]);
  }

  // 7. Attendance Today & Visits
  if (url.includes('/attendance/today')) {
    return res.status(200).json([
      { person_id: 'P-000001', name: 'Muhammad Husnain', first_detected: '09:15 AM', confidence: 0.94 },
      { person_id: 'P-000002', name: 'Ali Khan', first_detected: '10:30 AM', confidence: 0.91 }
    ]);
  }

  if (url.includes('/visits/today') || url.includes('/visits')) {
    return res.status(200).json([
      { person_id: 'P-000001', name: 'Muhammad Husnain', timestamp: '09:15 AM' },
      { person_id: 'P-000002', name: 'Ali Khan', timestamp: '10:30 AM' }
    ]);
  }

  // 8. Memberships
  if (url.includes('/memberships')) {
    return res.status(200).json([
      { person_id: 'P-000001', plan: 'Gold Plan', status: 'Active', days_left: 28 },
      { person_id: 'P-000002', plan: 'Silver Plan', status: 'Active', days_left: 15 },
      { person_id: 'P-000003', plan: 'Trial', status: 'Active', days_left: 2 }
    ]);
  }

  // 9. Staff Users
  if (url.includes('/staff') || url.includes('/users')) {
    return res.status(200).json(DEFAULT_USERS);
  }

  // 10. Activity Logs
  if (url.includes('/activity')) {
    return res.status(200).json([
      { id: 1, action: 'User Login', user: 'admin', timestamp: new Date().toISOString(), details: 'Admin logged in' },
      { id: 2, action: 'Face Verified', user: 'Muhammad Husnain', timestamp: new Date().toISOString(), details: 'Door Unlocked' }
    ]);
  }

  // 11. Cafe Menu & POS
  if (url.includes('/cafe/menu') || url.includes('/cafe/products')) {
    return res.status(200).json([
      { id: 'c-1', name: 'Whey Protein Shake (Vanilla)', category: 'Protein Shakes', price: 450, stock: 50 },
      { id: 'c-2', name: 'Pre-Workout Energy Booster', category: 'Pre-Workout Drinks', price: 350, stock: 40 },
      { id: 'c-3', name: 'BCAA Amino Burst', category: 'Energy & Hydration', price: 300, stock: 35 },
      { id: 'c-4', name: 'Creatine Monohydrate Scoop', category: 'Supplements', price: 150, stock: 80 }
    ]);
  }

  // 12. Workout Templates
  if (url.includes('/workout/templates')) {
    return res.status(200).json([
      { id: 'tpl-1', name: 'Push Day (Chest, Shoulders & Triceps)', icon: '⚡', target_muscle: 'Chest, Shoulders, Triceps', exercises: [] },
      { id: 'tpl-2', name: 'Pull Day (Back & Biceps)', icon: '🚀', target_muscle: 'Back & Biceps', exercises: [] },
      { id: 'tpl-3', name: 'Legs & Core Power', icon: '🔥', target_muscle: 'Quads, Hamstrings & Abs', exercises: [] }
    ]);
  }

  // Default fallback response
  return res.status(200).json({ status: 'online', path: url });
}
