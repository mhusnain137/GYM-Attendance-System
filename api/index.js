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
  if (url.includes('/api/status')) {
    return res.status(200).json({
      status: 'online',
      service: 'Titan Gym Cloud API',
      mode: 'cloud_serverless',
      timestamp: new Date().toISOString()
    });
  }

  // 2. Authentication / Login
  if (url.includes('/api/auth/login') && method === 'POST') {
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

  // 3. People / Members List
  if (url.includes('/api/people')) {
    return res.status(200).json([
      { id: 'P-000001', name: 'Muhammad Husnain', phone: '03001234567', status: 'active', registered_at: '2026-09-01' },
      { id: 'P-000002', name: 'Ali Khan', phone: '03007654321', status: 'active', registered_at: '2026-09-01' },
      { id: 'P-000003', name: 'Hamza Ahmed', phone: '03112233445', status: 'active', registered_at: '2026-09-01' }
    ]);
  }

  // 4. Cafe Menu & POS
  if (url.includes('/api/cafe/menu') || url.includes('/api/cafe/products')) {
    return res.status(200).json([
      { id: 'c-1', name: 'Whey Protein Shake (Vanilla)', category: 'Protein Shakes', price: 450, stock: 50 },
      { id: 'c-2', name: 'Pre-Workout Energy Booster', category: 'Pre-Workout Drinks', price: 350, stock: 40 },
      { id: 'c-3', name: 'BCAA Amino Burst', category: 'Energy & Hydration', price: 300, stock: 35 },
      { id: 'c-4', name: 'Creatine Monohydrate Scoop', category: 'Supplements', price: 150, stock: 80 }
    ]);
  }

  // 5. Workout Templates
  if (url.includes('/api/workout/templates')) {
    return res.status(200).json([
      { id: 'tpl-1', name: 'Push Day (Chest, Shoulders & Triceps)', icon: '⚡', target_muscle: 'Chest, Shoulders, Triceps', exercises: [] },
      { id: 'tpl-2', name: 'Pull Day (Back & Biceps)', icon: '🚀', target_muscle: 'Back & Biceps', exercises: [] },
      { id: 'tpl-3', name: 'Legs & Core Power', icon: '🔥', target_muscle: 'Quads, Hamstrings & Abs', exercises: [] }
    ]);
  }

  // 6. Attendance Today
  if (url.includes('/api/attendance/today')) {
    return res.status(200).json([]);
  }

  // Default response
  return res.status(200).json({ status: 'online', path: url });
}
