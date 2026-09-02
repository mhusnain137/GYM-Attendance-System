import os
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

import sys
import recognition_config

sys.path.insert(0, os.path.join(recognition_config.PROJECT_ROOT, "app"))
from db import mongo

router = APIRouter(prefix="/api/auth", tags=["auth"])

USERS_FILE = os.path.join(recognition_config.PROJECT_ROOT, "data", "users.json")
PERSONS_FILE = os.path.join(recognition_config.PROJECT_ROOT, "data", "persons.json")
MEMBERSHIPS_FILE = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")


def load_json(filepath: str, default=None):
    if default is None:
        default = []
    if mongo.is_connected():
        if filepath == USERS_FILE:
            data = mongo.find_all("users")
            if data:
                return data
        elif filepath == PERSONS_FILE:
            data = mongo.find_all("persons")
            if data:
                return data
        elif filepath == MEMBERSHIPS_FILE:
            data = mongo.find_all("memberships")
            if data:
                return data
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Auth] Error reading {filepath}: {e}")
            return default
    return default


def save_json(filepath: str, data: Any) -> bool:
    if mongo.is_connected():
        if filepath == USERS_FILE:
            mongo.replace_all("users", data)
        elif filepath == PERSONS_FILE:
            mongo.replace_all("persons", data)
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[Auth] Error saving {filepath}: {e}")
        return False


# ============================================================
# PYDANTIC MODELS
# ============================================================
class LoginModel(BaseModel):
    username: str
    password: str


class CreateStaffUser(BaseModel):
    username: str
    password: str
    name: str
    role: str  # MANAGER, RECEPTIONIST, ADMIN


# ============================================================
# AUTH ENDPOINTS
# ============================================================

@router.post("/login")
async def login(payload: LoginModel):
    """
    Authenticate Staff (Admin/Manager/Receptionist) or Gym Member
    """
    users = load_json(USERS_FILE, default=[])
    username_lower = payload.username.strip().lower()
    
    # 1. Check Staff Accounts
    found_user = next((u for u in users if u.get("username", "").lower() == username_lower), None)
    
    if found_user:
        if found_user.get("password") != payload.password.strip():
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        if not found_user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is disabled")
            
        return {
            "status": "success",
            "message": "Login successful",
            "token": f"token-{found_user['user_id']}-{datetime.now().strftime('%M%S')}",
            "user": {
                "user_id": found_user["user_id"],
                "username": found_user["username"],
                "name": found_user["name"],
                "role": found_user["role"]
            }
        }

    # 2. Check Gym Members (Log in using Member ID, Phone, or Name)
    persons = load_json(PERSONS_FILE, default=[])
    memberships = load_json(MEMBERSHIPS_FILE, default=[])
    member = None
    
    # 2a. Check persons.json
    for p in persons:
        pid = (p.get("id") or p.get("person_id") or "").lower()
        pname = (p.get("name") or "").lower()
        pphone = (p.get("phone") or "").strip()
        
        if pid == username_lower or pname == username_lower or (pphone and pphone == username_lower):
            member = p
            break
            
        digits_input = ''.join(filter(str.isdigit, username_lower))
        digits_pid = ''.join(filter(str.isdigit, pid))
        if digits_input and digits_pid and digits_input.lstrip('0') == digits_pid.lstrip('0'):
            member = p
            break

        digits_phone = ''.join(filter(str.isdigit, pphone))
        if digits_input and digits_phone and len(digits_input) >= 7 and digits_input.lstrip('0') == digits_phone.lstrip('0'):
            member = p
            break

    # 2b. Check memberships.json if not found in persons
    if not member:
        for m in memberships:
            mpid = (m.get("person_id") or m.get("membership_id") or "").lower()
            mpname = (m.get("person_name") or "").lower()
            mpphone = (m.get("phone") or "").strip()

            if mpid == username_lower or mpname == username_lower or (mpphone and mpphone == username_lower):
                member = {
                    "id": m.get("person_id") or m.get("membership_id"),
                    "person_id": m.get("person_id") or m.get("membership_id"),
                    "name": m.get("person_name", "Member"),
                    "phone": mpphone
                }
                break

            digits_input = ''.join(filter(str.isdigit, username_lower))
            digits_mpid = ''.join(filter(str.isdigit, mpid))
            if digits_input and digits_mpid and digits_input.lstrip('0') == digits_mpid.lstrip('0'):
                member = {
                    "id": m.get("person_id") or m.get("membership_id"),
                    "person_id": m.get("person_id") or m.get("membership_id"),
                    "name": m.get("person_name", "Member"),
                    "phone": mpphone
                }
                break
    
    if member:
        actual_id = member.get("id") or member.get("person_id")
        return {
            "status": "success",
            "message": "Member login successful",
            "token": f"token-mem-{actual_id}",
            "user": {
                "user_id": actual_id,
                "username": actual_id,
                "name": member.get("name", "Member"),
                "role": "MEMBER",
                "member_id": actual_id
            }
        }

    raise HTTPException(status_code=401, detail="User account not found")


