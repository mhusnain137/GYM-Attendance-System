import os
import json
import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

import sys
# Config & Project Root
import recognition_config

sys.path.insert(0, os.path.join(recognition_config.PROJECT_ROOT, "app"))
from db import mongo

router = APIRouter(prefix="/api/cafe", tags=["cafe"])

PRODUCTS_FILE = os.path.join(recognition_config.PROJECT_ROOT, "data", "cafe_products.json")
ORDERS_FILE = os.path.join(recognition_config.PROJECT_ROOT, "data", "cafe_orders.json")
MEMBERSHIPS_FILE = os.path.join(recognition_config.PROJECT_ROOT, "data", "memberships.json")
PERSONS_FILE = os.path.join(recognition_config.PROJECT_ROOT, "data", "persons.json")

CAFE_FILE_TO_COLL = {
    PRODUCTS_FILE: "cafe_products",
    ORDERS_FILE: "cafe_orders",
    MEMBERSHIPS_FILE: "memberships",
    PERSONS_FILE: "persons",
}


def load_json(filepath: str, default=None):
    if default is None:
        default = []
    if mongo.is_connected():
        coll_name = CAFE_FILE_TO_COLL.get(filepath)
        if coll_name:
            data = mongo.find_all(coll_name)
            if data is not None and len(data) > 0:
                return data
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[Cafe] Error reading {filepath}: {e}")
            return default
    return default


def save_json(filepath: str, data: Any) -> bool:
    if mongo.is_connected():
        coll_name = CAFE_FILE_TO_COLL.get(filepath)
        if coll_name:
            mongo.replace_all(coll_name, data)
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[Cafe] Error saving {filepath}: {e}")
        return False


# ============================================================
# PYDANTIC MODELS
# ============================================================
class CafeProductItem(BaseModel):
    name: str
    category: str
    price: float
    cost_price: float = 0.0
    calories: int = 0
    protein_g: float = 0.0
    stock: int = 0
    min_stock_alert: int = 5
    description: Optional[str] = ""
    customizable: bool = False
    image_url: Optional[str] = ""
    is_active: bool = True


class OrderItemModel(BaseModel):
    product_id: str
    name: str
    qty: int
    unit_price: float
    calories: int = 0
    protein_g: float = 0.0
    addons: Optional[List[str]] = []
    item_total: float


class CreateOrderModel(BaseModel):
    person_id: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = ""
    items: List[OrderItemModel]
    subtotal: float
    discount: float = 0.0
    total_amount: float
    payment_method: str = "CASH"  # CASH, CARD, QR_ONLINE, MEMBER_TAB
    payment_status: str = "PAID"   # PAID, UNPAID_TAB, PENDING
    order_status: str = "COMPLETED" # COMPLETED, PREPARING, CANCELLED
    notes: Optional[str] = ""
    served_by: str = "Front Desk Staff"  # RBAC ready: records cashier/receptionist


class UpdateOrderStatusModel(BaseModel):
    order_status: str
    payment_status: Optional[str] = None


# ============================================================
# PRODUCTS CATALOG ENDPOINTS
# ============================================================

@router.get("/products")
async def get_products(category: Optional[str] = None):
    """List all active cafe products with stock status"""
    products = load_json(PRODUCTS_FILE, default=[])
    
    # Enrich with stock status
    enriched = []
    for p in products:
        if not p.get("is_active", True):
            continue
        stock = p.get("stock", 0)
        min_alert = p.get("min_stock_alert", 5)
        
        status = "IN_STOCK"
        if stock <= 0:
            status = "OUT_OF_STOCK"
        elif stock <= min_alert:
            status = "LOW_STOCK"
            
        p_copy = dict(p)
        p_copy["stock_status"] = status
        p_copy["is_low_stock"] = (stock <= min_alert)
        
        if category and category.upper() != "ALL":
            if p.get("category", "").upper() == category.upper():
                enriched.append(p_copy)
        else:
            enriched.append(p_copy)
            
    return {"status": "success", "count": len(enriched), "products": enriched}


