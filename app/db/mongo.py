import os
import json
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import pymongo
from pymongo import MongoClient

# Configure logging
logger = logging.getLogger("gym_mongo")
logging.basicConfig(level=logging.INFO)

# Determine project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(PROJECT_ROOT, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME = os.getenv("DB_NAME", "gym_identity_db")

_client: Optional[MongoClient] = None
_db = None
_is_connected = False


def get_db():
    """Get the MongoDB database instance with lazy connection and reconnect resilience."""
    global _client, _db, _is_connected
    if _db is not None and _is_connected:
        return _db

    if not MONGO_URI:
        logger.warning("[MongoDB] MONGO_URI not found in environment or .env. Falling back to local files.")
        return None

    try:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Verify connection
        _client.admin.command("ping")
        _db = _client[DB_NAME]
        _is_connected = True
        logger.info(f"[MongoDB] Connected successfully to database: {DB_NAME}")
        return _db
    except Exception as e:
        logger.error(f"[MongoDB] Failed to connect: {e}. Operating in fallback mode.")
        _client = None
        _db = None
        _is_connected = False
        return None


def is_connected() -> bool:
    """Check if MongoDB is actively reachable."""
    db = get_db()
    return db is not None


def clean_doc(doc: Any) -> Any:
    """Strip MongoDB internal _id object or convert it so it serializes cleanly without errors."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [clean_doc(d) for d in doc]
    if isinstance(doc, dict):
        cleaned = dict(doc)
        if "_id" in cleaned:
            del cleaned["_id"]
        return cleaned
    return doc


def find_all(collection_name: str, query: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """Query documents from MongoDB collection, or return empty list if not connected."""
    db = get_db()
    if db is None:
        return []
    try:
        cursor = db[collection_name].find(query or {})
        return [clean_doc(doc) for doc in cursor]
    except Exception as e:
        logger.error(f"[MongoDB] find_all error on '{collection_name}': {e}")
        return []


def find_one(collection_name: str, query: Dict) -> Optional[Dict[str, Any]]:
    """Find a single document."""
    db = get_db()
    if db is None:
        return None
    try:
        doc = db[collection_name].find_one(query)
        return clean_doc(doc)
    except Exception as e:
        logger.error(f"[MongoDB] find_one error on '{collection_name}': {e}")
        return None


def insert_one(collection_name: str, doc: Dict[str, Any]) -> bool:
    """Insert a single document."""
    db = get_db()
    if db is None:
        return False
    try:
        doc_copy = dict(doc)
        db[collection_name].insert_one(doc_copy)
        return True
    except Exception as e:
        logger.error(f"[MongoDB] insert_one error on '{collection_name}': {e}")
        return False


def update_one(collection_name: str, query: Dict, update_data: Dict[str, Any], upsert: bool = False) -> bool:
    """Update or upsert a document."""
    db = get_db()
    if db is None:
        return False
    try:
        clean_update = dict(update_data)
        if "_id" in clean_update:
            del clean_update["_id"]
        db[collection_name].update_one(query, {"$set": clean_update}, upsert=upsert)
        return True
    except Exception as e:
        logger.error(f"[MongoDB] update_one error on '{collection_name}': {e}")
        return False


def delete_one(collection_name: str, query: Dict) -> bool:
    """Delete a single document."""
    db = get_db()
    if db is None:
        return False
    try:
        db[collection_name].delete_one(query)
        return True
    except Exception as e:
        logger.error(f"[MongoDB] delete_one error on '{collection_name}': {e}")
        return False


def replace_all(collection_name: str, docs: List[Dict[str, Any]]) -> bool:
    """Replace an entire collection with a new list of documents."""
    db = get_db()
    if db is None:
        return False
    try:
        db[collection_name].delete_many({})
        if docs:
            # Ensure no existing _id clashes
            cleaned = [dict(d) for d in docs]
            for d in cleaned:
                if "_id" in d:
                    del d["_id"]
            db[collection_name].insert_many(cleaned)
        return True
    except Exception as e:
        logger.error(f"[MongoDB] replace_all error on '{collection_name}': {e}")
        return False


# ============================================================
# AUTOMATIC MIGRATION FROM LOCAL JSON TO MONGODB ATLAS
# ============================================================
DATA_FILE_MAP = {
    "users": "users.json",
    "persons": "persons.json",
    "memberships": "memberships.json",
    "membership_plans": "membership_plans.json",
    "payments": "payments.json",
    "attendance": "attendance.json",
    "visits": "visits.json",
    "cafe_products": "cafe_products.json",
    "cafe_orders": "cafe_orders.json",
}

DEFAULT_ADMIN = [
    {
        "user_id": "USR-001",
        "username": "admin",
        "password": "admin123",
        "name": "Gym Owner (Super Admin)",
        "role": "ADMIN",
        "is_active": True,
        "created_at": "2026-09-01T12:00:00"
    }
]


def migrate_local_data_to_mongo():
    """
    On startup, inspects MongoDB Atlas.
    If a collection is empty, reads local data/*.json and uploads existing records.
    Never overwrites existing MongoDB data.
    """
    db = get_db()
    if db is None:
        logger.info("[Migration] MongoDB not connected. Skipping initial migration.")
        return

    data_dir = os.path.join(PROJECT_ROOT, "data")
    logger.info(f"[Migration] Checking migration status from {data_dir} to MongoDB Atlas...")

    for collection_name, json_filename in DATA_FILE_MAP.items():
        try:
            coll = db[collection_name]
            count = coll.count_documents({})
            if count == 0:
                json_path = os.path.join(data_dir, json_filename)
                records = []
                if os.path.exists(json_path):
                    try:
                        with open(json_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            if isinstance(data, list):
                                records = data
                    except Exception as e:
                        logger.warning(f"[Migration] Failed to read {json_path}: {e}")

                # If users collection is empty and file is empty, seed default admin
                if collection_name == "users" and len(records) == 0:
                    records = DEFAULT_ADMIN

                if records:
                    cleaned_records = []
                    for r in records:
                        if isinstance(r, dict):
                            rc = dict(r)
                            if "_id" in rc:
                                del rc["_id"]
                            cleaned_records.append(rc)
                    if cleaned_records:
                        coll.insert_many(cleaned_records)
                        logger.info(f"[Migration] Successfully migrated {len(cleaned_records)} records to '{collection_name}' collection in MongoDB.")
            else:
                logger.info(f"[Migration] Collection '{collection_name}' already has {count} documents in MongoDB.")
        except Exception as e:
            logger.error(f"[Migration] Error migrating '{collection_name}': {e}")
