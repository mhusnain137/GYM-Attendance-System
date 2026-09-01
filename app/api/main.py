import sys
import os

# Add the recognition and app modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'recognition'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from db import mongo

from fastapi import FastAPI, Response, UploadFile, File, Header, HTTPException
from typing import Optional, List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import cv2
import numpy as np
import json
import threading
import time
from collections import deque
import asyncio

# Import recognition components
import recognition_config
from recognition_service import RecognitionService
from cafe_routes import router as cafe_router
from auth_routes import router as auth_router

app = FastAPI(title="Person Identity System API")

@app.on_event("startup")
async def on_startup():
    try:
        mongo.migrate_local_data_to_mongo()
    except Exception as e:
        print(f"[Startup] DB migration notice: {e}")

app.include_router(cafe_router)
app.include_router(auth_router)

os.makedirs(recognition_config.FACE_CROPS_DIR, exist_ok=True)
app.mount("/api/face-crops", StaticFiles(directory=recognition_config.FACE_CROPS_DIR), name="face-crops")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global recognition service instance
recognition_service = None
recognition_thread = None
recognition_lock = threading.Lock()

# Event log (keep last 100 events)
event_log = deque(maxlen=100)

def add_event(event_type, message, data=None):
    """Add an event to the log"""
    event = {
        "timestamp": time.strftime("%H:%M:%S"),
        "type": event_type,
        "message": message,
        "data": data or {}
    }
    event_log.append(event)