@router.post("/products")
async def create_product(product: CafeProductItem):
    """Add a new product to the catalog"""
    products = load_json(PRODUCTS_FILE, default=[])
    
    new_id = f"PROD-{len(products) + 101}"
    new_item = {
        "id": new_id,
        "name": product.name,
        "category": product.category.upper(),
        "price": float(product.price),
        "cost_price": float(product.cost_price),
        "calories": int(product.calories),
        "protein_g": float(product.protein_g),
        "stock": int(product.stock),
        "min_stock_alert": int(product.min_stock_alert),
        "description": product.description or "",
        "customizable": product.customizable,
        "image_url": product.image_url or "",
        "is_active": product.is_active,
        "created_at": datetime.now().isoformat(),
        "created_by": "Admin"  # RBAC ready
    }
    
    products.append(new_item)
    save_json(PRODUCTS_FILE, products)
    return {"status": "success", "message": "Product created successfully", "product": new_item}


@router.put("/products/{product_id}")
async def update_product(product_id: str, product_update: Dict[str, Any]):
    """Update an existing product's details, pricing, or stock"""
    products = load_json(PRODUCTS_FILE, default=[])
    found = False
    updated_item = None
    
    for idx, p in enumerate(products):
        if p.get("id") == product_id:
            for k, v in product_update.items():
                if k in ["price", "cost_price", "protein_g"]:
                    products[idx][k] = float(v)
                elif k in ["calories", "stock", "min_stock_alert"]:
                    products[idx][k] = int(v)
                elif k == "category":
                    products[idx][k] = str(v).upper()
                else:
                    products[idx][k] = v
            updated_item = products[idx]
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Product not found")
        
    save_json(PRODUCTS_FILE, products)
    return {"status": "success", "message": "Product updated", "product": updated_item}


@router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    """Soft delete / archive a product"""
    products = load_json(PRODUCTS_FILE, default=[])
    found = False
    
    for idx, p in enumerate(products):
        if p.get("id") == product_id:
            products[idx]["is_active"] = False
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Product not found")
        
    save_json(PRODUCTS_FILE, products)
    return {"status": "success", "message": "Product archived successfully"}


# ============================================================
# ORDERS & POS CHECKOUT ENDPOINTS
# ============================================================

@router.get("/orders")
async def get_orders(
    date_filter: Optional[str] = None,
    status: Optional[str] = None,
    person_id: Optional[str] = None,
    limit: int = 100
):
    """Get list of cafe orders with flexible filtering"""
    orders = load_json(ORDERS_FILE, default=[])
    filtered = []
    
    today_str = date.today().isoformat()
    
    for ord_item in reversed(orders):  # Most recent first
        # Date filter
        ord_date = (ord_item.get("created_at") or "")[:10]
        if date_filter == "today" and ord_date != today_str:
            continue
        elif date_filter and date_filter != "today" and ord_date != date_filter:
            continue
            
        # Status filter
        if status and status.upper() != "ALL" and ord_item.get("order_status", "").upper() != status.upper():
            continue
            
        # Member filter
        if person_id and ord_item.get("person_id") != person_id:
            continue
            
        filtered.append(ord_item)
        if len(filtered) >= limit:
            break
            
    return {"status": "success", "count": len(filtered), "orders": filtered}


