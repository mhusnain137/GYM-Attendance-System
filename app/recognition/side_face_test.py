import cv2
import time
import numpy as np
from insightface.app import FaceAnalysis


# ============================================================
# CPU OPTIMIZED SETTINGS
# ============================================================

CAMERA_ID = 0

# Start small for CPU speed.
# Increase to (640, 640) later if needed.
DET_SIZE = (320, 320)

# Recognition every N frames
RECOGNITION_INTERVAL = 3


# ============================================================
# LOAD INSIGHTFACE / ARCFACE
# ============================================================

print("Loading InsightFace + ArcFace...")

app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

app.prepare(
    ctx_id=-1,
    det_size=DET_SIZE
)

print("Model loaded.")
print("CPU mode enabled.")
print()


# ============================================================
# CAMERA
# ============================================================

cap = cv2.VideoCapture(CAMERA_ID)

if not cap.isOpened():
    raise RuntimeError("Could not open webcam.")

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# Reduce camera buffering
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)


# ============================================================
# FPS
# ============================================================

frame_count = 0
fps = 0.0

fps_start = time.perf_counter()


# ============================================================
# CACHE
# ============================================================

last_faces = []

last_embeddings = []


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    ret, frame = cap.read()

    if not ret:
        print("Camera frame error.")
        break

    frame_count += 1


    # --------------------------------------------------------
    # RUN FACE DETECTION + ARCFace
    # --------------------------------------------------------

    if frame_count % RECOGNITION_INTERVAL == 0:

        try:

            faces = app.get(frame)

            last_faces = faces

        except Exception as e:

            print("InsightFace error:", e)

            faces = []


    else:

        faces = last_faces


    # --------------------------------------------------------
    # FACE COUNT
    # --------------------------------------------------------

    face_count = len(faces)


    # --------------------------------------------------------
    # DRAW FACES
    # --------------------------------------------------------

    for face in faces:

        bbox = face.bbox.astype(int)

        x1, y1, x2, y2 = bbox

        # Detection confidence
        detection_score = float(
            face.det_score
        )


        # ----------------------------------------------------
        # ARCface embedding
        # ----------------------------------------------------

        embedding = face.embedding

        embedding_size = (
            len(embedding)
            if embedding is not None
            else 0
        )


        # ----------------------------------------------------
        # DRAW BOX
        # ----------------------------------------------------

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )


        # ----------------------------------------------------
        # LABEL
        # ----------------------------------------------------

        label = (
            f"Face {detection_score:.2f}"
        )

        cv2.putText(
            frame,
            label,
            (x1, max(25, y1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 255, 0),
            2
        )


        # ----------------------------------------------------
        # EMBEDDING SIZE
        # ----------------------------------------------------

        cv2.putText(
            frame,
            f"Embedding: {embedding_size}D",
            (x1, y2 + 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1
        )


    # ========================================================
    # FPS
    # ========================================================

    elapsed = (
        time.perf_counter()
        - fps_start
    )

    if elapsed >= 1.0:

        fps = frame_count / elapsed

        frame_count = 0

        fps_start = time.perf_counter()


    # ========================================================
    # INFO
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
        f"Faces: {face_count}",
        (15, 60),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.65,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        "ArcFace | CPU",
        (15, 90),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        "Q = Quit",
        (15, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (255, 255, 255),
        2
    )


    # ========================================================
    # SHOW
    # ========================================================

    cv2.imshow(
        "ArcFace Side Face Test",
        frame
    )


    # ========================================================
    # KEY
    # ========================================================

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break


# ============================================================
# CLEANUP
# ============================================================

cap.release()

cv2.destroyAllWindows()

print("Camera closed.")