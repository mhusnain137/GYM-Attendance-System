# Plan 1: Gym Cafe & Nutrition POS Management System

## 📋 Executive Overview
Yeh plan Gym Attendance & Biometrics System ke andar ek complete, world-class **Gym Cafe & Supplement POS (Point of Sale)** module integrate karne ke liye hai. International gym software (jaise Mindbody, ABC Fitness, GymMaster) ke mutabiq gym cafes me protein shakes, pre-workouts, diet meals, aur supplements ki quick selling, stock tracking, aur member account integration sab se ahem hoti hai.

---

## 🌟 Key Features & World-Class Industry Standards

### 1. 🥤 Product & Inventory Management (Admin Catalog)
* **Product Catalog:**
  * Products add/edit/delete karna (Name, Category, Selling Price, Cost Price, Image/Icon).
  * **Categories:** 
    * 🥤 *Protein Shakes & Smoothies* (Whey, Mass Gainer, Vegan, Peanut Butter Smoothie)
    * ⚡ *Pre-Workouts & Energy Drinks* (C4, RedBull, Monster, Electrolytes)
    * 🍫 *Protein Bars & Healthy Snacks* (Oats bars, Dry fruits, Protein cookies)
    * 🥗 *Diet Meals & Salads* (Boiled eggs, Grilled chicken salad, Brown rice meals)
    * 💊 *Supplements & Single Scoops* (Creatine scoop, BCAA, Multivitamins)
    * 💧 *Water & Hydration*
* **Nutritional Information (Gym Special):**
  * Har item ke sath **Calories (kcal)** aur **Protein (g)** ka tag (gym members ke fitness goals ke liye bohot attractive feature).
* **Smart Stock / Inventory Alerts:**
  * Real-time stock count (e.g. 50 bottles bachi hain).
  * Auto-decrement on sale.
  * **Low-Stock Alert Badge** jab stock threshold (e.g. < 5) se kam ho jaye.

---

### 2. 🛒 Quick Point of Sale (POS) & Order Creation
* **Speedy Counter Checkout (Quick Tap Grid):**
  * Touch-friendly grid with categories and search for fast ordering during post-workout rush hours.
  * Cart drawer with quantity increment/decrement, discount option, and tax/total calculation.
* **Customer Selection:**
  * **Gym Member:** Search by Name or ID (face-recognized members can be selected in 1 click).
  * **Walk-in / Visitor:** Non-member direct sales.
* **Payment Methods:**
  * 💵 **Cash**
  * 💳 **Card / POS Terminal**
  * 📱 **Online / QR (JazzCash / EasyPaisa / Raast / Bank)**
  * 👤 **Member Tab / Prepaid Wallet:** Member ke account me udhaar ya prepaid balance se deduct karna (gyms me sab se popular feature).

---

### 3. 💳 Payment Verification & Order Approval Workflow
* **Order Statuses:**
  * ⏳ `PENDING_PAYMENT` (Order place ho chuka hai, payment ka intezar hai).
  * 🟡 `PREPARING` (Payment verify ho gayi, shake/meal ban raha hai).
  * 🟢 `COMPLETED` (Customer ko handover ho gaya).
  * 🔴 `CANCELLED` (Refund ya cancel).
* **Admin Approval Modal:**
  * Online transaction reference ID / screenshot check kar ke "Approve & Mark Paid" ka 1-click button.
* **Auto Stock Release on Cancellation:**
  * Agar order cancel ho to inventory automatically restore ho jaye gi.

---

### 4. 📲 Digital Receipts & WhatsApp Integration
* **WhatsApp Instant Receipt:**
  * Order approve hone par 1-click button: Member ke WhatsApp par formatted bill/receipt bhejna:
    ```text
    🏋️ TITAN GYM CAFE - RECEIPT #ORD-00142
    Member: Ali Khan (P-000102)
    Date: 29-Aug-2026 06:15 PM
    -----------------------------------
    1x Double Whey Isolate Shake - Rs. 450 (48g Protein)
    1x Creatine Monohydrate Scoop - Rs. 150
    -----------------------------------
    TOTAL: Rs. 600 [PAID - JazzCash]
    Enjoy your workout & recovery! 💪
    ```

---

### 5. 📊 Cafe Sales Analytics & Reports
* **Daily & Monthly Cafe Revenue:**
  * Total Cafe Sales (PKR), Net Profit, Total Orders.
* **Best Sellers & High Margin Items:**
  * Kon sa protein shake sab se zyada bik raha hai.
* **Member Profile Integration:**
  * Jab admin kisi member ki profile kholda hai (`MemberProfileModal`), to attendance ke sath sath unki **Cafe Orders History** bhi nazar aayegi!

---

## 🏗️ Technical Architecture & Proposed Files

### 📁 Data Storage:
* `data/cafe_products.json`: Catalog, stock, pricing, calories.
* `data/cafe_orders.json`: Orders, items list, customer ID, status, payment details.

### 🐍 Backend Endpoints (`app/api/main.py` or `cafe_routes.py`):
1. `GET /api/cafe/products` &rarr; List all active products & stock.
2. `POST /api/cafe/products` &rarr; Add new product (with optional image upload).
3. `PUT /api/cafe/products/{id}` &rarr; Update price, stock, details.
4. `DELETE /api/cafe/products/{id}` &rarr; Soft delete / disable product.
5. `GET /api/cafe/orders` &rarr; List recent orders with filter (Pending, Completed, Date).
6. `POST /api/cafe/orders` &rarr; Place new order & deduct stock.
7. `PUT /api/cafe/orders/{order_id}/status` &rarr; Approve payment / change status (`PAID`, `COMPLETED`, `CANCELLED`).
8. `GET /api/cafe/analytics` &rarr; Revenue, profit, top-selling items.

### ⚛️ Frontend Components (`frontend/src/components/Cafe/`):
1. `Cafe.jsx` & `Cafe.css`: Main Cafe Hub with tabs:
   * **POS Terminal (Counter View):** Products grid + active cart + checkout modal.
   * **Live Orders Queue:** Pending payment & in-progress orders with "Approve" button.
   * **Product & Stock Manager:** Table with Add/Edit item modal and low-stock indicators.
   * **Cafe Analytics:** Today's sale, month revenue, top shakes graph.
2. Update `App.jsx`:
   * Sidebar me naya tab: `🥤 Gym Cafe & POS`.

---

## 🔒 Verification Plan
1. **Catalog Test:** Add sample products across all categories and verify stock counts.
2. **Order Placement Test:** Place order with Member ID and Walk-in customer, verify stock auto-decrements.
3. **Approval Test:** Verify pending order status change to `COMPLETED` upon approval.
4. **WhatsApp Receipt Test:** Check generated receipt formatting with member phone number.
5. **Profile Integration Test:** Confirm order shows up under member's profile.