@router.post("/orders")
async def create_order(payload: CreateOrderModel):
    """
    Process new POS order:
    1. Verify and deduct product stock
    2. Update member tab balance if payment is MEMBER_TAB
    3. Generate order ID and save
    """
    orders = load_json(ORDERS_FILE, default=[])
    products = load_json(PRODUCTS_FILE, default=[])
    prod_map = {p["id"]: p for p in products}
    
    # 1. Deduct stock
    for item in payload.items:
        p = prod_map.get(item.product_id)
        if p:
            current_stock = p.get("stock", 0)
            new_stock = max(0, current_stock - item.qty)
            p["stock"] = new_stock
            
    save_json(PRODUCTS_FILE, list(prod_map.values()))
    
    # 2. Member Tab update
    if payload.payment_method == "MEMBER_TAB" and payload.person_id:
        # Update member record cafe_tab_balance
        memberships = load_json(MEMBERSHIPS_FILE, default=[])
        mem_found = False
        for m in memberships:
            if (m.get("person_id") or "").lower() == payload.person_id.lower():
                current_tab = float(m.get("cafe_tab_balance", 0.0))
                m["cafe_tab_balance"] = round(current_tab + payload.total_amount, 2)
                mem_found = True
        if mem_found:
            save_json(MEMBERSHIPS_FILE, memberships)
            
    # 3. Create Order
    today_num = datetime.now().strftime("%y%m%d")
    unique_suffix = uuid.uuid4().hex[:4].upper()
    order_id = f"ORD-{today_num}-{unique_suffix}"
    
    new_order = {
        "id": order_id,
        "person_id": payload.person_id,
        "customer_name": payload.customer_name,
        "customer_phone": payload.customer_phone or "",
        "items": [item.dict() for item in payload.items],
        "subtotal": round(payload.subtotal, 2),
        "discount": round(payload.discount, 2),
        "total_amount": round(payload.total_amount, 2),
        "payment_method": payload.payment_method,
        "payment_status": payload.payment_status,
        "order_status": payload.order_status,
        "notes": payload.notes or "",
        "served_by": payload.served_by,
        "created_at": datetime.now().isoformat()
    }
    
    orders.append(new_order)
    save_json(ORDERS_FILE, orders)
    
    return {
        "status": "success",
        "message": f"Order {order_id} placed successfully",
        "order": new_order
    }


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: UpdateOrderStatusModel):
    """
    Update order status (PREPARING, COMPLETED, CANCELLED).
    If CANCELLED: auto-restores inventory stock & reverses member tab if applicable.
    """
    orders = load_json(ORDERS_FILE, default=[])
    found_order = None
    target_idx = -1
    
    for idx, ord_item in enumerate(orders):
        if ord_item.get("id") == order_id:
            found_order = ord_item
            target_idx = idx
            break
            
    if not found_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    old_status = found_order.get("order_status")
    new_status = payload.order_status.upper()
    
    # If order is being cancelled now and wasn't already cancelled: restore stock!
    if new_status == "CANCELLED" and old_status != "CANCELLED":
        products = load_json(PRODUCTS_FILE, default=[])
        prod_map = {p["id"]: p for p in products}
        
        for item in found_order.get("items", []):
            pid = item.get("product_id")
            qty = item.get("qty", 1)
            if pid in prod_map:
                prod_map[pid]["stock"] = prod_map[pid].get("stock", 0) + qty
                
        save_json(PRODUCTS_FILE, list(prod_map.values()))
        
        # If was on member tab, reverse tab balance
        if found_order.get("payment_method") == "MEMBER_TAB" and found_order.get("person_id"):
            memberships = load_json(MEMBERSHIPS_FILE, default=[])
            for m in memberships:
                if (m.get("person_id") or "").lower() == found_order.get("person_id", "").lower():
                    cur_tab = float(m.get("cafe_tab_balance", 0.0))
                    m["cafe_tab_balance"] = max(0.0, round(cur_tab - found_order.get("total_amount", 0.0), 2))
            save_json(MEMBERSHIPS_FILE, memberships)
            
    orders[target_idx]["order_status"] = new_status
    if payload.payment_status:
        orders[target_idx]["payment_status"] = payload.payment_status
    orders[target_idx]["updated_at"] = datetime.now().isoformat()
    
    save_json(ORDERS_FILE, orders)
    return {"status": "success", "message": f"Order status updated to {new_status}", "order": orders[target_idx]}


class MemberPreOrderModel(BaseModel):
    person_id: str
    customer_name: str
    customer_phone: Optional[str] = None
    items: List[OrderItemModel]
    subtotal: float
    discount: Optional[float] = 0.0
    total_amount: float
    payment_intent: Optional[str] = "PAY_AT_COUNTER"  # PAY_AT_COUNTER or MEMBER_TAB
    notes: Optional[str] = None


