import cv2
import numpy as np
import json
import os
import time
import threading


# ============================================================
# PATHS
# ============================================================

YUNET_MODEL = r"models\yunet\face_detection_yunet_int8.onnx"
SFACE_MODEL = r"models\sface\face_recognition_sface_2021dec.onnx"
DATABASE_FILE = r"data\persons.json"


# ============================================================
# CAMERA
# ============================================================

CAMERA_ID = 0
CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480


# ============================================================
# YUNET
# ============================================================

FACE_CONFIDENCE = 0.60
NMS_THRESHOLD = 0.30
TOP_K = 5000

# Detection is run on a smaller frame for speed, then scaled back up.
# Lower this further (e.g. 240) if you need more FPS at the cost of
# missing small/far-away faces.
DETECTION_WIDTH = 320


# ============================================================
# RECOGNITION
# ============================================================

# Higher = stricter recognition
RECOGNITION_THRESHOLD = 0.50

# Difference required between best and second-best match
MIN_MATCH_MARGIN = 0.05

# ============================================================
# WEAK MATCH TEMPORAL CONFIRMATION
# ============================================================

# Lower threshold for considering a weak match candidate
# Matches below this are rejected entirely
WEAK_MATCH_THRESHOLD = 0.43

# Number of consecutive consistent weak matches required to confirm
WEAK_MATCH_REQUIRED_HITS = 3

# Maximum number of recent weak match scores to track per track
WEAK_MATCH_WINDOW = 5

# Minimum face detection confidence for weak match consideration
WEAK_MATCH_MIN_FACE_CONFIDENCE = 0.65

# Minimum face size (width in pixels) for weak match consideration
WEAK_MATCH_MIN_FACE_SIZE = 30


# ============================================================
# TRACKING (avoids re-running SFace on faces we already identified)
# ============================================================

# Minimum overlap (IOU) between this frame's face box and a cached
# track's box to consider them "the same face".
TRACK_IOU_THRESHOLD = 0.35

# Re-run SFace + database match on a tracked face every N frames,
# even if it's still the same person, to correct any drift/mistakes.
TRACK_REFRESH_FRAMES = 45

# If a cached track hasn't been seen for this many frames, drop it.
TRACK_MAX_MISSED_FRAMES = 15


# ============================================================
# REGISTRATION
# ============================================================

REGISTRATION_SAMPLES = 10

# Wait this many frames between samples
REGISTRATION_FRAME_GAP = 5


# ============================================================
# CHECK MODELS
# ============================================================

if not os.path.exists(YUNET_MODEL):
    raise FileNotFoundError(
        f"YuNet model not found:\n{YUNET_MODEL}"
    )

if not os.path.exists(SFACE_MODEL):
    raise FileNotFoundError(
        f"SFace model not found:\n{SFACE_MODEL}"
    )


# ============================================================
# CPU THREADING
# ============================================================

# By default OpenCV can be conservative about how many threads it
# uses for DNN inference. Explicitly using all cores speeds up both
# YuNet and SFace noticeably on CPU.
cv2.setNumThreads(os.cpu_count() or 4)


# ============================================================
# DATABASE SETUP
# ============================================================

os.makedirs(
    os.path.dirname(DATABASE_FILE),
    exist_ok=True
)

