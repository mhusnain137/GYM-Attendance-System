import cv2
import numpy as np
import onnxruntime as ort
import time
import os


# ============================================================
# PATHS
# ============================================================

YUNET_MODEL = r"models\yunet\face_detection_yunet_int8.onnx"

ARCFACE_MODEL = (
    r"C:\Users\HP\.insightface\models"
    r"\buffalo_l\w600k_r50.onnx"
)


# ============================================================
# CPU SETTINGS
# ============================================================

CAMERA_ID = 0

CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480

# YuNet detection size
DETECT_SIZE = (320, 320)

# Run ArcFace every N frames
# Higher = faster, lower = more recognition updates
ARCFACE_INTERVAL = 5


# ============================================================
# CHECK MODELS
# ============================================================

if not os.path.exists(YUNET_MODEL):
    raise FileNotFoundError(
        f"YuNet model not found:\n{YUNET_MODEL}"
    )

if not os.path.exists(ARCFACE_MODEL):
    raise FileNotFoundError(
        f"ArcFace model not found:\n{ARCFACE_MODEL}"
    )


# ============================================================
# SHOW ONNX PROVIDERS
# ============================================================

print()
print("Available ONNX providers:")

for provider in ort.get_available_providers():
    print(" -", provider)

print()

# IMPORTANT:
# Force CPU only.
SESSION_OPTIONS = ort.SessionOptions()

SESSION_OPTIONS.graph_optimization_level = (
    ort.GraphOptimizationLevel.ORT_ENABLE_ALL
)

SESSION_OPTIONS.intra_op_num_threads = max(
    1,
    (os.cpu_count() or 4) - 1
)

SESSION_OPTIONS.inter_op_num_threads = 1

arcface_session = ort.InferenceSession(
    ARCFACE_MODEL,
    sess_options=SESSION_OPTIONS,
    providers=["CPUExecutionProvider"]
)

print("ArcFace provider:")
print(
    arcface_session.get_providers()
)

print()


# ============================================================
# ARCFACE INPUT / OUTPUT
# ============================================================

arcface_input = (
    arcface_session
    .get_inputs()[0]
)

arcface_output = (
    arcface_session
    .get_outputs()[0]
)

print("ArcFace input:")
print(arcface_input.name)
print(arcface_input.shape)

print()

print("ArcFace output:")
print(arcface_output.name)
print(arcface_output.shape)

print()


# ============================================================
# YUNET
# ============================================================

print("Loading YuNet...")

detector = cv2.FaceDetectorYN.create(
    YUNET_MODEL,
    "",
    DETECT_SIZE,
    0.60,
    0.30,
    5000,
    cv2.dnn.DNN_BACKEND_OPENCV,
    cv2.dnn.DNN_TARGET_CPU
)

print("YuNet loaded.")
print()


# ============================================================
# ARCFACE PREPROCESSING
# ============================================================

def prepare_arcface(face_image):

    # ArcFace expects 112x112
    face_image = cv2.resize(
        face_image,
        (112, 112),
        interpolation=cv2.INTER_LINEAR
    )

    # BGR -> RGB
    face_image = cv2.cvtColor(
        face_image,
        cv2.COLOR_BGR2RGB
    )

    # uint8 -> float32
    face_image = face_image.astype(
        np.float32
    )

    # ArcFace normalization
    face_image = (
        (face_image - 127.5)
        / 127.5
    )

    # HWC -> CHW
    face_image = np.transpose(
        face_image,
        (2, 0, 1)
    )

    # Add batch dimension
    face_image = np.expand_dims(
        face_image,
        axis=0
    )

    return face_image


# ============================================================
# ARCFACE EMBEDDING
# ============================================================

def get_arcface_embedding(face_image):

    input_tensor = prepare_arcface(
        face_image
    )

    result = arcface_session.run(
        [arcface_output.name],
        {
            arcface_input.name:
            input_tensor
        }
    )

    embedding = result[0][0]

    # L2 normalize
    norm = np.linalg.norm(
        embedding
    )

    if norm > 0:
        embedding = (
            embedding / norm
        )

    return embedding


# ============================================================
# CAMERA
# ============================================================

print("Opening webcam...")

cap = cv2.VideoCapture(
    CAMERA_ID
)

if not cap.isOpened():
    raise RuntimeError(
        "Could not open webcam."
    )

cap.set(
    cv2.CAP_PROP_FRAME_WIDTH,
    CAMERA_WIDTH
)

cap.set(
    cv2.CAP_PROP_FRAME_HEIGHT,
    CAMERA_HEIGHT
)

