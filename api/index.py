import sys
import os

# Robust absolute path resolution for Vercel Serverless
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)

for p in [ROOT_DIR, os.path.join(ROOT_DIR, "app"), os.path.join(ROOT_DIR, "app", "api")]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

try:
    from auth_routes import router as auth_router
except Exception:
    from app.api.auth_routes import router as auth_router

try:
    from cafe_routes import router as cafe_router
except Exception:
    from app.api.cafe_routes import router as cafe_router

try:
    from workout_routes import router as workout_router
except Exception:
    from app.api.workout_routes import router as workout_router

app = FastAPI(title="Titan Gym Cloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(cafe_router)
app.include_router(workout_router)

@app.get("/api/status")
async def get_status():
    return {"status": "online", "mode": "cloud"}

# Export both app and Mangum handler for Vercel compatibility
handler = Mangum(app, lifespan="off")