@app.on_event("startup")
async def startup_event():
    """Initialize recognition service on startup"""
    global recognition_service
    recognition_service = RecognitionService()
    recognition_service.event_callback = lambda ev: add_event(ev.get("type", "SYSTEM"), ev.get("message", ""), ev.get("data"))
    add_event("SYSTEM", "Recognition service initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global recognition_service, recognition_thread
    if recognition_service:
        recognition_service.stop()
        add_event("SYSTEM", "Recognition service stopped")

@app.get("/api/status")
async def get_status():
    """Get system status"""
    global recognition_service
    if recognition_service:
        return {
            "camera": recognition_service.is_running(),
            "fps": recognition_service.get_fps(),
            "faces_detected": recognition_service.get_faces_detected(),
            "active_tracks": recognition_service.get_active_tracks(),
            "registered_people": recognition_service.get_registered_count(),
            "system_status": {
                "camera": "ONLINE" if recognition_service.is_running() else "OFFLINE",
                "yunet": "READY",
                "sface": "READY",
                "database": "READY",
                "tracking": "ACTIVE" if recognition_service.is_running() else "INACTIVE"
            }
        }
    return {
        "camera": False,
        "fps": 0,
        "faces_detected": 0,
        "active_tracks": 0,
        "registered_people": 0,
        "system_status": {
            "camera": "OFFLINE",
            "yunet": "READY",
            "sface": "READY",
            "database": "READY",
            "tracking": "INACTIVE"
        }
    }

@app.get("/api/state")
async def get_state():
    """Get current recognition state with enriched membership alerts"""
    global recognition_service
    if recognition_service and recognition_service.is_running():
        tracks = recognition_service.get_tracks()
        people = []
        active_alerts = []
        
        memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
        attendance_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "attendance.json")
        visits_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "visits.json")

        memberships = load_json_file(memberships_file)
        attendance_records = load_json_file(attendance_file)
        visits_records = load_json_file(visits_file)

        memberships_by_pid = {}
        for m in memberships:
            pid = m.get("person_id")
            if pid:
                memberships_by_pid[pid.lower()] = m

        # Calculate distinct visit dates per person_id
        visit_dates_by_pid = {}
        for rec in attendance_records + visits_records:
            r_pid = (rec.get("person_id") or "").lower().strip()
            r_date = rec.get("date")
            if r_pid and r_date:
                if r_pid not in visit_dates_by_pid:
                    visit_dates_by_pid[r_pid] = set()
                visit_dates_by_pid[r_pid].add(r_date)

        today_str = datetime.now().strftime("%Y-%m-%d")
        
        for i, track in enumerate(tracks):
            pid = track.get("id", "Unknown")
            pname = track.get("name", "Unknown")
            is_confirmed = track.get("confirmed", False)
            
            person_data = {
                "track_id": i,
                "person_id": pid,
                "name": pname,
                "similarity": track.get("score", 0.0),
                "face_confidence": track.get("confidence", 0.0),
                "bbox": track.get("bbox"),
                "confirmed": is_confirmed,
                "candidate_name": track.get("candidate_name"),
                "candidate_hits": track.get("candidate_hits", 0),
                "candidate_scores": track.get("candidate_scores", []),
                "last_seen_frame": track.get("last_seen_frame"),
                "last_embed_frame": track.get("last_embed_frame"),
                "membership_status": "NONE",
                "days_left": None,
                "expiry_date": None,
                "plan_name": None,
                "phone": "",
                "is_alert": False,
                "alert_type": None,
                "alert_message": None,
                "door_open": False,
                "access_status": "PENDING",
                "door_reason": "Verifying",
                "trial_days_used": 0,
                "trial_days_left": 5
            }
            
            # Enrich with membership details
            if pid and pid != "Unknown" and pid.lower() in memberships_by_pid:
                m = memberships_by_pid[pid.lower()]
                exp_date = m.get("expiry_date", "")
                m_status = m.get("status", "ACTIVE")
                plan_name = m.get("plan_name", "Standard Pass")
                phone = m.get("phone", "")
                
                person_data["expiry_date"] = exp_date
                person_data["plan_name"] = plan_name
                person_data["phone"] = phone
                
                days_left = 0
                if exp_date:
                    try:
                        exp_dt = datetime.strptime(exp_date, "%Y-%m-%d").date()
                        today_dt = datetime.strptime(today_str, "%Y-%m-%d").date()
                        days_left = (exp_dt - today_dt).days
                    except Exception:
                        days_left = 0
                person_data["days_left"] = days_left
                
                if m_status == "FROZEN":
                    if is_confirmed and recognition_service:
                        recognition_service.auto_unfreeze_membership_if_needed(pid, pname)
                        # Re-read membership info after auto-unfreeze
                        refreshed_memberships = load_json_file(memberships_file)
                        refreshed_m = next((rm for rm in refreshed_memberships if (rm.get("person_id") or "").lower() == pid.lower()), None)
                        if refreshed_m:
                            exp_date = refreshed_m.get("expiry_date", exp_date)
                            m_status = refreshed_m.get("status", "ACTIVE")
                            person_data["expiry_date"] = exp_date
                            try:
                                exp_dt = datetime.strptime(exp_date, "%Y-%m-%d").date()
                                today_dt = datetime.strptime(today_str, "%Y-%m-%d").date()
                                days_left = (exp_dt - today_dt).days
                            except Exception:
                                pass
                            person_data["days_left"] = days_left
                        person_data["membership_status"] = "ACTIVE"
                        person_data["is_alert"] = False
                        person_data["door_open"] = True
                        person_data["access_status"] = "GRANTED"
                        person_data["door_reason"] = f"Auto-Unfrozen Active Member ({plan_name})"
                    else:
                        person_data["membership_status"] = "FROZEN"
                        person_data["is_alert"] = True
                        person_data["alert_type"] = "FROZEN"
                        person_data["alert_message"] = f"Membership is currently FROZEN"
                        person_data["door_open"] = False
                        person_data["access_status"] = "DENIED"
                        person_data["door_reason"] = "Door Locked: Membership FROZEN"
                elif days_left < 0 or m_status == "EXPIRED":
                    person_data["membership_status"] = "EXPIRED"
                    person_data["is_alert"] = True
                    person_data["alert_type"] = "EXPIRED"
                    person_data["alert_message"] = f"Pass EXPIRED on {exp_date} ({abs(days_left)}d ago)"
                    person_data["door_open"] = False
                    person_data["access_status"] = "DENIED"
                    person_data["door_reason"] = f"Door Locked: Pass EXPIRED on {exp_date}"
                elif days_left <= 3:
                    person_data["membership_status"] = "EXPIRING_SOON"
                    person_data["is_alert"] = True
                    person_data["alert_type"] = "EXPIRING_SOON"
                    person_data["alert_message"] = f"Pass expiring in {days_left} day{'s' if days_left != 1 else ''}"
                    person_data["door_open"] = True
                    person_data["access_status"] = "GRANTED"
                    person_data["door_reason"] = f"Door Open: Active Member ({days_left}d left)"
                else:
                    person_data["membership_status"] = "ACTIVE"
                    person_data["door_open"] = True
                    person_data["access_status"] = "GRANTED"
                    person_data["door_reason"] = f"Door Open: Active Member ({plan_name})"
            elif pid and pid != "Unknown":
                # Person without an active membership (Visitor or unassigned member)
                # Apply 5-Day Free Trial Limit:
                past_dates = visit_dates_by_pid.get(pid.lower().strip(), set())
                all_dates = past_dates | {today_str} if is_confirmed else past_dates
                total_visit_days = max(1, len(all_dates)) if (is_confirmed or past_dates) else 0

                person_data["trial_days_used"] = total_visit_days
                person_data["trial_days_left"] = max(0, 5 - total_visit_days)

                if total_visit_days <= 5:
                    # Within 5-Day Free Trial: Allow entry and open door
                    person_data["membership_status"] = "TRIAL"
                    person_data["plan_name"] = f"5-Day Trial (Day {total_visit_days}/5)"
                    person_data["is_alert"] = False
                    person_data["door_open"] = True
                    person_data["access_status"] = "TRIAL_GRANTED"
                    remaining_str = f"{5 - total_visit_days} days left" if (5 - total_visit_days) > 0 else "Last trial day today"
                    person_data["door_reason"] = f"Free Trial: Day {total_visit_days} of 5 ({remaining_str})"
                else:
                    # 6th day onwards (> 5 days): Block entry and keep door locked!
                    person_data["membership_status"] = "TRIAL_EXPIRED"
                    person_data["plan_name"] = f"Trial Over ({total_visit_days}d used)"
                    person_data["is_alert"] = True
                    person_data["alert_type"] = "TRIAL_EXPIRED"
                    person_data["alert_message"] = f"5-Day Free Trial EXPIRED ({total_visit_days} days attended). Door Locked - Membership Required!"
                    person_data["door_open"] = False
                    person_data["access_status"] = "DENIED"
                    person_data["door_reason"] = f"Door Locked: 5-Day Trial Exhausted ({total_visit_days}d visited)"

            # Determine status
            if person_data["confirmed"]:
                person_data["status"] = "CONFIRMED"
                if person_data["is_alert"]:
                    active_alerts.append({
                        "person_id": pid,
                        "name": pname,
                        "membership_status": person_data["membership_status"],
                        "alert_type": person_data["alert_type"],
                        "alert_message": person_data["alert_message"],
                        "expiry_date": person_data["expiry_date"],
                        "days_left": person_data["days_left"],
                        "trial_days_used": person_data.get("trial_days_used", 0),
                        "phone": person_data["phone"],
                        "plan_name": person_data["plan_name"],
                        "timestamp": datetime.now().strftime("%I:%M:%S %p")
                    })
            elif person_data["candidate_name"]:
                person_data["status"] = "VERIFYING"
            else:
                person_data["status"] = "UNKNOWN"
                
            people.append(person_data)

        # Compute overall camera door status
        active_confirmed = [p for p in people if p.get("confirmed")]
        if active_confirmed:
            denied_list = [p for p in active_confirmed if not p.get("door_open", False)]
            if denied_list:
                denied_person = denied_list[0]
                door_status = {
                    "open": False,
                    "status": "LOCKED",
                    "badge": "🔴 DOOR LOCKED",
                    "person_name": denied_person.get("name"),
                    "person_id": denied_person.get("person_id"),
                    "message": denied_person.get("door_reason", "Access Denied"),
                    "trial_info": f"{denied_person.get('trial_days_used', 0)}/5 Days Used" if denied_person.get("alert_type") == "TRIAL_EXPIRED" else None,
                    "color": "#EF4444"
                }
            else:
                granted_person = active_confirmed[0]
                is_trial = granted_person.get("access_status") == "TRIAL_GRANTED"
                door_status = {
                    "open": True,
                    "status": "OPEN",
                    "badge": "🟢 DOOR UNLOCKED",
                    "person_name": granted_person.get("name"),
                    "person_id": granted_person.get("person_id"),
                    "message": granted_person.get("door_reason", "Access Granted"),
                    "trial_info": f"Trial Day {granted_person.get('trial_days_used', 1)} of 5" if is_trial else "Active Member",
                    "color": "#10B981"
                }
        else:
            door_status = {
                "open": False,
                "status": "IDLE",
                "badge": "🔒 DOOR SECURED",
                "person_name": None,
                "person_id": None,
                "message": "Waiting for face detection...",
                "trial_info": None,
                "color": "#64748B"
            }
        
        return {
            "camera": True,
            "fps": recognition_service.get_fps(),
            "faces_detected": len(tracks),
            "active_tracks": len(tracks),
            "registered_people": recognition_service.get_registered_count(),
            "people": people,
            "active_alerts": active_alerts,
            "door_status": door_status
        }
    
    return {
        "camera": False,
        "fps": 0,
        "faces_detected": 0,
        "active_tracks": 0,
        "registered_people": recognition_service.get_registered_count() if recognition_service else 0,
        "people": [],
        "active_alerts": [],
        "door_status": {
            "open": False,
            "status": "OFFLINE",
            "badge": "🔒 DOOR SECURED",
            "person_name": None,
            "person_id": None,
            "message": "Camera is offline",
            "trial_info": None,
            "color": "#64748B"
        }
    }

@app.get("/api/people")
async def get_people():
    """Get all registered people"""
    global recognition_service
    if recognition_service:
        return recognition_service.get_registered_people()
    return []

from datetime import datetime, timedelta

