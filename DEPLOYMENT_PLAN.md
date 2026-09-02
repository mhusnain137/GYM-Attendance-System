# 🚀 Free Production Deployment Plan: Titan Gym System (CCTV + Vercel + Cloudflare)

This plan outlines the 100% free, production-grade deployment strategy for the **Titan Gym System**. It enables live local CCTV/RTSP camera face recognition at zero latency while allowing gym members and admins to access the Member Portal, Workout Logs, Cafe POS, and Admin Dashboard from anywhere on their phones or laptops.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    subgraph Gym Local Network [Gym Premises: Local LAN]
        CCTV["📹 CCTV RTSP Camera<br>(192.168.2.253)"] -->|0 Lag RTSP Stream| GymPC["💻 Gym Front Desk PC<br>(FastAPI + AI Recognition Models)"]
        GymPC -->|Port 8000| CloudflareTunnel["🛡️ Cloudflare Tunnel (cloudflared)<br>(100% Free & Secure)"]
    end

    subgraph Cloud Infrastructure [Free Cloud Services]
        CloudflareTunnel -->|Encrypted HTTPS & WebSockets| CloudflareEdge["🌐 Cloudflare Public Edge<br>(https://titan-gym-api.yourdomain.com)"]
        VercelApp["⚡ Vercel Hosting (100% Free)<br>React + Vite Frontend<br>(https://titan-gym.vercel.app)"]
        MongoAtlas["🍃 MongoDB Atlas (Free M0)<br>Cloud Database Storage"]
    end

    subgraph End Users [Global Internet Access]
        Admins["👑 Admin & Trainers<br>(Home / Laptop)"] -->|HTTPS| VercelApp
        Members["📱 Gym Members<br>(Mobile Phones / Tablets)"] -->|HTTPS| VercelApp
    end

    VercelApp -->|API Calls & Face Stream| CloudflareEdge
    GymPC <-->|Auto Data Sync| MongoAtlas
```

---

## 📋 Phased Implementation Steps (For Tomorrow)

### Phase 1: Frontend Deployment on Vercel (100% Free)
1. **Prepare Frontend for Cloud Hosting**:
   - Add `frontend/vercel.json` with SPA rewrite rules to ensure client-side routing (`/*` -> `/index.html`) functions smoothly.
   - Configure dynamic API base URL via `import.meta.env.VITE_API_URL` so it automatically talks to the Cloudflare Tunnel URL when in production and `http://localhost:8000` when running locally.
2. **Deploy via GitHub**:
   - Link repository `mhusnain137/GYM-Attendance-System` on [Vercel.com](https://vercel.com).
   - Set Root Directory to `frontend`.
   - Hit **Deploy** — Vercel builds the static bundle and issues a permanent free HTTPS URL (e.g. `https://titan-gym-system.vercel.app`).

### Phase 2: Cloudflare Tunnel on Gym PC (100% Free)
1. **Install Cloudflare Tunnel (`cloudflared`)**:
   - Download the official, lightweight Windows binary `cloudflared.exe` on the Gym computer.
2. **Launch Free Secure Tunnel**:
   - Run a zero-config quick tunnel:
     ```powershell
     cloudflared tunnel --url http://localhost:8000
     ```
   - Cloudflare instantly generates a free, public HTTPS URL (e.g. `https://random-words.trycloudflare.com` or custom domain).
   - Alternatively, bind it to a permanent free Cloudflare domain using a named tunnel.
3. **Automate Auto-Start on PC Boot**:
   - Create a single batch script or Windows Scheduled Task so whenever the Gym PC turns on, the Backend and Tunnel start in the background automatically.

### Phase 3: CCTV & AI Recognition Verification
1. **Local RTSP Stream Testing**:
   - Confirm backend captures `rtsp://admin:12345abc@192.168.2.253:554/cam/realmonitor?channel=2&subtype=0` at 30 FPS.
   - Test YuNet face detection & SFace cosine matching locally on the Gym PC.
2. **Remote Live Video Feed**:
   - Verify that the MJPEG / WebSocket live recognition stream pipes through Cloudflare to the Vercel frontend without lag.

### Phase 4: Production Database Sync
1. **MongoDB Atlas Confirmation**:
   - Ensure MongoDB Atlas connection URI (`app/db/mongo.py`) is set in the environment.
   - Verify that whenever a member logs a workout or registers a new face, it is persisted to MongoDB Atlas cloud.

---

## 🎯 What You Will Need Tomorrow
1. A free account on [Vercel.com](https://vercel.com) (can log in using your GitHub account with 1 click).
2. The Gym PC running with internet connection and access to the camera IP `192.168.2.253`.

---

## 💡 Quick Resume Command
When you return tomorrow, simply say:
> *"Deployment plan shuru karo"*
