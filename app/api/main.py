import sys
import os

# Add the recognition module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'recognition'))

from fastapi import FastAPI, Response
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

app = FastAPI(title="Person Identity System API")

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
    """Get current recognition state"""
    global recognition_service
    if recognition_service:
        tracks = recognition_service.get_tracks()
        people = []
        
        for i, track in enumerate(tracks):
            person_data = {
                "track_id": i,
                "person_id": track.get("id", "Unknown"),
                "name": track.get("name", "Unknown"),
                "similarity": track.get("score", 0.0),
                "face_confidence": track.get("confidence", 0.0),
                "bbox": track.get("bbox"),
                "confirmed": track.get("confirmed", False),
                "candidate_name": track.get("candidate_name"),
                "candidate_hits": track.get("candidate_hits", 0),
                "candidate_scores": track.get("candidate_scores", []),
                "last_seen_frame": track.get("last_seen_frame"),
                "last_embed_frame": track.get("last_embed_frame")
            }
            
            # Determine status
            if person_data["confirmed"]:
                person_data["status"] = "CONFIRMED"
            elif person_data["candidate_name"]:
                person_data["status"] = "VERIFYING"
            else:
                person_data["status"] = "UNKNOWN"
                
            people.append(person_data)
        
        return {
            "camera": recognition_service.is_running(),
            "fps": recognition_service.get_fps(),
            "faces_detected": len(tracks),
            "active_tracks": len(tracks),
            "registered_people": recognition_service.get_registered_count(),
            "people": people
        }
    
    return {
        "camera": False,
        "fps": 0,
        "faces_detected": 0,
        "active_tracks": 0,
        "registered_people": 0,
        "people": []
    }

@app.get("/api/people")
async def get_people():
    """Get all registered people"""
    global recognition_service
    if recognition_service:
        return recognition_service.get_registered_people()
    return []

@app.delete("/api/people/{person_id}")
async def unregister_person(person_id: str):
    """Unregister a person by ID"""
    global recognition_service
    if recognition_service:
        result = recognition_service.unregister_person(person_id)
        if result["success"]:
            add_event("REGISTRATION", f"Person unregistered: {person_id}")
        return result
    return {"success": False, "message": "Recognition service not available"}

@app.put("/api/people/{person_id}")
async def update_person_name(person_id: str, data: dict):
    """Update person's name"""
    global recognition_service
    if recognition_service:
        new_name = data.get("name", "").strip()
        if not new_name:
            return {"success": False, "message": "Name cannot be empty"}
        
        persons = recognition_service.load_database()
        updated = False
        old_name = ""
        for p in persons:
            if p.get("id") == person_id:
                old_name = p.get("name", "")
                p["name"] = new_name
                updated = True
                break
        
        if updated:
            recognition_service.save_database(persons)
            recognition_service.persons = persons
            
            # Update attendance records
            attendance = recognition_service.load_attendance()
            att_changed = False
            for a in attendance:
                if a.get("person_id") == person_id:
                    a["name"] = new_name
                    att_changed = True
            if att_changed:
                recognition_service.save_attendance(attendance)
            
            add_event("REGISTRATION", f"Renamed {person_id} from '{old_name}' to '{new_name}'")
            return {"success": True, "message": f"Updated name to {new_name}"}
        return {"success": False, "message": "Person ID not found"}
    return {"success": False, "message": "Recognition service not available"}

@app.get("/api/attendance")
async def get_attendance():
    """Get all attendance records"""
    global recognition_service
    if recognition_service:
        return recognition_service.load_attendance()
    return []

@app.get("/api/attendance/today")
async def get_today_attendance():
    """Get today's attendance records"""
    global recognition_service
    if recognition_service:
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        attendance = recognition_service.load_attendance()
        today_attendance = [record for record in attendance if record.get("date") == today]
        return today_attendance
    return []

@app.get("/api/visits")
async def get_visits():
    """Get all visit logs"""
    global recognition_service
    if recognition_service and hasattr(recognition_service, 'load_visits'):
        return recognition_service.load_visits()
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
        return today_visits
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

def load_json_file(filepath, default=[]):
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            return default
    return default

def save_json_file(filepath, data):
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving {filepath}: {e}")
        return False

@app.get("/api/membership-plans")
async def get_membership_plans():
    """Get all membership plans"""
    plans_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "membership_plans.json")
    return load_json_file(plans_file)

@app.get("/api/memberships")
async def get_memberships():
    """Get all memberships with person details"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    people = recognition_service.get_registered_people() if recognition_service else []
    people_map = {p.get("id"): p.get("name") for p in people}
    
    for m in memberships:
        pid = m.get("person_id")
        if pid in people_map:
            m["person_name"] = people_map[pid]
            
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
            m["updated_at"] = datetime.now().isoformat()
            save_json_file(memberships_file, memberships)
            add_event("MEMBERSHIP", f"Froze membership {membership_id}")
            return {"status": "success", "message": "Membership frozen successfully", "data": m}
            
    return {"status": "error", "message": "Membership not found"}

@app.post("/api/memberships/{membership_id}/unfreeze")
async def unfreeze_membership(membership_id: str):
    """Unfreeze a membership"""
    memberships_file = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
    memberships = load_json_file(memberships_file)
    
    for m in memberships:
        if m.get("membership_id") == membership_id:
            from datetime import datetime
            m["status"] = "ACTIVE"
            m["updated_at"] = datetime.now().isoformat()
            save_json_file(memberships_file, memberships)
            add_event("MEMBERSHIP", f"Unfroze membership {membership_id}")
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)