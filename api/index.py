import sys
import os

# Configure paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'app'))
sys.path.insert(0, os.path.join(BASE_DIR, 'app', 'api'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from auth_routes import router as auth_router
from cafe_routes import router as cafe_router
from workout_routes import router as workout_router
from db import mongo

# Create clean, cloud-optimized FastAPI app
app = FastAPI(title="Titan Gym Cloud API")

# Enable CORS for global access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount cloud API routers
app.include_router(auth_router)
app.include_router(cafe_router)
app.include_router(workout_router)

@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "service": "Titan Gym Cloud API",
        "database": "connected" if mongo.is_connected() else "fallback"
    }

@app.get("/api/people")
async def get_people():
    if mongo.is_connected():
        people = mongo.find_all("persons")
        if people:
            return people
    return []

# Export for Vercel Serverless
app = app