@app.delete("/api/people/{person_id}")
async def unregister_person(person_id: str):
    """Unregister face profile by ID and Auto-Freeze associated active memberships"""
    global recognition_service
    if recognition_service:
        result = recognition_service.unregister_person(person_id)
        if result["success"]:
            # Auto-Freeze associated active membership
            memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
            if os.path.exists(memberships_file):
                try:
                    with open(memberships_file, "r", encoding="utf-8") as f:
                        memberships = json.load(f)
                    if isinstance(memberships, list):
                        today = time.strftime("%Y-%m-%d")
                        for m in memberships:
                            m_pid = (m.get("person_id") or "").lower()
                            if m_pid == person_id.lower():
                                if m.get("status") == "ACTIVE":
                                    m["status"] = "FROZEN"
                                    m["freeze_reason"] = "Auto-Frozen (Face Unregistered)"
                                    m["frozen_at"] = today
                                    m["notes"] = f"Auto-Frozen on {today} due to unregistration"
                        temp_f = memberships_file + ".tmp"
                        with open(temp_f, "w", encoding="utf-8") as f:
                            json.dump(memberships, f, indent=4)
                        os.replace(temp_f, memberships_file)
                except Exception as e:
                    print("Error auto-freezing membership:", e)

            add_event("REGISTRATION", f"Face profile unregistered for {person_id} (Membership Auto-Frozen)")
        return result
    return {"success": False, "message": "Recognition service not available"}

@app.put("/api/people/{person_id}")
async def update_person_name(person_id: str, data: dict):
    """Update person's name, link memberships and Auto-Unfreeze if previously frozen"""
    global recognition_service
    if recognition_service:
        new_name = data.get("name", "").strip()
        new_phone = data.get("phone", "").strip() if "phone" in data else None
        if not new_name and new_phone is None:
            return {"success": False, "message": "Name or phone cannot be empty"}
        
        persons = recognition_service.load_database()
        updated = False
        old_name = ""
        for p in persons:
            if p.get("id") == person_id:
                old_name = p.get("name", "")
                if new_name:
                    p["name"] = new_name
                if new_phone is not None:
                    p["phone"] = new_phone
                updated = True
                break
        
        if updated:
            recognition_service.save_database(persons)
            recognition_service.persons = persons
            
            # Update attendance records
            if new_name:
                attendance = recognition_service.load_attendance()
                att_changed = False
                for a in attendance:
                    if a.get("person_id") == person_id:
                        a["name"] = new_name
                        att_changed = True
                if att_changed:
                    recognition_service.save_attendance(attendance)

            # Update visits records
            if new_name and hasattr(recognition_service, 'load_visits'):
                visits = recognition_service.load_visits()
                vis_changed = False
                for v in visits:
                    if v.get("person_id") == person_id:
                        v["name"] = new_name
                        vis_changed = True
                if vis_changed:
                    recognition_service.save_visits(visits)
            
            # Auto-Unfreeze & link membership if matching name/id found
            memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
            if os.path.exists(memberships_file):
                try:
                    with open(memberships_file, "r", encoding="utf-8") as f:
                        memberships = json.load(f)
                    if isinstance(memberships, list):
                        today_dt = datetime.now()
                        m_changed = False
                        for m in memberships:
                            m_name = (m.get("person_name") or "").lower()
                            m_pid = (m.get("person_id") or "").lower()
                            
                            # Match by name or ID
                            if (new_name and (new_name.lower() == m_name or m_name in new_name.lower())) or person_id.lower() == m_pid:
                                if new_name:
                                    m["person_id"] = person_id
                                    m["person_name"] = new_name
                                if new_phone:
                                    m["phone"] = new_phone
                                m_changed = True
                                
                                # If frozen due to unregistration, unfreeze and extend expiry date!
                                if m.get("status") == "FROZEN":
                                    frozen_at_str = m.get("frozen_at") or m.get("updated_at", "").split("T")[0]
                                    if frozen_at_str:
                                        try:
                                            frozen_dt = datetime.strptime(frozen_at_str[:10], "%Y-%m-%d")
                                            days_frozen = max(0, (today_dt - frozen_dt).days)
                                            if days_frozen > 0 and m.get("expiry_date"):
                                                old_exp = datetime.strptime(m["expiry_date"], "%Y-%m-%d")
                                                new_exp = old_exp + timedelta(days=days_frozen)
                                                m["expiry_date"] = new_exp.strftime("%Y-%m-%d")
                                        except Exception:
                                            pass
                                    m["status"] = "ACTIVE"
                                    m["freeze_reason"] = ""
                                    m["notes"] = f"Auto-Unfrozen & Continued on {today_dt.strftime('%Y-%m-%d')}"
                        
                        if m_changed:
                            temp_f = memberships_file + ".tmp"
                            with open(temp_f, "w", encoding="utf-8") as f:
                                json.dump(memberships, f, indent=4)
                            os.replace(temp_f, memberships_file)
                except Exception as e:
                    print("Error auto-unfreezing membership:", e)
            
            add_event("MEMBERSHIP", f"Updated profile for {new_name or person_id} ({person_id})")
            return {"success": True, "message": f"Updated profile for {new_name or person_id}"}
        return {"success": False, "message": "Person ID not found"}
    return {"success": False, "message": "Recognition service not available"}

@app.post("/api/people/{person_id}/face-image")
async def add_person_face_image(person_id: str, file: UploadFile = File(...)):
    """Upload an additional face photo to extract embedding sample for a person"""
    global recognition_service
    if recognition_service:
        image_bytes = await file.read()
        result = recognition_service.add_person_face_image(person_id, image_bytes)
        if result.get("success"):
            add_event("REGISTRATION", f"Added new face sample photo for {person_id}")
        return result
    return {"success": False, "message": "Recognition service not available"}

from typing import List

@app.post("/api/people/{person_id}/batch-face-images")
async def add_person_batch_face_images(person_id: str, files: List[UploadFile] = File(...)):
    """Upload multiple face photos at once to extract embedding samples for a person"""
    global recognition_service
    if recognition_service:
        bytes_list = []
        for file in files:
            content = await file.read()
            bytes_list.append(content)
        result = recognition_service.add_person_batch_face_images(person_id, bytes_list)
        if result.get("success"):
            add_event("REGISTRATION", f"Added {result.get('added_count', 1)} face sample photos for {person_id}")
        return result
    return {"success": False, "message": "Recognition service not available"}

@app.get("/api/people/{person_id}/face-samples")
async def get_person_face_samples(person_id: str):
    """Get list of stored face sample thumbnails for a person"""
    global recognition_service
    if recognition_service:
        return recognition_service.get_person_face_samples(person_id)
    return []

@app.delete("/api/people/{person_id}/face-samples/{sample_index}")
async def delete_person_face_sample(person_id: str, sample_index: int):
    """Delete an individual stored face sample for a person"""
    global recognition_service
    if recognition_service:
        result = recognition_service.delete_person_face_sample(person_id, sample_index)
        if result.get("success"):
            add_event("REGISTRATION", f"Deleted face sample #{sample_index + 1} for {person_id}")
        return result
    return {"success": False, "message": "Recognition service not available"}

@app.put("/api/people/{person_id}/primary-face-sample/{sample_index}")
async def set_primary_face_sample(person_id: str, sample_index: int):
    """Set a specific sample index as the primary reference embedding and thumbnail for a person"""
    global recognition_service
    if recognition_service:
        result = recognition_service.set_primary_face_sample(person_id, sample_index)
        if result.get("success"):
            add_event("REGISTRATION", f"Set sample #{sample_index + 1} as primary face photo for {person_id}")
        return result
    return {"success": False, "message": "Recognition service not available"}

def resolve_person_names(records):
    """Dynamically sync latest registered person names into attendance and visit records"""
    global recognition_service
    if not recognition_service or not records:
        return records
    persons = recognition_service.persons or []
    people_map = {p.get("id"): p.get("name") for p in persons if p.get("id") and p.get("name")}
    for r in records:
        pid = r.get("person_id")
        if pid in people_map:
            r["name"] = people_map[pid]
            if "person_name" in r:
                r["person_name"] = people_map[pid]
    return records

