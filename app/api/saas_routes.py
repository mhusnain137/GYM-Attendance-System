import os
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'app'))
from db import mongo

router = APIRouter(prefix='/api/saas', tags=['saas'])

LEADS_FILE = os.path.join(PROJECT_ROOT, 'data', 'demo_leads.json')

class DemoLeadRequest(BaseModel):
    gym_name: str
    contact_name: str
    phone: str
    email: Optional[str] = ""
    city: Optional[str] = ""
    branch_count: Optional[int] = 1
    interested_plan: Optional[str] = "PRO"  # SADA, PRO, MAX
    notes: Optional[str] = ""

def load_leads() -> List[Dict[str, Any]]:
    if mongo.is_connected():
        leads = mongo.find_all('demo_leads')
        if leads is not None and len(leads) > 0:
            return leads
    if os.path.exists(LEADS_FILE):
        try:
            with open(LEADS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_leads(leads: List[Dict[str, Any]]) -> bool:
    if mongo.is_connected():
        mongo.replace_all('demo_leads', leads)
    try:
        os.makedirs(os.path.dirname(LEADS_FILE), exist_ok=True)
        with open(LEADS_FILE, 'w', encoding='utf-8') as f:
            json.dump(leads, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[SaaS] Error saving leads: {e}")
        return False

SAAS_PLANS = [
    {
        "id": "basic",
        "tier_code": "BASIC",
        "name": "Basic Plan",
        "tagline": "Essential AI Attendance for Single Gyms",
        "badge": "STARTER",
        "price_monthly_pkr": 14999,
        "price_annual_pkr": 11999,
        "price_monthly_usd": 49,
        "price_annual_usd": 39,
        "branch_limit": 1,
        "color_accent": "#64748b",
        "popular": False,
        "features": [
            {"text": "1 Gym Branch included", "included": True},
            {"text": "AI Facial Recognition Check-In (20+ FPS)", "included": True},
            {"text": "Live Turnstile Gate Relay Control", "included": True},
            {"text": "5-Day Free Trial Auto-Lockout", "included": True},
            {"text": "Member Profile & Attendance Logs", "included": True},
            {"text": "Manual WhatsApp Expiry Reminders", "included": True},
            {"text": "Local SQLite/JSON Database Backups", "included": True},
            {"text": "Multi-Branch Roaming Passes", "included": False},
            {"text": "Gym Cafe POS & Kitchen Khata Tabs", "included": False},
            {"text": "Member Workout Plans & Consistency Heatmaps", "included": False},
            {"text": "Cloud MongoDB Atlas Live Sync", "included": False},
            {"text": "CCTV Multi-Camera RTSP Network", "included": False},
            {"text": "Dedicated 24/7 Account Support", "included": False}
        ]
    },
    {
        "id": "pro",
        "tier_code": "PRO",
        "name": "Pro Plan",
        "tagline": "All-in-One Powerhouse for Growing Gyms",
        "badge": "MOST POPULAR",
        "price_monthly_pkr": 29999,
        "price_annual_pkr": 23999,
        "price_monthly_usd": 99,
        "price_annual_usd": 79,
        "branch_limit": 3,
        "color_accent": "#10b981",
        "popular": True,
        "features": [
            {"text": "Up to 3 Gym Branches in your city", "included": True},
            {"text": "AI Facial Recognition Check-In (20+ FPS)", "included": True},
            {"text": "Smart Roaming Pass City Access Enforcement", "included": True},
            {"text": "Door Lock Alert on Unauthorized Branch Entry", "included": True},
            {"text": "Member Branch Transfer with 1-Click Sync", "included": True},
            {"text": "Gym Cafe POS + Kitchen Orders Queue", "included": True},
            {"text": "Member Khata Credit Tab & Instant Settlement", "included": True},
            {"text": "Member Workout Routines & Consistency Streaks", "included": True},
            {"text": "Multi-Branch Executive Analytics & Capacity Grid", "included": True},
            {"text": "Cloud MongoDB Atlas Live Replication", "included": True},
            {"text": "1-Click WhatsApp Expiry & Renewal Alerts", "included": True},
            {"text": "CCTV Multi-Camera RTSP Network", "included": False},
            {"text": "White-Label Custom Brand & App", "included": False}
        ]
    },
    {
        "id": "max",
        "tier_code": "MAX",
        "name": "Max Plan",
        "tagline": "Unlimited Multi-City Enterprise Fitness Network",
        "badge": "ENTERPRISE ELITE",
        "price_monthly_pkr": 54999,
        "price_annual_pkr": 43999,
        "price_monthly_usd": 179,
        "price_annual_usd": 149,
        "branch_limit": -1,  # Unlimited
        "color_accent": "#8b5cf6",
        "popular": False,
        "features": [
            {"text": "Unlimited Gym Branches Across All Cities", "included": True},
            {"text": "AI Facial Recognition Check-In (20+ FPS)", "included": True},
            {"text": "Multi-Camera CCTV RTSP Network Stream Integration", "included": True},
            {"text": "Anti-Tailgating Sensor & Turnstile Relay Security", "included": True},
            {"text": "Auto-Visitor Registration from CCTV Camera Feeds", "included": True},
            {"text": "Full Gym Cafe POS + KDS + Unlimited Khata Tabs", "included": True},
            {"text": "Full Workout Planner + Trainer Assignment", "included": True},
            {"text": "Executive Multi-Branch Live BI Dashboards", "included": True},
            {"text": "Dedicated MongoDB Atlas Cluster + Hourly Snapshots", "included": True},
            {"text": "Custom Domain & White-Label Gym Branding", "included": True},
            {"text": "Automated WhatsApp API Expiry & Receipt Bot", "included": True},
            {"text": "24/7 Dedicated Account Manager & On-Site Setup", "included": True}
        ]
    }
]

@router.get('/plans')
async def get_plans():
    """Return public details for Sada, Pro, and Max subscription tiers"""
    return {
        "success": True,
        "plans": SAAS_PLANS,
        "currency": "PKR",
        "discount_annual_percentage": 20
    }

@router.post('/demo-request')
async def request_demo(payload: DemoLeadRequest):
    """Handle new demo inquiries and sales leads from gym owners"""
    leads = load_leads()
    new_lead = {
        "lead_id": f"LEAD-{uuid.uuid4().hex[:8].upper()}",
        "gym_name": payload.gym_name.strip(),
        "contact_name": payload.contact_name.strip(),
        "phone": payload.phone.strip(),
        "email": payload.email.strip() if payload.email else "",
        "city": payload.city.strip() if payload.city else "Not Specified",
        "branch_count": payload.branch_count or 1,
        "interested_plan": payload.interested_plan.upper() if payload.interested_plan else "PRO",
        "notes": payload.notes.strip() if payload.notes else "",
        "status": "NEW",
        "created_at": datetime.now().isoformat()
    }
    leads.insert(0, new_lead)
    save_leads(leads)
    
    # Generate direct WhatsApp concierge link for instant follow-up
    clean_phone = "".join(ch for ch in payload.phone if ch.isdigit())
    text = (
        f"Assalam o Alaikum {payload.contact_name}! Thank you for your interest in Titan Gym OS ({payload.interested_plan} Plan) "
        f"for {payload.gym_name}. Our senior solutions engineer will arrange your live turnstile & POS demo."
    )
    
    return {
        "success": True,
        "message": f"Demo request registered! Thank you {payload.contact_name}.",
        "lead": new_lead,
        "whatsapp_preview_text": text
    }

@router.get('/leads')
async def get_demo_leads():
    """Internal list of sales leads"""
    return load_leads()
