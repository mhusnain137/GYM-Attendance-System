import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from db import mongo

router = APIRouter(prefix="/api/branches", tags=["branches"])

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
BRANCHES_FILE = os.path.join(DATA_DIR, "branches.json")
PERSONS_FILE = os.path.join(DATA_DIR, "persons.json")
VISITS_FILE = os.path.join(DATA_DIR, "visits.json")


def load_branches() -> List[Dict[str, Any]]:
    """Fetch branches from MongoDB with local file fallback."""
    if mongo.is_connected():
        docs = mongo.find_all("branches")
        if docs and len(docs) > 0:
            return docs
    if os.path.exists(BRANCHES_FILE):
        try:
            with open(BRANCHES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def save_branches(branches: List[Dict[str, Any]]) -> bool:
    """Save branches to MongoDB and local file."""
    if mongo.is_connected():
        mongo.replace_all("branches", branches)
    try:
        os.makedirs(os.path.dirname(BRANCHES_FILE), exist_ok=True)
        with open(BRANCHES_FILE, "w", encoding="utf-8") as f:
            json.dump(branches, f, indent=2)
        return True
    except Exception as e:
        print(f"[BranchRoutes] Error saving branches: {e}")
        return False


def get_persons() -> List[Dict[str, Any]]:
    if mongo.is_connected():
        docs = mongo.find_all("persons")
        if docs:
            return docs
    if os.path.exists(PERSONS_FILE):
        try:
            with open(PERSONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def get_today_visits() -> List[Dict[str, Any]]:
    today_str = datetime.now().strftime("%Y-%m-%d")
    if mongo.is_connected():
        docs = mongo.find_all("visits", {"date": today_str})
        if docs:
            return docs
    if os.path.exists(VISITS_FILE):
        try:
            with open(VISITS_FILE, "r", encoding="utf-8") as f:
                visits = json.load(f)
                return [v for v in visits if v.get("date") == today_str]
        except Exception:
            pass
    return []


class CameraConfig(BaseModel):
    camera_id: str
    name: str
    rtsp_url: Optional[str] = ""
    type: Optional[str] = "CCTV_RTSP"  # CCTV_RTSP, WEBCAM, USB_CAM
    status: Optional[str] = "STANDBY"


class BranchCreate(BaseModel):
    branch_id: Optional[str] = None
    name: str
    city: str
    address: str
    phone: Optional[str] = ""
    manager_name: Optional[str] = ""
    manager_email: Optional[str] = ""
    capacity: Optional[int] = 200
    is_active: Optional[bool] = True
    cameras: Optional[List[CameraConfig]] = []


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None
    cameras: Optional[List[CameraConfig]] = None


@router.get("")
async def list_branches(city: Optional[str] = None, active_only: bool = False):
    """List all branches with calculated live member and visit counts."""
    branches = load_branches()
    persons = get_persons()
    today_visits = get_today_visits()

    enriched = []
    for b in branches:
        if active_only and not b.get("is_active", True):
            continue
        if city and b.get("city", "").lower() != city.lower():
            continue

        b_id = b.get("branch_id")

        # Count members whose home_branch is this branch, or legacy members on branch_main
        member_count = 0
        for p in persons:
            p_branch = p.get("home_branch_id") or p.get("branch_id") or "branch_main"
            if p_branch == b_id:
                member_count += 1

        # Count today visits at this branch
        visit_count = 0
        for v in today_visits:
            v_branch = v.get("branch_id") or "branch_main"
            if v_branch == b_id:
                visit_count += 1

        branch_copy = dict(b)
        canonical_name = branch_copy.get("name") or branch_copy.get("branch_name") or "Titan Branch"
        branch_copy["name"] = canonical_name
        branch_copy["branch_name"] = canonical_name
        branch_copy["members_count"] = member_count
        branch_copy["today_visits_count"] = visit_count
        branch_copy["active_cameras_count"] = len(b.get("cameras", []))
        enriched.append(branch_copy)

    return enriched


@router.get("/{branch_id}")
async def get_branch(branch_id: str):
    """Get single branch details."""
    branches = load_branches()
    for b in branches:
        if b.get("branch_id") == branch_id:
            persons = get_persons()
            today_visits = get_today_visits()
            b_copy = dict(b)
            b_copy["members_count"] = sum(
                1 for p in persons if (p.get("home_branch_id") or p.get("branch_id") or "branch_main") == branch_id
            )
            b_copy["today_visits_count"] = sum(
                1 for v in today_visits if (v.get("branch_id") or "branch_main") == branch_id
            )
            return b_copy

    raise HTTPException(status_code=404, detail=f"Branch '{branch_id}' not found")


@router.post("")
async def create_branch(payload: BranchCreate):
    """Add a new gym branch."""
    branches = load_branches()

    # Generate branch_id if missing
    b_id = payload.branch_id
    if not b_id:
        clean_slug = "".join(c for c in payload.name.lower() if c.isalnum() or c == "_")
        b_id = f"branch_{clean_slug[:15]}"

    # Check collision
    if any(b.get("branch_id") == b_id for b in branches):
        raise HTTPException(status_code=400, detail=f"Branch ID '{b_id}' already exists")

    new_branch = {
        "branch_id": b_id,
        "name": payload.name,
        "city": payload.city,
        "address": payload.address,
        "phone": payload.phone or "",
        "manager_name": payload.manager_name or "",
        "manager_email": payload.manager_email or "",
        "capacity": payload.capacity or 200,
        "is_active": payload.is_active if payload.is_active is not None else True,
        "cameras": [c.model_dump() for c in (payload.cameras or [])],
        "created_at": datetime.now().isoformat()
    }

    branches.append(new_branch)
    if save_branches(branches):
        return {"success": True, "branch": new_branch, "message": "Branch created successfully"}
    raise HTTPException(status_code=500, detail="Failed to save branch")


@router.put("/{branch_id}")
async def update_branch(branch_id: str, payload: BranchUpdate):
    """Update existing gym branch."""
    branches = load_branches()
    found_idx = -1
    for i, b in enumerate(branches):
        if b.get("branch_id") == branch_id:
            found_idx = i
            break

    if found_idx == -1:
        raise HTTPException(status_code=404, detail=f"Branch '{branch_id}' not found")

    target = dict(branches[found_idx])
    update_dict = payload.model_dump(exclude_unset=True)

    if "cameras" in update_dict and update_dict["cameras"] is not None:
        target["cameras"] = update_dict["cameras"]
        del update_dict["cameras"]

    for k, v in update_dict.items():
        if v is not None:
            target[k] = v

    branches[found_idx] = target
    if save_branches(branches):
        return {"success": True, "branch": target, "message": "Branch updated successfully"}
    raise HTTPException(status_code=500, detail="Failed to update branch")


@router.delete("/{branch_id}")
async def delete_branch(branch_id: str):
    """Deactivate or remove gym branch."""
    if branch_id == "branch_main":
        raise HTTPException(status_code=400, detail="Cannot delete default primary branch 'branch_main'")

    branches = load_branches()
    initial_len = len(branches)
    branches = [b for b in branches if b.get("branch_id") != branch_id]

    if len(branches) == initial_len:
        raise HTTPException(status_code=404, detail=f"Branch '{branch_id}' not found")

    if save_branches(branches):
        return {"success": True, "message": f"Branch '{branch_id}' deleted successfully"}
    raise HTTPException(status_code=500, detail="Failed to delete branch")