@app.get("/api/attendance")
async def get_attendance():
    """Get all attendance records"""
    global recognition_service
    if recognition_service:
        return resolve_person_names(recognition_service.load_attendance())
    return []

@app.get("/api/attendance/today")
async def get_today_attendance():
    """Get today's attendance records with trial countdown data"""
    global recognition_service
    if recognition_service:
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        attendance = recognition_service.load_attendance()
        today_attendance = [record for record in attendance if record.get("date") == today]
        records = resolve_person_names(today_attendance)

        # Enrich records with membership status and 5-day trial countdown
        try:
            memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
            visits_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "visits.json")
            memberships = load_json_file(memberships_file)
            visits = load_json_file(visits_file)
            
            memberships_by_pid = {m.get("person_id", "").lower(): m for m in memberships if m.get("person_id")}
            visit_dates_by_pid = {}
            for rec in attendance + visits:
                r_pid = (rec.get("person_id") or "").lower().strip()
                r_date = rec.get("date")
                if r_pid and r_date:
                    if r_pid not in visit_dates_by_pid:
                        visit_dates_by_pid[r_pid] = set()
                    visit_dates_by_pid[r_pid].add(r_date)

            for r in records:
                r_pid = (r.get("person_id") or "").lower().strip()
                mem = memberships_by_pid.get(r_pid)
                if mem and mem.get("status") == "ACTIVE":
                    r["membership_status"] = "ACTIVE"
                    r["is_trial"] = False
                    r["plan_name"] = mem.get("plan_name", "Standard Pass")
                else:
                    distinct_count = len(visit_dates_by_pid.get(r_pid, set()))
                    days_used = max(1, distinct_count)
                    r["trial_days_used"] = days_used
                    r["trial_days_left"] = max(0, 5 - days_used)
                    r["is_trial"] = (days_used <= 5)
                    r["is_trial_expired"] = (days_used > 5)
                    r["membership_status"] = "TRIAL" if (days_used <= 5) else "TRIAL_EXPIRED"
        except Exception as e:
            print("Error enriching attendance with trial info:", e)

        return records
    return []

@app.get("/api/visits")
async def get_visits():
    """Get all visit logs"""
    global recognition_service
    if recognition_service and hasattr(recognition_service, 'load_visits'):
        return resolve_person_names(recognition_service.load_visits())
    return []

@app.get("/api/visits/today")
async def get_today_visits():
    """Get today's visit logs"""
    global recognition_service
    if recognition_service and hasattr(recognition_service, 'load_visits'):
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        visits = recognition_service.load_visits()
        today_visits = [record for record in visits if record.get("date") == today]
        return resolve_person_names(today_visits)
    return []

@app.get("/api/events")
async def get_events():
    """Get recent events"""
    return list(event_log)

@app.delete("/api/events")
async def clear_events():
    """Clear all activity events"""
    global event_log
    event_log.clear()
    add_event("SYSTEM", "Activity log cleared")
    return {"status": "success", "message": "Activity log cleared"}

@app.delete("/api/attendance")
async def delete_attendance(person_id: str, date: str):
    """Delete a specific attendance record"""
    global recognition_service
    if recognition_service:
        attendance = recognition_service.load_attendance()
        updated = [a for a in attendance if not (a.get("person_id") == person_id and a.get("date") == date)]
        recognition_service.save_attendance(updated)
        add_event("ATTENDANCE", f"Deleted attendance record for {person_id} on {date}")
        return {"status": "success", "message": "Attendance record deleted"}
    return {"status": "error", "message": "Recognition service not available"}

@app.delete("/api/visits")
async def delete_visit(person_id: str, date: str, time: str = None):
    """Delete visit records for a person on a specific date (or specific time if provided)"""
    global recognition_service
    if recognition_service and hasattr(recognition_service, 'load_visits'):
        visits = recognition_service.load_visits()
        if time:
            updated = [v for v in visits if not (v.get("person_id") == person_id and v.get("date") == date and v.get("time") == time)]
        else:
            updated = [v for v in visits if not (v.get("person_id") == person_id and v.get("date") == date)]
        recognition_service.save_visits(updated)
        add_event("VISITS", f"Deleted visit record for {person_id} on {date}")
        return {"status": "success", "message": "Visit record deleted"}
    return {"status": "error", "message": "Recognition service not available"}

@app.delete("/api/visits/clear")
async def clear_all_visits():
    """Clear all visit records"""
    global recognition_service
    if recognition_service and hasattr(recognition_service, 'save_visits'):
        recognition_service.save_visits([])
        add_event("VISITS", "Cleared all visit history logs")
        return {"status": "success", "message": "All visit records cleared"}
    return {"status": "error", "message": "Recognition service not available"}

@app.post("/api/camera/start")
async def start_camera():
    """Start the camera"""
    global recognition_service, recognition_thread
    if recognition_service and not recognition_service.is_running():
        recognition_thread = threading.Thread(target=recognition_service.run, daemon=True)
        recognition_thread.start()
        add_event("CAMERA", "Camera started")
        return {"status": "success", "message": "Camera started"}
    return {"status": "error", "message": "Camera already running or service not available"}

@app.post("/api/camera/stop")
async def stop_camera():
    """Stop the camera"""
    global recognition_service
    if recognition_service and recognition_service.is_running():
        recognition_service.stop_reconnect()  # Stop any reconnect attempts
        recognition_service.stop()
        add_event("CAMERA", "Camera stopped")
        return {"status": "success", "message": "Camera stopped"}
    return {"status": "error", "message": "Camera not running or service not available"}

@app.get("/api/camera/status")
async def get_camera_status():
    """Get camera status"""
    global recognition_service
    if recognition_service:
        return recognition_service.get_camera_status()
    return {"source": "webcam", "name": "Webcam", "status": "disconnected", "rtsp_url": ""}

@app.post("/api/camera/source")
async def set_camera_source(request: dict):
    """Set camera source type"""
    global recognition_service
    source_type = request.get("source", "webcam")
    rtsp_url = request.get("rtsp_url", "")
    camera_name = request.get("camera_name", "")
    
    if recognition_service:
        # Stop camera and any reconnect attempts if running
        if recognition_service.is_running():
            recognition_service.stop_reconnect()
            recognition_service.stop()
        
        # Set new source
        recognition_service.set_camera_source(source_type, rtsp_url, camera_name)
        
        add_event("CAMERA", f"Camera source changed to {source_type}")
        return {"status": "success", "message": f"Camera source set to {source_type}"}
    
    return {"status": "error", "message": "Recognition service not available"}

@app.post("/api/register/start")
async def start_registration(request: dict):
    """Start registration for a new person"""
    global recognition_service
    name = request.get("name", "")
    if recognition_service:
        result = recognition_service.start_registration(name)
        if result["success"]:
            add_event("REGISTRATION", f"Registration started for {name}")
        return result
    return {"status": "error", "message": "Recognition service not available"}

@app.post("/api/register/cancel")
async def cancel_registration():
    """Cancel ongoing registration"""
    global recognition_service
    if recognition_service:
        result = recognition_service.cancel_registration()
        if result["success"]:
            add_event("REGISTRATION", "Registration cancelled")
        return result
    return {"status": "error", "message": "Recognition service not available"}

