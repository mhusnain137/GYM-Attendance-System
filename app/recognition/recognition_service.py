import cv2
import numpy as np
import json
import os
import time
import threading
from collections import deque
import recognition_config


class RecognitionService:
    """Recognition service that wraps the existing webcam.py logic"""
    
    def __init__(self):
        self.running = False
        self.lock = threading.Lock()
        
        # Load models
        print("Loading YuNet...")
        self.detector = cv2.FaceDetectorYN.create(
            recognition_config.YUNET_MODEL,
            "",
            (recognition_config.DETECTION_WIDTH, recognition_config.DETECTION_WIDTH),
            recognition_config.FACE_CONFIDENCE,
            recognition_config.NMS_THRESHOLD,
            recognition_config.TOP_K,
            cv2.dnn.DNN_BACKEND_OPENCV,
            cv2.dnn.DNN_TARGET_CPU
        )
        print("YuNet loaded.")
        
        print("Loading SFace...")
        self.recognizer = cv2.FaceRecognizerSF.create(
            recognition_config.SFACE_MODEL,
            ""
        )
        print("SFace loaded.")
        
        # Load database
        self.persons = self.load_database()
        print(f"Registered persons: {len(self.persons)}")
        
        # Initialize attendance file
        os.makedirs(
            os.path.dirname(recognition_config.ATTENDANCE_FILE),
            exist_ok=True
        )
        
        if not os.path.exists(recognition_config.ATTENDANCE_FILE):
            with open(
                recognition_config.ATTENDANCE_FILE,
                "w",
                encoding="utf-8"
            ) as f:
                json.dump([], f, indent=4)
        
        # Initialize visits file
        os.makedirs(
            os.path.dirname(recognition_config.VISITS_FILE),
            exist_ok=True
        )
        
        if not os.path.exists(recognition_config.VISITS_FILE):
            with open(
                recognition_config.VISITS_FILE,
                "w",
                encoding="utf-8"
            ) as f:
                json.dump([], f, indent=4)
        
        # Camera
        self.cap = None
        self.threaded_camera = None
        self.camera_source = getattr(recognition_config, 'CAMERA_SOURCE', 'webcam')  # 'webcam' or 'rtsp'
        self.rtsp_url = getattr(recognition_config, 'RTSP_URL', '')
        self.camera_name = 'Webcam'
        self.camera_status = 'disconnected'  # 'disconnected', 'connecting', 'connected', 'error', 'reconnecting'
        
        # RTSP reconnect management
        self.reconnect_thread = None
        self.should_reconnect = False
        self.frame_failure_count = 0
        self.reconnect_attempts = 0
        
        # Recognition state
        self.tracks = []
        self.frame_number = 0
        self.fps = 0.0
        self.fps_counter = 0
        self.fps_start = time.perf_counter()
        
        # Current frame for streaming
        self.current_frame = None
        self.frame_lock = threading.Lock()
        
        # Registration state
        self.registration_mode = False
        self.registration_embeddings = []
        self.registration_frame_counter = 0
        self.registration_message = ""
        self.registration_last_sample_frame = -999
        self.registration_name = ""
        
        # Event callback
        self.event_callback = None
        
        # Make settings accessible
        self.settings = {
            "recognition_threshold": recognition_config.RECOGNITION_THRESHOLD,
            "weak_match_threshold": recognition_config.WEAK_MATCH_THRESHOLD,
            "min_match_margin": recognition_config.MIN_MATCH_MARGIN,
            "weak_match_required_hits": recognition_config.WEAK_MATCH_REQUIRED_HITS,
            "track_refresh_frames": recognition_config.TRACK_REFRESH_FRAMES,
            "track_max_missed_frames": recognition_config.TRACK_MAX_MISSED_FRAMES,
            "enable_auto_register_unknown": getattr(recognition_config, 'ENABLE_AUTO_REGISTER_UNKNOWN', True),
            "auto_register_required_hits": getattr(recognition_config, 'AUTO_REGISTER_REQUIRED_HITS', 3)
        }
        
        # Set CPU threads
        cv2.setNumThreads(os.cpu_count() or 4)
    
    def load_database(self):
        """Load persons database"""
        try:
            with open(recognition_config.DATABASE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                return []
            return data
        except Exception as e:
            print("Database load error:", e)
            return []
    
    def save_database(self, persons):
        """Save persons database"""
        temp_file = recognition_config.DATABASE_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(persons, f, indent=4)
        os.replace(temp_file, recognition_config.DATABASE_FILE)
    
    def load_attendance(self):
        """Load attendance database"""
        try:
            with open(recognition_config.ATTENDANCE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                return []
            return data
        except Exception as e:
            print("Attendance load error:", e)
            return []
    
    def save_attendance(self, attendance):
        """Save attendance database"""
        temp_file = recognition_config.ATTENDANCE_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(attendance, f, indent=4)
        os.replace(temp_file, recognition_config.ATTENDANCE_FILE)
    
    def record_attendance(self, person_id, person_name):
        """Record attendance for a person on today's date
        
        Creates exactly one attendance record per person per date.
        If attendance already exists for person_id + today's date, does nothing.
        
        Only records attendance for registered persons (not Unknown).
        
        Thread-safe for the current single-process architecture.
        
        Returns:
            dict: The attendance record (existing or newly created), or None if failed
        """
        from datetime import datetime
        
        # Do not record attendance for Unknown persons
        if person_id == "Unknown" or person_name == "Unknown":
            return None
        
        try:
            # Get today's date
            today = datetime.now().strftime("%Y-%m-%d")
            current_time = datetime.now().strftime("%H:%M:%S")
            
            # Use lock to prevent race conditions
            with self.lock:
                # Load existing attendance
                attendance = self.load_attendance()
                
                # Check if attendance already exists for this person + date
                for record in attendance:
                    if record.get("person_id") == person_id and record.get("date") == today:
                        # Attendance already exists, return it
                        return record
                
                # Create new attendance record
                new_record = {
                    "date": today,
                    "person_id": person_id,
                    "name": person_name,
                    "status": "Present",
                    "first_detected": current_time,
                    "camera_source": self.camera_source,
                    "camera_name": self.camera_name or ('Webcam' if self.camera_source == 'webcam' else 'CCTV')
                }
                
                # Add to attendance list
                attendance.append(new_record)
                
                # Save attendance
                self.save_attendance(attendance)
                
                # Log event if callback exists
                if self.event_callback:
                    self.event_callback({
                        "type": "attendance",
                        "person_id": person_id,
                        "person_name": person_name,
                        "date": today,
                        "time": current_time,
                        "camera_name": self.camera_name
                    })
                
                return new_record
            
        except Exception as e:
            print(f"Error recording attendance: {e}")
            return None

    def load_visits(self):
        """Load visits log"""
        try:
            with open(recognition_config.VISITS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                return []
            return data
        except Exception as e:
            print("Visits load error:", e)
            return []
    
    def save_visits(self, visits):
        """Save visits log"""
        temp_file = recognition_config.VISITS_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(visits, f, indent=4)
        os.replace(temp_file, recognition_config.VISITS_FILE)
    
    def record_visit(self, person_id, person_name):
        """Log every appearance of a person in front of camera (visit log)
        
        Includes a 10-second cooldown per person to prevent rapid duplicate entries
        when a person stays in front of the camera or is re-detected across consecutive frames.
        """
        from datetime import datetime

        if person_id == "Unknown" or person_name == "Unknown":
            return None

        try:
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M:%S")
            cam_name = self.camera_name if self.camera_name else ('Webcam' if self.camera_source == 'webcam' else 'CCTV')

            with self.lock:
                visits = self.load_visits()
                
                # Check recent visits for this person to prevent rapid duplicate entries (< 10 seconds)
                for v in reversed(visits):
                    if v.get("person_id") == person_id and v.get("date") == today_str:
                        last_time_str = v.get("time")
                        if last_time_str:
                            try:
                                t_last = datetime.strptime(last_time_str, "%H:%M:%S")
                                t_now = datetime.strptime(time_str, "%H:%M:%S")
                                diff_seconds = abs((t_now - t_last).total_seconds())
                                if diff_seconds < 10:
                                    # Too soon, skip duplicate visit log
                                    return None
                            except Exception:
                                pass
                        break

                visits.append({
                    "person_id": person_id,
                    "name": person_name,
                    "date": today_str,
                    "time": time_str,
                    "camera_source": self.camera_source,
                    "camera_name": cam_name
                })
                self.save_visits(visits)
        except Exception as e:
            print(f"Error recording visit: {e}")
    
    def generate_person_id(self, persons):
        """Generate new person ID"""
        highest_number = 0
        for person in persons:
            person_id = str(person.get("id", ""))
            if person_id.startswith("P-"):
                try:
                    number = int(person_id[2:])
                    highest_number = max(highest_number, number)
                except ValueError:
                    pass
        return f"P-{highest_number + 1:06d}"
    
    def normalize_embedding(self, embedding):
        """Normalize embedding vector"""
        embedding = np.asarray(embedding, dtype=np.float32).flatten()
        norm = np.linalg.norm(embedding)
        if norm < 1e-8:
            return None
        return embedding / norm
    
    def cosine_similarity(self, a, b):
        """Calculate cosine similarity between embeddings"""
        a = self.normalize_embedding(a)
        b = self.normalize_embedding(b)
        if a is None or b is None:
            return -1.0
        return float(np.dot(a, b))
    
    def apply_lighting_normalization(self, aligned_face):
        """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) on L-channel to normalize lighting"""
        if not getattr(recognition_config, 'ENABLE_CLAHE_LIGHTING_NORM', True):
            return aligned_face
        try:
            lab = cv2.cvtColor(aligned_face, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clip_limit = getattr(recognition_config, 'CLAHE_CLIP_LIMIT', 2.0)
            tile_grid = getattr(recognition_config, 'CLAHE_TILE_GRID_SIZE', (8, 8))
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid)
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
            return enhanced
        except Exception as e:
            print("CLAHE error:", e)
            return aligned_face

    def crop_and_save_face_image(self, frame, face, person_id, sample_idx=0):
        """Save high quality face crop image per person and sample to disk asynchronously"""
        try:
            os.makedirs(recognition_config.FACE_CROPS_DIR, exist_ok=True)
            primary_path = os.path.join(recognition_config.FACE_CROPS_DIR, f"{person_id}.jpg")
            sample_path = os.path.join(recognition_config.FACE_CROPS_DIR, f"{person_id}_sample_{sample_idx}.jpg")
            
            x, y, w, h = face[:4]
            x, y, w, h = int(x), int(y), int(w), int(h)
            
            # Add 20% margin
            margin_x = int(w * 0.20)
            margin_y = int(h * 0.20)
            
            img_h, img_w = frame.shape[:2]
            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(img_w, x + w + margin_x)
            y2 = min(img_h, y + h + margin_y)
            
            face_crop = frame[y1:y2, x1:x2]
            if face_crop.size > 0:
                cv2.imwrite(sample_path, face_crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if sample_idx == 0 or not os.path.exists(primary_path):
                    cv2.imwrite(primary_path, face_crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
        except Exception as e:
            print("Error saving face crop:", e)

    def add_person_face_image(self, person_id, image_bytes):
        """Extract SFace embedding from uploaded photo and add to person's embeddings list"""
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {"success": False, "message": "Invalid image file"}

            img_h, img_w = img.shape[:2]
            self.detector.setInputSize((img_w, img_h))
            _, faces = self.detector.detect(img)

            # Restore detector default input size
            self.detector.setInputSize((recognition_config.DETECTION_WIDTH, recognition_config.DETECTION_WIDTH))

            if faces is None or len(faces) == 0:
                return {"success": False, "message": "No face detected in the uploaded photo. Please upload a clear photo."}
            
            if len(faces) > 1:
                return {"success": False, "message": "Multiple faces detected. Please upload a photo with only ONE face."}

            face = faces[0]
            confidence = face[-1]
            if confidence < 0.65:
                return {"success": False, "message": "Face confidence too low. Please upload a clearer front-facing photo."}

            aligned_face = self.recognizer.alignCrop(img, face)
            normalized_face = self.apply_lighting_normalization(aligned_face)
            feature = self.recognizer.feature(normalized_face)
            feature_norm = self.normalize_embedding(feature)

            if feature_norm is None:
                return {"success": False, "message": "Failed to extract face features"}

            with self.lock:
                persons = self.load_database()
                target_person = None
                for p in persons:
                    if p.get("id") == person_id:
                        target_person = p
                        break

                if not target_person:
                    return {"success": False, "message": "Person profile not found"}

                # Initialize embeddings array if not present
                embeddings = target_person.get("embeddings", [])
                if not embeddings and target_person.get("embedding"):
                    embeddings = [target_person["embedding"]]

                # Limit max 5 embeddings per person
                if len(embeddings) >= 5:
                    embeddings.pop(1) # Keep primary 0th embedding, rotate out older extra samples

                sample_idx = len(embeddings)
                embeddings.append(feature_norm.tolist())
                target_person["embeddings"] = embeddings
                target_person["embedding"] = embeddings[0] # primary reference

                self.save_database(persons)
                self.persons = persons

                # Save face crop image with sample index
                self.crop_and_save_face_image(img, face, person_id, sample_idx=sample_idx)

                return {
                    "success": True, 
                    "message": f"Successfully added new face sample! (Total samples: {len(embeddings)})",
                    "embedding_count": len(embeddings)
                }
        except Exception as e:
            print("Error in add_person_face_image:", e)
            return {"success": False, "message": f"Error processing image: {str(e)}"}

    def get_person_face_samples(self, person_id):
        """Get list of stored face sample thumbnail URLs for a person"""
        import time
        t_stamp = int(time.time() * 1000)
        with self.lock:
            target_person = next((p for p in self.persons if p.get("id") == person_id or p.get("person_id") == person_id), None)
            if not target_person:
                return []
            
            embeddings = target_person.get("embeddings", [])
            if not embeddings and target_person.get("embedding"):
                embeddings = [target_person["embedding"]]
                
            samples = []
            for idx in range(len(embeddings)):
                sample_filename = f"{person_id}_sample_{idx}.jpg"
                sample_path = os.path.join(recognition_config.FACE_CROPS_DIR, sample_filename)
                
                if os.path.exists(sample_path):
                    url = f"/api/face-crops/{sample_filename}?t={t_stamp}"
                else:
                    url = f"/api/face-crops/{person_id}.jpg?t={t_stamp}"
                    
                samples.append({
                    "index": idx,
                    "url": url,
                    "is_primary": idx == 0
                })
            return samples

    def delete_person_face_sample(self, person_id, sample_index):
        """Delete an individual face sample embedding and image for a person"""
        try:
            with self.lock:
                persons = self.load_database()
                target_person = None
                for p in persons:
                    if p.get("id") == person_id or p.get("person_id") == person_id:
                        target_person = p
                        break

                if not target_person:
                    return {"success": False, "message": "Person profile not found"}

                embeddings = target_person.get("embeddings", [])
                if not embeddings and target_person.get("embedding"):
                    embeddings = [target_person["embedding"]]

                if len(embeddings) <= 1:
                    return {"success": False, "message": "Cannot delete the last remaining face sample."}

                if sample_index < 0 or sample_index >= len(embeddings):
                    return {"success": False, "message": "Invalid sample index"}

                embeddings.pop(sample_index)
                target_person["embeddings"] = embeddings
                target_person["embedding"] = embeddings[0]

                self.save_database(persons)
                self.persons = persons

                # Delete sample image file
                sample_file = os.path.join(recognition_config.FACE_CROPS_DIR, f"{person_id}_sample_{sample_index}.jpg")
                if os.path.exists(sample_file):
                    try:
                        os.remove(sample_file)
                    except Exception:
                        pass

                return {
                    "success": True,
                    "message": f"Deleted face sample #{sample_index + 1} successfully!",
                    "remaining_count": len(embeddings)
                }
        except Exception as e:
            print("Error in delete_person_face_sample:", e)
            return {"success": False, "message": f"Error deleting face sample: {str(e)}"}

    def set_primary_face_sample(self, person_id, sample_index):
        """Set a specific sample index as the primary reference embedding and crop image"""
        try:
            with self.lock:
                persons = self.load_database()
                target_person = None
                for p in persons:
                    if p.get("id") == person_id or p.get("person_id") == person_id:
                        target_person = p
                        break

                if not target_person:
                    return {"success": False, "message": "Person profile not found"}

                embeddings = target_person.get("embeddings", [])
                if not embeddings and target_person.get("embedding"):
                    embeddings = [target_person["embedding"]]

                if sample_index < 0 or sample_index >= len(embeddings):
                    return {"success": False, "message": "Invalid sample index"}

                if sample_index == 0:
                    return {"success": True, "message": "Sample is already primary"}

                # Move selected sample to index 0
                chosen_embedding = embeddings.pop(sample_index)
                embeddings.insert(0, chosen_embedding)
                target_person["embeddings"] = embeddings
                target_person["embedding"] = embeddings[0]

                self.save_database(persons)
                self.persons = persons

                # Swap sample images on disk so sample_0 becomes the new primary image
                import shutil
                sample_0_file = os.path.join(recognition_config.FACE_CROPS_DIR, f"{person_id}_sample_0.jpg")
                sample_target_file = os.path.join(recognition_config.FACE_CROPS_DIR, f"{person_id}_sample_{sample_index}.jpg")
                primary_file = os.path.join(recognition_config.FACE_CROPS_DIR, f"{person_id}.jpg")

                if not os.path.exists(sample_0_file) and os.path.exists(primary_file):
                    try:
                        shutil.copy2(primary_file, sample_0_file)
                    except Exception:
                        pass

                if os.path.exists(sample_0_file) and os.path.exists(sample_target_file):
                    temp_file = os.path.join(recognition_config.FACE_CROPS_DIR, f"{person_id}_temp.jpg")
                    try:
                        shutil.copy2(sample_0_file, temp_file)
                        shutil.copy2(sample_target_file, sample_0_file)
                        shutil.copy2(temp_file, sample_target_file)
                        if os.path.exists(temp_file):
                            os.remove(temp_file)
                    except Exception as e:
                        print("Error swapping sample files:", e)

                if os.path.exists(sample_0_file):
                    try:
                        shutil.copy2(sample_0_file, primary_file)
                    except Exception as e:
                        print("Error updating primary_file:", e)

                return {
                    "success": True,
                    "message": f"Sample #{sample_index + 1} set as Primary face photo!",
                    "primary_index": 0
                }
        except Exception as e:
            print("Error in set_primary_face_sample:", e)
            return {"success": False, "message": f"Error setting primary face photo: {str(e)}"}

    def add_person_batch_face_images(self, person_id, images_bytes_list):
        """Extract SFace embeddings from multiple uploaded photos in a single batch"""
        added_count = 0
        failed_count = 0
        messages = []
        last_count = 0

        for idx, img_bytes in enumerate(images_bytes_list):
            res = self.add_person_face_image(person_id, img_bytes)
            if res.get("success"):
                added_count += 1
                last_count = res.get("embedding_count", 0)
            else:
                failed_count += 1
                messages.append(f"Photo #{idx+1}: {res.get('message')}")

        if added_count > 0:
            return {
                "success": True,
                "message": f"Successfully added {added_count} new face sample(s)! (Total samples: {last_count})",
                "added_count": added_count,
                "failed_count": failed_count,
                "embedding_count": last_count,
                "details": messages
            }
        else:
            first_msg = messages[0] if messages else "No valid face photos processed"
            return {"success": False, "message": first_msg, "details": messages}

    def get_face_embedding(self, frame, face):
        """Extract face embedding with optional CLAHE lighting normalization"""
        try:
            aligned_face = self.recognizer.alignCrop(frame, face)
            normalized_face = self.apply_lighting_normalization(aligned_face)
            feature = self.recognizer.feature(normalized_face)
            feature = self.normalize_embedding(feature)
            return feature
        except Exception as e:
            print("Embedding error:", e)
            return None
    
    def find_best_match(self, feature, database):
        """Find best matching person in database"""
        if feature is None:
            return None, 0.0, 0.0
        if not database:
            return None, 0.0, 0.0
        
        matches = []
        for person in database:
            stored_list = person.get("embeddings") or ([person["embedding"]] if person.get("embedding") else [])
            if not stored_list:
                continue
            best_person_score = -1.0
            for stored in stored_list:
                stored_norm = self.normalize_embedding(stored)
                if stored_norm is None:
                    continue
                score = self.cosine_similarity(feature, stored_norm)
                if score > best_person_score:
                    best_person_score = score
            if best_person_score > -1.0:
                matches.append((best_person_score, person))
        
        if not matches:
            return None, 0.0, 0.0
        
        matches.sort(key=lambda item: item[0], reverse=True)
        best_score, best_person = matches[0]
        second_score = matches[1][0] if len(matches) > 1 else 0.0
        
        return best_person, best_score, second_score
    
    def compute_iou(self, box1, box2):
        """Calculate IoU between two bounding boxes"""
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
    
    def detect_faces(self, frame):
        """Detect faces in frame"""
        height, width = frame.shape[:2]
        scale = recognition_config.DETECTION_WIDTH / float(width)
        detect_width = recognition_config.DETECTION_WIDTH
        detect_height = max(1, int(height * scale))
        
        small_frame = cv2.resize(frame, (detect_width, detect_height))
        self.detector.setInputSize((detect_width, detect_height))
        _, faces = self.detector.detect(small_frame)
        
        if faces is None:
            return []
        
        inv_scale = 1.0 / scale
        faces[:, :14] *= inv_scale
        return faces
    
    def match_or_create_track(self, face, frame, frame_number):
        """Match or create track for detected face"""
        x, y, w, h = face[:4]
        x, y, w, h = int(x), int(y), int(w), int(h)
        confidence = float(face[-1])
        bbox = (x, y, w, h)
        
        # Try to match against existing track
        best_track = None
        best_iou = 0.0
        for track in self.tracks:
            iou = self.compute_iou(bbox, track["bbox"])
            if iou > best_iou:
                best_iou = iou
                best_track = track
        
        needs_embedding = True
        
        if best_track is not None and best_iou >= recognition_config.TRACK_IOU_THRESHOLD:
            # Same face - refresh
            best_track["bbox"] = bbox
            best_track["confidence"] = confidence
            best_track["last_seen_frame"] = frame_number
            
            age = frame_number - best_track["last_embed_frame"]
            if age < recognition_config.TRACK_REFRESH_FRAMES and best_track.get("confirmed", False):
                needs_embedding = False
        else:
            # New face - create track
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
            self.tracks.append(best_track)
        
        if needs_embedding:
            feature = self.get_face_embedding(frame, face)
            person_id = "Unknown"
            person_name = "Unknown"
            similarity = 0.0
            
            # Face quality checks
            face_quality_ok = True
            if confidence < recognition_config.WEAK_MATCH_MIN_FACE_CONFIDENCE:
                face_quality_ok = False
            if w < recognition_config.WEAK_MATCH_MIN_FACE_SIZE:
                face_quality_ok = False
            
            if feature is not None and self.persons:
                best_person, best_score, second_score = self.find_best_match(feature, self.persons)
                margin = best_score - second_score
                
                # Strong match
                if (best_person is not None and 
                    best_score >= recognition_config.RECOGNITION_THRESHOLD and
                    (margin >= recognition_config.MIN_MATCH_MARGIN or len(self.persons) == 1)):
                    person_id = best_person["id"]
                    person_name = best_person.get("name", "Unknown")
                    similarity = best_score
                
                # Weak match
                elif (best_person is not None and
                      best_score >= recognition_config.WEAK_MATCH_THRESHOLD and
                      best_score < recognition_config.RECOGNITION_THRESHOLD and
                      face_quality_ok and
                      (margin >= recognition_config.MIN_MATCH_MARGIN or len(self.persons) == 1)):
                    
                    candidate_id = best_person["id"]
                    candidate_name = best_person.get("name", "Unknown")
                    current_candidate_id = best_track.get("candidate_id")
                    
                    if current_candidate_id == candidate_id:
                        best_track["candidate_hits"] += 1
                        best_track["candidate_scores"].append(best_score)
                        if len(best_track["candidate_scores"]) > recognition_config.WEAK_MATCH_WINDOW:
                            best_track["candidate_scores"].pop(0)
                        
                        if best_track["candidate_hits"] >= recognition_config.WEAK_MATCH_REQUIRED_HITS:
                            person_id = candidate_id
                            person_name = candidate_name
                            similarity = best_score
                            best_track["candidate_id"] = None
                            best_track["candidate_name"] = None
                            best_track["candidate_scores"] = []
                            best_track["candidate_hits"] = 0
                    else:
                        best_track["candidate_id"] = candidate_id
                        best_track["candidate_name"] = candidate_name
                        best_track["candidate_scores"] = [best_score]
                        best_track["candidate_hits"] = 1
            
            # Check if refresh of existing track
            is_refresh = best_track.get("last_embed_frame", -999) != -999
            is_confirmed = best_track.get("confirmed", False)
            
            if is_refresh and is_confirmed:
                if person_id != "Unknown":
                    best_track["id"] = person_id
                    best_track["name"] = person_name
                    best_track["score"] = similarity
                    best_track["confirmed"] = True
                    best_track["last_embed_frame"] = frame_number
                    best_track["candidate_id"] = None
                    best_track["candidate_name"] = None
                    best_track["candidate_scores"] = []
                    best_track["candidate_hits"] = 0
                else:
                    best_track["last_embed_frame"] = frame_number
            else:
                if person_id != "Unknown":
                    best_track["confirmed"] = True
                    best_track["candidate_id"] = None
                    best_track["candidate_name"] = None
                    best_track["candidate_scores"] = []
                    best_track["candidate_hits"] = 0
                    
                    # Record attendance for confirmed registered person
                    # Only record if this is the first confirmation for this track
                    if not best_track.get("attendance_recorded", False):
                        self.record_attendance(person_id, person_name)
                        best_track["attendance_recorded"] = True
                    self.record_visit(person_id, person_name)
                else:
                    best_track["confirmed"] = False
                    
                    # Check Auto-Registration for Unknown Person
                    enable_auto = getattr(recognition_config, 'ENABLE_AUTO_REGISTER_UNKNOWN', True)
                    min_conf = getattr(recognition_config, 'AUTO_REGISTER_MIN_CONFIDENCE', 0.65)
                    min_size = getattr(recognition_config, 'AUTO_REGISTER_MIN_SIZE', 45)
                    req_hits = getattr(recognition_config, 'AUTO_REGISTER_REQUIRED_HITS', 3)
                    
                    if (enable_auto and 
                        not best_track.get("auto_registered", False) and
                        confidence >= min_conf and
                        w >= min_size and
                        feature is not None):
                        
                        best_track["unknown_hits"] = best_track.get("unknown_hits", 0) + 1
                        if best_track["unknown_hits"] >= req_hits:
                            best_track["auto_registered"] = True
                            new_id = self.generate_person_id(self.persons)
                            num = new_id.replace("P-", "")
                            new_name = f"Visitor #{int(num)}" if num.isdigit() else f"Visitor {new_id}"
                            
                            new_person = {
                                "id": new_id,
                                "name": new_name,
                                "embedding": feature.tolist(),
                                "embeddings": [feature.tolist()],
                                "registered_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                                "is_auto_registered": True
                            }
                            
                            self.persons.append(new_person)
                            self.save_database(self.persons)
                            
                            # Crop and save strictly 1 face crop thumbnail image asynchronously
                            threading.Thread(
                                target=self.crop_and_save_face_image,
                                args=(frame.copy(), face, new_id),
                                daemon=True
                            ).start()
                            
                            person_id = new_id
                            person_name = new_name
                            similarity = 1.0
                            best_track["confirmed"] = True
                            
                            if not best_track.get("attendance_recorded", False):
                                self.record_attendance(person_id, person_name)
                                best_track["attendance_recorded"] = True
                            self.record_visit(person_id, person_name)
                
                best_track["id"] = person_id
                best_track["name"] = person_name
                best_track["score"] = similarity
                best_track["last_embed_frame"] = frame_number
        
        return best_track
    
    def process_frame(self, frame):
        """Process a single frame"""
        self.frame_number += 1
        
        # Detect faces
        faces = self.detect_faces(frame)
        
        # Handle registration
        if self.registration_mode:
            self.registration_frame_counter += 1
            if len(faces) == 1:
                if (self.frame_number - self.registration_last_sample_frame >= 
                    recognition_config.REGISTRATION_FRAME_GAP):
                    face = faces[0]
                    feature = self.get_face_embedding(frame, face)
                    if feature is not None:
                        self.registration_embeddings.append(feature)
                        self.registration_last_sample_frame = self.frame_number
                        sample_count = len(self.registration_embeddings)
                        self.registration_message = f"Registering {sample_count}/{recognition_config.REGISTRATION_SAMPLES}"
                        
                        if sample_count >= recognition_config.REGISTRATION_SAMPLES:
                            self.finish_registration()
            elif len(faces) == 0:
                self.registration_message = "No face detected"
            else:
                self.registration_message = "Only ONE person allowed"
        else:
            # Normal recognition mode
            self.tracks = [t for t in self.tracks 
                         if self.frame_number - t["last_seen_frame"] <= recognition_config.TRACK_MAX_MISSED_FRAMES]
            
            current_results = []
            for face in faces:
                track = self.match_or_create_track(face, frame, self.frame_number)
                current_results.append(track)
            
            # Draw results on frame
            for result in current_results:
                x, y, w, h = result["bbox"]
                confidence = result["confidence"]
                person_id = result["id"]
                person_name = result["name"]
                similarity = result["score"]
                candidate_name = result.get("candidate_name")
                candidate_hits = result.get("candidate_hits", 0)
                unknown_hits = result.get("unknown_hits", 0)
                
                if person_id != "Unknown":
                    color = (0, 255, 0)
                    label = f"{person_id} | {person_name} | {similarity:.2f}"
                elif candidate_name is not None and candidate_hits > 0:
                    color = (0, 165, 255)
                    avg_score = 0.0
                    scores = result.get("candidate_scores", [])
                    if scores:
                        avg_score = sum(scores) / len(scores)
                    label = f"Candidate: {candidate_name} | Hits: {candidate_hits}/{recognition_config.WEAK_MATCH_REQUIRED_HITS} | Avg: {avg_score:.2f}"
                elif unknown_hits > 0 and getattr(recognition_config, 'ENABLE_AUTO_REGISTER_UNKNOWN', True):
                    color = (0, 200, 255)
                    req_hits = getattr(recognition_config, 'AUTO_REGISTER_REQUIRED_HITS', 3)
                    label = f"Registering Visitor... ({unknown_hits}/{req_hits})"
                else:
                    color = (0, 0, 255)
                    label = "Unknown"
                
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.putText(frame, label, (x, max(25, y - 10)), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
                cv2.putText(frame, f"Face: {confidence:.2f}", (x, y + h + 20),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # Draw FPS
        self.fps_counter += 1
        elapsed = time.perf_counter() - self.fps_start
        if elapsed >= 1.0:
            self.fps = self.fps_counter / elapsed
            self.fps_counter = 0
            self.fps_start = time.perf_counter()
        
        cv2.putText(frame, f"FPS: {self.fps:.1f}", (15, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        # Draw registration info
        if self.registration_mode:
            cv2.putText(frame, self.registration_message, (15, 125),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
            cv2.putText(frame, "REGISTRATION MODE", (15, 155),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 165, 255), 2)
        
        return frame
    
    def set_camera_source(self, source_type, rtsp_url='', camera_name=''):
        """Set camera source type
        
        Args:
            source_type: 'webcam' or 'rtsp'
            rtsp_url: RTSP stream URL (required for rtsp)
            camera_name: Optional camera name for display
        """
        self.camera_source = source_type
        self.rtsp_url = rtsp_url
        self.camera_name = camera_name if camera_name else ('Webcam' if source_type == 'webcam' else 'CCTV')
    
    def get_camera_status(self):
        """Get current camera status"""
        return {
            'source': self.camera_source,
            'name': self.camera_name,
            'status': self.camera_status,
            'rtsp_url': self.rtsp_url or getattr(recognition_config, 'RTSP_URL', '')
        }
    
    def initialize_camera(self):
        """Initialize camera based on source type"""
        try:
            self.camera_status = 'connecting'
            
            if self.camera_source == 'webcam':
                self.cap = cv2.VideoCapture(recognition_config.CAMERA_ID)
                if not self.cap.isOpened():
                    print("Could not open webcam.")
                    self.camera_status = 'error'
                    return False
                
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, recognition_config.CAMERA_WIDTH)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, recognition_config.CAMERA_HEIGHT)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                
            elif self.camera_source == 'rtsp':
                if not self.rtsp_url:
                    print("RTSP URL not provided.")
                    self.camera_status = 'error'
                    return False
                
                # Force TCP transport for RTSP to prevent packet drop and connection errors
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
                self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                if not self.cap.isOpened():
                    print(f"Could not open RTSP stream: {self.rtsp_url}")
                    self.camera_status = 'error'
                    return False
                
                # Set buffer size to minimize latency
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            # Verify we can actually read a frame before reporting connected
            ret, test_frame = self.cap.read()
            if not ret or test_frame is None:
                print("Camera opened but cannot read frames.")
                self.camera_status = 'error'
                if self.cap:
                    self.cap.release()
                    self.cap = None
                return False
            
            self.camera_status = 'connected'
            self.frame_failure_count = 0
            self.reconnect_attempts = 0
            print(f"Camera initialized: {self.camera_name}")
            return True
            
        except Exception as e:
            print(f"Camera initialization error: {e}")
            self.camera_status = 'error'
            return False
    
    def stop_reconnect(self):
        """Stop any ongoing reconnect attempts"""
        self.should_reconnect = False
        self.reconnect_attempts = 0
    
    def run(self):
        """Main recognition loop"""
        self.running = True
        self.should_reconnect = False
        self.reconnect_attempts = 0
        self.frame_failure_count = 0
        
        # Initialize camera
        if not self.initialize_camera():
            self.running = False
            return
        
        print("Camera started.")
        
        while self.running:
            ret, frame = self.cap.read()
            
            if not ret or frame is None:
                self.frame_failure_count += 1
                print(f"Frame failure count: {self.frame_failure_count}")
                
                # Check if we should attempt reconnect
                if (self.camera_source == 'rtsp' and 
                    recognition_config.RTSP_RECONNECT_ENABLED and
                    self.frame_failure_count >= recognition_config.RTSP_FRAME_FAILURE_THRESHOLD):
                    
                    print("Frame failure threshold reached. Attempting reconnect...")
                    self.camera_status = 'reconnecting'
                    
                    # Stop current camera
                    if self.cap:
                        self.cap.release()
                        self.cap = None
                    
                    # Attempt reconnect
                    self.reconnect_attempts += 1
                    if self.reconnect_attempts > recognition_config.RTSP_MAX_RETRIES:
                        print("Max reconnect attempts reached. Giving up.")
                        self.camera_status = 'error'
                        self.running = False
                        break
                    
                    print(f"Reconnect attempt {self.reconnect_attempts}/{recognition_config.RTSP_MAX_RETRIES}")
                    time.sleep(recognition_config.RTSP_RECONNECT_INTERVAL)
                    
                    # Try to reconnect
                    if self.initialize_camera():
                        self.reconnect_attempts = 0
                        self.frame_failure_count = 0
                        print("Reconnect successful")
                        continue
                    else:
                        # Continue to next retry
                        continue
                
                time.sleep(0.005)
                continue
            
            # Reset frame failure count on successful frame
            self.frame_failure_count = 0
            
            # Process frame
            processed_frame = self.process_frame(frame)
            
            # Store current frame for streaming
            with self.frame_lock:
                self.current_frame = processed_frame.copy()
    
    def stop(self):
        """Stop recognition service"""
        self.running = False
        self.should_reconnect = False
        self.reconnect_attempts = 0
        if self.cap:
            self.cap.release()
            self.cap = None
        self.camera_status = 'disconnected'
        with self.lock:
            self.tracks = []
        self.fps = 0.0
        print("Recognition service stopped.")
    
    def is_running(self):
        """Check if service is running"""
        return self.running
    
    def get_frame(self):
        """Get current frame for streaming"""
        with self.frame_lock:
            if self.current_frame is not None:
                return self.current_frame.copy()
        return None
    
    def get_fps(self):
        """Get current FPS"""
        if not self.running:
            return 0.0
        return self.fps
    
    def get_faces_detected(self):
        """Get number of faces detected"""
        if not self.running:
            return 0
        return len(self.tracks)
    
    def get_active_tracks(self):
        """Get number of active tracks"""
        if not self.running:
            return 0
        return len(self.tracks)
    
    def get_tracks(self):
        """Get current tracks"""
        if not self.running:
            return []
        with self.lock:
            return self.tracks.copy()
    
    def get_registered_count(self):
        """Get number of registered people"""
        return len(self.persons)
    
    def get_registered_people(self):
        """Get all registered people"""
        return self.persons
    
    def unregister_person(self, person_id):
        """Unregister a person by ID"""
        # Find and remove the person
        person_to_remove = None
        for person in self.persons:
            if person.get("id") == person_id:
                person_to_remove = person
                break
        
        if person_to_remove is None:
            return {"success": False, "message": "Person not found"}
        
        # Remove from list
        self.persons.remove(person_to_remove)
        
        # Save to database
        self.save_database(self.persons)
        
        # Reload database to ensure consistency
        self.persons = self.load_database()
        
        return {"success": True, "message": "Person unregistered successfully", "person": person_to_remove}
    
    def start_registration(self, name):
        """Start registration for new person"""
        if self.registration_mode:
            return {"success": False, "message": "Registration already in progress"}
        
        self.registration_mode = True
        self.registration_embeddings = []
        self.registration_frame_counter = 0
        self.registration_last_sample_frame = -999
        self.registration_name = name
        self.registration_message = "Look at camera - collecting samples"
        
        return {"success": True, "message": "Registration started"}
    
    def cancel_registration(self):
        """Cancel registration"""
        self.registration_mode = False
        self.registration_embeddings = []
        self.registration_message = "Registration cancelled"
        with self.lock:
            self.tracks = []
        return {"success": True, "message": "Registration cancelled"}
    
    def finish_registration(self):
        """Finish registration process"""
        if len(self.registration_embeddings) < recognition_config.REGISTRATION_SAMPLES:
            self.registration_message = "Registration failed - not enough samples"
            self.registration_mode = False
            self.registration_embeddings = []
            with self.lock:
                self.tracks = []
            return
        
        # Average embeddings
        matrix = np.asarray(self.registration_embeddings, dtype=np.float32)
        average_embedding = np.mean(matrix, axis=0)
        average_embedding = self.normalize_embedding(average_embedding)
        
        if average_embedding is None:
            self.registration_message = "Invalid embedding"
            self.registration_mode = False
            self.registration_embeddings = []
            with self.lock:
                self.tracks = []
            return
        
        # Check for existing person
        existing_person, best_score, second_score = self.find_best_match(
            average_embedding, self.persons
        )
        
        if existing_person is not None and best_score >= 0.55:
            self.registration_message = f"Already registered: {existing_person['id']}"
            self.registration_mode = False
            self.registration_embeddings = []
            with self.lock:
                self.tracks = []
            return
        
        # Create new person
        person_id = self.generate_person_id(self.persons)
        new_person = {
            "id": person_id,
            "name": self.registration_name,
            "embeddings": [e.tolist() for e in self.registration_embeddings]
        }
        
        self.persons.append(new_person)
        self.save_database(self.persons)
        
        self.registration_message = f"Registered: {person_id} | {self.registration_name}"
        self.registration_mode = False
        self.registration_embeddings = []
        with self.lock:
            self.tracks = []
    
    def get_settings(self):
        """Get current settings"""
        return self.settings
    
    def update_settings(self, new_settings):
        """Update recognition settings"""
        try:
            for key, value in new_settings.items():
                if key in self.settings:
                    self.settings[key] = value
                    # Update corresponding config
                    if key == "recognition_threshold":
                        recognition_config.RECOGNITION_THRESHOLD = value
                    elif key == "weak_match_threshold":
                        recognition_config.WEAK_MATCH_THRESHOLD = value
                    elif key == "min_match_margin":
                        recognition_config.MIN_MATCH_MARGIN = value
                    elif key == "weak_match_required_hits":
                        recognition_config.WEAK_MATCH_REQUIRED_HITS = value
                    elif key == "track_refresh_frames":
                        recognition_config.TRACK_REFRESH_FRAMES = value
                    elif key == "track_max_missed_frames":
                        recognition_config.TRACK_MAX_MISSED_FRAMES = value
                    elif key == "enable_auto_register_unknown":
                        recognition_config.ENABLE_AUTO_REGISTER_UNKNOWN = bool(value)
                    elif key == "auto_register_required_hits":
                        recognition_config.AUTO_REGISTER_REQUIRED_HITS = int(value)
            return {"success": True, "message": "Settings updated"}
        except Exception as e:
            return {"success": False, "message": str(e)}