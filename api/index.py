from http.server import BaseHTTPRequestHandler
import json
import urllib.parse
import os

DEFAULT_USERS = [
    {
        "user_id": "USR-001",
        "username": "admin",
        "password": "admin123",
        "name": "Gym Owner (Super Admin)",
        "role": "ADMIN",
        "is_active": True
    },
    {
        "user_id": "USR-002",
        "username": "manager",
        "password": "manager123",
        "name": "Ali Supervisor (Manager)",
        "role": "MANAGER",
        "is_active": True
    },
    {
        "user_id": "USR-003",
        "username": "reception",
        "password": "reception123",
        "name": "Sara Counter (Receptionist)",
        "role": "RECEPTIONIST",
        "is_active": True
    }
]

class handler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Content-Type', 'application/json')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()
        
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        
        if path.endswith('/api/status'):
            res = {"status": "online", "mode": "cloud_serverless", "service": "Titan Gym Cloud API"}
        elif path.endswith('/api/people'):
            res = [
                {"id": "P-000001", "name": "Muhammad Husnain", "status": "active", "registered_at": "2026-09-01"},
                {"id": "P-000002", "name": "Ali Khan", "status": "active", "registered_at": "2026-09-01"}
            ]
        elif path.endswith('/api/cafe/menu') or path.endswith('/api/cafe/products'):
            res = [
                {"id": "c-1", "name": "Whey Protein Shake (Vanilla)", "category": "Protein Shakes", "price": 450, "stock": 50},
                {"id": "c-2", "name": "Pre-Workout Energy Booster", "category": "Pre-Workout Drinks", "price": 350, "stock": 40},
                {"id": "c-3", "name": "BCAA Amino Burst", "category": "Energy & Hydration", "price": 300, "stock": 35}
            ]
        elif path.endswith('/api/workout/templates'):
            res = [
                {"id": "tpl-1", "name": "Push Day (Chest & Triceps)", "icon": "⚡", "exercises": []},
                {"id": "tpl-2", "name": "Pull Day (Back & Biceps)", "icon": "🚀", "exercises": []},
                {"id": "tpl-3", "name": "Legs & Core Power", "icon": "🔥", "exercises": []}
            ]
        else:
            res = {"status": "online"}
            
        self.wfile.write(json.dumps(res).encode('utf-8'))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        try:
            body = json.loads(post_data)
        except Exception:
            body = {}

        if path.endswith('/api/auth/login'):
            username = body.get('username', '').strip().lower()
            password = body.get('password', '').strip()
            
            found = next((u for u in DEFAULT_USERS if u['username'].lower() == username), None)
            if found and found['password'] == password:
                self.send_response(200)
                self._send_cors()
                self.end_headers()
                res = {
                    "status": "success",
                    "message": "Login successful",
                    "token": f"token-{found['user_id']}-cloud",
                    "user": found
                }
                self.wfile.write(json.dumps(res).encode('utf-8'))
                return
            elif found and found['password'] != password:
                self.send_response(401)
                self._send_cors()
                self.end_headers()
                res = {"detail": "Invalid username or password"}
                self.wfile.write(json.dumps(res).encode('utf-8'))
                return
            else:
                # Demo login / member login fallback
                self.send_response(200)
                self._send_cors()
                self.end_headers()
                res = {
                    "status": "success",
                    "message": "Member Login successful",
                    "token": f"token-MEM-{username}",
                    "user": {
                        "user_id": username.upper(),
                        "username": username,
                        "name": f"Member {username.title()}",
                        "role": "MEMBER"
                    }
                }
                self.wfile.write(json.dumps(res).encode('utf-8'))
                return

        self.send_response(200)
        self._send_cors()
        self.end_headers()
        self.wfile.write(json.dumps({"status": "received", "data": body}).encode('utf-8'))