@app.get("/api/settings")
async def get_settings():
    """Get current recognition settings"""
    global recognition_service
    if recognition_service:
        return recognition_service.get_settings()
    return {}

@app.post("/api/settings")
async def update_settings(settings: dict):
    """Update recognition settings"""
    global recognition_service
    if recognition_service:
        result = recognition_service.update_settings(settings)
        if result["success"]:
            add_event("SETTINGS", "Settings updated")
        return result
    return {"status": "error", "message": "Recognition service not available"}

def generate_frames():
    """Generate MJPEG frames from recognition service"""
    global recognition_service
    while True:
        if recognition_service and recognition_service.is_running():
            frame = recognition_service.get_frame()
            if frame is not None:
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.033)  # ~30 FPS

@app.get("/video")
async def video_feed():
    """Video streaming endpoint"""
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

# ============================================================
# MEMBERSHIP MANAGEMENT API ENDPOINTS
# ============================================================

FILE_BASENAME_TO_COLL = {
    "persons.json": "persons",
    "memberships.json": "memberships",
    "membership_plans.json": "membership_plans",
    "payments.json": "payments",
    "attendance.json": "attendance",
    "visits.json": "visits",
    "cafe_orders.json": "cafe_orders",
    "cafe_products.json": "cafe_products",
    "users.json": "users",
}

def load_json_file(filepath, default=[]):
    if mongo.is_connected():
        fname = os.path.basename(filepath)
        coll_name = FILE_BASENAME_TO_COLL.get(fname)
        if coll_name:
            data = mongo.find_all(coll_name)
            if data is not None and len(data) > 0:
                return data
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            return default
    return default

def save_json_file(filepath, data):
    if mongo.is_connected():
        fname = os.path.basename(filepath)
        coll_name = FILE_BASENAME_TO_COLL.get(fname)
        if coll_name and isinstance(data, list):
            mongo.replace_all(coll_name, data)
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving {filepath}: {e}")
        return False

DEFAULT_MEMBERSHIP_PLANS = [
    {"plan_id": "daily", "name": "Daily Pass", "duration": 1, "duration_unit": "day", "price": 300.0, "description": "1 Day Pass"},
    {"plan_id": "weekly", "name": "Weekly Pass", "duration": 7, "duration_unit": "day", "price": 1500.0, "description": "7 Days Pass"},
    {"plan_id": "monthly", "name": "Monthly Standard", "duration": 1, "duration_unit": "month", "price": 5000.0, "description": "30-Day Pass"},
    {"plan_id": "3months", "name": "3 Months (Quarterly)", "duration": 3, "duration_unit": "month", "price": 13500.0, "description": "Quarterly Pass"},
    {"plan_id": "6months", "name": "6 Months (Half-Yearly)", "duration": 6, "duration_unit": "month", "price": 25000.0, "description": "Half-Year Pass"},
    {"plan_id": "yearly", "name": "1 Year VIP Annual", "duration": 1, "duration_unit": "year", "price": 45000.0, "description": "Annual VIP Pass"}
]

@app.get("/api/membership-plans")
async def get_membership_plans():
    """Get all membership plans"""
    plans_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "membership_plans.json")
    plans = load_json_file(plans_file)
    if not plans:
        plans = DEFAULT_MEMBERSHIP_PLANS
        save_json_file(plans_file, plans)
    return plans

@app.post("/api/memberships/{membership_id}/reminder-sent")
async def record_reminder_sent(membership_id: str):
    """Record that a WhatsApp reminder was sent to member"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    for m in memberships:
        if m.get("membership_id") == membership_id:
            from datetime import datetime
            now_iso = datetime.now().isoformat()
            m["reminder_count"] = m.get("reminder_count", 0) + 1
            m["last_reminder_sent"] = now_iso
            save_json_file(memberships_file, memberships)
            add_event("MEMBERSHIP", f"Recorded WhatsApp reminder for {m.get('person_name', membership_id)}")
            return {"status": "success", "message": "Reminder recorded", "data": m}
            
    return {"status": "error", "message": "Membership not found"}

@app.get("/api/memberships")
async def get_memberships():
    """Get all memberships with person details"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    people = recognition_service.get_registered_people() if recognition_service else []
    people_map = {p.get("id"): p.get("name") for p in people}
    people_phone_map = {p.get("id"): p.get("phone", "") for p in people}
    
    for m in memberships:
        pid = m.get("person_id")
        if pid in people_map:
            m["person_name"] = people_map[pid]
        if not m.get("phone") and pid in people_phone_map and people_phone_map[pid]:
            m["phone"] = people_phone_map[pid]
            
    return memberships

@app.get("/api/memberships/summary")
async def get_memberships_summary():
    """Get membership statistics summary"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    payments_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "payments.json")
    
    memberships = load_json_file(memberships_file)
    payments = load_json_file(payments_file)
    
    from datetime import datetime, timedelta
    today_str = datetime.now().strftime("%Y-%m-%d")
    next_week_str = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    total_memberships = len(memberships)
    active_memberships = 0
    expiring_soon = 0
    expired_memberships = 0
    
    for m in memberships:
        status = m.get("status", "ACTIVE")
        expiry = m.get("expiry_date", "")
        
        if status == "ACTIVE":
            if expiry and expiry < today_str:
                expired_memberships += 1
            elif expiry and today_str <= expiry <= next_week_str:
                expiring_soon += 1
                active_memberships += 1
            else:
                active_memberships += 1
        elif status == "EXPIRED":
            expired_memberships += 1
            
    total_revenue = sum(p.get("amount", 0) for p in payments if p.get("payment_status") == "PAID")
    
    return {
        "total_memberships": total_memberships,
        "active_memberships": active_memberships,
        "expiring_soon": expiring_soon,
        "expired_memberships": expired_memberships,
        "total_revenue": total_revenue
    }

@app.post("/api/memberships")
async def create_membership(data: dict):
    """Create a new membership"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    payments_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "payments.json")
    plans_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "membership_plans.json")
    
    memberships = load_json_file(memberships_file)
    payments = load_json_file(payments_file)
    plans = load_json_file(plans_file)
    
    from datetime import datetime, timedelta
    
    existing_ids = [m.get("membership_id", "") for m in memberships]
    new_num = len(memberships) + 1
    new_id = f"M-{new_num:06d}"
    while new_id in existing_ids:
        new_num += 1
        new_id = f"M-{new_num:06d}"
        
    plan_id = data.get("plan_id", "monthly")
    plan_obj = next((p for p in plans if p.get("plan_id") == plan_id), None)
    plan_name = plan_obj.get("name", plan_id.capitalize()) if plan_obj else plan_id.capitalize()
    
    start_date = data.get("start_date") or datetime.now().strftime("%Y-%m-%d")
    expiry_date = data.get("expiry_date")
    
    if not expiry_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            if plan_id == "daily":
                exp_dt = start_dt + timedelta(days=1)
            elif plan_id == "weekly":
                exp_dt = start_dt + timedelta(days=7)
            elif plan_id == "monthly":
                exp_dt = start_dt + timedelta(days=30)
            elif plan_id == "3months":
                exp_dt = start_dt + timedelta(days=90)
            elif plan_id == "6months":
                exp_dt = start_dt + timedelta(days=180)
            elif plan_id == "yearly":
                exp_dt = start_dt + timedelta(days=365)
            else:
                exp_dt = start_dt + timedelta(days=30)
            expiry_date = exp_dt.strftime("%Y-%m-%d")
        except Exception:
            expiry_date = start_date
        
    now_iso = datetime.now().isoformat()
    amount = float(data.get("amount", plan_obj.get("price", 0) if plan_obj else 0))
    
    new_membership = {
        "membership_id": new_id,
        "person_id": data.get("person_id", ""),
        "plan_id": plan_id,
        "plan_name": plan_name,
        "start_date": start_date,
        "expiry_date": expiry_date,
        "status": "ACTIVE",
        "payment_status": data.get("payment_status", "PAID"),
        "amount": amount,
        "phone": data.get("phone", "").strip(),
        "notes": data.get("notes", ""),
        "created_at": now_iso,
        "updated_at": now_iso
    }
    
    memberships.append(new_membership)
    save_json_file(memberships_file, memberships)
    
    if data.get("payment_status") == "PAID" and amount > 0:
        pay_id = f"PAY-{len(payments) + 1:06d}"
        new_payment = {
            "payment_id": pay_id,
            "membership_id": new_id,
            "amount": amount,
            "payment_status": "PAID",
            "payment_date": start_date,
            "payment_method": data.get("payment_method", "CASH"),
            "reference_id": data.get("reference_id", ""),
            "notes": data.get("notes", "New membership payment"),
            "created_at": now_iso
        }
        payments.append(new_payment)
        save_json_file(payments_file, payments)
        
    add_event("MEMBERSHIP", f"Created membership {new_id} for person {data.get('person_id')}")
    return {"status": "success", "message": "Membership created successfully", "data": new_membership}

