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

  const REGISTERED_PEOPLE = [
  {
    "id": "P-000002",
    "name": "Ahsan",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000003",
    "name": "Jawad",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000004",
    "name": "Abdul Hannan",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000005",
    "name": "Hassaan",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000006",
    "name": "Furqan",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000009",
    "name": "Usman Bhai",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000010",
    "name": "Husnain",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:37:03"
  },
  {
    "id": "P-000011",
    "name": "Ahmad Saeed",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 19:44:14"
  },
  {
    "id": "P-000014",
    "name": "Ahmad Riaz",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 18:02:57"
  },
  {
    "id": "P-000016",
    "name": "Junaid",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 18:48:42"
  },
  {
    "id": "P-000017",
    "name": "Sir Saleem",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 18:48:43"
  },
  {
    "id": "P-000019",
    "name": "Husnain Sarwar",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 19:37:17"
  },
  {
    "id": "P-000020",
    "name": "Ahmad bin saeed",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 19:48:56"
  },
  {
    "id": "P-000022",
    "name": "Sir Imran",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-29 17:11:22"
  }
];

  const MEMBERSHIPS = [
  {
    "membership_id": "M-000003",
    "person_id": "P-000002",
    "plan_id": "monthly",
    "plan_name": "Monthly",
    "start_date": "2026-08-18",
    "expiry_date": "2026-09-18",
    "status": "ACTIVE",
    "payment_status": "PAID",
    "amount": 5000.0,
    "notes": "",
    "created_at": "2026-08-18T18:36:30.177012",
    "updated_at": "2026-08-18T18:36:30.177012",
    "person_name": "Ahsan",
    "cafe_tab_balance": 500.0
  },
  {
    "membership_id": "M-000002",
    "person_id": "P-000011",
    "person_name": "Ahmad Saeed",
    "plan_id": "monthly",
    "plan_name": "Monthly",
    "start_date": "2026-08-18",
    "expiry_date": "2026-09-19",
    "status": "ACTIVE",
    "payment_status": "PAID",
    "amount": 5000.0,
    "notes": "Auto-Unfrozen & Continued on 2026-08-19 | Auto-Unfrozen at camera check-in on 2026-08-29",
    "created_at": "2026-08-18T19:22:16.087156",
    "updated_at": "2026-08-29T18:32:45.656592",
    "freeze_reason": "",
    "phone": "03217614627",
    "frozen_at": "2026-08-29",
    "unfrozen_at": "2026-08-29"
  },
  {
    "membership_id": "M-000004",
    "person_id": "P-000022",
    "plan_id": "daily",
    "plan_name": "Daily Pass",
    "start_date": "2026-08-29",
    "expiry_date": "2026-08-30",
    "status": "ACTIVE",
    "payment_status": "PAID",
    "amount": 300.0,
    "phone": "",
    "notes": "",
    "created_at": "2026-08-29T17:22:28.288519",
    "updated_at": "2026-08-29T17:31:02.519296",
    "reminder_count": 1,
    "last_reminder_sent": "2026-08-29T17:22:33.030615",
    "freeze_reason": "N/a"
  }
];

  const ATTENDANCE = [
  {
    "date": "2026-08-18",
    "person_id": "P-000009",
    "name": "Usman Bhai",
    "status": "Present",
    "first_detected": "16:58:41",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-18",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "16:58:45",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-19",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "17:37:03",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-19",
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "status": "Present",
    "first_detected": "19:44:14",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-19",
    "person_id": "P-000003",
    "name": "Jawad",
    "status": "Present",
    "first_detected": "19:45:38",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-19",
    "person_id": "P-000005",
    "name": "Hassaan",
    "status": "Present",
    "first_detected": "19:45:48",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-22",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "18:17:08",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-22",
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "status": "Present",
    "first_detected": "18:17:12",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-22",
    "person_id": "P-000003",
    "name": "Jawad",
    "status": "Present",
    "first_detected": "18:17:15",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "17:43:33",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000005",
    "name": "Hassaan",
    "status": "Present",
    "first_detected": "17:53:51",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000016",
    "name": "Junaid",
    "status": "Present",
    "first_detected": "18:03:06",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000017",
    "name": "Sir Saleem",
    "status": "Present",
    "first_detected": "18:48:43",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000018",
    "name": "Visitor #18",
    "status": "Present",
    "first_detected": "18:48:45",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000019",
    "name": "Husnain Sarwar",
    "status": "Present",
    "first_detected": "19:37:17",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "status": "Present",
    "first_detected": "19:48:56",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000021",
    "name": "SIr Imran",
    "status": "Present",
    "first_detected": "20:14:13",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000018",
    "name": "Visitor #18",
    "status": "Present",
    "first_detected": "17:03:21",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "17:10:44",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000022",
    "name": "Sir Imran",
    "status": "Present",
    "first_detected": "17:11:22",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000016",
    "name": "Junaid",
    "status": "Present",
    "first_detected": "17:51:27",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "status": "Present",
    "first_detected": "19:30:21",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "status": "Present",
    "first_detected": "19:38:54",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-09-02",
    "person_id": "P-000019",
    "name": "Husnain Sarwar",
    "status": "Present",
    "first_detected": "19:24:22",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-09-02",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "23:15:47",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  }
];

  const VISITS = [
  {
    "person_id": "P-000021",
    "name": "SIr Imran",
    "date": "2026-08-25",
    "time": "20:14:13",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000018",
    "name": "Visitor #18",
    "date": "2026-08-29",
    "time": "17:03:21",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000017",
    "name": "Sir Saleem",
    "date": "2026-08-29",
    "time": "17:04:08",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:10:44",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:11:22",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000022",
    "name": "Sir Imran",
    "date": "2026-08-29",
    "time": "17:11:22",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000022",
    "name": "Sir Imran",
    "date": "2026-08-29",
    "time": "17:12:09",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:12:18",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000022",
    "name": "Sir Imran",
    "date": "2026-08-29",
    "time": "17:12:50",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:12:52",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:24:47",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:24:59",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000022",
    "name": "Sir Imran",
    "date": "2026-08-29",
    "time": "17:30:45",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:30:49",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000016",
    "name": "Junaid",
    "date": "2026-08-29",
    "time": "17:51:27",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "18:32:34",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "18:36:45",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "date": "2026-08-29",
    "time": "19:30:21",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000023",
    "name": "Visitor #23",
    "date": "2026-08-29",
    "time": "19:37:34",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "19:38:50",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "date": "2026-08-29",
    "time": "19:38:54",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "19:39:05",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "date": "2026-08-29",
    "time": "19:39:32",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000019",
    "name": "Husnain Sarwar",
    "date": "2026-09-02",
    "time": "19:24:23",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-09-02",
    "time": "23:15:48",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  }
];

  const USERS = [
  {
    "user_id": "USR-001",
    "username": "admin",
    "password": "admin123",
    "name": "Gym Owner (Super Admin)",
    "role": "ADMIN",
    "is_active": true,
    "created_at": "2026-09-01T17:40:00"
  },
  {
    "user_id": "USR-002",
    "username": "manager",
    "password": "manager123",
    "name": "Ali Supervisor (Manager)",
    "role": "MANAGER",
    "is_active": true,
    "created_at": "2026-09-01T17:40:00"
  },
  {
    "user_id": "USR-003",
    "username": "reception",
    "password": "reception123",
    "name": "Sara Counter (Receptionist)",
    "role": "RECEPTIONIST",
    "is_active": true,
    "created_at": "2026-09-01T17:40:00"
  }
];

  // 1. Health & System Status
  if (url.includes('/status') && !url.includes('/camera/status')) {
    return res.status(200).json({
      status: 'online',
      camera: false,
      fps: 0,
      faces_detected: 0,
      active_tracks: 0,
      registered_people: REGISTERED_PEOPLE.length,
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

  // 4. Analytics Dashboard
  if (url.includes('/analytics/dashboard') || url.includes('/analytics')) {
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
        this_month_revenue: 235000,
        growth_percentage: 12,
        peak_rush_window: '6:00 PM - 9:00 PM',
        total_lifetime_revenue: 1055000,
        busiest_hour: '8:00 PM'
      }
    });
  }

  // 5. Authentication / Login
  if (url.includes('/auth/login') || url.includes('/login')) {
    if (method === 'POST') {
      const { username, password } = req.body || {};
      const cleanUser = (username || '').trim().toLowerCase();

      // Check Staff in USERS
      const found = USERS.find(u => (u.username || '').toLowerCase() === cleanUser);
      if (found) {
        if (found.password === (password || '').trim()) {
          return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token: `token-${found.user_id || found.id || 'USR'}-cloud`,
            user: found
          });
        } else {
          return res.status(401).json({ detail: 'Invalid username or password' });
        }
      }

      // Check Member login
      const matchedMember = REGISTERED_PEOPLE.find(p => (p.name || '').toLowerCase() === cleanUser || (p.id || '').toLowerCase() === cleanUser);
      return res.status(200).json({
        status: 'success',
        message: 'Member Login successful',
        token: `token-MEM-${cleanUser}`,
        user: {
          user_id: matchedMember ? matchedMember.id : cleanUser.toUpperCase(),
          username: cleanUser,
          name: matchedMember ? matchedMember.name : `Member ${cleanUser.toUpperCase()}`,
          role: 'MEMBER'
        }
      });
    }
  }

  // 6. People / Members List
  if (url.includes('/people')) {
    return res.status(200).json(REGISTERED_PEOPLE);
  }

  // 7. Attendance Today & Visits
  if (url.includes('/attendance/today') || url.includes('/attendance')) {
    return res.status(200).json(ATTENDANCE);
  }

  if (url.includes('/visits/today') || url.includes('/visits')) {
    return res.status(200).json(VISITS);
  }

  // 8. Memberships
  if (url.includes('/memberships')) {
    return res.status(200).json(MEMBERSHIPS);
  }

  // 9. Staff Users
  if (url.includes('/staff') || url.includes('/users')) {
    return res.status(200).json(USERS);
  }

  // 10. Activity Logs
  if (url.includes('/activity')) {
    return res.status(200).json([
      { id: 1, action: 'User Login', user: 'admin', timestamp: new Date().toISOString(), details: 'Admin logged in' },
      { id: 2, action: 'Face Verified', user: 'Husnain', timestamp: new Date().toISOString(), details: 'Door Unlocked' }
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
