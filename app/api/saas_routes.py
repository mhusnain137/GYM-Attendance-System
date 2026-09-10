import os
import json
import uuid
import urllib.request
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
CLOUD_LEADS_URL = "https://gym-attendance-system-three.vercel.app/api/saas/leads"
_last_cloud_sync_time = 0

def sync_from_cloud_leads():
    global _last_cloud_sync_time
    now = datetime.now().timestamp()
    if now - _last_cloud_sync_time < 8:  # Min 8s between syncs
        return
    _last_cloud_sync_time = now
    try:
        req = urllib.request.Request(CLOUD_LEADS_URL, headers={'User-Agent': 'Local-FastAPI-Sync/1.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                cloud_leads = json.loads(resp.read().decode('utf-8'))
                if isinstance(cloud_leads, list) and len(cloud_leads) > 0:
                    local_leads = load_leads()
                    existing_ids = {l.get('lead_id') for l in local_leads if l.get('lead_id')}
                    has_new = False
                    for cl in cloud_leads:
                        cid = cl.get('lead_id')
                        if cid and cid not in existing_ids:
                            local_leads.insert(0, cl)
                            existing_ids.add(cid)
                            has_new = True
                    if has_new:
                        save_leads(local_leads)
    except Exception:
        pass

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

class UpdateLeadStatusRequest(BaseModel):
    status: Optional[str] = None
    is_read: Optional[bool] = None

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
        "is_read": False,
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
    """Internal list of sales leads (with cloud sync)"""
    sync_from_cloud_leads()
    return load_leads()

@router.get('/leads/unread-count')
async def get_unread_leads_count():
    """Get number of unread demo leads for top navbar notification bell"""
    sync_from_cloud_leads()
    leads = load_leads()
    unread = [l for l in leads if not l.get('is_read', False)]
    latest = unread[0] if unread else (leads[0] if leads else None)
    return {
        "success": True,
        "unread_count": len(unread),
        "total": len(leads),
        "latest": latest
    }

@router.post('/leads/mark-all-read')
async def mark_all_leads_read():
    """Mark all unread demo leads as read"""
    leads = load_leads()
    for l in leads:
        l['is_read'] = True
    save_leads(leads)
    return {"success": True, "message": "All leads marked as read"}

@router.patch('/leads/{lead_id}/status')
async def update_lead_status(lead_id: str, payload: UpdateLeadStatusRequest):
    """Update lead status or mark as read"""
    leads = load_leads()
    target = None
    for l in leads:
        if l.get('lead_id') == lead_id:
            target = l
            break
    if not target:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if payload.status:
        target['status'] = payload.status.upper()
    if payload.is_read is not None:
        target['is_read'] = payload.is_read
    
    target['updated_at'] = datetime.now().isoformat()
    save_leads(leads)
    return {"success": True, "lead": target}

@router.delete('/leads/{lead_id}')
async def delete_lead(lead_id: str):
    """Delete a sales lead inquiry"""
    leads = load_leads()
    initial_len = len(leads)
    leads = [l for l in leads if l.get('lead_id') != lead_id]
    if len(leads) == initial_len:
        raise HTTPException(status_code=404, detail="Lead not found")
    save_leads(leads)
    return {"success": True, "message": f"Lead {lead_id} removed"}