if not os.path.exists(DATABASE_FILE):

    with open(
        DATABASE_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump([], f, indent=4)


def load_database():

    try:

        with open(
            DATABASE_FILE,
            "r",
            encoding="utf-8"
        ) as f:

            data = json.load(f)

        if not isinstance(data, list):
            return []

        return data

    except Exception as e:

        print("Database load error:", e)

        return []


def save_database(persons):

    temp_file = DATABASE_FILE + ".tmp"

    with open(
        temp_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            persons,
            f,
            indent=4
        )

    # Replace database safely
    os.replace(
        temp_file,
        DATABASE_FILE
    )


def generate_person_id(persons):

    highest_number = 0

    for person in persons:

        person_id = str(
            person.get("id", "")
        )

        if person_id.startswith("P-"):

            try:

                number = int(
                    person_id[2:]
                )

                highest_number = max(
                    highest_number,
                    number
                )

            except ValueError:
                pass

    return f"P-{highest_number + 1:06d}"


# ============================================================
# EMBEDDINGS
# ============================================================

def normalize_embedding(embedding):

    embedding = np.asarray(
        embedding,
        dtype=np.float32
    ).flatten()

    norm = np.linalg.norm(
        embedding
    )

    if norm < 1e-8:
        return None

    return embedding / norm


def cosine_similarity(a, b):

    a = normalize_embedding(a)
    b = normalize_embedding(b)

    if a is None or b is None:
        return -1.0

    return float(
        np.dot(a, b)
    )


# ============================================================
# EXTRACT FACE EMBEDDING
# ============================================================

def get_face_embedding(frame, face):

    try:

        aligned_face = recognizer.alignCrop(
            frame,
            face
        )

        feature = recognizer.feature(
            aligned_face
        )

        feature = normalize_embedding(
            feature
        )

        return feature

    except Exception as e:

        print(
            "Embedding error:",
            e
        )

        return None


# ============================================================
# FIND BEST MATCH
# ============================================================

def find_best_match(
    feature,
    database
):

    if feature is None:
        return None, 0.0, 0.0

    if not database:
        return None, 0.0, 0.0

    matches = []

    for person in database:

        stored = person.get(
            "embedding"
        )

        if not stored:
            continue

        stored = normalize_embedding(
            stored
        )

        if stored is None:
            continue

        score = cosine_similarity(
            feature,
            stored
        )

        matches.append(
            (
                score,
                person
            )
        )

    if not matches:

        return None, 0.0, 0.0

    # Highest similarity first
    matches.sort(
        key=lambda item: item[0],
        reverse=True
    )

    best_score, best_person = matches[0]

    if len(matches) > 1:

        second_score = matches[1][0]

    else:

        second_score = 0.0

    return (
        best_person,
        best_score,
        second_score
    )


# ============================================================
# IOU (used for lightweight face tracking between frames)
# ============================================================

def compute_iou(box1, box2):

    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2

    xa = max(x1, x2)
    ya = max(y1, y2)
    xb = min(x1 + w1, x2 + w2)
    yb = min(y1 + h1, y2 + h2)

    inter_w = max(0, xb - xa)
    inter_h = max(0, yb - ya)
    inter = inter_w * inter_h

    union = (w1 * h1) + (w2 * h2) - inter

    if union <= 0:
        return 0.0

    return inter / union


# ============================================================
# THREADED CAMERA
# ============================================================
# Reading frames is blocking I/O. Doing it on a background thread
# means the main loop is never stalled waiting on the camera driver.

class ThreadedCamera:

    def __init__(self, src, width, height):

        self.cap = cv2.VideoCapture(src)

        if not self.cap.isOpened():
            raise RuntimeError("Could not open webcam.")

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        self.lock = threading.Lock()

        self.ret, self.frame = self.cap.read()

        self.running = True

        self.thread = threading.Thread(
            target=self._update,
            daemon=True
        )

        self.thread.start()

    def _update(self):

        while self.running:

            ret, frame = self.cap.read()

            with self.lock:

                self.ret = ret
                self.frame = frame

            if not ret:
                time.sleep(0.01)

    def read(self):

        with self.lock:

            if self.frame is None:
                return False, None

            return self.ret, self.frame.copy()

    def release(self):

        self.running = False

        self.thread.join(timeout=1.0)

        self.cap.release()


# ============================================================
# LOAD MODELS
# ============================================================

print()
print("==========================================")
print("      PERSON IDENTITY SYSTEM (FAST)")
print("==========================================")
print()

print("Loading YuNet...")

detector = cv2.FaceDetectorYN.create(
    YUNET_MODEL,
    "",
    (DETECTION_WIDTH, DETECTION_WIDTH),
    FACE_CONFIDENCE,
    NMS_THRESHOLD,
    TOP_K,
    cv2.dnn.DNN_BACKEND_OPENCV,
    cv2.dnn.DNN_TARGET_CPU
)

print("YuNet loaded.")


print("Loading SFace...")

recognizer = cv2.FaceRecognizerSF.create(
    SFACE_MODEL,
    ""
)

print("SFace loaded.")


# ============================================================
# DATABASE
# ============================================================

persons = load_database()

print(
    f"Registered persons: {len(persons)}"
)


# ============================================================
# CAMERA
# ============================================================

print("Opening camera...")

camera = ThreadedCamera(
    CAMERA_ID,
    CAMERA_WIDTH,
    CAMERA_HEIGHT
)

print("Camera started.")
print()
print("R = Register new person")
print("Q = Quit")
print()


# ============================================================
# REGISTRATION STATE
# ============================================================

registration_mode = False

registration_embeddings = []

registration_frame_counter = 0

registration_message = ""

registration_last_sample_frame = -999


# ============================================================
# TRACKING STATE
# ============================================================
# Each track dict:
# {
#   "bbox": (x, y, w, h),
#   "confidence": float,
#   "id": str,
#   "name": str,
#   "score": float,
#   "confirmed": bool,         # whether identity has been confidently recognized
#   "candidate_id": str,       # weak match candidate person ID
#   "candidate_name": str,     # weak match candidate person name
#   "candidate_scores": list,  # recent weak match scores
#   "candidate_hits": int,     # consecutive weak match hits for candidate
#   "last_embed_frame": int,   # frame when SFace was last run for it
#   "last_seen_frame": int
# }

tracks = []

frame_number = 0


# ============================================================
# FPS
# ============================================================

fps = 0.0

fps_counter = 0

fps_start = time.perf_counter()


# ============================================================
# START REGISTRATION
# ============================================================

def start_registration():

    global registration_mode
    global registration_embeddings
    global registration_frame_counter
    global registration_message
    global registration_last_sample_frame

    registration_mode = True

    registration_embeddings = []

    registration_frame_counter = 0

    registration_last_sample_frame = -999

    registration_message = (
        "Look at camera - collecting samples"
    )

    print()
    print("==========================================")
    print("       REGISTRATION STARTED")
    print("==========================================")
    print("Only ONE person should be visible.")
    print("Look at the camera.")
    print()


# ============================================================
# FINISH REGISTRATION
# ============================================================

def finish_registration():

    global registration_mode
    global registration_embeddings
    global registration_message
    global persons

    # --------------------------------------------------------
    # Minimum sample check
    # --------------------------------------------------------

    if len(
        registration_embeddings
    ) < REGISTRATION_SAMPLES:

        registration_message = (
            "Registration failed"
        )

        registration_mode = False

        registration_embeddings = []

        return

    # --------------------------------------------------------
    # Average embeddings
    # --------------------------------------------------------

    matrix = np.asarray(
        registration_embeddings,
        dtype=np.float32
    )

    average_embedding = np.mean(
        matrix,
        axis=0
    )

    average_embedding = normalize_embedding(
        average_embedding
    )

    if average_embedding is None:

        registration_message = (
            "Invalid embedding"
        )

        registration_mode = False

        registration_embeddings = []

        return

    # ========================================================
    # CHECK WHETHER THIS PERSON ALREADY EXISTS
    # ========================================================

    existing_person, best_score, second_score = find_best_match(
        average_embedding,
        persons
    )

    # If very similar to an existing person,
    # DO NOT create a duplicate ID.
    if (
        existing_person is not None
        and
        best_score >= 0.55
    ):

        registration_message = (
            f"Already registered: "
            f"{existing_person['id']}"
        )

        print()
        print("==========================================")
        print("PERSON ALREADY REGISTERED")
        print(
            f"ID   : {existing_person['id']}"
        )
        print(
            f"Name : {existing_person.get('name', 'Unknown')}"
        )
        print(
            f"Score: {best_score:.3f}"
        )
        print("==========================================")

        registration_mode = False

        registration_embeddings = []

        return

    # ========================================================
    # NEW PERSON
    # ========================================================

    person_id = generate_person_id(
        persons
    )

    # --------------------------------------------------------
    # Ask name
    # --------------------------------------------------------

    print()

    name = input(
        f"Enter name for {person_id}: "
    ).strip()

    if not name:

        name = "Unknown"

    # ========================================================
    # SAVE
    # ========================================================

    new_person = {

        "id": person_id,

        "name": name,

        "embedding": (
            average_embedding.tolist()
        )

    }

    persons.append(
        new_person
    )

    save_database(
        persons
    )

    # ========================================================
    # COMPLETE
    # ========================================================

    registration_message = (
        f"Registered: {person_id} | {name}"
    )

    print()
    print("==========================================")
    print("      REGISTRATION COMPLETE")
    print("==========================================")
    print(
        f"ID   : {person_id}"
    )
    print(
        f"Name : {name}"
    )
    print("==========================================")
    print()

    registration_mode = False

    registration_embeddings = []


# ============================================================
# DETECT FACES (runs on a downscaled frame for speed)
# ============================================================

def detect_faces(frame):

    height, width = frame.shape[:2]

    scale = DETECTION_WIDTH / float(width)

    detect_width = DETECTION_WIDTH
    detect_height = max(1, int(height * scale))

    small_frame = cv2.resize(
        frame,
        (detect_width, detect_height)
    )

    detector.setInputSize(
        (detect_width, detect_height)
    )

    _, faces = detector.detect(small_frame)

    if faces is None:
        return []

    # Scale bounding boxes (and landmarks) back up to full frame size
    inv_scale = 1.0 / scale

    faces[:, :14] *= inv_scale

    return faces


# ============================================================
# UPDATE TRACKS FOR ONE DETECTED FACE
# ============================================================

def match_or_create_track(face, frame, frame_number):

    x, y, w, h = face[:4]

    x = int(x)
    y = int(y)
    w = int(w)
    h = int(h)

    confidence = float(face[-1])

    bbox = (x, y, w, h)

    # --------------------------------------------------------
    # Try to match against an existing track via IOU
    # --------------------------------------------------------

    best_track = None
    best_iou = 0.0

    for track in tracks:

        iou = compute_iou(bbox, track["bbox"])

        if iou > best_iou:
            best_iou = iou
            best_track = track

    needs_embedding = True

    if (
        best_track is not None
        and best_iou >= TRACK_IOU_THRESHOLD
    ):

        # Same face as before - just refresh its box/confidence.
        best_track["bbox"] = bbox
        best_track["confidence"] = confidence
        best_track["last_seen_frame"] = frame_number

        age = frame_number - best_track["last_embed_frame"]

        if age < TRACK_REFRESH_FRAMES:
            # Recently identified - reuse cached identity,
            # skip SFace entirely for this face this frame.
            needs_embedding = False
        else:
            track_to_update = best_track

    else:

        # New face - create a fresh track.
        best_track = {
            "bbox": bbox,
            "confidence": confidence,
            "id": "Unknown",
            "name": "Unknown",
            "score": 0.0,
            "confirmed": False,
            "candidate_id": None,
            "candidate_name": None,
            "candidate_scores": [],
            "candidate_hits": 0,
            "last_embed_frame": -999,
            "last_seen_frame": frame_number
        }

        tracks.append(best_track)

    if needs_embedding:

        feature = get_face_embedding(frame, face)

        person_id = "Unknown"
        person_name = "Unknown"
        similarity = 0.0

        # Face quality checks
        face_quality_ok = True
        if confidence < WEAK_MATCH_MIN_FACE_CONFIDENCE:
            face_quality_ok = False
        if w < WEAK_MATCH_MIN_FACE_SIZE:
            face_quality_ok = False

        if feature is not None and persons:

            best_person, best_score, second_score = find_best_match(
                feature,
                persons
            )

            margin = best_score - second_score

            # STRONG MATCH - immediate acceptance
            if (
                best_person is not None
                and best_score >= RECOGNITION_THRESHOLD
                and (
                    margin >= MIN_MATCH_MARGIN
                    or len(persons) == 1
                )
            ):

                person_id = best_person["id"]
                person_name = best_person.get("name", "Unknown")
                similarity = best_score

            # WEAK MATCH - candidate for temporal confirmation
            elif (
                best_person is not None
                and best_score >= WEAK_MATCH_THRESHOLD
                and best_score < RECOGNITION_THRESHOLD
                and face_quality_ok
                and (
                    margin >= MIN_MATCH_MARGIN
                    or len(persons) == 1
                )
            ):

                # This is a weak match - store as candidate
                candidate_id = best_person["id"]
                candidate_name = best_person.get("name", "Unknown")

                # Check if this matches the current candidate
                current_candidate_id = best_track.get("candidate_id")

                if current_candidate_id == candidate_id:
                    # Same candidate - increment hits
                    best_track["candidate_hits"] += 1
                    best_track["candidate_scores"].append(best_score)

                    # Keep only recent scores within window
                    if len(best_track["candidate_scores"]) > WEAK_MATCH_WINDOW:
                        best_track["candidate_scores"].pop(0)

                    # Check if we have enough hits to confirm
                    if best_track["candidate_hits"] >= WEAK_MATCH_REQUIRED_HITS:
                        # Promote candidate to confirmed identity
                        person_id = candidate_id
                        person_name = candidate_name
                        similarity = best_score

                        # Clear candidate state
                        best_track["candidate_id"] = None
                        best_track["candidate_name"] = None
                        best_track["candidate_scores"] = []
                        best_track["candidate_hits"] = 0

                        # Debug output
                        track_idx = tracks.index(best_track) if best_track in tracks else -1
                        print(
                            f"Track {track_idx} | Identity: {person_name} | "
                            f"Score: {similarity:.2f} | State: CONFIRMED FROM WEAK MATCH"
                        )
                    else:
                        # Still accumulating hits
                        track_idx = tracks.index(best_track) if best_track in tracks else -1
                        print(
                            f"Track {track_idx} | Best: {candidate_name} | "
                            f"Score: {best_score:.2f} | Second: {second_score:.2f} | "
                            f"Margin: {margin:.2f} | State: WEAK CANDIDATE | "
                            f"Hits: {best_track['candidate_hits']}/{WEAK_MATCH_REQUIRED_HITS}"
                        )
                else:
                    # Different candidate - reset and start new
                    best_track["candidate_id"] = candidate_id
                    best_track["candidate_name"] = candidate_name
                    best_track["candidate_scores"] = [best_score]
                    best_track["candidate_hits"] = 1

                    track_idx = tracks.index(best_track) if best_track in tracks else -1
                    print(
                        f"Track {track_idx} | Best: {candidate_name} | "
                        f"Score: {best_score:.2f} | Second: {second_score:.2f} | "
                        f"Margin: {margin:.2f} | State: NEW CANDIDATE (reset previous)"
                    )

        # Check if this is a refresh of an existing track
        is_refresh = best_track.get("last_embed_frame", -999) != -999
        is_confirmed = best_track.get("confirmed", False)

        if is_refresh and is_confirmed:
            # This track already has a confirmed identity
            if person_id != "Unknown":
                # Strong new recognition - update identity
                best_track["id"] = person_id
                best_track["name"] = person_name
                best_track["score"] = similarity
                best_track["confirmed"] = True
                best_track["last_embed_frame"] = frame_number

                # Clear any candidate state when strongly confirmed
                best_track["candidate_id"] = None
                best_track["candidate_name"] = None
                best_track["candidate_scores"] = []
                best_track["candidate_hits"] = 0

                # Debug output
                track_idx = tracks.index(best_track) if best_track in tracks else -1
                print(
                    f"Track {track_idx} | Previous: {best_track['name']} | "
                    f"New match: {person_name} | Score: {similarity:.2f} | "
                    f"RESULT: UPDATED"
                )
            else:
                # Failed refresh - preserve previous identity
                best_track["last_embed_frame"] = frame_number

                # Debug output
                track_idx = tracks.index(best_track) if best_track in tracks else -1
                print(
                    f"Track {track_idx} | Previous: {best_track['name']} | "
                    f"New score: {similarity:.2f} | RESULT: KEEP PREVIOUS IDENTITY"
                )
        else:
            # New track or unconfirmed track - apply recognition result
            if person_id != "Unknown":
                best_track["confirmed"] = True
                # Clear candidate state on confirmation
                best_track["candidate_id"] = None
                best_track["candidate_name"] = None
                best_track["candidate_scores"] = []
                best_track["candidate_hits"] = 0
            else:
                best_track["confirmed"] = False

            best_track["id"] = person_id
            best_track["name"] = person_name
            best_track["score"] = similarity
            best_track["last_embed_frame"] = frame_number

            # Debug output for new track
            if not is_refresh:
                track_idx = tracks.index(best_track) if best_track in tracks else -1
                print(
                    f"Track {track_idx} | New track | Match: {person_name} | "
                    f"Score: {similarity:.2f} | RESULT: {'CONFIRMED' if person_id != 'Unknown' else 'UNKNOWN'}"
                )

    return best_track


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    ret, frame = camera.read()

    if not ret or frame is None:

        # Camera not ready yet / dropped a frame - don't crash,
        # just try again shortly.
        time.sleep(0.005)
        continue

    frame_number += 1

    # ========================================================
    # FACE DETECTION
    # ========================================================

    faces = detect_faces(frame)

    face_count = len(faces)

    # ========================================================
    # REGISTRATION MODE
    # ========================================================

    if registration_mode:

        registration_frame_counter += 1

        # ----------------------------------------------------
        # EXACTLY ONE FACE REQUIRED
        # ----------------------------------------------------

        if face_count == 1:

            # Wait between samples
            if (
                frame_number
                - registration_last_sample_frame
                >= REGISTRATION_FRAME_GAP
            ):

                face = faces[0]

                # --------------------------------------------
                # Get embedding
                # --------------------------------------------

                feature = get_face_embedding(frame, face)

                if feature is not None:

                    registration_embeddings.append(feature)

                    registration_last_sample_frame = frame_number

                    sample_count = len(registration_embeddings)

                    registration_message = (
                        f"Registering "
                        f"{sample_count}/"
                        f"{REGISTRATION_SAMPLES}"
                    )

                    print(
                        f"\rSamples: "
                        f"{sample_count}/"
                        f"{REGISTRATION_SAMPLES}",
                        end=""
                    )

                    # ----------------------------------------
                    # Complete
                    # ----------------------------------------

                    if sample_count >= REGISTRATION_SAMPLES:

                        print()

                        finish_registration()

        elif face_count == 0:

            registration_message = "No face detected"

        else:

            registration_message = "Only ONE person allowed"

        # ----------------------------------------------------
        # Draw registration faces
        # ----------------------------------------------------

        for face in faces:

            x, y, w, h = face[:4]

            x = int(x)
            y = int(y)
            w = int(w)
            h = int(h)

            cv2.rectangle(
                frame,
                (x, y),
                (x + w, y + h),
                (0, 165, 255),
                2
            )

    # ========================================================
    # NORMAL RECOGNITION MODE
    # ========================================================

    else:

        # ----------------------------------------------------
        # Drop stale tracks (faces that left the frame)
        # ----------------------------------------------------

        tracks = [
            t for t in tracks
            if frame_number - t["last_seen_frame"]
            <= TRACK_MAX_MISSED_FRAMES
        ]

        # ----------------------------------------------------
        # Match / update / create a track for every detected
        # face. SFace only runs for genuinely new faces or
        # tracks old enough to need a refresh.
        # ----------------------------------------------------

        current_results = []

        for face in faces:

            track = match_or_create_track(
                face,
                frame,
                frame_number
            )

            current_results.append(track)

        # ======================================================
        # DRAW RESULTS
        # ======================================================

        for result in current_results:

            x, y, w, h = result["bbox"]

            confidence = result["confidence"]

            person_id = result["id"]

            person_name = result["name"]

            similarity = result["score"]

            # Check for weak match candidate
            candidate_name = result.get("candidate_name")
            candidate_hits = result.get("candidate_hits", 0)

            if person_id != "Unknown":

                color = (0, 255, 0)

                label = (
                    f"{person_id} | "
                    f"{person_name} | "
                    f"{similarity:.2f}"
                )

            elif candidate_name is not None and candidate_hits > 0:

                # Show candidate status
                color = (0, 165, 255)  # Orange for candidate

                avg_score = 0.0
                scores = result.get("candidate_scores", [])
                if scores:
                    avg_score = sum(scores) / len(scores)

                label = (
                    f"Candidate: {candidate_name} | "
                    f"Hits: {candidate_hits}/{WEAK_MATCH_REQUIRED_HITS} | "
                    f"Avg: {avg_score:.2f}"
                )

            else:

                color = (0, 0, 255)

                label = "Unknown"

            # Face box

            cv2.rectangle(
                frame,
                (x, y),
                (x + w, y + h),
                color,
                2
            )

            # Identity

            cv2.putText(
                frame,
                label,
                (x, max(25, y - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                color,
                2
            )

            # Detection confidence

            cv2.putText(
                frame,
                f"Face: {confidence:.2f}",
                (x, y + h + 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                1
            )

    # ========================================================
    # FPS
    # ========================================================

    fps_counter += 1

    elapsed = time.perf_counter() - fps_start

    if elapsed >= 1.0:

        fps = fps_counter / elapsed

        fps_counter = 0

        fps_start = time.perf_counter()

    # ========================================================
    # INFORMATION PANEL
    # ========================================================

    cv2.putText(
        frame,
        f"FPS: {fps:.1f}",
        (15, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Faces Detected: {face_count}",
        (15, 60),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Registered: {len(persons)}",
        (15, 90),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2
    )

    # ========================================================
    # MODE MESSAGE
    # ========================================================

    if registration_mode:

        cv2.putText(
            frame,
            registration_message,
            (15, 125),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 165, 255),
            2
        )

        cv2.putText(
            frame,
            "REGISTRATION MODE",
            (15, 155),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 165, 255),
            2
        )

        cv2.putText(
            frame,
            "ESC = Cancel",
            (15, 185),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255),
            2
        )

    else:

        cv2.putText(
            frame,
            "R = Register New Person",
            (15, 125),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2
        )

    # ========================================================
    # DISPLAY
    # ========================================================

    cv2.imshow(
        "Person Identity System",
        frame
    )

    # ========================================================
    # KEYBOARD
    # ========================================================

    key = cv2.waitKey(1) & 0xFF

    # --------------------------------------------------------
    # REGISTER
    # --------------------------------------------------------

    if key == ord("r"):

        if not registration_mode:

            start_registration()

    # --------------------------------------------------------
    # CANCEL
    # --------------------------------------------------------

    elif key == 27:

        if registration_mode:

            registration_mode = False

            registration_embeddings = []

            registration_message = "Registration cancelled"

            print("\nRegistration cancelled.")

    # --------------------------------------------------------
    # QUIT
    # --------------------------------------------------------

    elif key == ord("q"):

        break


# ============================================================
# CLEANUP
# ============================================================

camera.release()

cv2.destroyAllWindows()

print()
print("Camera closed.")