cap.set(
    cv2.CAP_PROP_BUFFERSIZE,
    1
)


# ============================================================
# VARIABLES
# ============================================================

frame_number = 0

last_faces = None

last_embeddings = []

fps = 0.0

fps_frames = 0

fps_start = time.perf_counter()


# ============================================================
# MAIN LOOP
# ============================================================

print()
print("======================================")
print(" YuNet + ArcFace CPU Test")
print("======================================")
print("Q = Quit")
print()
print("Turn your face:")
print("1. Front")
print("2. 45 degree left")
print("3. 45 degree right")
print("4. Full side/profile")
print()


while True:

    ret, frame = cap.read()

    if not ret:
        print(
            "Failed to read camera."
        )
        break

    frame_number += 1


    # ========================================================
    # YUNET
    # ========================================================

    height, width = frame.shape[:2]

    detector.setInputSize(
        (width, height)
    )

    _, faces = detector.detect(
        frame
    )


    if faces is None:

        face_count = 0

        last_faces = None

    else:

        face_count = len(faces)

        last_faces = faces


    # ========================================================
    # ARCFACE
    # ========================================================

    # Don't run ArcFace every frame.
    if (
        faces is not None
        and
        frame_number % ARCFACE_INTERVAL == 0
    ):

        last_embeddings = []

        for face in faces:

            x, y, w, h = face[:4]

            x = int(x)
            y = int(y)
            w = int(w)
            h = int(h)


            # ----------------------------------------------
            # Make sure crop stays inside frame
            # ----------------------------------------------

            x1 = max(
                0,
                x
            )

            y1 = max(
                0,
                y
            )

            x2 = min(
                width,
                x + w
            )

            y2 = min(
                height,
                y + h
            )


            if (
                x2 <= x1
                or
                y2 <= y1
            ):
                continue


            face_crop = frame[
                y1:y2,
                x1:x2
            ]


            if face_crop.size == 0:
                continue


            try:

                embedding = (
                    get_arcface_embedding(
                        face_crop
                    )
                )

                last_embeddings.append(
                    embedding
                )

            except Exception as e:

                print(
                    "ArcFace error:",
                    e
                )


    # ========================================================
    # DRAW DETECTIONS
    # ========================================================

    if faces is not None:

        for index, face in enumerate(
            faces
        ):

            x, y, w, h = face[:4]

            x = int(x)
            y = int(y)
            w = int(w)
            h = int(h)

            confidence = float(
                face[-1]
            )


            # ----------------------------------------------
            # Draw box
            # ----------------------------------------------

            cv2.rectangle(
                frame,
                (x, y),
                (x + w, y + h),
                (0, 255, 0),
                2
            )


            # ----------------------------------------------
            # Detection confidence
            # ----------------------------------------------

            cv2.putText(
                frame,
                f"Face {confidence:.2f}",
                (
                    x,
                    max(
                        25,
                        y - 10
                    )
                ),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 255, 0),
                2
            )


            # ----------------------------------------------
            # Embedding information
            # ----------------------------------------------

            if (
                index
                <
                len(last_embeddings)
            ):

                embedding_size = len(
                    last_embeddings[index]
                )

                embedding_text = (
                    f"ArcFace: "
                    f"{embedding_size}D"
                )

            else:

                embedding_text = (
                    "ArcFace: waiting..."
                )


            cv2.putText(
                frame,
                embedding_text,
                (
                    x,
                    y + h + 20
                ),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1
            )


    # ========================================================
    # FPS
    # ========================================================

    fps_frames += 1

    elapsed = (
        time.perf_counter()
        -
        fps_start
    )

    if elapsed >= 1.0:

        fps = (
            fps_frames
            /
            elapsed
        )

        fps_frames = 0

        fps_start = (
            time.perf_counter()
        )


    # ========================================================
    # INFORMATION
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
        "YuNet + ArcFace | CPU",
        (15, 90),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (255, 255, 255),
        2
    )


    cv2.putText(
        frame,
        f"ArcFace interval: "
        f"{ARCFACE_INTERVAL}",
        (15, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (255, 255, 255),
        1
    )


    cv2.putText(
        frame,
        "Q = Quit",
        (15, 150),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (255, 255, 255),
        1
    )


    # ========================================================
    # SHOW
    # ========================================================

    cv2.imshow(
        "CPU Face Recognition Test",
        frame
    )


    # ========================================================
    # KEYBOARD
    # ========================================================

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break


# ============================================================
# CLEANUP
# ============================================================

cap.release()

cv2.destroyAllWindows()

print()
print("Camera closed.")