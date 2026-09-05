import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pymongo
from pymongo import MongoClient

app = FastAPI(title="Titan Gym Cloud Serverless API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME = os.getenv("DB_NAME", "gym_identity_db")

def get_mongo_db():
    if not MONGO_URI:
        return None
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        return client[DB_NAME]
    except Exception:
        return None

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

class LoginModel(BaseModel):
    username: str
    password: str

@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "mode": "cloud_serverless",
        "service": "Titan Gym Cloud API"
    }

@app.post("/api/auth/login")
async def login(payload: LoginModel):
    username = payload.username.strip().lower()
    
    # 1. Check Staff Accounts
    db = get_mongo_db()
    users = []
    if db is not None:
        try:
            users = list(db["users"].find({}, {"_id": 0}))
        except Exception:
            users = []
    
    if not users:
        users = DEFAULT_USERS

    found = next((u for u in users if u.get("username", "").lower() == username), None)
    if found:
        if found.get("password") == payload.password.strip():
            return {
                "status": "success",
                "message": "Login successful",
                "token": f"token-{found.get('user_id', 'USR')}-cloud",
                "user": found
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
    # 2. Check Member Accounts
    persons = []
    if db is not None:
        try:
            persons = list(db["persons"].find({}, {"_id": 0}))
        except Exception:
            persons = []
            
    member = next((p for p in persons if str(p.get("id", "")).lower() == username or str(p.get("phone", "")) == payload.username.strip()), None)
    if member:
        return {
            "status": "success",
            "message": "Member Login successful",
            "token": f"token-MEM-{member.get('id')}",
            "user": {
                "user_id": member.get("id"),
                "username": member.get("name"),
                "name": member.get("name"),
                "role": "MEMBER"
            }
        }
        
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.get("/api/people")
async def get_people():
    db = get_mongo_db()
    if db is not None:
        try:
            return list(db["persons"].find({}, {"_id": 0}))
        except Exception:
            pass
    return []

@app.get("/api/cafe/products")
@app.get("/api/cafe/menu")
async def get_cafe_menu():
    db = get_mongo_db()
    if db is not None:
        try:
            return list(db["cafe_products"].find({}, {"_id": 0}))
        except Exception:
            pass
    return []

@app.get("/api/workout/templates")
async def get_workout_templates():
    db = get_mongo_db()
    if db is not None:
        try:
            return list(db["workout_templates"].find({}, {"_id": 0}))
        except Exception:
            pass
    return []

@app.get("/api/attendance/today")
async def get_today_attendance():
    db = get_mongo_db()
    if db is not None:
        try:
            return list(db["attendance"].find({}, {"_id": 0}))
        except Exception:
            pass
    return []

# Export for Vercel
app = app
