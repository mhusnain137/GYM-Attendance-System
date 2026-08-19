# ============================================================
# PATHS
# ============================================================

import os

# Get the project root directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

YUNET_MODEL = os.path.join(PROJECT_ROOT, "models", "yunet", "face_detection_yunet_int8.onnx")
SFACE_MODEL = os.path.join(PROJECT_ROOT, "models", "sface", "face_recognition_sface_2021dec.onnx")
DATABASE_FILE = os.path.join(PROJECT_ROOT, "data", "persons.json")
ATTENDANCE_FILE = os.path.join(PROJECT_ROOT, "data", "attendance.json")
VISITS_FILE = os.path.join(PROJECT_ROOT, "data", "visits.json")

# ============================================================
# CAMERA
# ============================================================

CAMERA_ID = 0
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480

# Camera source type: 'webcam' or 'rtsp'
CAMERA_SOURCE = 'webcam'
# RTSP URL (sanitized placeholder; set RTSP_URL environment variable for production)
RTSP_URL = os.environ.get('RTSP_URL', 'rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0')
# Optional camera name for display
CAMERA_NAME = ''

# RTSP Reconnect Configuration
RTSP_RECONNECT_ENABLED = True
RTSP_RECONNECT_INTERVAL = 5  # seconds
RTSP_MAX_RETRIES = 10
RTSP_FRAME_FAILURE_THRESHOLD = 30  # consecutive frame failures before attempting reconnect


# ============================================================
# YUNET
# ============================================================

FACE_CONFIDENCE = 0.60
NMS_THRESHOLD = 0.30
TOP_K = 5000
DETECTION_WIDTH = 640


# ============================================================
# RECOGNITION
# ============================================================

RECOGNITION_THRESHOLD = 0.45
MIN_MATCH_MARGIN = 0.05


# ============================================================
# WEAK MATCH TEMPORAL CONFIRMATION
# ============================================================

WEAK_MATCH_THRESHOLD = 0.40
WEAK_MATCH_REQUIRED_HITS = 3
WEAK_MATCH_WINDOW = 5
WEAK_MATCH_MIN_FACE_CONFIDENCE = 0.65
WEAK_MATCH_MIN_FACE_SIZE = 30


# ============================================================
# TRACKING
# ============================================================

TRACK_IOU_THRESHOLD = 0.35
TRACK_REFRESH_FRAMES = 45
TRACK_MAX_MISSED_FRAMES = 15


# ============================================================
# REGISTRATION
# ============================================================

REGISTRATION_SAMPLES = 15
REGISTRATION_FRAME_GAP = 5


# ============================================================
# AUTO-REGISTRATION & CLAHE LIGHTING CONFIG
# ============================================================

FACE_CROPS_DIR = os.path.join(PROJECT_ROOT, "data", "face_crops")
ENABLE_AUTO_REGISTER_UNKNOWN = True
AUTO_REGISTER_MIN_CONFIDENCE = 0.70
AUTO_REGISTER_MIN_SIZE = 50
AUTO_REGISTER_REQUIRED_HITS = 3
ENABLE_CLAHE_LIGHTING_NORM = True
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID_SIZE = (8, 8)