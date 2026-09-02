# 🏋️‍♂️ Smart GYM Attendance & Management System

An AI-powered Smart GYM Attendance, Member Portal, Cafe Billing & Workout Tracking Management System with real-time Facial Recognition using **YuNet** and **SFace**.

---

## 📋 System Requirements (Prerequisites)

Ensure the following tools are installed on your system before setting up:

1. **Python** (Version 3.10 or 3.11 recommended): [Download Python](https://www.python.org/downloads/)
   - *Note: During installation, make sure to check **"Add Python to PATH"**.*
2. **Node.js** (Version 18 or higher): [Download Node.js](https://nodejs.org/)
3. **Git**: [Download Git](https://git-scm.com/)
4. **Webcam**: A working integrated or USB camera for facial detection & recognition.

---

## 🚀 Quick Start (One-Click Launch on Windows)

If you are on Windows, you can start both servers simply by double-clicking the batch files:

1. Double-click **`start_backend.bat`** *(Installs Python dependencies & starts FastAPI backend on http://localhost:8000)*
2. In the `frontend` folder, run `npm install` (first time only), then double-click **`start_frontend.bat`** *(Starts Vite React frontend on http://localhost:5173)*

---

## 🛠️ Step-by-Step Manual Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Ahmadmirza881/GYM-Attendance-System.git
cd GYM-Attendance-System
```

---

### 2. Backend Setup (FastAPI + OpenCV)

1. **Create and activate a Python virtual environment:**
   - **Windows:**
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

2. **Install the required Python packages:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Backend API Server:**
   ```bash
   cd app/api
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - API Docs will be live at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 3. Frontend Setup (React 19 + Vite)

1. **Open a new terminal window** and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. **Install npm dependencies:**
   ```bash
   npm install
   ```

3. **Start the Frontend development server:**
   ```bash
   npm run dev
   ```
   - The web app will open at: [http://localhost:5173](http://localhost:5173)

---

## 🌟 Key Features

- 👤 **Real-Time Facial Recognition**: Sub-second face detection (YuNet) and recognition (SFace) with anti-spoofing/confidence scoring.
- 🕒 **Automated Attendance Tracking**: Auto check-in & check-out with instant status and live camera overlay.
- 💳 **Member Management & Profiles**: Membership plan expiry tracking, fee dues, attendance history, and photo capture.
- ☕ **Gym Cafe / POS System**: Inventory management, cafe order billing, item catalog, and daily revenue stats.
- 🏋️ **Workout & Diet Tracker**: Customized workout routines, exercise logs, diet plans, and weight/BMI progress charts.
- 🔐 **Role-Based Auth & Member Portal**: Separate dashboards for Admins/Staff and Members.

---

## 📦 Python Dependencies (`requirements.txt`)
- `fastapi>=0.104.1`
- `uvicorn[standard]>=0.24.0`
- `python-multipart>=0.0.6`
- `opencv-python>=4.8.1.78`
- `numpy>=1.24.3`
- `pydantic>=2.0.0`
