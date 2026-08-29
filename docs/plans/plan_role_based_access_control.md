# Plan 2: Multi-Role Access Control (RBAC) & Permissions Architecture

## 📋 Executive Overview
Is plan me industry-standard gym management best practices (jaise GymMaster, Mindbody) ke mutabiq har role ke liye **Read (Dekhna)**, **Create (Naya Add Karna)**, **Alter/Update (Tabdeeli Karna)**, aur **Delete (Khatam Karna)** ka mukammal aur wazeh faisla kiya gaya hai taakay system me security, privacy aur fraud prevention maintain rahay.

---

## 🎯 Detailed Access & Alteration Matrix (Kon Kya Kar Sakta Hai)

---

### 1. 👑 Admin (Owner / Super Admin)
> **Motto:** "Complete Authority & Financial Master"

* **Access (Dekh Sakta Hai):**
  * Har cheez ka 100% access (Live Camera, Member Profiles, Revenue, Profits, Cafe, Activity Logs, AI Camera Settings, Staff Accounts).
* **Create (Add Kar Sakta Hai):**
  * Naye staff accounts (Manager, Receptionist, Admin).
  * Naye members, membership plans, cafe products, payments.
* **Alter (Tabdeeli Kar Sakta Hai):**
  * Kisi bhi member ka data, phone number, name, aur face profile.
  * Membership expiry date ko extend/change karna, pricing plans modify karna.
  * AI Camera hardware settings (RTSP URL, Face confidence threshold, matching margin).
* **Delete (Khatam Kar Sakta Hai):**
  * **Sirf Admin hi Delete kar sakta hai:**
    * Member profiles delete karna.
    * Attendance / Visit records delete karna.
    * Membership plans ya cafe products delete karna.
    * Activity logs clear karna.

---

### 2. 👔 Manager (Operations & Gym Floor Supervisor)
> **Motto:** "Floor Supervision & Daily Operations (Without System Hardware & Total Deletion Risks)"

* **Access (Dekh Sakta Hai):**
  * Live Camera & Recognition Dashboard.
  * Tamam members ki list aur un ke full profiles.
  * Daily attendance trends, rush hours, aur gym capacity.
  * Memberships status (Active, Expiring Soon, Expired, Frozen).
  * Cafe inventory aur daily orders.
* **Create (Add Kar Sakta Hai):**
  * Naye members register karna (Face photos capture karna).
  * Memberships assign karna aur renew karna.
  * Cafe products me naya stock add karna.
* **Alter (Tabdeeli Kar Sakta Hai):**
  * Member ka contact number ya name update karna.
  * Membership ko **Freeze** (pause) ya **Unfreeze** karna (e.g. member beemar hai ya safar par hai).
  * Cafe product prices aur stock count update karna.
* **RESTRICTED (Kya NAHI Kar Sakta):**
  * ❌ Member profiles ya database records ko **Delete** nahi kar sakta (Fraud/Accidental data loss prevention).
  * ❌ Camera RTSP password ya AI matching thresholds ko alter nahi kar sakta.
  * ❌ Naye Staff accounts nahi bana sakta.

---

### 3. 🛎️ Receptionist (Front-Desk Staff)
> **Motto:** "Fast Customer Service, Check-ins & Billing (No Financial Profit Viewing & No Altering Policy)"

* **Access (Dekh Sakta Hai):**
  * **Live Front-Desk Arrival Screen:** Chehra detect hone par member ka naam, photo, aur pass status dekhna (`ACTIVE`, `EXPIRED`, `NO PASS`).
  * Live alerts: Pass expire hone par alert banner dekhna taakay member ko rokk kar renewal ka keh sakay.
  * Cafe Counter POS: Shakes aur supplements ki list dekhna.
* **Create (Add Kar Sakta Hai):**
  * Naye anay walay member ka chehra scan kar ke register karna.
  * Fee collect kar ke naya pass issue karna ya renew karna.
  * Gym Cafe ka order punch karna (Shake/Pre-workout) aur payment lena.
  * WhatsApp par receipt bhejna.
* **Alter (Tabdeeli Kar Sakta Hai):**
  * Sirf member ka phone number aur basic contact info update kar sakta hai.