class ApprovePreOrderModel(BaseModel):
    payment_method: str = "CASH"  # CASH, CARD, MEMBER_TAB, ONLINE_QR
    approved_by: Optional[str] = "Front Desk Staff"
    notes: Optional[str] = None


@router.post("/orders/pre-order")
async def place_member_preorder(payload: MemberPreOrderModel):
    """
    Member self-service pre-order from customer portal.
    Status starts as PENDING_APPROVAL. Stock is not deducted until Staff approves.
    """
    orders = load_json(ORDERS_FILE, default=[])
    order_id = f"ORD-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    
    new_order = {
        "id": order_id,
        "person_id": payload.person_id,
        "customer_name": payload.customer_name,
        "customer_phone": payload.customer_phone or "",
        "items": [item.dict() for item in payload.items],
        "subtotal": round(payload.subtotal, 2),
        "discount": round(payload.discount or 0.0, 2),
        "total_amount": round(payload.total_amount, 2),
        "payment_method": payload.payment_intent or "PAY_AT_COUNTER",
        "payment_status": "PENDING_APPROVAL",
        "order_status": "PENDING_APPROVAL",
        "is_preorder": True,
        "notes": payload.notes,
        "served_by": "Customer Portal",
        "created_at": datetime.now().isoformat()
    }
    
    orders.append(new_order)
    save_json(ORDERS_FILE, orders)
    
    return {
        "status": "success",
        "message": f"Pre-order #{order_id} submitted. Please pay / confirm with front desk.",
        "order": new_order
    }


@router.post("/orders/{order_id}/approve")
async def approve_preorder(order_id: str, payload: ApprovePreOrderModel):
    """
    Staff / Receptionist approves member pre-order upon receiving payment.
    Deducts stock, updates tab if MEMBER_TAB, transitions to PREPARING.
    """
    orders = load_json(ORDERS_FILE, default=[])
    found_order = None
    target_idx = -1
    
    for idx, ord_item in enumerate(orders):
        if ord_item.get("id") == order_id:
            found_order = ord_item
            target_idx = idx
            break
            
    if not found_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if found_order.get("order_status") not in ["PENDING_APPROVAL", "CANCELLED"]:
        return {"status": "info", "message": f"Order is already {found_order.get('order_status')}", "order": found_order}

    # 1. Deduct Stock for all items
    products = load_json(PRODUCTS_FILE, default=[])
    prod_map = {p["id"]: p for p in products}
    
    for item in found_order.get("items", []):
        pid = item.get("product_id")
        qty = item.get("qty", 1)
        if pid in prod_map:
            current_stock = prod_map[pid].get("stock", 0)
            prod_map[pid]["stock"] = max(0, current_stock - qty)
            
    save_json(PRODUCTS_FILE, list(prod_map.values()))
    
    # 2. If Payment is MEMBER_TAB, update member's tab balance
    pay_method = payload.payment_method.upper()
    if pay_method == "MEMBER_TAB" and found_order.get("person_id"):
        memberships = load_json(MEMBERSHIPS_FILE, default=[])
        for m in memberships:
            if (m.get("person_id") or "").lower() == found_order.get("person_id", "").lower():
                cur_tab = float(m.get("cafe_tab_balance", 0.0))
                m["cafe_tab_balance"] = round(cur_tab + found_order.get("total_amount", 0.0), 2)
        save_json(MEMBERSHIPS_FILE, memberships)

    # 3. Update Order Status
    orders[target_idx]["payment_method"] = pay_method
    orders[target_idx]["payment_status"] = "UNPAID_TAB" if pay_method == "MEMBER_TAB" else "PAID"
    orders[target_idx]["order_status"] = "PREPARING"
    orders[target_idx]["approved_by"] = payload.approved_by
    orders[target_idx]["approved_at"] = datetime.now().isoformat()
    orders[target_idx]["updated_at"] = datetime.now().isoformat()
    
    save_json(ORDERS_FILE, orders)
    return {
        "status": "success",
        "message": f"Pre-order #{order_id} approved and sent to kitchen!",
        "order": orders[target_idx]
    }