@app.put("/api/memberships/{membership_id}")
async def update_membership(membership_id: str, data: dict):
    """Update an existing membership"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    for m in memberships:
        if m.get("membership_id") == membership_id:
            from datetime import datetime
            m.update(data)
            m["updated_at"] = datetime.now().isoformat()
            save_json_file(memberships_file, memberships)
            add_event("MEMBERSHIP", f"Updated membership {membership_id}")
            return {"status": "success", "message": "Membership updated successfully", "data": m}
            
    return {"status": "error", "message": "Membership not found"}

@app.post("/api/memberships/{membership_id}/renew")
async def renew_membership(membership_id: str, data: dict):
    """Renew a membership"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    payments_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "payments.json")
    plans_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "membership_plans.json")
    
    memberships = load_json_file(memberships_file)
    payments = load_json_file(payments_file)
    plans = load_json_file(plans_file)
    
    from datetime import datetime, timedelta
    
    target_m = next((m for m in memberships if m.get("membership_id") == membership_id), None)
    if not target_m:
        return {"status": "error", "message": "Membership not found"}
        
    plan_id = data.get("plan_id", target_m.get("plan_id", "monthly"))
    plan_obj = next((p for p in plans if p.get("plan_id") == plan_id), None)
    
    start_date = data.get("start_date") or datetime.now().strftime("%Y-%m-%d")
    expiry_date = data.get("expiry_date")
    
    if not expiry_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            if plan_id == "daily":
                exp_dt = start_dt + timedelta(days=1)
            elif plan_id == "weekly":
                exp_dt = start_dt + timedelta(days=7)
            elif plan_id == "monthly":
                exp_dt = start_dt + timedelta(days=30)
            elif plan_id == "3months":
                exp_dt = start_dt + timedelta(days=90)
            elif plan_id == "6months":
                exp_dt = start_dt + timedelta(days=180)
            elif plan_id == "yearly":
                exp_dt = start_dt + timedelta(days=365)
            else:
                exp_dt = start_dt + timedelta(days=30)
            expiry_date = exp_dt.strftime("%Y-%m-%d")
        except Exception:
            expiry_date = start_date
        
    amount = float(data.get("amount", plan_obj.get("price", 0) if plan_obj else 0))
    now_iso = datetime.now().isoformat()
    
    target_m["plan_id"] = plan_id
    if plan_obj:
        target_m["plan_name"] = plan_obj.get("name")
    target_m["start_date"] = start_date
    target_m["expiry_date"] = expiry_date
    target_m["status"] = "ACTIVE"
    target_m["payment_status"] = "PAID"
    target_m["updated_at"] = now_iso
    
    save_json_file(memberships_file, memberships)
    
    pay_id = f"PAY-{len(payments) + 1:06d}"
    new_payment = {
        "payment_id": pay_id,
        "membership_id": membership_id,
        "amount": amount,
        "payment_status": "PAID",
        "payment_date": start_date,
        "payment_method": data.get("payment_method", "CASH"),
        "reference_id": data.get("reference_id", ""),
        "notes": "Membership renewal payment",
        "created_at": now_iso
    }
    payments.append(new_payment)
    save_json_file(payments_file, payments)
    
    add_event("MEMBERSHIP", f"Renewed membership {membership_id}")
    return {"status": "success", "message": "Membership renewed successfully", "data": target_m}

@app.post("/api/memberships/{membership_id}/freeze")
async def freeze_membership(membership_id: str, data: dict):
    """Freeze a membership"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    for m in memberships:
        if m.get("membership_id") == membership_id:
            from datetime import datetime
            m["status"] = "FROZEN"
            m["freeze_reason"] = data.get("reason", "")
            m["frozen_at"] = datetime.now().strftime("%Y-%m-%d")
            m["updated_at"] = datetime.now().isoformat()
            save_json_file(memberships_file, memberships)
            add_event("MEMBERSHIP", f"Froze membership {membership_id} (Reason: {data.get('reason', 'N/A')})")
            return {"status": "success", "message": "Membership frozen successfully", "data": m}
            
    return {"status": "error", "message": "Membership not found"}

@app.post("/api/memberships/{membership_id}/unfreeze")
async def unfreeze_membership(membership_id: str):
    """Unfreeze a membership and extend expiry date by frozen duration"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    for m in memberships:
        if m.get("membership_id") == membership_id:
            from datetime import datetime, timedelta
            today_dt = datetime.now()
            today_str = today_dt.strftime("%Y-%m-%d")
            frozen_at_str = m.get("frozen_at") or (m.get("updated_at") or "").split("T")[0]
            days_frozen = 0
            if frozen_at_str:
                try:
                    frozen_dt = datetime.strptime(frozen_at_str[:10], "%Y-%m-%d")
                    days_frozen = max(0, (today_dt.date() - frozen_dt.date()).days)
                except Exception:
                    days_frozen = 0
                    
            if days_frozen > 0 and m.get("expiry_date"):
                try:
                    old_exp = datetime.strptime(m["expiry_date"], "%Y-%m-%d")
                    new_exp = old_exp + timedelta(days=days_frozen)
                    m["expiry_date"] = new_exp.strftime("%Y-%m-%d")
                except Exception as ex:
                    print(f"Error extending expiry date: {ex}")
                    
            m["status"] = "ACTIVE"
            m["freeze_reason"] = ""
            m["unfrozen_at"] = today_str
            m["updated_at"] = today_dt.isoformat()
            if days_frozen > 0:
                m["notes"] = (m.get("notes", "") + f" | Unfrozen on {today_str} (extended {days_frozen}d)").strip(" |")
            save_json_file(memberships_file, memberships)
            add_event("MEMBERSHIP", f"Unfroze membership {membership_id}" + (f" (extended {days_frozen}d)" if days_frozen > 0 else ""))
            return {"status": "success", "message": "Membership unfrozen successfully", "data": m}
            
    return {"status": "error", "message": "Membership not found"}

