import os
import json
import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/workout", tags=["Workout & Training"])

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
TEMPLATES_FILE = os.path.join(DATA_DIR, "workout_templates.json")
LOGS_FILE = os.path.join(DATA_DIR, "workout_logs.json")
CUSTOM_EXERCISES_FILE = os.path.join(DATA_DIR, "custom_exercises.json")

# -------------------------------------------------------------------------
# Built-in Standard Exercise Database
# -------------------------------------------------------------------------
STANDARD_EXERCISES = [
    # Chest
    {"id": "std-1", "name": "Barbell Flat Bench Press", "category": "Chest", "equipment": "Barbell", "target": "Mid Chest", "default_sets": 4, "default_reps": "8-10"},
    {"id": "std-2", "name": "Incline Dumbbell Bench Press", "category": "Chest", "equipment": "Dumbbells", "target": "Upper Chest", "default_sets": 4, "default_reps": "10-12"},
    {"id": "std-3", "name": "Flat Dumbbell Press", "category": "Chest", "equipment": "Dumbbells", "target": "Mid Chest", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-4", "name": "Cable Chest Flyes", "category": "Chest", "equipment": "Cable", "target": "Chest Isolation", "default_sets": 3, "default_reps": "12-15"},
    {"id": "std-5", "name": "Chest Dips", "category": "Chest", "equipment": "Bodyweight", "target": "Lower Chest", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-6", "name": "Push-Ups", "category": "Chest", "equipment": "Bodyweight", "target": "Chest & Core", "default_sets": 3, "default_reps": "15-20"},

    # Back
    {"id": "std-7", "name": "Conventional Deadlift", "category": "Back", "equipment": "Barbell", "target": "Lower Back & Posterior Chain", "default_sets": 4, "default_reps": "5-8"},
    {"id": "std-8", "name": "Lat Pulldown (Wide Grip)", "category": "Back", "equipment": "Cable Machine", "target": "Lats Width", "default_sets": 4, "default_reps": "10-12"},
    {"id": "std-9", "name": "Seated Cable Row (Close Grip)", "category": "Back", "equipment": "Cable Machine", "target": "Mid Back & Rhomboids", "default_sets": 4, "default_reps": "10-12"},
    {"id": "std-10", "name": "Barbell Bent-Over Row", "category": "Back", "equipment": "Barbell", "target": "Upper Back & Lats", "default_sets": 4, "default_reps": "8-10"},
    {"id": "std-11", "name": "Single-Arm Dumbbell Row", "category": "Back", "equipment": "Dumbbells", "target": "Lower Lats", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-12", "name": "Pull-Ups / Chin-Ups", "category": "Back", "equipment": "Bodyweight", "target": "Upper Lats & Biceps", "default_sets": 3, "default_reps": "8-12"},
    {"id": "std-13", "name": "Face Pulls", "category": "Back", "equipment": "Rope Cable", "target": "Rear Delts & Upper Back", "default_sets": 4, "default_reps": "15-20"},

    # Legs & Glutes
    {"id": "std-14", "name": "Barbell Back Squats", "category": "Legs", "equipment": "Barbell", "target": "Quads & Glutes", "default_sets": 4, "default_reps": "8-10"},
    {"id": "std-15", "name": "Leg Press 45°", "category": "Legs", "equipment": "Machine", "target": "Quad Sweep", "default_sets": 4, "default_reps": "10-12"},
    {"id": "std-16", "name": "Romanian Deadlift (RDL)", "category": "Legs", "equipment": "Barbell / Dumbbell", "target": "Hamstrings & Glutes", "default_sets": 4, "default_reps": "10-12"},
    {"id": "std-17", "name": "Seated Leg Extension Machine", "category": "Legs", "equipment": "Machine", "target": "Quad Teardrop", "default_sets": 3, "default_reps": "12-15"},
    {"id": "std-18", "name": "Lying / Seated Leg Curls", "category": "Legs", "equipment": "Machine", "target": "Hamstrings", "default_sets": 3, "default_reps": "12-15"},
    {"id": "std-19", "name": "Walking Dumbbell Lunges", "category": "Legs", "equipment": "Dumbbells", "target": "Glutes & Quads", "default_sets": 3, "default_reps": "12 steps/leg"},
    {"id": "std-20", "name": "Standing Calf Raises", "category": "Legs", "equipment": "Machine / Dumbbells", "target": "Gastrocnemius", "default_sets": 4, "default_reps": "15-20"},
    {"id": "std-21", "name": "Bulgarian Split Squats", "category": "Legs", "equipment": "Dumbbells", "target": "Glutes & Single Leg", "default_sets": 3, "default_reps": "10-12/leg"},
    {"id": "std-22", "name": "Barbell Hip Thrusts", "category": "Legs", "equipment": "Barbell", "target": "Glute Max", "default_sets": 4, "default_reps": "10-12"},

    # Shoulders
    {"id": "std-23", "name": "Overhead Shoulder Press", "category": "Shoulders", "equipment": "Barbell", "target": "Anterior Delts & Strength", "default_sets": 4, "default_reps": "8-10"},
    {"id": "std-24", "name": "Seated Dumbbell Shoulder Press", "category": "Shoulders", "equipment": "Dumbbells", "target": "Deltoids", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-25", "name": "Standing Lateral Dumbbell Raises", "category": "Shoulders", "equipment": "Dumbbells", "target": "Lateral Side Delts", "default_sets": 4, "default_reps": "12-15"},
    {"id": "std-26", "name": "Front Dumbbell Raises", "category": "Shoulders", "equipment": "Dumbbells", "target": "Front Delts", "default_sets": 3, "default_reps": "12-15"},
    {"id": "std-27", "name": "Arnold Dumbbell Press", "category": "Shoulders", "equipment": "Dumbbells", "target": "Full Shoulder Rotation", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-28", "name": "Reverse Pec Deck Flyes", "category": "Shoulders", "equipment": "Machine", "target": "Rear Delts", "default_sets": 3, "default_reps": "12-15"},

    # Arms (Biceps & Triceps)
    {"id": "std-29", "name": "EZ-Bar Standing Bicep Curls", "category": "Arms", "equipment": "EZ Bar", "target": "Biceps Peak", "default_sets": 4, "default_reps": "10-12"},
    {"id": "std-30", "name": "Incline Dumbbell Bicep Curls", "category": "Arms", "equipment": "Dumbbells", "target": "Biceps Long Head", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-31", "name": "Dumbbell Hammer Curls", "category": "Arms", "equipment": "Dumbbells", "target": "Brachialis & Forearms", "default_sets": 3, "default_reps": "12-15"},
    {"id": "std-32", "name": "Preacher Curl", "category": "Arms", "equipment": "EZ Bar / Dumbbells", "target": "Biceps Short Head", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-33", "name": "Rope Cable Triceps Pushdown", "category": "Arms", "equipment": "Cable Machine", "target": "Triceps Lateral", "default_sets": 4, "default_reps": "12-15"},
    {"id": "std-34", "name": "Skull Crushers (Lying Triceps)", "category": "Arms", "equipment": "EZ Bar", "target": "Triceps Medial & Long", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-35", "name": "Overhead Dumbbell Triceps Extension", "category": "Arms", "equipment": "Dumbbell", "target": "Triceps Long Head", "default_sets": 3, "default_reps": "10-12"},

    # Core & Cardio
    {"id": "std-36", "name": "Hanging Knee / Leg Raises", "category": "Core", "equipment": "Pull-up Bar", "target": "Lower Abs", "default_sets": 4, "default_reps": "15-20"},
    {"id": "std-37", "name": "Cable Woodchoppers (Obliques)", "category": "Core", "equipment": "Cable", "target": "Side Obliques", "default_sets": 3, "default_reps": "15 reps/side"},
    {"id": "std-38", "name": "Plank Holds", "category": "Core", "equipment": "Bodyweight", "target": "Core Stability", "default_sets": 3, "default_reps": "60 secs"},
    {"id": "std-39", "name": "Ab Wheel Rollout", "category": "Core", "equipment": "Ab Roller", "target": "Total Rectus Abdominis", "default_sets": 3, "default_reps": "10-12"},
    {"id": "std-40", "name": "Treadmill Incline Walk / Jog", "category": "Cardio", "equipment": "Treadmill", "target": "Cardiovascular Stamina", "default_sets": 1, "default_reps": "20 mins"},
    {"id": "std-41", "name": "Battle Ropes HIIT", "category": "Cardio", "equipment": "Battle Ropes", "target": "Fat Burn & Stamina", "default_sets": 4, "default_reps": "30 secs"}
]

# -------------------------------------------------------------------------
# Helper Functions for File & MongoDB Cloud Persistence
# -------------------------------------------------------------------------
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from db import mongo

def _get_collection_name(file_path: str) -> Optional[str]:
    if file_path == LOGS_FILE:
        return "workout_logs"
    elif file_path == TEMPLATES_FILE:
        return "workout_templates"
    elif file_path == CUSTOM_EXERCISES_FILE:
        return "custom_exercises"
    return None

def _load_json(file_path: str, default_val: Any) -> Any:
    coll_name = _get_collection_name(file_path)
    if coll_name and mongo.is_connected():
        try:
            docs = mongo.find_all(coll_name)
            if docs:
                if isinstance(default_val, list):
                    return docs
                elif isinstance(default_val, dict):
                    res = {}
                    for d in docs:
                        k = d.get("member_id") or d.get("key")
                        if k:
                            res[k] = d.get("items") or d.get("templates") or d.get("exercises") or []
                    if res:
                        return res
        except Exception as e:
            print(f"[MongoDB] Workout load notice for {coll_name}: {e}")

    if not os.path.exists(file_path):
        return default_val
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default_val

def _save_json(file_path: str, data: Any):
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        temp_path = file_path + ".tmp"
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp_path, file_path)
    except Exception as e:
        pass

    coll_name = _get_collection_name(file_path)
    if coll_name and mongo.is_connected():
        try:
            if isinstance(data, list):
                mongo.replace_all(coll_name, data)
            elif isinstance(data, dict):
                docs = [{"member_id": k, "items": v} for k, v in data.items()]
                mongo.replace_all(coll_name, docs)
        except Exception as e:
            print(f"[MongoDB] Workout save notice for {coll_name}: {e}")

def _normalize_id(mem_id: str) -> str:
    return str(mem_id).strip().upper()

def _get_default_starter_templates(member_id: str) -> List[Dict[str, Any]]:
    return [
        {
            "id": f"tpl-{uuid.uuid4().hex[:8]}",
            "name": "Push Day (Chest, Shoulders, Triceps)",
            "description": "Upper body pushing power focused on chest, shoulders and triceps.",
            "target_muscle": "Chest, Shoulders & Triceps",
            "icon": "⚡",
            "created_at": datetime.now().isoformat(),
            "exercises": [
                {"name": "Incline Dumbbell Bench Press", "category": "Chest", "target_sets": 4, "target_reps": "10-12", "notes": "Focus on upper pec stretch"},
                {"name": "Barbell Flat Bench Press", "category": "Chest", "target_sets": 4, "target_reps": "8-10", "notes": "Heavy compound pressing"},
                {"name": "Seated Dumbbell Shoulder Press", "category": "Shoulders", "target_sets": 3, "target_reps": "10-12", "notes": "Control the descent"},
                {"name": "Standing Lateral Dumbbell Raises", "category": "Shoulders", "target_sets": 4, "target_reps": "12-15", "notes": "Strict form, no swinging"},
                {"name": "Rope Cable Triceps Pushdown", "category": "Arms", "target_sets": 4, "target_reps": "12-15", "notes": "Lock out and squeeze triceps"}
            ]
        },
        {
            "id": f"tpl-{uuid.uuid4().hex[:8]}",
            "name": "Pull Day (Back & Biceps)",
            "description": "Lats width, upper back thickness, and bicep growth.",
            "target_muscle": "Back, Lats & Biceps",
            "icon": "🚀",
            "created_at": datetime.now().isoformat(),
            "exercises": [
                {"name": "Lat Pulldown (Wide Grip)", "category": "Back", "target_sets": 4, "target_reps": "10-12", "notes": "Pull with elbows to clavicle"},
                {"name": "Seated Cable Row (Close Grip)", "category": "Back", "target_sets": 4, "target_reps": "10-12", "notes": "Squeeze shoulder blades together"},
                {"name": "Single-Arm Dumbbell Row", "category": "Back", "target_sets": 3, "target_reps": "10-12", "notes": "Full stretch at bottom"},
                {"name": "Face Pulls", "category": "Back", "target_sets": 4, "target_reps": "15-20", "notes": "Target rear delts and rotators"},
                {"name": "EZ-Bar Standing Bicep Curls", "category": "Arms", "target_sets": 4, "target_reps": "10-12", "notes": "Keep elbows pinned at sides"},
                {"name": "Dumbbell Hammer Curls", "category": "Arms", "target_sets": 3, "target_reps": "12-15", "notes": "Brachialis and grip strength"}
            ]
        },
        {
            "id": f"tpl-{uuid.uuid4().hex[:8]}",
            "name": "Legs & Lower Body Power",
            "description": "Quads, hamstrings, glutes and calves strength development.",
            "target_muscle": "Quads, Hamstrings & Glutes",
            "icon": "🦵",
            "created_at": datetime.now().isoformat(),
            "exercises": [
                {"name": "Barbell Back Squats", "category": "Legs", "target_sets": 4, "target_reps": "8-10", "notes": "Hit parallel depth"},
                {"name": "Leg Press 45°", "category": "Legs", "target_sets": 4, "target_reps": "10-12", "notes": "Do not lock knees at top"},
                {"name": "Romanian Deadlift (RDL)", "category": "Legs", "target_sets": 4, "target_reps": "10-12", "notes": "Feel deep hamstring stretch"},
                {"name": "Seated Leg Extension Machine", "category": "Legs", "target_sets": 3, "target_reps": "12-15", "notes": "1 second hold at peak"},
                {"name": "Standing Calf Raises", "category": "Legs", "target_sets": 4, "target_reps": "15-20", "notes": "Full plantar extension"}
            ]
        },
        {
            "id": f"tpl-{uuid.uuid4().hex[:8]}",
            "name": "Full Body Conditioning",
            "description": "High-efficiency compound workout targeting total body strength.",
            "target_muscle": "Total Body & Core",
            "icon": "💥",
            "created_at": datetime.now().isoformat(),
            "exercises": [
                {"name": "Conventional Deadlift", "category": "Back", "target_sets": 3, "target_reps": "6-8", "notes": "Brace core tight"},
                {"name": "Barbell Flat Bench Press", "category": "Chest", "target_sets": 3, "target_reps": "8-10", "notes": "Controlled pressing"},
                {"name": "Barbell Back Squats", "category": "Legs", "target_sets": 3, "target_reps": "8-10", "notes": "Solid compound depth"},
                {"name": "Overhead Shoulder Press", "category": "Shoulders", "target_sets": 3, "target_reps": "8-10", "notes": "Strict overhead lock"},
                {"name": "Hanging Knee / Leg Raises", "category": "Core", "target_sets": 3, "target_reps": "15-20", "notes": "Control hip swing"}
            ]
        }
    ]

# -------------------------------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------------------------------
class TemplateExerciseItem(BaseModel):
    name: str
    category: Optional[str] = "General"
    target_sets: Optional[int] = 3
    target_reps: Optional[str] = "10-12"
    notes: Optional[str] = ""

class WorkoutTemplatePayload(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=2)
    description: Optional[str] = ""
    target_muscle: Optional[str] = ""
    icon: Optional[str] = "⚡"
    exercises: List[TemplateExerciseItem] = []

class CustomExercisePayload(BaseModel):
    member_id: str
    name: str = Field(..., min_length=2)
    category: Optional[str] = "Custom"
    equipment: Optional[str] = "Gym Equipment"
    target: Optional[str] = "Target Muscle"

class SetLogItem(BaseModel):
    set_num: int
    weight_kg: float = 0.0
    reps: int = 0
    is_completed: bool = True

class ExerciseLogItem(BaseModel):
    name: str
    category: Optional[str] = "General"
    notes: Optional[str] = ""
    sets: List[SetLogItem] = []

class WorkoutSessionPayload(BaseModel):
    template_id: Optional[str] = ""
    template_name: str
    date: Optional[str] = None
    duration_minutes: Optional[int] = 45
    notes: Optional[str] = ""
    exercises: List[ExerciseLogItem] = []

# -------------------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------------------

@router.get("/exercises")
def get_exercises(member_id: Optional[str] = None):
    """
    Get standard exercise library + member's custom created exercises.
    """
    all_exercises = list(STANDARD_EXERCISES)
    
    if member_id:
        norm_id = _normalize_id(member_id)
        custom_db = _load_json(CUSTOM_EXERCISES_FILE, {})
        member_custom = custom_db.get(norm_id, [])
        all_exercises.extend(member_custom)
        
    return {
        "status": "success",
        "count": len(all_exercises),
        "exercises": all_exercises
    }

@router.post("/custom-exercise")
def add_custom_exercise(payload: CustomExercisePayload):
    """
    Add a custom exercise for a member.
    """
    norm_id = _normalize_id(payload.member_id)
    custom_db = _load_json(CUSTOM_EXERCISES_FILE, {})
    
    if norm_id not in custom_db:
        custom_db[norm_id] = []
        
    # Check duplicate
    existing_names = [e["name"].lower() for e in custom_db[norm_id]] + [e["name"].lower() for e in STANDARD_EXERCISES]
    if payload.name.lower() in existing_names:
        raise HTTPException(status_code=400, detail="An exercise with this name already exists.")
        
    new_ex = {
        "id": f"custom-{uuid.uuid4().hex[:8]}",
        "name": payload.name.strip(),
        "category": payload.category or "Custom",
        "equipment": payload.equipment or "Custom Equipment",
        "target": payload.target or "Custom Target",
        "default_sets": 3,
        "default_reps": "10-12",
        "is_custom": True,
        "created_at": datetime.now().isoformat()
    }
    
    custom_db[norm_id].append(new_ex)
    _save_json(CUSTOM_EXERCISES_FILE, custom_db)
    
    return {
        "status": "success",
        "message": f"Custom exercise '{payload.name}' added successfully.",
        "exercise": new_ex
    }

@router.get("/templates/{member_id}")
def get_member_templates(member_id: str):
    """
    Get all custom workout templates for a specific member.
    If member has no templates yet, seeds clean starter templates.
    """
    norm_id = _normalize_id(member_id)
    templates_db = _load_json(TEMPLATES_FILE, {})
    
    if norm_id not in templates_db or not templates_db[norm_id]:
        starters = _get_default_starter_templates(norm_id)
        templates_db[norm_id] = starters
        _save_json(TEMPLATES_FILE, templates_db)
        
    return {
        "status": "success",
        "member_id": norm_id,
        "count": len(templates_db[norm_id]),
        "templates": templates_db[norm_id]
    }

@router.post("/templates/{member_id}")
def save_member_template(member_id: str, payload: WorkoutTemplatePayload):
    """
    Create or update a custom workout template for a member.
    """
    norm_id = _normalize_id(member_id)
    templates_db = _load_json(TEMPLATES_FILE, {})
    
    if norm_id not in templates_db:
        templates_db[norm_id] = []
        
    member_tpls = templates_db[norm_id]
    
    # Check if updating existing or creating new
    tpl_id = payload.id or f"tpl-{uuid.uuid4().hex[:8]}"
    existing_idx = next((idx for idx, t in enumerate(member_tpls) if t.get("id") == tpl_id), -1)
    
    tpl_data = {
        "id": tpl_id,
        "name": payload.name.strip(),
        "description": payload.description or "",
        "target_muscle": payload.target_muscle or "Custom Routine",
        "icon": payload.icon or "⚡",
        "updated_at": datetime.now().isoformat(),
        "exercises": [ex.dict() for ex in payload.exercises]
    }
    
    if existing_idx >= 0:
        tpl_data["created_at"] = member_tpls[existing_idx].get("created_at", datetime.now().isoformat())
        member_tpls[existing_idx] = tpl_data
        msg = f"Template '{payload.name}' updated successfully."
    else:
        tpl_data["created_at"] = datetime.now().isoformat()
        member_tpls.append(tpl_data)
        msg = f"Template '{payload.name}' created successfully."
        
    templates_db[norm_id] = member_tpls
    _save_json(TEMPLATES_FILE, templates_db)
    
    return {
        "status": "success",
        "message": msg,
        "template": tpl_data
    }

@router.delete("/templates/{member_id}/{template_id}")
def delete_member_template(member_id: str, template_id: str):
    """
    Delete a custom workout template.
    """
    norm_id = _normalize_id(member_id)
    templates_db = _load_json(TEMPLATES_FILE, {})
    
    if norm_id not in templates_db:
        raise HTTPException(status_code=404, detail="No templates found for this member.")
        
    original_count = len(templates_db[norm_id])
    templates_db[norm_id] = [t for t in templates_db[norm_id] if t.get("id") != template_id]
    
    if len(templates_db[norm_id]) == original_count:
        raise HTTPException(status_code=404, detail="Template not found.")
        
    _save_json(TEMPLATES_FILE, templates_db)
    
    return {
        "status": "success",
        "message": "Template deleted successfully.",
        "remaining_count": len(templates_db[norm_id])
    }

@router.post("/logs/{member_id}")
def log_workout_session(member_id: str, payload: WorkoutSessionPayload):
    """
    Save a completed workout session with exercise details, sets, weights and reps.
    """
    norm_id = _normalize_id(member_id)
    logs_db = _load_json(LOGS_FILE, [])
    
    # Calculate session totals
    total_volume_kg = 0.0
    total_completed_sets = 0
    total_reps = 0
    
    exercises_data = []
    for ex in payload.exercises:
        ex_dict = ex.dict()
        ex_volume = 0.0
        for s in ex_dict.get("sets", []):
            if s.get("is_completed", True):
                total_completed_sets += 1
                w = float(s.get("weight_kg", 0.0))
                r = int(s.get("reps", 0))
                ex_volume += (w * r)
                total_reps += r
        ex_dict["total_volume_kg"] = round(ex_volume, 1)
        total_volume_kg += ex_volume
        exercises_data.append(ex_dict)
        
    session_id = f"wlog-{datetime.now().strftime('%y%m%d%H%M%S')}-{uuid.uuid4().hex[:4]}"
    session_date = payload.date or date.today().isoformat()
    
    new_log = {
        "id": session_id,
        "member_id": norm_id,
        "template_id": payload.template_id or "",
        "template_name": payload.template_name,
        "date": session_date,
        "timestamp": datetime.now().isoformat(),
        "duration_minutes": payload.duration_minutes or 45,
        "notes": payload.notes or "",
        "total_volume_kg": round(total_volume_kg, 1),
        "total_sets": total_completed_sets,
        "total_reps": total_reps,
        "exercises_count": len(exercises_data),
        "exercises": exercises_data
    }
    
    logs_db.append(new_log)
    _save_json(LOGS_FILE, logs_db)
    
    return {
        "status": "success",
        "message": f"Workout '{payload.template_name}' logged successfully! Total volume: {round(total_volume_kg, 1)} kg.",
        "log": new_log
    }

@router.get("/admin/all-logs")
def get_all_workout_logs_for_admin(member_id: Optional[str] = None, limit: int = 150):
    """
    Get workout logs for all members (or filtered by member) for Admin Workout Activity Inspector.
    Enriches with member name from persons.json.
    """
    logs_db = _load_json(LOGS_FILE, [])
    persons = _load_json(os.path.join(DATA_DIR, "persons.json"), [])
    person_map = {
        (p.get("person_id") or p.get("id")): p.get("name", "Member")
        for p in persons
    }
    
    enriched_logs = []
    for log in logs_db:
        m_id = log.get("member_id", "")
        if member_id and _normalize_id(member_id) != _normalize_id(m_id):
            continue
        item = dict(log)
        item["member_name"] = person_map.get(m_id, log.get("member_name", "Member"))
        enriched_logs.append(item)
        
    enriched_logs.sort(key=lambda x: x.get("timestamp", x.get("date", "")), reverse=True)
    
    return {
        "status": "success",
        "count": len(enriched_logs),
        "logs": enriched_logs[:limit]
    }

@router.get("/logs/{member_id}")
def get_member_workout_logs(member_id: str, limit: int = 30):
    """
    Get past workout logs for a member.
    """
    norm_id = _normalize_id(member_id)
    logs_db = _load_json(LOGS_FILE, [])
    
    member_logs = [log for log in logs_db if log.get("member_id") == norm_id]
    member_logs.sort(key=lambda x: x.get("timestamp", x.get("date", "")), reverse=True)
    
    return {
        "status": "success",
        "member_id": norm_id,
        "count": len(member_logs),
        "logs": member_logs[:limit]
    }

@router.get("/exercise-progress/{member_id}/{exercise_name}")
def get_exercise_progress(member_id: str, exercise_name: str):
    """
    Get chronological weight progression and graph data points for an individual exercise.
    """
    norm_id = _normalize_id(member_id)
    logs_db = _load_json(LOGS_FILE, [])
    
    # Filter logs for this member
    member_logs = [log for log in logs_db if log.get("member_id") == norm_id]
    member_logs.sort(key=lambda x: x.get("timestamp", x.get("date", ""))) # ascending for chart
    
    data_points = []
    max_weight_ever = 0.0
    total_exercise_sets = 0
    
    for log in member_logs:
        log_date = log.get("date", "")
        for ex in log.get("exercises", []):
            if ex.get("name", "").strip().lower() == exercise_name.strip().lower():
                sets = ex.get("sets", [])
                completed_sets = [s for s in sets if s.get("is_completed", True)]
                
                if completed_sets:
                    session_max_weight = max([float(s.get("weight_kg", 0.0)) for s in completed_sets], default=0.0)
                    session_total_reps = sum([int(s.get("reps", 0)) for s in completed_sets])
                    session_volume = sum([float(s.get("weight_kg", 0.0)) * int(s.get("reps", 0)) for s in completed_sets])
                    
                    if session_max_weight > max_weight_ever:
                        max_weight_ever = session_max_weight
                        
                    total_exercise_sets += len(completed_sets)
                    
                    data_points.append({
                        "date": log_date,
                        "session_id": log.get("id"),
                        "template_name": log.get("template_name", "Workout"),
                        "max_weight_kg": session_max_weight,
                        "sets_count": len(completed_sets),
                        "total_reps": session_total_reps,
                        "volume_kg": round(session_volume, 1),
                        "best_set_desc": f"{session_max_weight} kg × {next((s.get('reps') for s in completed_sets if float(s.get('weight_kg', 0)) == session_max_weight), 0)} reps"
                    })
                    
    # Calculate overall gain percentage
    first_weight = data_points[0]["max_weight_kg"] if data_points else 0.0
    latest_weight = data_points[-1]["max_weight_kg"] if data_points else 0.0
    weight_gain_kg = round(latest_weight - first_weight, 1)
    gain_pct = round(((latest_weight - first_weight) / first_weight) * 100, 1) if first_weight > 0 else 0.0
    
    return {
        "status": "success",
        "exercise": exercise_name,
        "exercise_name": exercise_name,
        "member_id": norm_id,
        "sessions_count": len(data_points),
        "pr_max_weight_kg": max_weight_ever,
        "starting_weight_kg": first_weight,
        "latest_weight_kg": latest_weight,
        "weight_gain_kg": weight_gain_kg,
        "gain_percentage": gain_pct,
        "total_sets_completed": total_exercise_sets,
        "progress_points": data_points
    }

@router.get("/dashboard/{member_id}")
def get_workout_dashboard(member_id: str):
    """
    Get consolidated dashboard metrics: templates, total workouts, PRs, last workout.
    """
    norm_id = _normalize_id(member_id)
    templates_db = _load_json(TEMPLATES_FILE, {})
    logs_db = _load_json(LOGS_FILE, [])
    
    member_templates = templates_db.get(norm_id, [])
    if not member_templates:
        member_templates = _get_default_starter_templates(norm_id)
        
    member_logs = [log for log in logs_db if log.get("member_id") == norm_id]
    member_logs.sort(key=lambda x: x.get("timestamp", x.get("date", "")), reverse=True)
    
    # Calculate all-time PRs
    exercise_prs: Dict[str, Dict[str, Any]] = {}
    total_all_time_volume = 0.0
    
    for log in member_logs:
        total_all_time_volume += log.get("total_volume_kg", 0.0)
        for ex in log.get("exercises", []):
            ex_name = ex.get("name", "").strip()
            if not ex_name:
                continue
            for s in ex.get("sets", []):
                w = float(s.get("weight_kg", 0.0))
                r = int(s.get("reps", 0))
                if ex_name not in exercise_prs or w > exercise_prs[ex_name]["weight_kg"]:
                    exercise_prs[ex_name] = {
                        "exercise": ex_name,
                        "category": ex.get("category", "General"),
                        "weight_kg": w,
                        "reps": r,
                        "date": log.get("date", "")
                    }
                    
    top_prs = sorted(exercise_prs.values(), key=lambda x: x["weight_kg"], reverse=True)[:6]
    
    return {
        "status": "success",
        "member_id": norm_id,
        "total_workouts_logged": len(member_logs),
        "total_templates": len(member_templates),
        "all_time_volume_kg": round(total_all_time_volume, 1),
        "latest_workout": member_logs[0] if member_logs else None,
        "top_prs": top_prs,
        "templates": member_templates
    }