@router.post("/orders/{order_id}/reject")
async def reject_preorder(order_id: str, reason: Optional[str] = None):
    """Staff rejects member pre-order"""
    orders = load_json(ORDERS_FILE, default=[])
    found_order = None
    target_idx = -1
    
    for idx, ord_item in enumerate(orders):
        if ord_item.get("id") == order_id:
            found_order = ord_item
            target_idx = idx
            break
            
    if not found_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    orders[target_idx]["order_status"] = "REJECTED"
    orders[target_idx]["payment_status"] = "REJECTED"
    orders[target_idx]["rejection_reason"] = reason or "Declined by front desk"
    orders[target_idx]["updated_at"] = datetime.now().isoformat()
    
    save_json(ORDERS_FILE, orders)
    return {"status": "success", "message": f"Order #{order_id} rejected", "order": orders[target_idx]}


@router.get("/members/{person_id}/active-preorders")
async def get_member_active_preorders(person_id: str):
    """Get active preorders for real-time tracking in member portal"""
    orders = load_json(ORDERS_FILE, default=[])
    active = [
        o for o in reversed(orders)
        if (o.get("person_id") or "").lower() == person_id.lower()
        and o.get("order_status") in ["PENDING_APPROVAL", "PREPARING", "READY_FOR_PICKUP"]
    ]
    return {"status": "success", "active_orders": active}


# ============================================================
# CAFE ANALYTICS & MEMBER INTEGRATION
# ============================================================

@router.get("/analytics")
async def get_cafe_analytics():
    """
    Returns daily and monthly cafe performance metrics,
    top selling items, and inventory low-stock alerts.
    Structured to easily hide profit from cashiers in Plan 2 (RBAC).
    """
    orders = load_json(ORDERS_FILE, default=[])
    products = load_json(PRODUCTS_FILE, default=[])
    
    today_str = date.today().isoformat()
    curr_month_str = today_str[:7]
    
    prod_cost_map = {p["id"]: float(p.get("cost_price", 0.0)) for p in products}
    
    today_revenue = 0.0
    today_orders = 0
    today_profit = 0.0
    
    monthly_revenue = 0.0
    monthly_orders = 0
    monthly_profit = 0.0
    
    total_revenue = 0.0
    total_orders = 0
    
    item_sales_count: Dict[str, Dict[str, Any]] = {}
    payment_methods: Dict[str, Dict[str, Any]] = {
        "CASH": {"count": 0, "amount": 0.0},
        "CARD": {"count": 0, "amount": 0.0},
        "QR_ONLINE": {"count": 0, "amount": 0.0},
        "MEMBER_TAB": {"count": 0, "amount": 0.0}
    }
    
    for ord_item in orders:
        if ord_item.get("order_status") == "CANCELLED":
            continue
            
        ord_date = (ord_item.get("created_at") or "")[:10]
        amount = float(ord_item.get("total_amount", 0.0))
        method = ord_item.get("payment_method", "CASH")
        
        # Calculate cost for this order
        ord_cost = 0.0
        for itm in ord_item.get("items", []):
            pid = itm.get("product_id")
            qty = itm.get("qty", 1)
            cost_each = prod_cost_map.get(pid, 0.0)
            ord_cost += (cost_each * qty)
            
            # Item popularity tracking
            if pid not in item_sales_count:
                item_sales_count[pid] = {
                    "name": itm.get("name", "Product"),
                    "qty": 0,
                    "revenue": 0.0
                }
            item_sales_count[pid]["qty"] += qty
            item_sales_count[pid]["revenue"] += float(itm.get("item_total", 0.0))
            
        ord_profit = max(0.0, amount - ord_cost)
        
        # Total
        total_revenue += amount
        total_orders += 1
        
        # Method breakdown
        if method in payment_methods:
            payment_methods[method]["count"] += 1
            payment_methods[method]["amount"] += amount
            
        # Today
        if ord_date == today_str:
            today_revenue += amount
            today_orders += 1
            today_profit += ord_profit
            
        # Month
        if ord_date.startswith(curr_month_str):
            monthly_revenue += amount
            monthly_orders += 1
            monthly_profit += ord_profit
            
    # Rank top selling products
    sorted_items = sorted(item_sales_count.values(), key=lambda x: x["qty"], reverse=True)
    top_selling = sorted_items[:5]
    
    # Low stock items count
    low_stock_products = [
        p for p in products 
        if p.get("is_active", True) and p.get("stock", 0) <= p.get("min_stock_alert", 5)
    ]
    
    return {
        "status": "success",
        "today": {
            "revenue": round(today_revenue, 2),
            "orders": today_orders,
            "profit": round(today_profit, 2)
        },
        "month": {
            "revenue": round(monthly_revenue, 2),
            "orders": monthly_orders,
            "profit": round(monthly_profit, 2)
        },
        "total": {
            "revenue": round(total_revenue, 2),
            "orders": total_orders
        },
        "top_selling": top_selling,
        "payment_breakdown": payment_methods,
        "low_stock_alerts": {
            "count": len(low_stock_products),
            "items": [{"id": p["id"], "name": p["name"], "stock": p["stock"]} for p in low_stock_products]
        }
    }