@router.get("/users")
async def get_staff_users(x_role: Optional[str] = Header(None, alias="X-User-Role")):
    """
    Get list of all staff users (Admin only view)
    """
    users = load_json(USERS_FILE, default=[])
    safe_users = [
        {
            "user_id": u["user_id"],
            "username": u["username"],
            "name": u["name"],
            "role": u["role"],
            "is_active": u.get("is_active", True),
            "created_at": u.get("created_at", "")
        }
        for u in users
    ]
    return {"status": "success", "count": len(safe_users), "users": safe_users}


@router.post("/users")
async def create_staff_user(
    payload: CreateStaffUser,
    x_role: Optional[str] = Header(None, alias="X-User-Role")
):
    """
    Create a new staff user (Manager or Receptionist) - Admin privileged
    """
    if x_role and x_role.upper() not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Permission Denied: Only Admin can create staff accounts")

    users = load_json(USERS_FILE, default=[])
    
    # Check duplicate username
    if any(u.get("username", "").lower() == payload.username.strip().lower() for u in users):
        raise HTTPException(status_code=400, detail="Username already exists")
        
    user_id = f"USR-00{len(users) + 1}"
    new_user = {
        "user_id": user_id,
        "username": payload.username.strip(),
        "password": payload.password.strip(),
        "name": payload.name.strip(),
        "role": payload.role.upper(),
        "is_active": True,
        "created_at": datetime.now().isoformat()
    }
    
    users.append(new_user)
    save_json(USERS_FILE, users)
    
    return {
        "status": "success",
        "message": f"Staff user {payload.name} ({payload.role}) created successfully",
        "user": {
            "user_id": user_id,
            "username": new_user["username"],
            "name": new_user["name"],
            "role": new_user["role"]
        }
    }


@router.delete("/users/{user_id}")
async def delete_staff_user(
    user_id: str,
    x_role: Optional[str] = Header(None, alias="X-User-Role")
):
    """
    Delete staff user account (Admin privileged)
    """
    if x_role and x_role.upper() not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Permission Denied: Only Admin can delete staff accounts")

    users = load_json(USERS_FILE, default=[])
    found = False
    
    filtered_users = []
    for u in users:
        if u.get("user_id") == user_id:
            if u.get("role") == "ADMIN" and len([x for x in users if x.get("role") == "ADMIN"]) <= 1:
                raise HTTPException(status_code=400, detail="Cannot delete the primary Admin account")
            found = True
        else:
            filtered_users.append(u)
            
    if not found:
        raise HTTPException(status_code=404, detail="Staff user not found")
        
    save_json(USERS_FILE, filtered_users)
    return {"status": "success", "message": "Staff user account deleted successfully"}