* **RESTRICTED (Kya NAHI Kar Sakta):**
  * ❌ Gym ka **Total Revenue, Profit margins, aur Business Growth numbers** nahi dekh sakta (Gym owners staff ko apna total profit nahi dikhatay).
  * ❌ Membership prices ya discounts ko apni marzi se alter nahi kar sakta.
  * ❌ Membership ki expiry date khud se aagay nahi barha sakta (fraud protection).
  * ❌ Kisi bhi record ko delete nahi kar sakta.

---

### 4. 🏋️ Customer / Gym Member (Customer Portal)
> **Motto:** "Self-Service & Workout Tracking (Private & Read-Only)"

* **Access (Dekh Sakta Hai - SIRF APNA DATA):**
  * 🪪 **Digital Gym ID Card:** Apna photo, Member ID, aur validity status.
  * 📅 **Personal Workout Attendance & Streaks:**
    * Is maheenay kitnay din workout kiya.
    * Current consecutive streak (e.g. "🔥 6-Day Streak").
    * Har din check-in hone ka exact time.
  * 💳 **My Membership:**
    * Pass type (e.g. 3 Months Quarterly).
    * Days left countdown (e.g. "9 days remaining").
    * Expiry date aur payment history.
  * 🥤 **My Cafe Consumption:**
    * Jo shakes aur diet meals unhon ne cafe se khareeday un ki list aur receipts.
    * Consumed Calories aur Protein ka total tracker.
* **Alter (Tabdeeli Kar Sakta Hai):**
  * Sirf apna Emergency Contact number aur password/PIN change kar sakta hai.
* **RESTRICTED (Kya NAHI Kar Sakta):**
  * ❌ Doosray kisi member ka data, attendance ya photo bilkul nahi dekh sakta.
  * ❌ Gym ke cameras, staff settings ya administrative panels ka access 100% blocked hoga.

---

## 📊 Summary Comparison Table

| Feature / Screen | 👑 Admin | 👔 Manager | 🛎️ Receptionist | 🏋️ Member (Customer) |
| :--- | :---: | :---: | :---: | :---: |
| **Live Camera Feed & Faces** | View & Control | View Only | View Only | ❌ No Access |
| **AI Camera & RTSP Settings** | View & Alter | ❌ Blocked | ❌ Blocked | ❌ No Access |
| **Delete Members / Visits** | ✅ Allowed | ❌ Blocked | ❌ Blocked | ❌ No Access |
| **Register New Faces** | Add & Alter | Add & Alter | Add Only | ❌ No Access |
| **Freeze / Unfreeze Passes** | ✅ Allowed | ✅ Allowed | ❌ Blocked | ❌ No Access |
| **Collect Fees & Renew** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ (Request Only) |
| **Gym Profit & Revenue Reports**| Full Access | Daily Only | ❌ Hidden | ❌ No Access |
| **Gym Cafe POS Counter** | Full Access | Full Access | Order Taking | ❌ (View Own Bill) |
| **Personal Attendance & Streaks**| All Members | All Members | All Members | ✅ **Own Data Only** |
| **Digital Gym Card** | All Members | All Members | All Members | ✅ **Own Card Only** |

---

## 🔒 Security Enforcement (Technical Level)

1. **Frontend Level:**
   * User ke login hotay hi unke role ke mutabiq un-authorized buttons (maslan "Delete Member", "System Settings", "Revenue Graph") DOM se completely hide ho jayenge.
2. **Backend API Level (FastAPI Guards):**
   * Agar koi user URL ya API tool se direct endpoint call karne ki koshish kare (maslan `DELETE /api/people/P-0001` ya `PUT /api/settings`), to backend us ka token verify kare ga:
     ```python
     if current_user.role != "ADMIN":
         raise HTTPException(status_code=403, detail="Permission Denied: Only Admin can perform this action")
     ```
3. **Database Audit Trail:**
   * Jab bhi koi Manager ya Receptionist koi pass renew kare ga ya order punch kare ga, record me unka username save hoga (`created_by: "receptionist_ali"`) taakay accountability rahay.