@router.get("/members/{person_id}/history")
async def get_member_cafe_history(person_id: str):
    """
    Returns specific member's cafe orders, total spending,
    and nutritional intake (total protein & calories consumed).
    """
    orders = load_json(ORDERS_FILE, default=[])
    memberships = load_json(MEMBERSHIPS_FILE, default=[])
    
    member_orders = [
        o for o in orders 
        if (o.get("person_id") or "").lower() == person_id.lower() 
        and o.get("order_status") != "CANCELLED"
    ]
    
    total_spent = sum(float(o.get("total_amount", 0.0)) for o in member_orders)
    total_protein = 0.0
    total_calories = 0
    
    for o in member_orders:
        for itm in o.get("items", []):
            qty = itm.get("qty", 1)
            total_protein += float(itm.get("protein_g", 0.0)) * qty
            total_calories += int(itm.get("calories", 0)) * qty
            
    # Check tab balance
    tab_balance = 0.0
    for m in memberships:
        if (m.get("person_id") or "").lower() == person_id.lower():
            tab_balance = float(m.get("cafe_tab_balance", 0.0))
            break
            
    return {
        "status": "success",
        "person_id": person_id,
        "total_spent_pkr": round(total_spent, 2),
        "total_protein_g": round(total_protein, 1),
        "total_calories_kcal": total_calories,
        "cafe_tab_balance": round(tab_balance, 2),
        "orders_count": len(member_orders),
        "orders": list(reversed(member_orders))
    }


class SettleTabModel(BaseModel):
    amount_paid: float
    payment_method: str = "CASH"  # CASH, CARD, QR_ONLINE


@router.post("/members/{person_id}/settle-tab")
async def settle_member_tab(person_id: str, payload: SettleTabModel):
    """
    Settle / clear member's outstanding cafe khata balance.
    """
    memberships = load_json(MEMBERSHIPS_FILE, default=[])
    mem_found = False
    new_balance = 0.0
    
    for m in memberships:
        if (m.get("person_id") or "").lower() == person_id.lower():
            current_tab = float(m.get("cafe_tab_balance", 0.0))
            new_balance = max(0.0, round(current_tab - payload.amount_paid, 2))
            m["cafe_tab_balance"] = new_balance
            mem_found = True
            
    if not mem_found:
        raise HTTPException(status_code=404, detail="Member not found")
        
    save_json(MEMBERSHIPS_FILE, memberships)
    
    return {
        "status": "success",
        "message": f"Settled Rs. {payload.amount_paid}. Remaining tab: Rs. {new_balance}",
        "remaining_tab_balance": new_balance
    }