@app.post("/api/memberships/{membership_id}/cancel")
async def cancel_membership(membership_id: str, data: dict = {}):
    """Cancel a membership"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    for m in memberships:
        if m.get("membership_id") == membership_id:
            from datetime import datetime
            m["status"] = "CANCELLED"
            m["cancel_reason"] = data.get("reason", "")
            m["updated_at"] = datetime.now().isoformat()
            save_json_file(memberships_file, memberships)
            add_event("MEMBERSHIP", f"Cancelled membership {membership_id}")
            return {"status": "success", "message": "Membership cancelled successfully", "data": m}
            
    return {"status": "error", "message": "Membership not found"}

@app.delete("/api/memberships/{membership_id}")
async def delete_membership(membership_id: str):
    """Delete a membership"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    initial_count = len(memberships)
    memberships = [m for m in memberships if m.get("membership_id") != membership_id]
    
    if len(memberships) < initial_count:
        save_json_file(memberships_file, memberships)
        add_event("MEMBERSHIP", f"Deleted membership {membership_id}")
        return {"status": "success", "message": "Membership deleted successfully"}
        
    return {"status": "error", "message": "Membership not found"}

@app.get("/api/memberships/{membership_id}/history")
async def get_membership_history(membership_id: str):
    """Get payment and history for a membership"""
    payments_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "payments.json")
    payments = load_json_file(payments_file)
    
    history = [p for p in payments if p.get("membership_id") == membership_id]
    return history

@app.get("/api/analytics/dashboard")
async def get_dashboard_analytics():
    """Get monthly revenue trends, hourly rush distributions, and key KPIs"""
    payments_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "payments.json")
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    attendance_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "attendance.json")
    visits_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "visits.json")
    
    payments = load_json_file(payments_file)
    memberships = load_json_file(memberships_file)
    attendance = load_json_file(attendance_file)
    visits = load_json_file(visits_file)
    
    from datetime import datetime, timedelta
    now = datetime.now()
    month_keys = []
    month_data = {}
    
    for i in range(5, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        key = f"{y:04d}-{m:02d}"
        label = datetime(y, m, 1).strftime("%b %Y")
        month_keys.append(key)
        month_data[key] = {
            "month": key,
            "label": label,
            "revenue": 0.0,
            "transactions": 0,
            "renewals": 0,
            "new_passes": 0
        }
        
    for p in payments:
        p_date = p.get("payment_date") or (p.get("created_at") or "")[:10]
        if p_date and len(p_date) >= 7:
            m_key = p_date[:7]
            if m_key in month_data:
                amt = float(p.get("amount", 0))
                month_data[m_key]["revenue"] += amt
                month_data[m_key]["transactions"] += 1
                if "Renew" in p.get("notes", "") or "RENEW" in p.get("reference_id", ""):
                    month_data[m_key]["renewals"] += 1
                else:
                    month_data[m_key]["new_passes"] += 1

    if sum(m_item["revenue"] for m_item in month_data.values()) == 0:
        for m in memberships:
            m_date = (m.get("start_date") or (m.get("created_at") or "")[:10])
            if m_date and len(m_date) >= 7:
                m_key = m_date[:7]
                if m_key in month_data:
                    month_data[m_key]["revenue"] += float(m.get("amount", 0))
                    month_data[m_key]["transactions"] += 1
                    month_data[m_key]["new_passes"] += 1

    monthly_revenue = [month_data[k] for k in month_keys]
    
    # Hourly Rush Distribution (06:00 to 22:00)
    hourly_counts = {h: 0 for h in range(6, 23)}
    
    for a in attendance:
        t_str = a.get("first_detected", "")
        if t_str and ":" in t_str:
            try:
                hour = int(t_str.split(":")[0])
                if 6 <= hour <= 22:
                    hourly_counts[hour] += 1
            except Exception:
                pass
                
    for v in visits:
        t_str = v.get("first_detected", "")
        if t_str and ":" in t_str:
            try:
                hour = int(t_str.split(":")[0])
                if 6 <= hour <= 22:
                    hourly_counts[hour] += 1
            except Exception:
                pass

    max_rush_hour = max(hourly_counts, key=hourly_counts.get) if any(hourly_counts.values()) else 18
    max_count = hourly_counts.get(max_rush_hour, 0)
    
    hourly_rush = []
    for h in range(6, 23):
        cnt = hourly_counts[h]
        if cnt >= max_count * 0.75 and cnt > 0:
            intensity = "peak"
        elif cnt >= max_count * 0.4 and cnt > 0:
            intensity = "moderate"
        elif cnt > 0:
            intensity = "light"
        else:
            intensity = "quiet"
            
        period = "AM" if h < 12 else "PM"
        display_h = h if h <= 12 else h - 12
        if display_h == 0:
            display_h = 12
        label = f"{display_h:02d}:00 {period}"
        
        hourly_rush.append({
            "hour": h,
            "label": label,
            "count": cnt,
            "intensity": intensity
        })

    curr_month_key = now.strftime("%Y-%m")
    prev_month = (now.replace(day=1) - timedelta(days=1))
    prev_month_key = prev_month.strftime("%Y-%m")
    
    this_month_rev = month_data.get(curr_month_key, {}).get("revenue", 0.0)
    prev_month_rev = month_data.get(prev_month_key, {}).get("revenue", 0.0)
    
    growth_pct = 0
    if prev_month_rev > 0:
        growth_pct = round(((this_month_rev - prev_month_rev) / prev_month_rev) * 100, 1)
        
    active_members_count = sum(1 for m in memberships if m.get("status") == "ACTIVE")
    
    today_str = now.strftime("%Y-%m-%d")
    today_attendance = sum(1 for a in attendance if a.get("date") == today_str)
    
    peak_start = max_rush_hour
    peak_end = min(22, max_rush_hour + 2)
    peak_rush_label = f"{peak_start if peak_start <= 12 else peak_start-12}:00 {'AM' if peak_start < 12 else 'PM'} - {peak_end if peak_end <= 12 else peak_end-12}:00 {'AM' if peak_end < 12 else 'PM'}"

    return {
        "monthly_revenue": monthly_revenue,
        "hourly_rush": hourly_rush,
        "kpis": {
            "this_month_revenue": this_month_rev,
            "prev_month_revenue": prev_month_rev,
            "growth_percentage": growth_pct,
            "active_members": active_members_count,
            "today_attendance": today_attendance,
            "busiest_hour": f"{max_rush_hour if max_rush_hour <= 12 else max_rush_hour-12}:00 {'AM' if max_rush_hour < 12 else 'PM'}",
            "peak_rush_window": peak_rush_label,
            "total_lifetime_revenue": sum(float(p.get("amount", 0)) for p in payments) or sum(float(m.get("amount", 0)) for m in memberships)
        }
    }

@app.get("/api/people/{person_id}/profile")
async def get_member_profile(person_id: str):
    """Get complete detailed profile, attendance heatmap, streaks, and payment history"""
    global recognition_service
    people = recognition_service.get_registered_people() if recognition_service else []
    person = next((p for p in people if p.get("id") == person_id or p.get("person_id") == person_id), None)
    
    if not person:
        db_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "persons.json")
        all_persons = load_json_file(db_file)
        person = next((p for p in all_persons if p.get("id") == person_id or p.get("person_id") == person_id), None)
        
    if not person:
        return {"status": "error", "message": "Person not found"}

    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    payments_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "payments.json")
    attendance_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "attendance.json")
    
    memberships = load_json_file(memberships_file)
    payments = load_json_file(payments_file)
    attendance = load_json_file(attendance_file)
    
    user_memberships = [m for m in memberships if (m.get("person_id") or "").lower() == person_id.lower()]
    active_membership = next((m for m in user_memberships if m.get("status") in ["ACTIVE", "FROZEN"]), None)
    if not active_membership and user_memberships:
        active_membership = user_memberships[0]
        
    user_att = [a for a in attendance if (a.get("person_id") or "").lower() == person_id.lower()]
    user_att.sort(key=lambda x: (x.get("date", ""), x.get("first_detected", "")), reverse=True)
    
    att_calendar = {}
    for a in user_att:
        d = a.get("date")
        if d:
            att_calendar[d] = {
                "attended": True,
                "first_detected": a.get("first_detected", ""),
                "camera_name": a.get("camera_name", "Gate CCTV")
            }
            
    dates_attended = sorted(list(set(att_calendar.keys())), reverse=True)
    from datetime import datetime, timedelta
    today = datetime.now().date()
    
    current_streak = 0
    best_streak = 0
    
    if dates_attended:
        try:
            latest_date = datetime.strptime(dates_attended[0], "%Y-%m-%d").date()
            if (today - latest_date).days <= 1:
                streak_d = latest_date
                while streak_d.strftime("%Y-%m-%d") in att_calendar:
                    current_streak += 1
                    streak_d -= timedelta(days=1)
        except Exception:
            pass
                
    if dates_attended:
        try:
            temp_streak = 1
            sorted_asc = sorted([datetime.strptime(d, "%Y-%m-%d").date() for d in dates_attended])
            best_streak = 1
            for i in range(1, len(sorted_asc)):
                if sorted_asc[i] == sorted_asc[i-1] + timedelta(days=1):
                    temp_streak += 1
                    best_streak = max(best_streak, temp_streak)
                elif sorted_asc[i] > sorted_asc[i-1] + timedelta(days=1):
                    temp_streak = 1
        except Exception:
            best_streak = len(dates_attended)

    curr_month_str = today.strftime("%Y-%m")
    visits_this_month = sum(1 for d in dates_attended if d.startswith(curr_month_str))
    
    user_mem_ids = [m.get("membership_id") for m in user_memberships]
    user_payments = [p for p in payments if p.get("membership_id") in user_mem_ids]
    
    total_paid = sum(float(p.get("amount", 0)) for p in user_payments)
    if total_paid == 0 and active_membership:
        total_paid = float(active_membership.get("amount", 0))

    # Cafe History & Nutrition Metrics
    cafe_orders_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "cafe_orders.json")
    cafe_orders_all = load_json_file(cafe_orders_file, default=[])
    user_cafe_orders = [
        o for o in cafe_orders_all 
        if (o.get("person_id") or "").lower() == person_id.lower() 
        and o.get("order_status") != "CANCELLED"
    ]
    total_cafe_spent = sum(float(o.get("total_amount", 0)) for o in user_cafe_orders)
    total_cafe_protein = 0.0
    total_cafe_calories = 0
    for o in user_cafe_orders:
        for itm in o.get("items", []):
            qty = itm.get("qty", 1)
            total_cafe_protein += float(itm.get("protein_g", 0.0)) * qty
            total_cafe_calories += int(itm.get("calories", 0)) * qty

    cafe_tab_balance = float(active_membership.get("cafe_tab_balance", 0.0)) if active_membership else 0.0

    return {
        "status": "success",
        "person": {
            "person_id": person_id,
            "name": person.get("name", "Unknown"),
            "phone": person.get("phone", "") or (active_membership.get("phone") if active_membership else ""),
            "created_at": person.get("created_at", ""),
            "is_registered": True
        },
        "membership": active_membership,
        "all_memberships": user_memberships,
        "metrics": {
            "current_streak": current_streak,
            "best_streak": best_streak,
            "visits_this_month": visits_this_month,
            "total_lifetime_visits": len(dates_attended),
            "total_paid_pkr": total_paid,
            "last_visit_date": dates_attended[0] if dates_attended else None
        },
        "attendance_calendar": att_calendar,
        "recent_attendance": user_att[:20],
        "payments_history": user_payments,
        "cafe_metrics": {
            "total_spent_pkr": round(total_cafe_spent, 2),
            "total_protein_g": round(total_cafe_protein, 1),
            "total_calories_kcal": total_cafe_calories,
            "cafe_tab_balance": round(cafe_tab_balance, 2),
            "orders_count": len(user_cafe_orders)
        },
        "cafe_history": list(reversed(user_cafe_orders))
    }


