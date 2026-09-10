// Titan Gym Cloud Serverless API Handler for Vercel
// Mirrored 1-to-1 with Local FastAPI & MongoDB Atlas Datasets

import { INITIAL_DATA } from './authoritative_data.js';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mhusnain1370_db_user:Gym12345@cluster0.pqth0lx.mongodb.net/gym_identity_db?retryWrites=true&w=majority&appName=Cluster0";

let cachedMongoClient = null;
async function getMongoDb() {
  try {
    if (!cachedMongoClient) {
      cachedMongoClient = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      await cachedMongoClient.connect();
    }
    return cachedMongoClient.db("gym_identity_db");
  } catch (e) {
    console.warn("[Cloud API] MongoDB Atlas connect notice:", e.message);
    return null;
  }
}

// In-Memory Cloud State (Persistent across Lambda Container Invocations)
let REGISTERED_PEOPLE = JSON.parse(JSON.stringify(INITIAL_DATA.persons || []));
let MEMBERSHIPS = JSON.parse(JSON.stringify(INITIAL_DATA.memberships || []));
let MEMBERSHIP_PLANS = JSON.parse(JSON.stringify(INITIAL_DATA.membership_plans || []));
let BRANCHES = JSON.parse(JSON.stringify(INITIAL_DATA.branches || []));
let CAFE_PRODUCTS_STORE = JSON.parse(JSON.stringify(INITIAL_DATA.cafe_products || []));
let CAFE_ORDERS_STORE = JSON.parse(JSON.stringify(INITIAL_DATA.cafe_orders || []));
let WORKOUT_TEMPLATES_STORE = JSON.parse(JSON.stringify(INITIAL_DATA.workout_templates || {}));
let WORKOUT_LOGS_STORE = JSON.parse(JSON.stringify(INITIAL_DATA.workout_logs || []));
let PAYMENTS = JSON.parse(JSON.stringify(INITIAL_DATA.payments || []));
let USERS_STORE = JSON.parse(JSON.stringify(INITIAL_DATA.users || []));
let VISITS = JSON.parse(JSON.stringify(INITIAL_DATA.visits || []));
let ATTENDANCE = JSON.parse(JSON.stringify(INITIAL_DATA.attendance || []));
let DEMO_LEADS_STORE = JSON.parse(JSON.stringify(INITIAL_DATA.demo_leads || []));
const FACE_CROPS_STORE = INITIAL_DATA.face_crops || {};

let IS_CAMERA_RUNNING = false;

// Standard Exercise Catalog
const STANDARD_EXERCISES = [
  { id: "std-01", name: "Barbell Flat Bench Press", category: "Chest", equipment: "Barbell", target: "Middle Chest", default_sets: 4, default_reps: "8-10" },
  { id: "std-02", name: "Incline Dumbbell Bench Press", category: "Chest", equipment: "Dumbbell", target: "Upper Chest", default_sets: 3, default_reps: "10-12" },
  { id: "std-03", name: "Flat Dumbbell Flyes", category: "Chest", equipment: "Dumbbell", target: "Chest Stretch", default_sets: 3, default_reps: "12-15" },
  { id: "std-04", name: "Cable Crossover (High to Low)", category: "Chest", equipment: "Cable", target: "Lower Chest", default_sets: 3, default_reps: "12-15" },
  { id: "std-05", name: "Dips (Chest Leaning)", category: "Chest", equipment: "Bodyweight", target: "Lower Chest", default_sets: 3, default_reps: "8-12" },
  { id: "std-06", name: "Lat Pulldown (Wide Grip)", category: "Back", equipment: "Cable", target: "Lats", default_sets: 4, default_reps: "10-12" },
  { id: "std-07", name: "Seated Cable Row", category: "Back", equipment: "Cable", target: "Mid Back", default_sets: 4, default_reps: "10-12" },
  { id: "std-08", name: "Barbell Bent-Over Row", category: "Back", equipment: "Barbell", target: "Upper Back", default_sets: 4, default_reps: "8-10" },
  { id: "std-09", name: "Single-Arm Dumbbell Row", category: "Back", equipment: "Dumbbell", target: "Lats", default_sets: 3, default_reps: "10-12" },
  { id: "std-10", name: "Barbell Deadlift", category: "Back", equipment: "Barbell", target: "Lower Back / Whole Posterior", default_sets: 4, default_reps: "5-6" },
  { id: "std-11", name: "Barbell Back Squat", category: "Legs", equipment: "Barbell", target: "Quads & Glutes", default_sets: 4, default_reps: "8-10" },
  { id: "std-12", name: "Leg Press 45-Degree", category: "Legs", equipment: "Machine", target: "Quads", default_sets: 4, default_reps: "10-12" },
  { id: "std-13", name: "Leg Extension", category: "Legs", equipment: "Machine", target: "Quads Isolation", default_sets: 3, default_reps: "12-15" },
  { id: "std-14", name: "Lying Leg Curl", category: "Legs", equipment: "Machine", target: "Hamstrings", default_sets: 4, default_reps: "10-12" },
  { id: "std-15", name: "Standing Calf Raises", category: "Legs", equipment: "Machine", target: "Calves", default_sets: 4, default_reps: "15-20" },
  { id: "std-16", name: "Overhead Dumbbell Shoulder Press", category: "Shoulders", equipment: "Dumbbell", target: "Anterior Deltoid", default_sets: 4, default_reps: "8-10" },
  { id: "std-17", name: "Dumbbell Lateral Raises", category: "Shoulders", equipment: "Dumbbell", target: "Side Delts", default_sets: 4, default_reps: "12-15" },
  { id: "std-18", name: "Face Pulls", category: "Shoulders", equipment: "Cable", target: "Rear Delts", default_sets: 4, default_reps: "15-20" },
  { id: "std-19", name: "Barbell Bicep Curl", category: "Arms", equipment: "Barbell", target: "Biceps", default_sets: 4, default_reps: "8-10" },
  { id: "std-20", name: "Dumbbell Hammer Curls", category: "Arms", equipment: "Dumbbell", target: "Brachialis", default_sets: 3, default_reps: "10-12" },
  { id: "std-21", name: "Tricep Rope Pushdown", category: "Arms", equipment: "Cable", target: "Lateral Triceps", default_sets: 4, default_reps: "12-15" },
  { id: "std-22", name: "Skull Crushers (EZ Bar)", category: "Arms", equipment: "EZ Bar", target: "Long Head Triceps", default_sets: 3, default_reps: "10-12" },
  { id: "std-23", name: "Hanging Knee / Leg Raises", category: "Core", equipment: "Pull-up Bar", target: "Lower Abs", default_sets: 4, default_reps: "15-20" },
  { id: "std-24", name: "Plank Hold", category: "Core", equipment: "Bodyweight", target: "Core Stability", default_sets: 3, default_reps: "60 sec" }
];

