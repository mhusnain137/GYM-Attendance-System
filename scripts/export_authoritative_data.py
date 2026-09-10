import os
import json
import base64
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CROPS_DIR = os.path.join(DATA_DIR, "face_crops")

def clean_person(p):
    """Strip large embedding vectors while preserving all frontend fields"""
    return {
        "id": p.get("id") or p.get("person_id"),
        "person_id": p.get("person_id") or p.get("id"),
        "name": p.get("name", "Unknown Member"),
        "phone": p.get("phone", ""),
        "email": p.get("email", ""),
        "status": p.get("status", "active"),
        "registered_at": p.get("registered_at") or p.get("updated_at") or "2026-08-19 17:00:00",
        "updated_at": p.get("updated_at", ""),
        "branch_id": p.get("branch_id") or p.get("home_branch_id") or "BR-MAIN-001",
        "home_branch_id": p.get("home_branch_id") or p.get("branch_id") or "BR-MAIN-001",
        "branch_name": p.get("branch_name", "Titan Gym (Main Branch)"),
        "allowed_branches": p.get("allowed_branches", ["all"]),
        "thumbnail": f"/api/face-crops/{p.get('id') or p.get('person_id')}.jpg",
        "profile_picture": f"/api/face-crops/{p.get('id') or p.get('person_id')}.jpg"
    }

def load_json(filename, default=None):
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
    return default if default is not None else []

def main():
    print("Collecting authoritative datasets...")
    raw_persons = load_json("persons.json", [])
    clean_persons = [clean_person(p) for p in raw_persons]
    
    memberships = load_json("memberships.json", [])
    membership_plans = load_json("membership_plans.json", [])
    branches = load_json("branches.json", [])
    cafe_products = load_json("cafe_products.json", [])
    cafe_orders = load_json("cafe_orders.json", [])
    workout_templates = load_json("workout_templates.json", {})
    workout_logs = load_json("workout_logs.json", [])
    payments = load_json("payments.json", [])
    users = load_json("users.json", [])
    visits = load_json("visits.json", [])
    attendance = load_json("attendance.json", [])
    demo_leads = load_json("demo_leads.json", [])

    # Load face crops and encode as base64 map (only primary person crops: P-*.jpg)
    crops_map = {}
    if os.path.exists(CROPS_DIR):
        for fname in os.listdir(CROPS_DIR):
            if fname.endswith(".jpg") and not "_sample_" in fname:
                fpath = os.path.join(CROPS_DIR, fname)
                try:
                    with open(fpath, "rb") as img_f:
                        crops_map[fname] = base64.b64encode(img_f.read()).decode("utf-8")
                except Exception as e:
                    print(f"Error encoding {fname}: {e}")

    print(f"Persons: {len(clean_persons)}")
    print(f"Memberships: {len(memberships)}")
    print(f"Membership Plans: {len(membership_plans)}")
    print(f"Branches: {len(branches)}")
    print(f"Cafe Products: {len(cafe_products)}")
    print(f"Cafe Orders: {len(cafe_orders)}")
    print(f"Face Crops Encoded: {len(crops_map)} images")
    print(f"Demo Leads: {len(demo_leads)}")

    export_path = os.path.join(PROJECT_ROOT, "api", "authoritative_data.json")
    with open(export_path, "w", encoding="utf-8") as out_f:
        json.dump({
            "persons": clean_persons,
            "memberships": memberships,
            "membership_plans": membership_plans,
            "branches": branches,
            "cafe_products": cafe_products,
            "cafe_orders": cafe_orders,
            "workout_templates": workout_templates,
            "workout_logs": workout_logs,
            "payments": payments,
            "users": users,
            "visits": visits,
            "attendance": attendance,
            "demo_leads": demo_leads,
            "face_crops": crops_map
        }, out_f, indent=2)

    print(f"Exported successfully to {export_path} ({os.path.getsize(export_path)} bytes)")

if __name__ == "__main__":
    main()