@app.post("/api/memberships/{person_id}/freeze")
async def freeze_membership(person_id: str, x_role: Optional[str] = Header(None, alias="X-User-Role")):
    """Freeze / pause membership validity (Manager & Admin only)"""
    if x_role and x_role.upper() == "RECEPTIONIST":
        raise HTTPException(status_code=403, detail="Permission Denied: Receptionist cannot freeze passes")

    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    found = False

    for m in memberships:
        if (m.get("person_id") or "").lower() == person_id.lower() and m.get("status") == "ACTIVE":
            m["status"] = "FROZEN"
            m["frozen_at"] = datetime.now().isoformat()
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Active membership not found for this member")

    save_json_file(memberships_file, memberships)
    return {"status": "success", "message": f"Membership for {person_id} has been FROZEN (paused)."}


@app.post("/api/memberships/{person_id}/unfreeze")
async def unfreeze_membership(person_id: str, x_role: Optional[str] = Header(None, alias="X-User-Role")):
    """Unfreeze / resume membership validity and extend expiry date (Manager & Admin only)"""
    if x_role and x_role.upper() == "RECEPTIONIST":
        raise HTTPException(status_code=403, detail="Permission Denied: Receptionist cannot unfreeze passes")

    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    found = False

    for m in memberships:
        if (m.get("person_id") or "").lower() == person_id.lower() and m.get("status") == "FROZEN":
            frozen_at_str = m.get("frozen_at")
            days_frozen = 1
            if frozen_at_str:
                try:
                    f_date = datetime.fromisoformat(frozen_at_str.replace("Z", ""))
                    days_frozen = max(1, (datetime.now() - f_date).days)
                except Exception:
                    pass

            # Extend expiry date by days_frozen
            exp_str = m.get("expiry_date")
            if exp_str:
                try:
                    cur_exp = datetime.strptime(exp_str[:10], "%Y-%m-%d")
                    new_exp = cur_exp + timedelta(days=days_frozen)
                    m["expiry_date"] = new_exp.strftime("%Y-%m-%d")
                except Exception:
                    pass

            m["status"] = "ACTIVE"
            m["unfrozen_at"] = datetime.now().isoformat()
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Frozen membership not found for this member")

    save_json_file(memberships_file, memberships)
    return {"status": "success", "message": f"Membership for {person_id} RESUMED and expiry extended by {days_frozen} day(s)."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)