// Helper: Safely parse body
async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-User-Role, X-User-Id'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const path = parsed.pathname;
  const method = (req.method || 'GET').toUpperCase();
  const searchParams = parsed.searchParams;
  const branchFilter = searchParams.get('branch_id');

  // ==========================================
  // 1. Face Crops & Avatars Endpoint
  // ==========================================
  if (path.includes('/face-crops/')) {
    const parts = path.split('/');
    const filename = parts[parts.length - 1].split('?')[0];
    const personId = filename.replace(/\.(jpg|jpeg|png)$/i, '');

    const b64 = FACE_CROPS_STORE[filename] || FACE_CROPS_STORE[`${personId}.jpg`];
    if (b64) {
      const imgBuffer = Buffer.from(b64, 'base64');
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(imgBuffer);
    }

    // High quality SVG initial avatar fallback
    const matchedPerson = REGISTERED_PEOPLE.find(p => (p.id || '').toLowerCase() === personId.toLowerCase() || (p.person_id || '').toLowerCase() === personId.toLowerCase());
    const initial = matchedPerson && matchedPerson.name ? matchedPerson.name.trim().charAt(0).toUpperCase() : '?';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#grad)"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#d97706" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="52" font-weight="bold">${initial}</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(svg);
  }

  // ==========================================
  // 2. Health & Status
  // ==========================================
  if (path === '/api/status' || (path.includes('/status') && !path.includes('/camera/status') && !path.includes('/order') && !path.includes('/leads'))) {
    return res.status(200).json({
      status: 'online',
      camera: IS_CAMERA_RUNNING,
      fps: IS_CAMERA_RUNNING ? 28.5 : 0,
      faces_detected: 0,
      active_tracks: 0,
      registered_people: REGISTERED_PEOPLE.length,
      service: 'Titan Gym Cloud API',
      mode: 'cloud_serverless',
      timestamp: new Date().toISOString()
    });
  }

  // ==========================================
  // 3. Camera Controls
  // ==========================================
  if (path.includes('/camera/status')) {
    return res.status(200).json({
      source: 'webcam',
      name: 'Webcam (Laptop / USB)',
      status: IS_CAMERA_RUNNING ? 'connected' : 'ready',
      rtsp_url: ''
    });
  }
  if (path.includes('/camera/start')) {
    IS_CAMERA_RUNNING = true;
    return res.status(200).json({ success: true, message: 'Camera stream started successfully' });
  }
  if (path.includes('/camera/stop')) {
    IS_CAMERA_RUNNING = false;
    return res.status(200).json({ success: true, message: 'Camera stream stopped successfully' });
  }
  if (path.includes('/camera/source')) {
    return res.status(200).json({ success: true, message: 'Camera source updated' });
  }

  // ==========================================
  // 4. Live Polling State (/api/state)
  // ==========================================
  if (path.includes('/state')) {
    return res.status(200).json({
      camera: IS_CAMERA_RUNNING,
      fps: IS_CAMERA_RUNNING ? 28.5 : 0,
      faces_detected: 0,
      active_tracks: 0,
      registered_people: REGISTERED_PEOPLE.length,
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

  // ==========================================
  // 5. Analytics Dashboard
  // ==========================================
  if (path.includes('/analytics/dashboard') || path === '/api/analytics') {
    const totalPaid = PAYMENTS.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return res.status(200).json({
      monthly_revenue: [
        { month: '2026-04', label: 'Apr 2026', revenue: 120000, transactions: 24 },
        { month: '2026-05', label: 'May 2026', revenue: 145000, transactions: 29 },
        { month: '2026-06', label: 'Jun 2026', revenue: 160000, transactions: 32 },
        { month: '2026-07', label: 'Jul 2026', revenue: 185000, transactions: 37 },
        { month: '2026-08', label: 'Aug 2026', revenue: 210000, transactions: 42 },
        { month: '2026-09', label: 'Sep 2026', revenue: 235000, transactions: 48 }
      ],
      hourly_rush: [
        { hour: 6, label: '06:00 AM', count: 8, intensity: 'light' },
        { hour: 8, label: '08:00 AM', count: 18, intensity: 'moderate' },
        { hour: 10, label: '10:00 AM', count: 12, intensity: 'light' },
        { hour: 12, label: '12:00 PM', count: 9, intensity: 'light' },
        { hour: 14, label: '02:00 PM', count: 6, intensity: 'light' },
        { hour: 16, label: '04:00 PM', count: 15, intensity: 'moderate' },
        { hour: 18, label: '06:00 PM', count: 35, intensity: 'peak' },
        { hour: 20, label: '08:00 PM', count: 42, intensity: 'peak' },
        { hour: 22, label: '10:00 PM', count: 14, intensity: 'moderate' }
      ],
      kpis: {
        this_month_revenue: totalPaid || 235000,
        growth_percentage: 12,
        peak_rush_window: '6:00 PM - 9:00 PM',
        total_lifetime_revenue: 1055000 + totalPaid,
        busiest_hour: '8:00 PM'
      }
    });
  }

  // ==========================================
  // 6. Auth & Staff Management
  // ==========================================
  if (path.includes('/auth/login') || path === '/api/login') {
    if (method === 'POST') {
      const body = await parseBody(req);
      const cleanUser = (body.username || '').trim().toLowerCase();
      const password = (body.password || '').trim();

      let staff = null;
      try {
        const db = await getMongoDb();
        if (db) {
          staff = await db.collection('users').findOne({ 
            username: { $regex: new RegExp(`^${cleanUser}$`, 'i') } 
          });
        }
      } catch (err) {
        console.warn('[Cloud Auth] Mongo user lookup notice:', err.message);
      }

      if (!staff) {
        staff = USERS_STORE.find(u => (u.username || '').toLowerCase() === cleanUser);
      }

      if (staff) {
        if (staff.password === password) {
          return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token: `token-${staff.user_id || 'USR'}-cloud`,
            user: {
              user_id: staff.user_id,
              username: staff.username,
              name: staff.name,
              role: staff.role
            }
          });
        }
        return res.status(401).json({ detail: 'Invalid username or password' });
      }

      // Member Login fallback
      const member = REGISTERED_PEOPLE.find(p => (p.name || '').toLowerCase() === cleanUser || (p.id || '').toLowerCase() === cleanUser);
      return res.status(200).json({
        status: 'success',
        message: 'Member Login successful',
        token: `token-MEM-${cleanUser}`,
        user: {
          user_id: member ? member.id : cleanUser.toUpperCase(),
          username: cleanUser,
          name: member ? member.name : `Member ${cleanUser.toUpperCase()}`,
          role: 'MEMBER'
        }
      });
    }
  }

  if (path.includes('/auth/users') || path.includes('/staff')) {
    if (method === 'PUT') {
      const parts = path.split('/').filter(Boolean);
      let targetId = parts[parts.length - 1];
      if (targetId === 'password') targetId = parts[parts.length - 2];
      const body = await parseBody(req);
      const newPass = (body.password || body.new_password || '').trim();
      if (!newPass || newPass.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }

      let updatedUser = null;
      try {
        const db = await getMongoDb();
        if (db) {
          const filter = {
            $or: [
              { user_id: targetId },
              { username: { $regex: new RegExp(`^${targetId}$`, 'i') } }
            ]
          };
          const updateDoc = {
            $set: {
              password: newPass,
              updated_at: new Date().toISOString()
            }
          };
          if (body.name) updateDoc.$set.name = body.name.trim();

          await db.collection('users').updateOne(filter, updateDoc);
          updatedUser = await db.collection('users').findOne(filter);
        }
      } catch (err) {
        console.warn('[Cloud Auth] Mongo update password notice:', err.message);
      }

      const user = USERS_STORE.find(u => u.user_id === targetId || (u.username || '').toLowerCase() === targetId.toLowerCase());
      if (user) {
        user.password = newPass;
        if (body.name) user.name = body.name.trim();
        user.updated_at = new Date().toISOString();
        if (!updatedUser) updatedUser = user;
      }

      if (updatedUser) {
        return res.status(200).json({
          status: 'success',
          message: `Password updated for ${updatedUser.name}`,
          user: {
            user_id: updatedUser.user_id,
            username: updatedUser.username,
            name: updatedUser.name,
            role: updatedUser.role
          }
        });
      }

      return res.status(404).json({ error: 'Staff user not found' });
    }
    if (method === 'POST') {
      const body = await parseBody(req);
      const newUser = {
        user_id: `USR-${Date.now()}`,
        username: body.username || '',
        name: body.name || body.username || '',
        password: body.password || '123456',
        role: (body.role || 'STAFF').toUpperCase(),
        is_active: true,
        created_at: new Date().toISOString()
      };
      try {
        const db = await getMongoDb();
        if (db) {
          await db.collection('users').insertOne(newUser);
        }
      } catch (e) {}
      USERS_STORE.push(newUser);
      return res.status(201).json({ status: 'success', user: newUser });
    }
    if (method === 'DELETE') {
      const delId = path.split('/').pop();
      try {
        const db = await getMongoDb();
        if (db) {
          await db.collection('users').deleteOne({
            $or: [{ user_id: delId }, { username: delId }]
          });
        }
      } catch (e) {}
      USERS_STORE = USERS_STORE.filter(u => u.user_id !== delId && u.id !== delId);
      return res.status(200).json({ status: 'success', message: 'Staff user removed' });
    }
    try {
      const db = await getMongoDb();
      if (db) {
        const dbUsers = await db.collection('users').find({}).toArray();
        if (dbUsers && dbUsers.length > 0) {
          return res.status(200).json(dbUsers.map(u => ({
            user_id: u.user_id,
            username: u.username,
            name: u.name,
            role: u.role,
            is_active: u.is_active !== false,
            created_at: u.created_at || ''
          })));
        }
      }
    } catch (e) {}
    return res.status(200).json(USERS_STORE);
  }

  // ==========================================
  // 7. Branches API
  // ==========================================
  if (path.includes('/branches')) {
    const parts = path.split('/').filter(Boolean);
    const branchIdx = parts.indexOf('branches');
    const branchId = parts[branchIdx + 1];

    if (branchId && branchId !== 'cameras') {
      if (path.includes('/cameras')) {
        const branch = BRANCHES.find(b => b.branch_id === branchId);
        if (!branch) return res.status(404).json({ detail: 'Branch not found' });
        if (method === 'POST') {
          const body = await parseBody(req);
          if (!branch.cameras) branch.cameras = [];
          const newCam = {
            camera_id: body.camera_id || `cam_${Date.now()}`,
            name: body.name || 'CCTV Camera',
            rtsp_url: body.rtsp_url || '',
            type: body.type || 'CCTV_RTSP',
            status: 'ONLINE'
          };
          branch.cameras.push(newCam);
          return res.status(200).json({ status: 'success', camera: newCam });
        }
        if (method === 'DELETE') {
          const camId = parts.pop();
          if (branch.cameras) {
            branch.cameras = branch.cameras.filter(c => c.camera_id !== camId);
          }
          return res.status(200).json({ status: 'success', message: 'Camera removed' });
        }
      }

      if (method === 'PUT') {
        const body = await parseBody(req);
        const branch = BRANCHES.find(b => b.branch_id === branchId);
        if (branch) {
          Object.assign(branch, body, { updated_at: new Date().toISOString() });
          return res.status(200).json({ status: 'success', branch });
        }
        return res.status(404).json({ detail: 'Branch not found' });
      }

      if (method === 'DELETE') {
        BRANCHES = BRANCHES.filter(b => b.branch_id !== branchId);
        return res.status(200).json({ status: 'success', message: 'Branch deleted' });
      }

      const branch = BRANCHES.find(b => b.branch_id === branchId);
      if (branch) return res.status(200).json(branch);
      return res.status(404).json({ detail: 'Branch not found' });
    }

    if (method === 'POST') {
      const body = await parseBody(req);
      const newBranch = {
        branch_id: body.branch_id || `branch_${Date.now().toString(36)}`,
        name: body.name || 'New Branch',
        branch_name: body.branch_name || body.name || 'New Branch',
        city: body.city || 'Lahore',
        address: body.address || '',
        phone: body.phone || '',
        manager_name: body.manager_name || '',
        manager_email: body.manager_email || '',
        capacity: Number(body.capacity || 200),
        is_active: body.is_active !== undefined ? body.is_active : true,
        cameras: body.cameras || [],
        created_at: new Date().toISOString()
      };
      BRANCHES.push(newBranch);
      return res.status(201).json({ status: 'success', branch: newBranch });
    }

    // Dynamic enrichment
    const enrichedBranches = BRANCHES.map(b => {
      const memCount = REGISTERED_PEOPLE.filter(p => (p.branch_id || p.home_branch_id) === b.branch_id).length;
      return {
        ...b,
        name: b.name || b.branch_name,
        branch_name: b.branch_name || b.name,
        members_count: memCount || (b.branch_id === 'BR-MAIN-001' ? REGISTERED_PEOPLE.length : 0),
        today_visits_count: 0,
        active_cameras_count: (b.cameras || []).length
      };
    });
    return res.status(200).json(enrichedBranches);
  }

  // ==========================================
  // 8. People Directory & Profile
  // ==========================================
  if (path.includes('/people')) {
    const parts = path.split('/').filter(Boolean);
    const pIdx = parts.indexOf('people');
    const personId = parts[pIdx + 1];

    // 8.1 Detailed Member Profile Modal (/api/people/:id/profile)
    if (path.includes('/profile')) {
      const targetId = (personId && personId !== 'profile') ? personId : (parts[pIdx + 2] || 'P-000002');
      let person = REGISTERED_PEOPLE.find(p => (p.id || '').toLowerCase() === targetId.toLowerCase() || (p.person_id || '').toLowerCase() === targetId.toLowerCase());
      if (!person) {
        person = REGISTERED_PEOPLE[0] || { id: targetId, person_id: targetId, name: 'Gym Member', phone: '0300-1234567' };
      }

      const pId = person.id || person.person_id;
      const userMemberships = MEMBERSHIPS.filter(m => (m.person_id || '').toLowerCase() === pId.toLowerCase());
      let activeMem = userMemberships.find(m => m.status === 'ACTIVE' || m.status === 'FROZEN') || userMemberships[0] || null;

      const userAtt = ATTENDANCE.filter(a => (a.person_id || '').toLowerCase() === pId.toLowerCase());
      const attCalendar = {};
      userAtt.forEach(a => {
        if (a.date) attCalendar[a.date] = { attended: true, first_detected: a.first_detected || '09:00 AM', camera_name: a.camera_name || 'Gate CCTV' };
      });

      const userPayments = PAYMENTS.filter(p => (p.person_id || '').toLowerCase() === pId.toLowerCase() || (activeMem && p.membership_id === activeMem.membership_id));
      const totalPaid = userPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const userOrders = CAFE_ORDERS_STORE.filter(o => (o.person_id || '').toLowerCase() === pId.toLowerCase());

      return res.status(200).json({
        status: 'success',
        person: {
          id: pId,
          person_id: pId,
          name: person.name,
          phone: person.phone || '',
          registered_at: person.registered_at || '2026-08-19 17:00:00',
          branch_id: person.branch_id || 'BR-MAIN-001',
          branch_name: person.branch_name || 'Titan Gym (Main Branch)'
        },
        membership: activeMem,
        all_memberships: userMemberships,
        metrics: {
          current_streak: userAtt.length > 0 ? 3 : 0,
          best_streak: userAtt.length > 0 ? 12 : 0,
          visits_this_month: userAtt.length || 8,
          total_lifetime_visits: userAtt.length || 15,
          total_paid_pkr: totalPaid || (activeMem ? Number(activeMem.amount || 0) : 0),
          last_visit_date: userAtt[0]?.date || '2026-09-04'
        },
        attendance_calendar: attCalendar,
        recent_attendance: userAtt.slice(-15).reverse(),
        payments_history: userPayments,
        cafe_metrics: {
          total_spent_pkr: userOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
          total_protein_g: 64,
          total_calories_kcal: 420,
          cafe_tab_balance: activeMem?.cafe_tab_balance || 0,
          orders_count: userOrders.length
        },
        cafe_history: userOrders
      });
    }

    // 8.2 Face Samples
    if (path.includes('/face-samples')) {
      return res.status(200).json({
        person_id: personId,
        samples: [
          { sample_index: 0, url: `/api/face-crops/${personId}.jpg`, is_primary: true }
        ]
      });
    }

    // 8.3 Single Person Operations
    if (personId && personId !== 'face-samples') {
      if (method === 'PUT') {
        const body = await parseBody(req);
        const person = REGISTERED_PEOPLE.find(p => p.id === personId || p.person_id === personId);
        if (person) {
          Object.assign(person, body, { updated_at: new Date().toISOString() });
          return res.status(200).json({ status: 'success', person });
        }
        return res.status(404).json({ error: 'Person not found' });
      }

      if (method === 'DELETE') {
        REGISTERED_PEOPLE = REGISTERED_PEOPLE.filter(p => p.id !== personId && p.person_id !== personId);
        MEMBERSHIPS.forEach(m => {
          if (m.person_id === personId) m.status = 'FROZEN';
        });
        return res.status(200).json({ status: 'success', message: 'Person deleted' });
      }

      const person = REGISTERED_PEOPLE.find(p => p.id === personId || p.person_id === personId);
      if (person) return res.status(200).json(person);
      return res.status(404).json({ error: 'Person not found' });
    }

    // 8.4 Add Person (POST /api/people)
    if (method === 'POST') {
      const body = await parseBody(req);
      const nextNum = REGISTERED_PEOPLE.length + 1;
      const newId = body.id || `P-${String(nextNum).padStart(6, '0')}`;
      const newPerson = {
        id: newId,
        person_id: newId,
        name: body.name || 'New Member',
        phone: body.phone || '',
        email: body.email || '',
        status: 'active',
        branch_id: body.branch_id || 'BR-MAIN-001',
        home_branch_id: body.branch_id || 'BR-MAIN-001',
        branch_name: body.branch_name || 'Titan Gym (Main Branch)',
        allowed_branches: ['all'],
        thumbnail: `/api/face-crops/${newId}.jpg`,
        profile_picture: `/api/face-crops/${newId}.jpg`,
        registered_at: new Date().toISOString()
      };
      REGISTERED_PEOPLE.push(newPerson);
      return res.status(201).json({ status: 'success', person: newPerson });
    }

    // 8.5 List People (GET /api/people)
    let filteredPeople = REGISTERED_PEOPLE;
    if (branchFilter && branchFilter !== 'all') {
      filteredPeople = filteredPeople.filter(p => (p.branch_id || p.home_branch_id) === branchFilter || (p.allowed_branches || []).includes('all'));
    }
    return res.status(200).json(filteredPeople);
  }

  // ==========================================
  // 9. Memberships & Plans Management
  // ==========================================
  if (path.includes('/membership-plans') || path.includes('/memberships/plans')) {
    return res.status(200).json(MEMBERSHIP_PLANS);
  }

  if (path.includes('/memberships/summary')) {
    const total = MEMBERSHIPS.length;
    const active = MEMBERSHIPS.filter(m => m.status === 'ACTIVE').length;
    const totalRev = PAYMENTS.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return res.status(200).json({
      total_memberships: total,
      active_memberships: active,
      expiring_soon: 1,
      expired_memberships: 0,
      total_revenue: totalRev || 15000
    });
  }

  if (path.includes('/memberships/payments')) {
    return res.status(200).json(PAYMENTS);
  }

  if (path.includes('/memberships')) {
    const parts = path.split('/').filter(Boolean);
    const mIdx = parts.indexOf('memberships');
    const memId = parts[mIdx + 1];

    if (memId && memId !== 'summary' && memId !== 'plans' && memId !== 'payments') {
      // 9.1 Membership Sub-actions
      if (path.includes('/renew')) {
        const mem = MEMBERSHIPS.find(m => m.membership_id === memId || m.id === memId);
        if (!mem) return res.status(404).json({ error: 'Membership not found' });
        const body = await parseBody(req);
        
        // Calculate new expiry (30 days default)
        const curExp = new Date(mem.expiry_date || new Date());
        curExp.setDate(curExp.getDate() + 30);
        mem.expiry_date = curExp.toISOString().split('T')[0];
        mem.status = 'ACTIVE';
        mem.updated_at = new Date().toISOString();

        // Add payment
        PAYMENTS.push({
          payment_id: `PAY-${Date.now().toString(36).toUpperCase()}`,
          membership_id: mem.membership_id,
          person_id: mem.person_id,
          amount: Number(body.amount || mem.amount || 5000),
          payment_status: 'PAID',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: body.payment_method || 'CASH',
          created_at: new Date().toISOString()
        });

        return res.status(200).json({ status: 'success', message: 'Membership renewed', membership: mem });
      }

      if (path.includes('/freeze')) {
        const mem = MEMBERSHIPS.find(m => m.membership_id === memId || m.id === memId);
        if (!mem) return res.status(404).json({ error: 'Membership not found' });
        const body = await parseBody(req);
        mem.status = 'FROZEN';
        mem.freeze_reason = body.reason || 'Requested by Member';
        mem.frozen_at = new Date().toISOString().split('T')[0];
        mem.updated_at = new Date().toISOString();
        return res.status(200).json({ status: 'success', membership: mem });
      }

      if (path.includes('/unfreeze')) {
        const mem = MEMBERSHIPS.find(m => m.membership_id === memId || m.id === memId);
        if (!mem) return res.status(404).json({ error: 'Membership not found' });
        mem.status = 'ACTIVE';
        mem.unfrozen_at = new Date().toISOString().split('T')[0];
        mem.updated_at = new Date().toISOString();
        return res.status(200).json({ status: 'success', membership: mem });
      }

      if (path.includes('/reminder-sent')) {
        const mem = MEMBERSHIPS.find(m => m.membership_id === memId || m.id === memId);
        if (mem) {
          mem.reminder_count = (mem.reminder_count || 0) + 1;
          mem.last_reminder_sent = new Date().toISOString();
          return res.status(200).json({ status: 'success', membership: mem });
        }
      }

      if (path.includes('/history')) {
        return res.status(200).json(PAYMENTS.filter(p => p.membership_id === memId));
      }

      // Single Membership CRUD
      if (method === 'PUT') {
        const body = await parseBody(req);
        const mem = MEMBERSHIPS.find(m => m.membership_id === memId || m.id === memId);
        if (mem) {
          Object.assign(mem, body, { updated_at: new Date().toISOString() });
          return res.status(200).json({ status: 'success', membership: mem });
        }
        return res.status(404).json({ error: 'Membership not found' });
      }

      if (method === 'DELETE') {
        MEMBERSHIPS = MEMBERSHIPS.filter(m => m.membership_id !== memId && m.id !== memId);
        return res.status(200).json({ status: 'success', message: 'Membership deleted' });
      }

      const mem = MEMBERSHIPS.find(m => m.membership_id === memId || m.id === memId);
      if (mem) return res.status(200).json(mem);
      return res.status(404).json({ error: 'Membership not found' });
    }

    // 9.2 Add New Membership (POST /api/memberships)
    if (method === 'POST') {
      const body = await parseBody(req);
      const newMemId = `M-${String(MEMBERSHIPS.length + 1).padStart(6, '0')}`;
      const plan = MEMBERSHIP_PLANS.find(p => p.plan_id === body.plan_id) || MEMBERSHIP_PLANS[2]; // default monthly
      const person = REGISTERED_PEOPLE.find(p => p.id === body.person_id || p.person_id === body.person_id);

      const startDate = body.start_date || new Date().toISOString().split('T')[0];
      const expiry = new Date(startDate);
      if (plan.duration_unit === 'day') expiry.setDate(expiry.getDate() + plan.duration);
      else if (plan.duration_unit === 'month') expiry.setMonth(expiry.getMonth() + plan.duration);
      else if (plan.duration_unit === 'year') expiry.setFullYear(expiry.getFullYear() + plan.duration);

      const newMembership = {
        membership_id: newMemId,
        person_id: body.person_id,
        person_name: person ? person.name : (body.person_name || 'Member'),
        plan_id: plan.plan_id,
        plan_name: plan.name,
        start_date: startDate,
        expiry_date: expiry.toISOString().split('T')[0],
        status: 'ACTIVE',
        payment_status: body.payment_status || 'PAID',
        amount: Number(body.amount || plan.price),
        notes: body.notes || '',
        branch_id: body.branch_id || person?.branch_id || 'BR-MAIN-001',
        branch_name: person?.branch_name || 'Titan Gym (Main Branch)',
        allowed_branches: ['BR-MAIN-001'],
        cafe_tab_balance: 0,
        reminder_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      MEMBERSHIPS.push(newMembership);

      // Record Payment
      PAYMENTS.push({
        payment_id: `PAY-${Date.now().toString(36).toUpperCase()}`,
        membership_id: newMemId,
        person_id: body.person_id,
        amount: newMembership.amount,
        payment_status: 'PAID',
        payment_date: startDate,
        payment_method: body.payment_method || 'CASH',
        created_at: new Date().toISOString()
      });

      return res.status(201).json({ status: 'success', membership: newMembership });
    }

    // 9.3 List Memberships (GET /api/memberships)
    const enrichedMemberships = MEMBERSHIPS.map(m => {
      const p = REGISTERED_PEOPLE.find(person => person.id === m.person_id || person.person_id === m.person_id);
      return {
        ...m,
        person_name: m.person_name || p?.name || 'Member',
        phone: m.phone || p?.phone || '',
        branch_id: m.branch_id || p?.branch_id || 'BR-MAIN-001'
      };
    });

    if (branchFilter && branchFilter !== 'all') {
      return res.status(200).json(enrichedMemberships.filter(m => m.branch_id === branchFilter));
    }
    return res.status(200).json(enrichedMemberships);
  }

  // ==========================================
  // 10. Cafe Management Endpoints
  // ==========================================
  if (path.includes('/cafe/products')) {
    const parts = path.split('/').filter(Boolean);
    const prodId = parts[parts.indexOf('products') + 1];

    if (prodId) {
      if (method === 'PUT') {
        const body = await parseBody(req);
        const prod = CAFE_PRODUCTS_STORE.find(p => p.id === prodId);
        if (prod) {
          Object.assign(prod, body);
          return res.status(200).json({ status: 'success', product: prod });
        }
        return res.status(404).json({ error: 'Product not found' });
      }
      if (method === 'DELETE') {
        CAFE_PRODUCTS_STORE = CAFE_PRODUCTS_STORE.filter(p => p.id !== prodId);
        return res.status(200).json({ status: 'success', message: 'Product deleted' });
      }
    }

    if (method === 'POST') {
      const body = await parseBody(req);
      const newProd = {
        id: `PROD-${Date.now().toString(36).toUpperCase()}`,
        name: body.name || 'New Shake',
        category: (body.category || 'SHAKES').toUpperCase(),
        price: Number(body.price || 300),
        cost_price: Number(body.cost_price || 150),
        calories: Number(body.calories || 200),
        protein_g: Number(body.protein_g || 25),
        stock: Number(body.stock || 20),
        min_stock_alert: 5,
        is_active: true,
        description: body.description || '',
        customizable: Boolean(body.customizable)
      };
      CAFE_PRODUCTS_STORE.push(newProd);
      return res.status(201).json({ status: 'success', product: newProd });
    }
    return res.status(200).json(CAFE_PRODUCTS_STORE);
  }

  if (path.includes('/cafe/orders')) {
    const parts = path.split('/').filter(Boolean);
    const orderIdx = parts.indexOf('orders');
    const orderId = parts[orderIdx + 1];

    if (orderId) {
      if (path.includes('/status') && method === 'PUT') {
        const body = await parseBody(req);
        const order = CAFE_ORDERS_STORE.find(o => o.id === orderId);
        if (order) {
          order.order_status = body.order_status || order.order_status;
          return res.status(200).json({ status: 'success', order });
        }
      }
      if (path.includes('/approve') && method === 'POST') {
        const order = CAFE_ORDERS_STORE.find(o => o.id === orderId);
        if (order) {
          order.order_status = 'COMPLETED';
          order.payment_status = 'PAID';
          return res.status(200).json({ status: 'success', order });
        }
      }
      if (path.includes('/reject') && method === 'POST') {
        const order = CAFE_ORDERS_STORE.find(o => o.id === orderId);
        if (order) {
          order.order_status = 'CANCELLED';
          return res.status(200).json({ status: 'success', order });
        }
      }
      if (path.includes('/pickup') && method === 'POST') {
        const order = CAFE_ORDERS_STORE.find(o => o.id === orderId);
        if (order) {
          order.order_status = 'COMPLETED';
          return res.status(200).json({ status: 'success', order });
        }
      }
      if (path.includes('/cancel') && method === 'POST') {
        const order = CAFE_ORDERS_STORE.find(o => o.id === orderId);
        if (order) {
          order.order_status = 'CANCELLED';
          return res.status(200).json({ status: 'success', order });
        }
      }
    }

    if (method === 'POST') {
      const body = await parseBody(req);
      const isPreOrder = path.includes('/pre-order');
      const newOrder = {
        id: `ORD-${Date.now().toString(36).toUpperCase()}`,
        person_id: body.person_id || 'P-GUEST',
        customer_name: body.customer_name || 'Walk-in Member',
        items: body.items || [],
        subtotal: Number(body.subtotal || body.total_amount || 0),
        discount: Number(body.discount || 0),
        total_amount: Number(body.total_amount || 0),
        payment_method: body.payment_method || 'CASH',
        payment_status: (body.payment_method === 'KHATA' || body.payment_method === 'TAB') ? 'UNPAID' : (body.payment_status || 'PAID'),
        order_status: isPreOrder ? 'PRE_ORDER' : 'COMPLETED',
        notes: body.notes || '',
        served_by: body.served_by || 'Front Desk Staff',
        created_at: new Date().toISOString()
      };

      // Deduct item stock
      (newOrder.items || []).forEach(it => {
        const prod = CAFE_PRODUCTS_STORE.find(p => p.id === it.product_id);
        if (prod && prod.stock > 0) prod.stock -= (it.qty || 1);
      });

      // Settle Khata balance if Tab payment
      if (body.payment_method === 'KHATA' || body.payment_method === 'TAB') {
        const mem = MEMBERSHIPS.find(m => m.person_id === newOrder.person_id);
        if (mem) {
          mem.cafe_tab_balance = (mem.cafe_tab_balance || 0) + newOrder.total_amount;
        }
      }

      CAFE_ORDERS_STORE.unshift(newOrder);
      return res.status(201).json({ status: 'success', order: newOrder });
    }

    return res.status(200).json(CAFE_ORDERS_STORE);
  }

  if (path.includes('/cafe/members/') && path.includes('/settle-tab')) {
    const memId = path.split('/')[4];
    const mem = MEMBERSHIPS.find(m => m.person_id === memId);
    if (mem) {
      mem.cafe_tab_balance = 0;
      CAFE_ORDERS_STORE.forEach(o => {
        if (o.person_id === memId && o.payment_status === 'UNPAID') o.payment_status = 'PAID';
      });
      return res.status(200).json({ status: 'success', message: 'Tab cleared', balance: 0 });
    }
    return res.status(200).json({ status: 'success', message: 'Tab settled' });
  }

  if (path.includes('/cafe/members/') && path.includes('/active-preorders')) {
    const memId = path.split('/')[4];
    const preorders = CAFE_ORDERS_STORE.filter(o => o.person_id === memId && (o.order_status === 'PRE_ORDER' || o.order_status === 'READY'));
    return res.status(200).json(preorders);
  }

  if (path.includes('/cafe/analytics')) {
    const totalRev = CAFE_ORDERS_STORE.filter(o => o.order_status === 'COMPLETED').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    return res.status(200).json({
      today_revenue: 3500,
      monthly_revenue: totalRev || 42000,
      total_orders: CAFE_ORDERS_STORE.length,
      top_items: [
        { name: 'Double Whey Isolate Shake', sold: 48, revenue: 21600 },
        { name: 'C4 Pre-Workout Blast', sold: 34, revenue: 8500 }
      ]
    });
  }

  // ==========================================
  // 11. Workout & Routine System
  // ==========================================
  if (path.includes('/workout/templates')) {
    const parts = path.split('/').filter(Boolean);
    const tIdx = parts.indexOf('templates');
    const memberId = parts[tIdx + 1] || 'P-000002';
    const tplId = parts[tIdx + 2];

    if (tplId && method === 'DELETE') {
      if (WORKOUT_TEMPLATES_STORE[memberId]) {
        WORKOUT_TEMPLATES_STORE[memberId] = WORKOUT_TEMPLATES_STORE[memberId].filter(t => t.id !== tplId);
      }
      return res.status(200).json({ status: 'success', message: 'Template removed' });
    }

    if (method === 'POST') {
      const body = await parseBody(req);
      if (!WORKOUT_TEMPLATES_STORE[memberId]) WORKOUT_TEMPLATES_STORE[memberId] = [];
      const newTpl = {
        id: body.id || `tpl-${Date.now().toString(36)}`,
        name: body.name || 'Custom Routine',
        description: body.description || '',
        target_muscle: body.target_muscle || 'Full Body',
        icon: body.icon || '⚡',
        exercises: body.exercises || [],
        created_at: new Date().toISOString()
      };
      WORKOUT_TEMPLATES_STORE[memberId].push(newTpl);
      return res.status(201).json({ status: 'success', template: newTpl });
    }

    const memberTpls = WORKOUT_TEMPLATES_STORE[memberId] || WORKOUT_TEMPLATES_STORE['P-000002'] || [];
    return res.status(200).json(memberTpls);
  }

  if (path.includes('/workout/exercises')) {
    return res.status(200).json(STANDARD_EXERCISES);
  }

  if (path.includes('/workout/custom-exercise') && method === 'POST') {
    const body = await parseBody(req);
    const newEx = {
      id: `custom-${Date.now()}`,
      name: body.name || 'Custom Exercise',
      category: body.category || 'General',
      equipment: body.equipment || 'Machine',
      target: body.target || 'General'
    };
    STANDARD_EXERCISES.push(newEx);
    return res.status(201).json({ status: 'success', exercise: newEx });
  }

  if (path.includes('/workout/logs')) {
    const parts = path.split('/').filter(Boolean);
    const memId = parts[parts.indexOf('logs') + 1] || 'P-000002';

    if (method === 'POST') {
      const body = await parseBody(req);
      const newLog = {
        id: `wlog-${Date.now().toString(36)}`,
        member_id: memId,
        template_id: body.template_id || '',
        template_name: body.template_name || 'Workout Session',
        date: body.date || new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        duration_minutes: Number(body.duration_minutes || 45),
        total_volume_kg: Number(body.total_volume_kg || 800),
        total_sets: Number(body.total_sets || 10),
        exercises: body.exercises || []
      };
      WORKOUT_LOGS_STORE.unshift(newLog);
      return res.status(201).json({ status: 'success', log: newLog });
    }

    const memberLogs = WORKOUT_LOGS_STORE.filter(l => l.member_id === memId);
    return res.status(200).json(memberLogs);
  }

  if (path.includes('/workout/admin/all-logs')) {
    return res.status(200).json(WORKOUT_LOGS_STORE);
  }

  if (path.includes('/workout/dashboard')) {
    const parts = path.split('/').filter(Boolean);
    const memId = parts[parts.indexOf('dashboard') + 1] || 'P-000002';
    const logs = WORKOUT_LOGS_STORE.filter(l => l.member_id === memId);
    return res.status(200).json({
      total_workouts: logs.length || 14,
      total_volume_kg: logs.reduce((sum, l) => sum + Number(l.total_volume_kg || 0), 0) || 12400,
      active_streak: 3,
      recent_logs: logs.slice(0, 5)
    });
  }

  // ==========================================
  // 12. Attendance & Visits
  // ==========================================
  if (path.includes('/attendance')) {
    if (path.includes('/today')) return res.status(200).json(ATTENDANCE.slice(-10).reverse());
    return res.status(200).json(ATTENDANCE);
  }

  if (path.includes('/visits')) {
    if (path.includes('/today')) return res.status(200).json(VISITS.slice(-10).reverse());
    return res.status(200).json(VISITS);
  }

  // ==========================================
  // 13. System Activity Logs
  // ==========================================
  if (path.includes('/activity') || path.includes('/events')) {
    return res.status(200).json([
      { id: 1, action: 'User Login', user: 'admin', timestamp: new Date().toISOString(), details: 'Admin logged into portal' },
      { id: 2, action: 'Face Verified', user: 'Ahsan', timestamp: new Date().toISOString(), details: 'Turnstile Unlocked - Main Branch' },
      { id: 3, action: 'Cafe Item Sold', user: 'Husnain', timestamp: new Date().toISOString(), details: 'Double Whey Isolate Shake' },
      { id: 4, action: 'Membership Active', user: 'Ahmad Saeed', timestamp: new Date().toISOString(), details: 'Monthly Standard Active' }
    ]);
  }

  // ==========================================
  // 14. SaaS Demo Leads & CRM Endpoints
  // ==========================================
  if (path.includes('/saas/') || path.includes('/demo-request') || path.includes('/leads')) {
    if (path.includes('/demo-request') && method === 'POST') {
      const body = await parseBody(req);
      const newLead = {
        lead_id: `LEAD-${Date.now().toString(36).toUpperCase()}`,
        gym_name: (body.gym_name || 'Titan Gym').trim(),
        contact_name: (body.contact_name || 'Guest Lead').trim(),
        phone: (body.phone || '').trim(),
        email: (body.email || '').trim(),
        city: (body.city || 'Lahore').trim(),
        branch_count: Number(body.branch_count || 1),
        interested_plan: (body.interested_plan || 'PRO').toUpperCase(),
        notes: (body.notes || '').trim(),
        status: 'NEW',
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      DEMO_LEADS_STORE.unshift(newLead);
      return res.status(200).json({
        success: true,
        message: `Demo request registered! Thank you ${newLead.contact_name}.`,
        lead: newLead
      });
    }

    if (path.includes('/leads/unread-count') && method === 'GET') {
      const unread = DEMO_LEADS_STORE.filter(l => !l.is_read);
      return res.status(200).json({
        success: true,
        unread_count: unread.length,
        total: DEMO_LEADS_STORE.length,
        latest: unread[0] || (DEMO_LEADS_STORE[0] || null)
      });
    }

    if (path.includes('/leads/mark-all-read') && method === 'POST') {
      DEMO_LEADS_STORE.forEach(l => { l.is_read = true; });
      return res.status(200).json({ success: true, message: 'All leads marked as read' });
    }

    if (path.includes('/status') && method === 'PATCH') {
      const parts = path.split('/').filter(Boolean);
      const statusIdx = parts.indexOf('status');
      const leadId = parts[statusIdx - 1];
      const body = await parseBody(req);
      const lead = DEMO_LEADS_STORE.find(l => l.lead_id === leadId);
      if (lead) {
        if (body.status) lead.status = body.status.toUpperCase();
        if (body.is_read !== undefined) lead.is_read = body.is_read;
        lead.updated_at = new Date().toISOString();
        return res.status(200).json({ success: true, lead });
      }
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (method === 'DELETE') {
      const parts = path.split('/').filter(Boolean);
      const leadId = parts[parts.length - 1];
      DEMO_LEADS_STORE = DEMO_LEADS_STORE.filter(l => l.lead_id !== leadId);
      return res.status(200).json({ success: true, message: `Lead ${leadId} removed` });
    }

    return res.status(200).json(DEMO_LEADS_STORE);
  }

  // Default fallback
  return res.status(200).json({ status: 'online', path, method });
}
