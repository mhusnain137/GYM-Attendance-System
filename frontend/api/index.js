// Unified In-Memory Store for Serverless State across Requests
let CAFE_PRODUCTS_STORE = [
  {
    "id": "PROD-101",
    "name": "Double Whey Isolate Shake",
    "category": "SHAKES",
    "price": 450,
    "cost_price": 280,
    "calories": 210,
    "protein_g": 32,
    "stock": 29,
    "min_stock_alert": 5,
    "is_active": true,
    "description": "Pure whey isolate blended with chilled skim milk or water.",
    "customizable": true
  },
  {
    "id": "PROD-102",
    "name": "Peanut Butter Mass Gainer",
    "category": "SHAKES",
    "price": 550,
    "cost_price": 340,
    "calories": 650,
    "protein_g": 45,
    "stock": 25,
    "min_stock_alert": 5,
    "is_active": true,
    "description": "Heavy mass gainer with banana, natural peanut butter, and oats.",
    "customizable": true
  },
  {
    "id": "PROD-103",
    "name": "Vegan Green Detox Smoothie",
    "category": "SHAKES",
    "price": 400,
    "cost_price": 230,
    "calories": 180,
    "protein_g": 22,
    "stock": 18,
    "min_stock_alert": 4,
    "is_active": true,
    "description": "Plant-based pea protein with spinach, green apple, and almond milk.",
    "customizable": true
  },
  {
    "id": "PROD-104",
    "name": "C4 Pre-Workout Blast",
    "category": "PRE_WORKOUT",
    "price": 250,
    "cost_price": 140,
    "calories": 10,
    "protein_g": 0,
    "stock": 41,
    "min_stock_alert": 8,
    "is_active": true,
    "description": "High energy explosive pre-workout drink with Beta-Alanine and Caffeine.",
    "customizable": false
  },
  {
    "id": "PROD-105",
    "name": "BCAA Recovery Slush",
    "category": "PRE_WORKOUT",
    "price": 220,
    "cost_price": 120,
    "calories": 15,
    "protein_g": 7,
    "stock": 28,
    "min_stock_alert": 5,
    "is_active": true,
    "description": "2:1:1 Amino acids ice slush for intra-workout hydration.",
    "customizable": false
  },
  {
    "id": "PROD-106",
    "name": "Creatine Monohydrate Scoop",
    "category": "SUPPLEMENTS",
    "price": 120,
    "cost_price": 60,
    "calories": 0,
    "protein_g": 0,
    "stock": 50,
    "min_stock_alert": 10,
    "is_active": true,
    "description": "5g Micronized pure German creatine scoop.",
    "customizable": false
  },
  {
    "id": "PROD-107",
    "name": "Chocolate Chip Protein Bar",
    "category": "SNACKS",
    "price": 320.0,
    "cost_price": 210.0,
    "calories": 240,
    "protein_g": 20.0,
    "stock": 10,
    "min_stock_alert": 5,
    "is_active": true,
    "description": "Low sugar, chewy baked whey protein bar.",
    "customizable": false
  },
  {
    "id": "PROD-108",
    "name": "Grilled Chicken & Brown Rice",
    "category": "MEALS",
    "price": 550,
    "cost_price": 360,
    "calories": 480,
    "protein_g": 42,
    "stock": 8,
    "min_stock_alert": 3,
    "is_active": true,
    "description": "200g tender breast fillets with seasoned brown rice & steamed veggies.",
    "customizable": false
  },
  {
    "id": "PROD-109",
    "name": "Boiled Eggs Plate (4 Eggs)",
    "category": "MEALS",
    "price": 200,
    "cost_price": 120,
    "calories": 280,
    "protein_g": 24,
    "stock": 15,
    "min_stock_alert": 5,
    "is_active": true,
    "description": "Fresh farm boiled eggs served with black pepper and pink salt.",
    "customizable": false
  },
  {
    "id": "PROD-110",
    "name": "Electrolyte Mineral Water (500ml)",
    "category": "HYDRATION",
    "price": 80,
    "cost_price": 40,
    "calories": 0,
    "protein_g": 0,
    "stock": 60,
    "min_stock_alert": 10,
    "is_active": true,
    "description": "Chilled alkaline mineral water with essential salts.",
    "customizable": false
  }
];
let CAFE_ORDERS_STORE = [
  {
    "id": "ORD-260901-B10F",
    "person_id": "P-000002",
    "customer_name": "Ahsan",
    "customer_phone": "",
    "items": [
      {
        "product_id": "PROD-101",
        "name": "Double Whey Isolate Shake",
        "qty": 1,
        "unit_price": 570.0,
        "calories": 210,
        "protein_g": 32.0,
        "addons": [
          "+1 Scoop Creatine (5g)"
        ],
        "item_total": 570.0
      }
    ],
    "subtotal": 570.0,
    "discount": 0.0,
    "total_amount": 570.0,
    "payment_method": "CASH",
    "payment_status": "PAID",
    "order_status": "COMPLETED",
    "notes": "",
    "served_by": "Front Desk Staff",
    "created_at": "2026-09-01T17:01:02.740640"
  },
  {
    "id": "ORD-260901-58F3",
    "person_id": "P-000010",
    "customer_name": "Husnain",
    "customer_phone": "",
    "items": [
      {
        "product_id": "PROD-104",
        "name": "C4 Pre-Workout Blast",
        "qty": 1,
        "unit_price": 250.0,
        "calories": 10,
        "protein_g": 0.0,
        "addons": [],
        "item_total": 250.0
      }
    ],
    "subtotal": 250.0,
    "discount": 0.0,
    "total_amount": 250.0,
    "payment_method": "CASH",
    "payment_status": "PAID",
    "order_status": "COMPLETED",
    "notes": "",
    "served_by": "Front Desk Staff",
    "created_at": "2026-09-01T17:03:55.020394"
  },
  {
    "id": "ORD-260901-3FE0",
    "person_id": "P-000006",
    "customer_name": "Furqan",
    "customer_phone": "",
    "items": [
      {
        "product_id": "PROD-105",
        "name": "BCAA Recovery Slush",
        "qty": 1,
        "unit_price": 220.0,
        "calories": 15,
        "protein_g": 7.0,
        "addons": [],
        "item_total": 220.0
      }
    ],
    "subtotal": 220.0,
    "discount": 0.0,
    "total_amount": 220.0,
    "payment_method": "MEMBER_TAB",
    "payment_status": "UNPAID_TAB",
    "order_status": "COMPLETED",
    "notes": "",
    "served_by": "Front Desk Staff",
    "created_at": "2026-09-01T17:36:50.862410"
  },
  {
    "id": "ORD-260901-F9E6",
    "person_id": "P-000002",
    "customer_name": "Test Member",
    "customer_phone": "03001234567",
    "items": [
      {
        "product_id": "PROD-101",
        "name": "Double Whey Isolate Shake",
        "qty": 1,
        "unit_price": 500.0,
        "calories": 310,
        "protein_g": 36.0,
        "addons": [
          "Base: Whole Milk (+Rs. 50)",
          "+1 Spoon Peanut Butter"
        ],
        "item_total": 500.0
      }
    ],
    "subtotal": 500.0,
    "discount": 0.0,
    "total_amount": 500.0,
    "payment_method": "MEMBER_TAB",
    "payment_status": "UNPAID_TAB",
    "order_status": "COMPLETED",
    "notes": "",
    "served_by": "Reception Counter",
    "created_at": "2026-09-01T18:06:21.624373",
    "updated_at": "2026-09-01T18:06:25.778581"
  },
  {
    "id": "ORD-260901-6BDD",
    "person_id": "P-000002",
    "customer_name": "Test Member",
    "customer_phone": "03001234567",
    "items": [
      {
        "product_id": "PROD-101",
        "name": "Double Whey Isolate Shake",
        "qty": 1,
        "unit_price": 500.0,
        "calories": 310,
        "protein_g": 36.0,
        "addons": [
          "Base: Whole Milk (+Rs. 50)",
          "+1 Spoon Peanut Butter"
        ],
        "item_total": 500.0
      }
    ],
    "subtotal": 500.0,
    "discount": 0.0,
    "total_amount": 500.0,
    "payment_method": "MEMBER_TAB",
    "payment_status": "UNPAID_TAB",
    "order_status": "COMPLETED",
    "notes": "",
    "served_by": "Reception Counter",
    "created_at": "2026-09-01T18:11:20.820639",
    "updated_at": "2026-09-01T18:28:08.169231"
  },
  {
    "id": "ORD-260901-B954",
    "person_id": "P-000002",
    "customer_name": "Test Member",
    "customer_phone": "03001234567",
    "items": [
      {
        "product_id": "PROD-101",
        "name": "Double Whey Isolate Shake",
        "qty": 1,
        "unit_price": 500.0,
        "calories": 310,
        "protein_g": 36.0,
        "addons": [
          "Base: Whole Milk (+Rs. 50)",
          "+1 Spoon Peanut Butter"
        ],
        "item_total": 500.0
      }
    ],
    "subtotal": 500.0,
    "discount": 0.0,
    "total_amount": 500.0,
    "payment_method": "MEMBER_TAB",
    "payment_status": "UNPAID_TAB",
    "order_status": "COMPLETED",
    "notes": "",
    "served_by": "Reception Counter",
    "created_at": "2026-09-01T18:11:51.840371",
    "updated_at": "2026-09-01T18:11:56.007169"
  },
  {
    "id": "ORD-260901-3220",
    "person_id": "P-000002",
    "customer_name": "Ahsan (Member)",
    "customer_phone": "03009998877",
    "items": [
      {
        "product_id": "PROD-101",
        "name": "Double Whey Isolate Shake",
        "qty": 1,
        "unit_price": 490.0,
        "calories": 260,
        "protein_g": 36.0,
        "addons": [
          "Base: Skim Milk (+Rs. 40)"
        ],
        "item_total": 490.0
      }
    ],
    "subtotal": 490.0,
    "discount": 0.0,
    "total_amount": 490.0,
    "payment_method": "CASH",
    "payment_status": "PAID",
    "order_status": "PICKED_UP",
    "is_preorder": true,
    "notes": "Pre-order for post-workout pickup",
    "served_by": "Customer Portal",
    "created_at": "2026-09-01T18:20:11.617498",
    "approved_by": "Sara Receptionist",
    "approved_at": "2026-09-01T18:20:17.774540",
    "updated_at": "2026-09-02T19:07:27.080068",
    "picked_up_by": "Customer",
    "picked_up_at": "2026-09-02T19:07:27.080068",
    "completed_at": "2026-09-02T19:07:27.080068"
  },
  {
    "id": "ORD-260901-5E21",
    "person_id": "P-000002",
    "customer_name": "Test Member",
    "customer_phone": "03001234567",
    "items": [
      {
        "product_id": "PROD-101",
        "name": "Double Whey Isolate Shake",
        "qty": 1,
        "unit_price": 500.0,
        "calories": 310,
        "protein_g": 36.0,
        "addons": [
          "Base: Whole Milk (+Rs. 50)",
          "+1 Spoon Peanut Butter"
        ],
        "item_total": 500.0
      }
    ],
    "subtotal": 500.0,
    "discount": 0.0,
    "total_amount": 500.0,
    "payment_method": "MEMBER_TAB",
    "payment_status": "UNPAID_TAB",
    "order_status": "COMPLETED",
    "notes": "",
    "served_by": "Reception Counter",
    "created_at": "2026-09-01T18:24:22.819095",
    "updated_at": "2026-09-01T18:24:26.957387"
  },
  {
    "id": "ORD-260901-91F1",
    "person_id": "P-000002",
    "customer_name": "Ahsan",
    "customer_phone": "",
    "items": [
      {
        "product_id": "PROD-105",
        "name": "BCAA Recovery Slush",
        "qty": 1,
        "unit_price": 220.0,
        "calories": 15,
        "protein_g": 7.0,
        "addons": [],
        "item_total": 220.0
      }
    ],
    "subtotal": 220.0,
    "discount": 0.0,
    "total_amount": 220.0,
    "payment_method": "CASH",
    "payment_status": "PAID",
    "order_status": "COMPLETED",
    "is_preorder": true,
    "notes": "Pre-ordered via Member Portal (Pay at Counter)",
    "served_by": "Customer Portal",
    "created_at": "2026-09-01T18:26:12.252758",
    "approved_by": "Reception Staff",
    "approved_at": "2026-09-01T18:28:10.829433",
    "updated_at": "2026-09-01T18:28:29.142377"
  }
];
let WORKOUT_TEMPLATES_STORE = {
  "P-000002": [
    {
      "id": "tpl-ef3c349d",
      "name": "UPPER BODY",
      "description": "Upper body pushing power focused on chest, shoulders and triceps.",
      "target_muscle": "Chest, Shoulders & Triceps",
      "icon": "\u26a1",
      "updated_at": "2026-09-02T18:08:17.250510",
      "exercises": [
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 2,
          "target_reps": "8-10",
          "notes": ""
        },
        {
          "name": "Incline Dumbbell Bench Press",
          "category": "Chest",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": ""
        },
        {
          "name": "Flat Dumbbell Press",
          "category": "Chest",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": ""
        }
      ],
      "created_at": "2026-09-02T18:06:47.578415"
    },
    {
      "id": "tpl-7fc88bc8",
      "name": "Pull Day (Back & Biceps)",
      "description": "Lats width, upper back thickness, and bicep growth.",
      "target_muscle": "Back, Lats & Biceps",
      "icon": "\ud83d\ude80",
      "created_at": "2026-09-02T18:06:47.578526",
      "exercises": [
        {
          "name": "Lat Pulldown (Wide Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Pull with elbows to clavicle"
        },
        {
          "name": "Seated Cable Row (Close Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Squeeze shoulder blades together"
        },
        {
          "name": "Single-Arm Dumbbell Row",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Full stretch at bottom"
        },
        {
          "name": "Face Pulls",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Target rear delts and rotators"
        },
        {
          "name": "EZ-Bar Standing Bicep Curls",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Keep elbows pinned at sides"
        },
        {
          "name": "Dumbbell Hammer Curls",
          "category": "Arms",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "Brachialis and grip strength"
        }
      ]
    },
    {
      "id": "tpl-7ea3e034",
      "name": "Legs & Lower Body Power",
      "description": "Quads, hamstrings, glutes and calves strength development.",
      "target_muscle": "Quads, Hamstrings & Glutes",
      "icon": "\ud83e\uddb5",
      "created_at": "2026-09-02T18:06:47.578566",
      "exercises": [
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Hit parallel depth"
        },
        {
          "name": "Leg Press 45\u00b0",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Do not lock knees at top"
        },
        {
          "name": "Romanian Deadlift (RDL)",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Feel deep hamstring stretch"
        },
        {
          "name": "Seated Leg Extension Machine",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "1 second hold at peak"
        },
        {
          "name": "Standing Calf Raises",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Full plantar extension"
        }
      ]
    },
    {
      "id": "tpl-0abcd5eb",
      "name": "Full Body Conditioning",
      "description": "High-efficiency compound workout targeting total body strength.",
      "target_muscle": "Total Body & Core",
      "icon": "\ud83d\udca5",
      "created_at": "2026-09-02T18:06:47.578624",
      "exercises": [
        {
          "name": "Conventional Deadlift",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "6-8",
          "notes": "Brace core tight"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Controlled pressing"
        },
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Solid compound depth"
        },
        {
          "name": "Overhead Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Strict overhead lock"
        },
        {
          "name": "Hanging Knee / Leg Raises",
          "category": "Core",
          "target_sets": 3,
          "target_reps": "15-20",
          "notes": "Control hip swing"
        }
      ]
    }
  ],
  "USR-001": [
    {
      "id": "tpl-679355b8",
      "name": "Push Day (Chest, Shoulders, Triceps)",
      "description": "Upper body pushing power focused on chest, shoulders and triceps.",
      "target_muscle": "Chest, Shoulders & Triceps",
      "icon": "\u26a1",
      "created_at": "2026-09-02T18:23:23.977368",
      "exercises": [
        {
          "name": "Incline Dumbbell Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Focus on upper pec stretch"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Heavy compound pressing"
        },
        {
          "name": "Seated Dumbbell Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Control the descent"
        },
        {
          "name": "Standing Lateral Dumbbell Raises",
          "category": "Shoulders",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Strict form, no swinging"
        },
        {
          "name": "Rope Cable Triceps Pushdown",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Lock out and squeeze triceps"
        }
      ]
    },
    {
      "id": "tpl-df4c2b84",
      "name": "Pull Day (Back & Biceps)",
      "description": "Lats width, upper back thickness, and bicep growth.",
      "target_muscle": "Back, Lats & Biceps",
      "icon": "\ud83d\ude80",
      "created_at": "2026-09-02T18:23:23.977428",
      "exercises": [
        {
          "name": "Lat Pulldown (Wide Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Pull with elbows to clavicle"
        },
        {
          "name": "Seated Cable Row (Close Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Squeeze shoulder blades together"
        },
        {
          "name": "Single-Arm Dumbbell Row",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Full stretch at bottom"
        },
        {
          "name": "Face Pulls",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Target rear delts and rotators"
        },
        {
          "name": "EZ-Bar Standing Bicep Curls",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Keep elbows pinned at sides"
        },
        {
          "name": "Dumbbell Hammer Curls",
          "category": "Arms",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "Brachialis and grip strength"
        }
      ]
    },
    {
      "id": "tpl-25016f9b",
      "name": "Legs & Lower Body Power",
      "description": "Quads, hamstrings, glutes and calves strength development.",
      "target_muscle": "Quads, Hamstrings & Glutes",
      "icon": "\ud83e\uddb5",
      "created_at": "2026-09-02T18:23:23.977451",
      "exercises": [
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Hit parallel depth"
        },
        {
          "name": "Leg Press 45\u00b0",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Do not lock knees at top"
        },
        {
          "name": "Romanian Deadlift (RDL)",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Feel deep hamstring stretch"
        },
        {
          "name": "Seated Leg Extension Machine",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "1 second hold at peak"
        },
        {
          "name": "Standing Calf Raises",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Full plantar extension"
        }
      ]
    },
    {
      "id": "tpl-69c2e290",
      "name": "Full Body Conditioning",
      "description": "High-efficiency compound workout targeting total body strength.",
      "target_muscle": "Total Body & Core",
      "icon": "\ud83d\udca5",
      "created_at": "2026-09-02T18:23:23.977502",
      "exercises": [
        {
          "name": "Conventional Deadlift",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "6-8",
          "notes": "Brace core tight"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Controlled pressing"
        },
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Solid compound depth"
        },
        {
          "name": "Overhead Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Strict overhead lock"
        },
        {
          "name": "Hanging Knee / Leg Raises",
          "category": "Core",
          "target_sets": 3,
          "target_reps": "15-20",
          "notes": "Control hip swing"
        }
      ]
    }
  ],
  "P-000005": [
    {
      "id": "tpl-7e83d88f",
      "name": "Push Day (Chest, Shoulders, Triceps)",
      "description": "Upper body pushing power focused on chest, shoulders and triceps.",
      "target_muscle": "Chest, Shoulders & Triceps",
      "icon": "\u26a1",
      "created_at": "2026-09-02T18:28:02.567027",
      "exercises": [
        {
          "name": "Incline Dumbbell Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Focus on upper pec stretch"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Heavy compound pressing"
        },
        {
          "name": "Seated Dumbbell Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Control the descent"
        },
        {
          "name": "Standing Lateral Dumbbell Raises",
          "category": "Shoulders",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Strict form, no swinging"
        },
        {
          "name": "Rope Cable Triceps Pushdown",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Lock out and squeeze triceps"
        }
      ]
    },
    {
      "id": "tpl-f22f0332",
      "name": "Pull Day (Back & Biceps)",
      "description": "Lats width, upper back thickness, and bicep growth.",
      "target_muscle": "Back, Lats & Biceps",
      "icon": "\ud83d\ude80",
      "created_at": "2026-09-02T18:28:02.567065",
      "exercises": [
        {
          "name": "Lat Pulldown (Wide Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Pull with elbows to clavicle"
        },
        {
          "name": "Seated Cable Row (Close Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Squeeze shoulder blades together"
        },
        {
          "name": "Single-Arm Dumbbell Row",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Full stretch at bottom"
        },
        {
          "name": "Face Pulls",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Target rear delts and rotators"
        },
        {
          "name": "EZ-Bar Standing Bicep Curls",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Keep elbows pinned at sides"
        },
        {
          "name": "Dumbbell Hammer Curls",
          "category": "Arms",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "Brachialis and grip strength"
        }
      ]
    },
    {
      "id": "tpl-873aa589",
      "name": "Legs & Lower Body Power",
      "description": "Quads, hamstrings, glutes and calves strength development.",
      "target_muscle": "Quads, Hamstrings & Glutes",
      "icon": "\ud83e\uddb5",
      "created_at": "2026-09-02T18:28:02.567086",
      "exercises": [
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Hit parallel depth"
        },
        {
          "name": "Leg Press 45\u00b0",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Do not lock knees at top"
        },
        {
          "name": "Romanian Deadlift (RDL)",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Feel deep hamstring stretch"
        },
        {
          "name": "Seated Leg Extension Machine",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "1 second hold at peak"
        },
        {
          "name": "Standing Calf Raises",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Full plantar extension"
        }
      ]
    },
    {
      "id": "tpl-3c957bd1",
      "name": "Full Body Conditioning",
      "description": "High-efficiency compound workout targeting total body strength.",
      "target_muscle": "Total Body & Core",
      "icon": "\ud83d\udca5",
      "created_at": "2026-09-02T18:28:02.567113",
      "exercises": [
        {
          "name": "Conventional Deadlift",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "6-8",
          "notes": "Brace core tight"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Controlled pressing"
        },
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Solid compound depth"
        },
        {
          "name": "Overhead Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Strict overhead lock"
        },
        {
          "name": "Hanging Knee / Leg Raises",
          "category": "Core",
          "target_sets": 3,
          "target_reps": "15-20",
          "notes": "Control hip swing"
        }
      ]
    }
  ],
  "P-000016": [
    {
      "id": "tpl-c90fafb6",
      "name": "Push Day (Chest, Shoulders, Triceps)",
      "description": "Upper body pushing power focused on chest, shoulders and triceps.",
      "target_muscle": "Chest, Shoulders & Triceps",
      "icon": "\u26a1",
      "created_at": "2026-09-02T18:28:08.289235",
      "exercises": [
        {
          "name": "Incline Dumbbell Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Focus on upper pec stretch"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Heavy compound pressing"
        },
        {
          "name": "Seated Dumbbell Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Control the descent"
        },
        {
          "name": "Standing Lateral Dumbbell Raises",
          "category": "Shoulders",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Strict form, no swinging"
        },
        {
          "name": "Rope Cable Triceps Pushdown",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Lock out and squeeze triceps"
        }
      ]
    },
    {
      "id": "tpl-83f58a83",
      "name": "Pull Day (Back & Biceps)",
      "description": "Lats width, upper back thickness, and bicep growth.",
      "target_muscle": "Back, Lats & Biceps",
      "icon": "\ud83d\ude80",
      "created_at": "2026-09-02T18:28:08.289290",
      "exercises": [
        {
          "name": "Lat Pulldown (Wide Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Pull with elbows to clavicle"
        },
        {
          "name": "Seated Cable Row (Close Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Squeeze shoulder blades together"
        },
        {
          "name": "Single-Arm Dumbbell Row",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Full stretch at bottom"
        },
        {
          "name": "Face Pulls",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Target rear delts and rotators"
        },
        {
          "name": "EZ-Bar Standing Bicep Curls",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Keep elbows pinned at sides"
        },
        {
          "name": "Dumbbell Hammer Curls",
          "category": "Arms",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "Brachialis and grip strength"
        }
      ]
    },
    {
      "id": "tpl-69582b8b",
      "name": "Legs & Lower Body Power",
      "description": "Quads, hamstrings, glutes and calves strength development.",
      "target_muscle": "Quads, Hamstrings & Glutes",
      "icon": "\ud83e\uddb5",
      "created_at": "2026-09-02T18:28:08.289326",
      "exercises": [
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Hit parallel depth"
        },
        {
          "name": "Leg Press 45\u00b0",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Do not lock knees at top"
        },
        {
          "name": "Romanian Deadlift (RDL)",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Feel deep hamstring stretch"
        },
        {
          "name": "Seated Leg Extension Machine",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "1 second hold at peak"
        },
        {
          "name": "Standing Calf Raises",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Full plantar extension"
        }
      ]
    },
    {
      "id": "tpl-ce123382",
      "name": "Full Body Conditioning",
      "description": "High-efficiency compound workout targeting total body strength.",
      "target_muscle": "Total Body & Core",
      "icon": "\ud83d\udca5",
      "created_at": "2026-09-02T18:28:08.289362",
      "exercises": [
        {
          "name": "Conventional Deadlift",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "6-8",
          "notes": "Brace core tight"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Controlled pressing"
        },
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Solid compound depth"
        },
        {
          "name": "Overhead Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Strict overhead lock"
        },
        {
          "name": "Hanging Knee / Leg Raises",
          "category": "Core",
          "target_sets": 3,
          "target_reps": "15-20",
          "notes": "Control hip swing"
        }
      ]
    }
  ],
  "P-000003": [
    {
      "id": "tpl-c04c941d",
      "name": "Push Day (Chest, Shoulders, Triceps)",
      "description": "Upper body pushing power focused on chest, shoulders and triceps.",
      "target_muscle": "Chest, Shoulders & Triceps",
      "icon": "\u26a1",
      "created_at": "2026-09-02T18:29:18.371535",
      "exercises": [
        {
          "name": "Incline Dumbbell Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Focus on upper pec stretch"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Heavy compound pressing"
        },
        {
          "name": "Seated Dumbbell Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Control the descent"
        },
        {
          "name": "Standing Lateral Dumbbell Raises",
          "category": "Shoulders",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Strict form, no swinging"
        },
        {
          "name": "Rope Cable Triceps Pushdown",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Lock out and squeeze triceps"
        }
      ]
    },
    {
      "id": "tpl-f9c90558",
      "name": "Pull Day (Back & Biceps)",
      "description": "Lats width, upper back thickness, and bicep growth.",
      "target_muscle": "Back, Lats & Biceps",
      "icon": "\ud83d\ude80",
      "created_at": "2026-09-02T18:29:18.371620",
      "exercises": [
        {
          "name": "Lat Pulldown (Wide Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Pull with elbows to clavicle"
        },
        {
          "name": "Seated Cable Row (Close Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Squeeze shoulder blades together"
        },
        {
          "name": "Single-Arm Dumbbell Row",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Full stretch at bottom"
        },
        {
          "name": "Face Pulls",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Target rear delts and rotators"
        },
        {
          "name": "EZ-Bar Standing Bicep Curls",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Keep elbows pinned at sides"
        },
        {
          "name": "Dumbbell Hammer Curls",
          "category": "Arms",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "Brachialis and grip strength"
        }
      ]
    },
    {
      "id": "tpl-32a58117",
      "name": "Legs & Lower Body Power",
      "description": "Quads, hamstrings, glutes and calves strength development.",
      "target_muscle": "Quads, Hamstrings & Glutes",
      "icon": "\ud83e\uddb5",
      "created_at": "2026-09-02T18:29:18.371656",
      "exercises": [
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Hit parallel depth"
        },
        {
          "name": "Leg Press 45\u00b0",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Do not lock knees at top"
        },
        {
          "name": "Romanian Deadlift (RDL)",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Feel deep hamstring stretch"
        },
        {
          "name": "Seated Leg Extension Machine",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "1 second hold at peak"
        },
        {
          "name": "Standing Calf Raises",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Full plantar extension"
        }
      ]
    },
    {
      "id": "tpl-5c62e415",
      "name": "Full Body Conditioning",
      "description": "High-efficiency compound workout targeting total body strength.",
      "target_muscle": "Total Body & Core",
      "icon": "\ud83d\udca5",
      "created_at": "2026-09-02T18:29:18.371696",
      "exercises": [
        {
          "name": "Conventional Deadlift",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "6-8",
          "notes": "Brace core tight"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Controlled pressing"
        },
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Solid compound depth"
        },
        {
          "name": "Overhead Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Strict overhead lock"
        },
        {
          "name": "Hanging Knee / Leg Raises",
          "category": "Core",
          "target_sets": 3,
          "target_reps": "15-20",
          "notes": "Control hip swing"
        }
      ]
    }
  ],
  "P-000011": [
    {
      "id": "tpl-16949243",
      "name": "Push Day (Chest, Shoulders, Triceps)",
      "description": "Upper body pushing power focused on chest, shoulders and triceps.",
      "target_muscle": "Chest, Shoulders & Triceps",
      "icon": "\u26a1",
      "created_at": "2026-09-02T19:09:07.422311",
      "exercises": [
        {
          "name": "Incline Dumbbell Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Focus on upper pec stretch"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Heavy compound pressing"
        },
        {
          "name": "Seated Dumbbell Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Control the descent"
        },
        {
          "name": "Standing Lateral Dumbbell Raises",
          "category": "Shoulders",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Strict form, no swinging"
        },
        {
          "name": "Rope Cable Triceps Pushdown",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "12-15",
          "notes": "Lock out and squeeze triceps"
        }
      ]
    },
    {
      "id": "tpl-024deee4",
      "name": "Pull Day (Back & Biceps)",
      "description": "Lats width, upper back thickness, and bicep growth.",
      "target_muscle": "Back, Lats & Biceps",
      "icon": "\ud83d\ude80",
      "created_at": "2026-09-02T19:09:07.422348",
      "exercises": [
        {
          "name": "Lat Pulldown (Wide Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Pull with elbows to clavicle"
        },
        {
          "name": "Seated Cable Row (Close Grip)",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Squeeze shoulder blades together"
        },
        {
          "name": "Single-Arm Dumbbell Row",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "10-12",
          "notes": "Full stretch at bottom"
        },
        {
          "name": "Face Pulls",
          "category": "Back",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Target rear delts and rotators"
        },
        {
          "name": "EZ-Bar Standing Bicep Curls",
          "category": "Arms",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Keep elbows pinned at sides"
        },
        {
          "name": "Dumbbell Hammer Curls",
          "category": "Arms",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "Brachialis and grip strength"
        }
      ]
    },
    {
      "id": "tpl-95b7b1e1",
      "name": "Legs & Lower Body Power",
      "description": "Quads, hamstrings, glutes and calves strength development.",
      "target_muscle": "Quads, Hamstrings & Glutes",
      "icon": "\ud83e\uddb5",
      "created_at": "2026-09-02T19:09:07.422368",
      "exercises": [
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "8-10",
          "notes": "Hit parallel depth"
        },
        {
          "name": "Leg Press 45\u00b0",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Do not lock knees at top"
        },
        {
          "name": "Romanian Deadlift (RDL)",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "10-12",
          "notes": "Feel deep hamstring stretch"
        },
        {
          "name": "Seated Leg Extension Machine",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "12-15",
          "notes": "1 second hold at peak"
        },
        {
          "name": "Standing Calf Raises",
          "category": "Legs",
          "target_sets": 4,
          "target_reps": "15-20",
          "notes": "Full plantar extension"
        }
      ]
    },
    {
      "id": "tpl-b96a6097",
      "name": "Full Body Conditioning",
      "description": "High-efficiency compound workout targeting total body strength.",
      "target_muscle": "Total Body & Core",
      "icon": "\ud83d\udca5",
      "created_at": "2026-09-02T19:09:07.422385",
      "exercises": [
        {
          "name": "Conventional Deadlift",
          "category": "Back",
          "target_sets": 3,
          "target_reps": "6-8",
          "notes": "Brace core tight"
        },
        {
          "name": "Barbell Flat Bench Press",
          "category": "Chest",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Controlled pressing"
        },
        {
          "name": "Barbell Back Squats",
          "category": "Legs",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Solid compound depth"
        },
        {
          "name": "Overhead Shoulder Press",
          "category": "Shoulders",
          "target_sets": 3,
          "target_reps": "8-10",
          "notes": "Strict overhead lock"
        },
        {
          "name": "Hanging Knee / Leg Raises",
          "category": "Core",
          "target_sets": 3,
          "target_reps": "15-20",
          "notes": "Control hip swing"
        }
      ]
    }
  ]
};
let DEFAULT_TEMPLATES = [
  {
    "id": "tpl-ef3c349d",
    "name": "UPPER BODY",
    "description": "Upper body pushing power focused on chest, shoulders and triceps.",
    "target_muscle": "Chest, Shoulders & Triceps",
    "icon": "\u26a1",
    "updated_at": "2026-09-02T18:08:17.250510",
    "exercises": [
      {
        "name": "Barbell Flat Bench Press",
        "category": "Chest",
        "target_sets": 2,
        "target_reps": "8-10",
        "notes": ""
      },
      {
        "name": "Incline Dumbbell Bench Press",
        "category": "Chest",
        "target_sets": 3,
        "target_reps": "10-12",
        "notes": ""
      },
      {
        "name": "Flat Dumbbell Press",
        "category": "Chest",
        "target_sets": 3,
        "target_reps": "10-12",
        "notes": ""
      }
    ],
    "created_at": "2026-09-02T18:06:47.578415"
  },
  {
    "id": "tpl-7fc88bc8",
    "name": "Pull Day (Back & Biceps)",
    "description": "Lats width, upper back thickness, and bicep growth.",
    "target_muscle": "Back, Lats & Biceps",
    "icon": "\ud83d\ude80",
    "created_at": "2026-09-02T18:06:47.578526",
    "exercises": [
      {
        "name": "Lat Pulldown (Wide Grip)",
        "category": "Back",
        "target_sets": 4,
        "target_reps": "10-12",
        "notes": "Pull with elbows to clavicle"
      },
      {
        "name": "Seated Cable Row (Close Grip)",
        "category": "Back",
        "target_sets": 4,
        "target_reps": "10-12",
        "notes": "Squeeze shoulder blades together"
      },
      {
        "name": "Single-Arm Dumbbell Row",
        "category": "Back",
        "target_sets": 3,
        "target_reps": "10-12",
        "notes": "Full stretch at bottom"
      },
      {
        "name": "Face Pulls",
        "category": "Back",
        "target_sets": 4,
        "target_reps": "15-20",
        "notes": "Target rear delts and rotators"
      },
      {
        "name": "EZ-Bar Standing Bicep Curls",
        "category": "Arms",
        "target_sets": 4,
        "target_reps": "10-12",
        "notes": "Keep elbows pinned at sides"
      },
      {
        "name": "Dumbbell Hammer Curls",
        "category": "Arms",
        "target_sets": 3,
        "target_reps": "12-15",
        "notes": "Brachialis and grip strength"
      }
    ]
  },
  {
    "id": "tpl-7ea3e034",
    "name": "Legs & Lower Body Power",
    "description": "Quads, hamstrings, glutes and calves strength development.",
    "target_muscle": "Quads, Hamstrings & Glutes",
    "icon": "\ud83e\uddb5",
    "created_at": "2026-09-02T18:06:47.578566",
    "exercises": [
      {
        "name": "Barbell Back Squats",
        "category": "Legs",
        "target_sets": 4,
        "target_reps": "8-10",
        "notes": "Hit parallel depth"
      },
      {
        "name": "Leg Press 45\u00b0",
        "category": "Legs",
        "target_sets": 4,
        "target_reps": "10-12",
        "notes": "Do not lock knees at top"
      },
      {
        "name": "Romanian Deadlift (RDL)",
        "category": "Legs",
        "target_sets": 4,
        "target_reps": "10-12",
        "notes": "Feel deep hamstring stretch"
      },
      {
        "name": "Seated Leg Extension Machine",
        "category": "Legs",
        "target_sets": 3,
        "target_reps": "12-15",
        "notes": "1 second hold at peak"
      },
      {
        "name": "Standing Calf Raises",
        "category": "Legs",
        "target_sets": 4,
        "target_reps": "15-20",
        "notes": "Full plantar extension"
      }
    ]
  },
  {
    "id": "tpl-0abcd5eb",
    "name": "Full Body Conditioning",
    "description": "High-efficiency compound workout targeting total body strength.",
    "target_muscle": "Total Body & Core",
    "icon": "\ud83d\udca5",
    "created_at": "2026-09-02T18:06:47.578624",
    "exercises": [
      {
        "name": "Conventional Deadlift",
        "category": "Back",
        "target_sets": 3,
        "target_reps": "6-8",
        "notes": "Brace core tight"
      },
      {
        "name": "Barbell Flat Bench Press",
        "category": "Chest",
        "target_sets": 3,
        "target_reps": "8-10",
        "notes": "Controlled pressing"
      },
      {
        "name": "Barbell Back Squats",
        "category": "Legs",
        "target_sets": 3,
        "target_reps": "8-10",
        "notes": "Solid compound depth"
      },
      {
        "name": "Overhead Shoulder Press",
        "category": "Shoulders",
        "target_sets": 3,
        "target_reps": "8-10",
        "notes": "Strict overhead lock"
      },
      {
        "name": "Hanging Knee / Leg Raises",
        "category": "Core",
        "target_sets": 3,
        "target_reps": "15-20",
        "notes": "Control hip swing"
      }
    ]
  }
];
let WORKOUT_LOGS_STORE = [
  {
    "id": "wlog-260902180924-a828",
    "member_id": "P-000002",
    "template_id": "tpl-ef3c349d",
    "template_name": "UPPER BODY",
    "date": "2026-09-02",
    "timestamp": "2026-09-02T18:09:24.106722",
    "duration_minutes": 45,
    "notes": "",
    "total_volume_kg": 800.0,
    "total_sets": 2,
    "total_reps": 20,
    "exercises_count": 3,
    "exercises": [
      {
        "name": "Barbell Flat Bench Press",
        "category": "Chest",
        "notes": "",
        "sets": [
          {
            "set_num": 1,
            "weight_kg": 40.0,
            "reps": 10,
            "is_completed": true
          },
          {
            "set_num": 2,
            "weight_kg": 40.0,
            "reps": 10,
            "is_completed": true
          }
        ],
        "total_volume_kg": 800.0
      },
      {
        "name": "Incline Dumbbell Bench Press",
        "category": "Chest",
        "notes": "",
        "sets": [
          {
            "set_num": 1,
            "weight_kg": 40.0,
            "reps": 10,
            "is_completed": false
          },
          {
            "set_num": 2,
            "weight_kg": 40.0,
            "reps": 10,
            "is_completed": false
          },
          {
            "set_num": 3,
            "weight_kg": 40.0,
            "reps": 10,
            "is_completed": false
          }
        ],
        "total_volume_kg": 0.0
      },
      {
        "name": "Flat Dumbbell Press",
        "category": "Chest",
        "notes": "",
        "sets": [
          {
            "set_num": 1,
            "weight_kg": 40.0,
            "reps": 10,
            "is_completed": false
          },
          {
            "set_num": 2,
            "weight_kg": 40.0,
            "reps": 10,
            "is_completed": false
          },
          {
            "set_num": 3,
            "weight_kg": 40.0,
            "reps": 10,
            "is_completed": false
          }
        ],
        "total_volume_kg": 0.0
      }
    ]
  }
];
let USERS_STORE = [
  {
    "user_id": "USR-001",
    "username": "admin",
    "password": "admin123",
    "name": "Gym Owner (Super Admin)",
    "role": "ADMIN",
    "is_active": true,
    "created_at": "2026-09-01T17:40:00"
  },
  {
    "user_id": "USR-002",
    "username": "manager",
    "password": "manager123",
    "name": "Ali Supervisor (Manager)",
    "role": "MANAGER",
    "is_active": true,
    "created_at": "2026-09-01T17:40:00"
  },
  {
    "user_id": "USR-003",
    "username": "reception",
    "password": "reception123",
    "name": "Sara Counter (Receptionist)",
    "role": "RECEPTIONIST",
    "is_active": true,
    "created_at": "2026-09-01T17:40:00"
  }
];
let REGISTERED_PEOPLE = [
  {
    "id": "P-000002",
    "name": "Ahsan",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000003",
    "name": "Jawad",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000004",
    "name": "Abdul Hannan",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000005",
    "name": "Hassaan",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000006",
    "name": "Furqan",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000009",
    "name": "Usman Bhai",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:00:00"
  },
  {
    "id": "P-000010",
    "name": "Husnain",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 17:37:03"
  },
  {
    "id": "P-000011",
    "name": "Ahmad Saeed",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-19 19:44:14"
  },
  {
    "id": "P-000014",
    "name": "Ahmad Riaz",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 18:02:57"
  },
  {
    "id": "P-000016",
    "name": "Junaid",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 18:48:42"
  },
  {
    "id": "P-000017",
    "name": "Sir Saleem",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 18:48:43"
  },
  {
    "id": "P-000019",
    "name": "Husnain Sarwar",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 19:37:17"
  },
  {
    "id": "P-000020",
    "name": "Ahmad bin saeed",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-25 19:48:56"
  },
  {
    "id": "P-000022",
    "name": "Sir Imran",
    "phone": "0300-1234567",
    "email": "",
    "status": "active",
    "registered_at": "2026-08-29 17:11:22"
  }
];
let MEMBERSHIPS = [
  {
    "membership_id": "M-000003",
    "person_id": "P-000002",
    "plan_id": "monthly",
    "plan_name": "Monthly",
    "start_date": "2026-08-18",
    "expiry_date": "2026-09-18",
    "status": "ACTIVE",
    "payment_status": "PAID",
    "amount": 5000.0,
    "notes": "",
    "created_at": "2026-08-18T18:36:30.177012",
    "updated_at": "2026-08-18T18:36:30.177012",
    "person_name": "Ahsan",
    "cafe_tab_balance": 500.0
  },
  {
    "membership_id": "M-000002",
    "person_id": "P-000011",
    "person_name": "Ahmad Saeed",
    "plan_id": "monthly",
    "plan_name": "Monthly",
    "start_date": "2026-08-18",
    "expiry_date": "2026-09-19",
    "status": "ACTIVE",
    "payment_status": "PAID",
    "amount": 5000.0,
    "notes": "Auto-Unfrozen & Continued on 2026-08-19 | Auto-Unfrozen at camera check-in on 2026-08-29",
    "created_at": "2026-08-18T19:22:16.087156",
    "updated_at": "2026-08-29T18:32:45.656592",
    "freeze_reason": "",
    "phone": "03217614627",
    "frozen_at": "2026-08-29",
    "unfrozen_at": "2026-08-29"
  },
  {
    "membership_id": "M-000004",
    "person_id": "P-000022",
    "plan_id": "daily",
    "plan_name": "Daily Pass",
    "start_date": "2026-08-29",
    "expiry_date": "2026-08-30",
    "status": "ACTIVE",
    "payment_status": "PAID",
    "amount": 300.0,
    "phone": "",
    "notes": "",
    "created_at": "2026-08-29T17:22:28.288519",
    "updated_at": "2026-08-29T17:31:02.519296",
    "reminder_count": 1,
    "last_reminder_sent": "2026-08-29T17:22:33.030615",
    "freeze_reason": "N/a"
  }
];
let MEMBERSHIP_PLANS = [
  {
    "plan_id": "daily",
    "name": "Daily Pass",
    "duration": 1,
    "duration_unit": "day",
    "price": 300.0,
    "description": "1 Day Gym Access Pass"
  },
  {
    "plan_id": "weekly",
    "name": "Weekly Pass",
    "duration": 7,
    "duration_unit": "day",
    "price": 1500.0,
    "description": "7 Days Full Access Pass"
  },
  {
    "plan_id": "monthly",
    "name": "Monthly Standard",
    "duration": 1,
    "duration_unit": "month",
    "price": 5000.0,
    "description": "Standard 30-Day Gym Membership"
  },
  {
    "plan_id": "3months",
    "name": "3 Months (Quarterly)",
    "duration": 3,
    "duration_unit": "month",
    "price": 13500.0,
    "description": "Quarterly Gym Membership (Save 10%)"
  },
  {
    "plan_id": "6months",
    "name": "6 Months (Half-Yearly)",
    "duration": 6,
    "duration_unit": "month",
    "price": 25000.0,
    "description": "Half-Year Gym Membership (Save Rs 5,000)"
  },
  {
    "plan_id": "yearly",
    "name": "1 Year VIP Annual",
    "duration": 1,
    "duration_unit": "year",
    "price": 45000.0,
    "description": "VIP Full Year Gym Access (Save Rs 15,000)"
  }
];
let ATTENDANCE = [
  {
    "date": "2026-08-17",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "18:36:38"
  },
  {
    "date": "2026-08-17",
    "person_id": "P-000009",
    "name": "Usman Bhai",
    "status": "Present",
    "first_detected": "18:54:12"
  },
  {
    "date": "2026-08-17",
    "person_id": "P-000004",
    "name": "Abdul Hannan",
    "status": "Present",
    "first_detected": "18:54:46"
  },
  {
    "date": "2026-08-17",
    "person_id": "P-000013",
    "name": "Sir Saleem",
    "status": "Present",
    "first_detected": "20:34:13",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-17",
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "status": "Present",
    "first_detected": "20:42:45",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-18",
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "status": "Present",
    "first_detected": "16:52:55",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-18",
    "person_id": "P-000013",
    "name": "Sir Saleem",
    "status": "Present",
    "first_detected": "16:58:22",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-18",
    "person_id": "P-000003",
    "name": "Jawad",
    "status": "Present",
    "first_detected": "16:58:26",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-18",
    "person_id": "P-000009",
    "name": "Usman Bhai",
    "status": "Present",
    "first_detected": "16:58:41",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-18",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "16:58:45",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-19",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "17:37:03",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-19",
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "status": "Present",
    "first_detected": "19:44:14",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-19",
    "person_id": "P-000003",
    "name": "Jawad",
    "status": "Present",
    "first_detected": "19:45:38",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-19",
    "person_id": "P-000005",
    "name": "Hassaan",
    "status": "Present",
    "first_detected": "19:45:48",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-22",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "18:17:08",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-22",
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "status": "Present",
    "first_detected": "18:17:12",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-22",
    "person_id": "P-000003",
    "name": "Jawad",
    "status": "Present",
    "first_detected": "18:17:15",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "17:43:33",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000005",
    "name": "Hassaan",
    "status": "Present",
    "first_detected": "17:53:51",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000016",
    "name": "Junaid",
    "status": "Present",
    "first_detected": "18:03:06",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000017",
    "name": "Sir Saleem",
    "status": "Present",
    "first_detected": "18:48:43",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000018",
    "name": "Visitor #18",
    "status": "Present",
    "first_detected": "18:48:45",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000019",
    "name": "Husnain Sarwar",
    "status": "Present",
    "first_detected": "19:37:17",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "status": "Present",
    "first_detected": "19:48:56",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-25",
    "person_id": "P-000021",
    "name": "SIr Imran",
    "status": "Present",
    "first_detected": "20:14:13",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000018",
    "name": "Visitor #18",
    "status": "Present",
    "first_detected": "17:03:21",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "17:10:44",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000022",
    "name": "Sir Imran",
    "status": "Present",
    "first_detected": "17:11:22",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000016",
    "name": "Junaid",
    "status": "Present",
    "first_detected": "17:51:27",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "status": "Present",
    "first_detected": "19:30:21",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-08-29",
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "status": "Present",
    "first_detected": "19:38:54",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-09-02",
    "person_id": "P-000019",
    "name": "Husnain Sarwar",
    "status": "Present",
    "first_detected": "19:24:22",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "date": "2026-09-02",
    "person_id": "P-000010",
    "name": "Husnain",
    "status": "Present",
    "first_detected": "23:15:47",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  }
];
let VISITS = [
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-22",
    "time": "18:17:08",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "date": "2026-08-22",
    "time": "18:17:12",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000003",
    "name": "Jawad",
    "date": "2026-08-22",
    "time": "18:17:15",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000005",
    "name": "Hassaan",
    "date": "2026-08-22",
    "time": "18:25:59",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000004",
    "name": "Abdul Hannan",
    "date": "2026-08-22",
    "time": "18:26:05",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000005",
    "name": "Hassaan",
    "date": "2026-08-22",
    "time": "18:50:10",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-25",
    "time": "17:43:33",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000012",
    "name": "Ahmad Riaz",
    "date": "2026-08-25",
    "time": "17:43:45",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-25",
    "time": "17:53:45",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000005",
    "name": "Hassaan",
    "date": "2026-08-25",
    "time": "17:53:51",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000012",
    "name": "Ahmad Riaz",
    "date": "2026-08-25",
    "time": "17:53:55",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-25",
    "time": "17:53:57",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-25",
    "time": "17:54:24",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000012",
    "name": "Ahmad Riaz",
    "date": "2026-08-25",
    "time": "17:54:27",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-25",
    "time": "17:56:54",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-25",
    "time": "18:01:27",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000012",
    "name": "Ahmad Riaz",
    "date": "2026-08-25",
    "time": "18:01:27",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000012",
    "name": "Ahmad Riaz",
    "date": "2026-08-25",
    "time": "18:01:53",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000016",
    "name": "Junaid",
    "date": "2026-08-25",
    "time": "18:03:06",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-25",
    "time": "18:03:09",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-25",
    "time": "18:04:28",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000016",
    "name": "Junaid",
    "date": "2026-08-25",
    "time": "18:04:30",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000016",
    "name": "Junaid",
    "date": "2026-08-25",
    "time": "18:48:42",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000017",
    "name": "Sir Saleem",
    "date": "2026-08-25",
    "time": "18:48:43",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000018",
    "name": "Visitor #18",
    "date": "2026-08-25",
    "time": "18:48:45",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000017",
    "name": "Sir Saleem",
    "date": "2026-08-25",
    "time": "19:22:18",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000018",
    "name": "Visitor #18",
    "date": "2026-08-25",
    "time": "19:35:56",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000019",
    "name": "Husnain Sarwar",
    "date": "2026-08-25",
    "time": "19:37:17",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000019",
    "name": "Husnain Sarwar",
    "date": "2026-08-25",
    "time": "19:38:41",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "date": "2026-08-25",
    "time": "19:48:56",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "date": "2026-08-25",
    "time": "19:49:23",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "date": "2026-08-25",
    "time": "19:50:24",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000021",
    "name": "SIr Imran",
    "date": "2026-08-25",
    "time": "20:14:13",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000018",
    "name": "Visitor #18",
    "date": "2026-08-29",
    "time": "17:03:21",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000017",
    "name": "Sir Saleem",
    "date": "2026-08-29",
    "time": "17:04:08",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:10:44",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:11:22",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000022",
    "name": "Sir Imran",
    "date": "2026-08-29",
    "time": "17:11:22",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000022",
    "name": "Sir Imran",
    "date": "2026-08-29",
    "time": "17:12:09",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:12:18",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000022",
    "name": "Sir Imran",
    "date": "2026-08-29",
    "time": "17:12:50",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:12:52",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:24:47",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:24:59",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000022",
    "name": "Sir Imran",
    "date": "2026-08-29",
    "time": "17:30:45",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "17:30:49",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000016",
    "name": "Junaid",
    "date": "2026-08-29",
    "time": "17:51:27",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "18:32:34",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "18:36:45",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000020",
    "name": "Ahmad bin saeed",
    "date": "2026-08-29",
    "time": "19:30:21",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000023",
    "name": "Visitor #23",
    "date": "2026-08-29",
    "time": "19:37:34",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "19:38:50",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "date": "2026-08-29",
    "time": "19:38:54",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-08-29",
    "time": "19:39:05",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000011",
    "name": "Ahmad Saeed",
    "date": "2026-08-29",
    "time": "19:39:32",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000019",
    "name": "Husnain Sarwar",
    "date": "2026-09-02",
    "time": "19:24:23",
    "camera_source": "rtsp",
    "camera_name": "Webcam"
  },
  {
    "person_id": "P-000010",
    "name": "Husnain",
    "date": "2026-09-02",
    "time": "23:15:48",
    "camera_source": "webcam",
    "camera_name": "Webcam"
  }
];
let PAYMENTS = [
  {
    "payment_id": "PAY-000001",
    "membership_id": "M-000004",
    "amount": 5000.0,
    "payment_status": "PAID",
    "payment_date": "2026-08-22",
    "payment_method": "CASH",
    "reference_id": "",
    "notes": "",
    "created_at": "2026-08-22T19:21:41.625697"
  },
  {
    "payment_id": "PAY-000002",
    "membership_id": "M-000004",
    "amount": 5000.0,
    "payment_status": "PAID",
    "payment_date": "2026-08-29",
    "payment_method": "CASH",
    "reference_id": "",
    "notes": "",
    "created_at": "2026-08-29T17:22:05.475992"
  },
  {
    "payment_id": "PAY-000003",
    "membership_id": "M-000004",
    "amount": 300.0,
    "payment_status": "PAID",
    "payment_date": "2026-08-29",
    "payment_method": "CASH",
    "reference_id": "",
    "notes": "",
    "created_at": "2026-08-29T17:22:14.802140"
  },
  {
    "payment_id": "PAY-000004",
    "membership_id": "M-000004",
    "amount": 300.0,
    "payment_status": "PAID",
    "payment_date": "2026-08-29",
    "payment_method": "CASH",
    "reference_id": "",
    "notes": "",
    "created_at": "2026-08-29T17:22:28.288519"
  }
];
let STANDARD_EXERCISES = [
  {
    "id": "std-1",
    "name": "Barbell Flat Bench Press",
    "category": "Chest",
    "equipment": "Barbell",
    "target": "Mid Chest",
    "default_sets": 4,
    "default_reps": "8-10"
  },
  {
    "id": "std-2",
    "name": "Incline Dumbbell Bench Press",
    "category": "Chest",
    "equipment": "Dumbbells",
    "target": "Upper Chest",
    "default_sets": 4,
    "default_reps": "10-12"
  },
  {
    "id": "std-3",
    "name": "Flat Dumbbell Press",
    "category": "Chest",
    "equipment": "Dumbbells",
    "target": "Mid Chest",
    "default_sets": 3,
    "default_reps": "10-12"
  },
  {
    "id": "std-7",
    "name": "Conventional Deadlift",
    "category": "Back",
    "equipment": "Barbell",
    "target": "Lower Back & Posterior Chain",
    "default_sets": 4,
    "default_reps": "5-8"
  },
  {
    "id": "std-8",
    "name": "Lat Pulldown (Wide Grip)",
    "category": "Back",
    "equipment": "Cable Machine",
    "target": "Lats Width",
    "default_sets": 4,
    "default_reps": "10-12"
  },
  {
    "id": "std-9",
    "name": "Seated Cable Row (Close Grip)",
    "category": "Back",
    "equipment": "Cable Machine",
    "target": "Mid Back & Rhomboids",
    "default_sets": 4,
    "default_reps": "10-12"
  },
  {
    "id": "std-11",
    "name": "Single-Arm Dumbbell Row",
    "category": "Back",
    "equipment": "Dumbbells",
    "target": "Lower Lats",
    "default_sets": 3,
    "default_reps": "10-12"
  },
  {
    "id": "std-13",
    "name": "Face Pulls",
    "category": "Back",
    "equipment": "Rope Cable",
    "target": "Rear Delts & Upper Back",
    "default_sets": 4,
    "default_reps": "15-20"
  },
  {
    "id": "std-14",
    "name": "Barbell Back Squats",
    "category": "Legs",
    "equipment": "Barbell",
    "target": "Quads & Glutes",
    "default_sets": 4,
    "default_reps": "8-10"
  },
  {
    "id": "std-15",
    "name": "Leg Press 45\u00b0",
    "category": "Legs",
    "equipment": "Machine",
    "target": "Quad Sweep",
    "default_sets": 4,
    "default_reps": "10-12"
  },
  {
    "id": "std-16",
    "name": "Romanian Deadlift (RDL)",
    "category": "Legs",
    "equipment": "Barbell / Dumbbell",
    "target": "Hamstrings & Glutes",
    "default_sets": 4,
    "default_reps": "10-12"
  },
  {
    "id": "std-17",
    "name": "Seated Leg Extension Machine",
    "category": "Legs",
    "equipment": "Machine",
    "target": "Quad Teardrop",
    "default_sets": 3,
    "default_reps": "12-15"
  },
  {
    "id": "std-20",
    "name": "Standing Calf Raises",
    "category": "Legs",
    "equipment": "Machine / Dumbbells",
    "target": "Gastrocnemius",
    "default_sets": 4,
    "default_reps": "15-20"
  },
  {
    "id": "std-23",
    "name": "Overhead Shoulder Press",
    "category": "Shoulders",
    "equipment": "Barbell",
    "target": "Anterior Delts & Strength",
    "default_sets": 4,
    "default_reps": "8-10"
  },
  {
    "id": "std-29",
    "name": "EZ-Bar Standing Bicep Curls",
    "category": "Arms",
    "equipment": "EZ Bar",
    "target": "Biceps Peak",
    "default_sets": 4,
    "default_reps": "10-12"
  },
  {
    "id": "std-31",
    "name": "Dumbbell Hammer Curls",
    "category": "Arms",
    "equipment": "Dumbbells",
    "target": "Brachialis & Forearms",
    "default_sets": 3,
    "default_reps": "12-15"
  },
  {
    "id": "std-36",
    "name": "Hanging Knee / Leg Raises",
    "category": "Core",
    "equipment": "Pull-up Bar",
    "target": "Lower Abs",
    "default_sets": 4,
    "default_reps": "15-20"
  }
];

export default function handler(req, res) {
  // Global CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-User-Role, X-User-Id'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = req.url || '';
  const method = req.method;

  // 1. Health Status
  if (url.includes('/status') && !url.includes('/camera/status') && !url.includes('/order')) {
    return res.status(200).json({
      status: 'online',
      camera: false,
      fps: 0,
      faces_detected: 0,
      active_tracks: 0,
      registered_people: REGISTERED_PEOPLE.length,
      service: 'Titan Gym Cloud API',
      mode: 'cloud_serverless',
      timestamp: new Date().toISOString()
    });
  }

  // 2. Camera Status & Controls
  if (url.includes('/camera/status')) {
    return res.status(200).json({
      source: 'webcam',
      name: 'Webcam',
      status: 'ready',
      rtsp_url: ''
    });
  }

  if (url.includes('/camera/source') || url.includes('/camera/start') || url.includes('/camera/stop') || url.includes('/register/')) {
    return res.status(200).json({
      success: true,
      message: 'Camera setting updated'
    });
  }

  // 3. State Endpoint (Real-time Live Polling)
  if (url.includes('/state')) {
    return res.status(200).json({
      camera: false,
      fps: 0,
      faces_detected: 0,
      active_tracks: 0,
      registered_people: REGISTERED_PEOPLE.length,
      people: [],
      active_alerts: [],
      door_status: {
        open: false,
        status: 'SECURED',
        badge: '🔒 DOOR SECURED',
        message: 'Smart Access Control Ready'
      }
    });
  }

  // 4. Analytics Dashboard
  if (url.includes('/analytics/dashboard') || url === '/api/analytics') {
    return res.status(200).json({
      monthly_revenue: [
        { month: '2026-04', label: 'Apr 2026', revenue: 120000, transactions: 24 },
        { month: '2026-05', label: 'May 2026', revenue: 145000, transactions: 29 },
        { month: '2026-06', label: 'Jun 2026', revenue: 160000, transactions: 32 },
        { month: '2026-07', label: 'Jul 2026', revenue: 185000, transactions: 37 },
        { month: '2026-08', label: 'Aug 2026', revenue: 210000, transactions: 42 },
        { month: '2026-09', label: 'Sep 2026', revenue: 235000, transactions: 48 }
      ],
      hourly_rush: [
        { hour: 6, label: '06:00 AM', count: 8, intensity: 'light' },
        { hour: 8, label: '08:00 AM', count: 18, intensity: 'moderate' },
        { hour: 10, label: '10:00 AM', count: 12, intensity: 'light' },
        { hour: 12, label: '12:00 PM', count: 9, intensity: 'light' },
        { hour: 14, label: '02:00 PM', count: 6, intensity: 'light' },
        { hour: 16, label: '04:00 PM', count: 15, intensity: 'moderate' },
        { hour: 18, label: '06:00 PM', count: 35, intensity: 'peak' },
        { hour: 20, label: '08:00 PM', count: 42, intensity: 'peak' },
        { hour: 22, label: '10:00 PM', count: 14, intensity: 'moderate' }
      ],
      kpis: {
        this_month_revenue: 235000,
        growth_percentage: 12,
        peak_rush_window: '6:00 PM - 9:00 PM',
        total_lifetime_revenue: 1055000,
        busiest_hour: '8:00 PM'
      }
    });
  }

  // 5. Authentication
  if (url.includes('/auth/login') || url === '/api/login') {
    if (method === 'POST') {
      const { username, password } = req.body || {};
      const cleanUser = (username || '').trim().toLowerCase();

      // Check Staff
      const found = USERS_STORE.find(u => (u.username || '').toLowerCase() === cleanUser);
      if (found) {
        if (found.password === (password || '').trim()) {
          return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token: `token-${found.user_id || found.id || 'USR'}-cloud`,
            user: found
          });
        } else {
          return res.status(401).json({ detail: 'Invalid username or password' });
        }
      }

      // Check Member login
      const matchedMember = REGISTERED_PEOPLE.find(p => (p.name || '').toLowerCase() === cleanUser || (p.id || '').toLowerCase() === cleanUser);
      return res.status(200).json({
        status: 'success',
        message: 'Member Login successful',
        token: `token-MEM-${cleanUser}`,
        user: {
          user_id: matchedMember ? matchedMember.id : cleanUser.toUpperCase(),
          username: cleanUser,
          name: matchedMember ? matchedMember.name : `Member ${cleanUser.toUpperCase()}`,
          role: 'MEMBER'
        }
      });
    }
  }

  // 6. Staff & Roles Management
  if (url.includes('/auth/users') || url.includes('/staff')) {
    if (method === 'POST') {
      const newUser = {
        user_id: `USR-${Date.now()}`,
        ...(req.body || {}),
        is_active: true
      };
      USERS_STORE.push(newUser);
      return res.status(201).json({ status: 'success', user: newUser });
    }
    if (method === 'DELETE') {
      const parts = url.split('/');
      const delId = parts[parts.length - 1];
      USERS_STORE = USERS_STORE.filter(u => u.user_id !== delId && u.id !== delId);
      return res.status(200).json({ status: 'success', message: 'Staff user deleted' });
    }
    return res.status(200).json({ status: 'success', users: USERS_STORE });
  }

  // 7. Cafe Products, Orders & POS Management
  if (url.includes('/cafe/products')) {
    if (method === 'POST') {
      const body = req.body || {};
      const newProd = {
        id: `PROD-${Date.now().toString().slice(-4)}`,
        name: body.name || 'New Cafe Item',
        category: body.category || 'SHAKES',
        price: Number(body.price || 350),
        cost_price: Number(body.cost_price || 200),
        calories: Number(body.calories || 200),
        protein_g: Number(body.protein_g || 25),
        stock: Number(body.stock || 20),
        min_stock_alert: Number(body.min_stock_alert || 5),
        description: body.description || '',
        customizable: !!body.customizable,
        is_active: true
      };
      CAFE_PRODUCTS_STORE.unshift(newProd);
      return res.status(201).json({ status: 'success', product: newProd, products: CAFE_PRODUCTS_STORE });
    }
    if (method === 'PUT') {
      const parts = url.split('/');
      const prodId = parts[parts.length - 1];
      const body = req.body || {};
      CAFE_PRODUCTS_STORE = CAFE_PRODUCTS_STORE.map(p => p.id === prodId ? { ...p, ...body } : p);
      return res.status(200).json({ status: 'success', products: CAFE_PRODUCTS_STORE });
    }
    if (method === 'DELETE') {
      const parts = url.split('/');
      const prodId = parts[parts.length - 1];
      CAFE_PRODUCTS_STORE = CAFE_PRODUCTS_STORE.filter(p => p.id !== prodId);
      return res.status(200).json({ status: 'success', message: 'Product deleted', products: CAFE_PRODUCTS_STORE });
    }
    return res.status(200).json({ status: 'success', count: CAFE_PRODUCTS_STORE.length, products: CAFE_PRODUCTS_STORE });
  }

  if (url.includes('/cafe/orders')) {
    if (method === 'POST') {
      const body = req.body || {};
      const newOrder = {
        id: `ord-${Date.now()}`,
        ...body,
        order_status: body.order_status || 'PENDING',
        payment_status: body.payment_status || 'PAID',
        created_at: new Date().toISOString()
      };
      CAFE_ORDERS_STORE.unshift(newOrder);
      return res.status(201).json({ status: 'success', order: newOrder, orders: CAFE_ORDERS_STORE });
    }
    return res.status(200).json({ status: 'success', count: CAFE_ORDERS_STORE.length, orders: CAFE_ORDERS_STORE });
  }

  if (url.includes('/cafe/analytics')) {
    return res.status(200).json({
      total_revenue: 45600,
      total_orders: CAFE_ORDERS_STORE.length || 15,
      top_products: [
        { name: 'Double Whey Isolate Shake', sold: 45, revenue: 20250 },
        { name: 'C4 Pre-Workout Blast', sold: 30, revenue: 7500 },
        { name: 'Chocolate Chip Protein Bar', sold: 25, revenue: 8000 }
      ]
    });
  }

  // 8. Workout Templates & Exercises
  if (url.includes('/workout/templates')) {
    const parts = url.split('/');
    const memId = parts[parts.length - 1];
    
    if (method === 'POST') {
      const body = req.body || {};
      const newTpl = {
        id: `tpl-${Date.now().toString(16)}`,
        name: body.name || 'New Routine',
        description: body.description || '',
        target_muscle: body.target_muscle || 'General',
        icon: body.icon || '⚡',
        exercises: body.exercises || [],
        created_at: new Date().toISOString()
      };
      DEFAULT_TEMPLATES.push(newTpl);
      return res.status(201).json({ status: 'success', template: newTpl, templates: DEFAULT_TEMPLATES });
    }

    if (method === 'DELETE') {
      const delTplId = parts[parts.length - 1];
      DEFAULT_TEMPLATES = DEFAULT_TEMPLATES.filter(t => t.id !== delTplId);
      return res.status(200).json({ status: 'success', message: 'Template deleted', templates: DEFAULT_TEMPLATES });
    }

    // Check member-specific templates or fallback to default full templates list
    let templatesList = DEFAULT_TEMPLATES;
    if (memId && WORKOUT_TEMPLATES_STORE[memId]) {
      templatesList = WORKOUT_TEMPLATES_STORE[memId];
    }
    return res.status(200).json({
      status: 'success',
      count: templatesList.length,
      templates: templatesList
    });
  }

  if (url.includes('/workout/exercises')) {
    return res.status(200).json({
      status: 'success',
      count: STANDARD_EXERCISES.length,
      exercises: STANDARD_EXERCISES
    });
  }

  if (url.includes('/workout/logs') || url.includes('/workout/admin/all-logs')) {
    if (method === 'POST') {
      const body = req.body || {};
      const newLog = {
        id: `log-${Date.now()}`,
        ...body,
        created_at: new Date().toISOString()
      };
      WORKOUT_LOGS_STORE.unshift(newLog);
      return res.status(201).json({ status: 'success', log: newLog, logs: WORKOUT_LOGS_STORE });
    }
    return res.status(200).json({
      status: 'success',
      count: WORKOUT_LOGS_STORE.length,
      logs: WORKOUT_LOGS_STORE
    });
  }

  if (url.includes('/workout/dashboard')) {
    return res.status(200).json({
      total_workouts: 14,
      streak_days: 5,
      calories_burned: 5400,
      favorite_exercise: 'Barbell Flat Bench Press'
    });
  }

  // 9. Memberships & Plans
  if (url.includes('/memberships/plans') || url.includes('/membership_plans')) {
    return res.status(200).json(MEMBERSHIP_PLANS.length ? MEMBERSHIP_PLANS : [
      { plan_id: 'daily', name: 'Daily Pass', duration: 1, duration_unit: 'day', price: 300 },
      { plan_id: 'weekly', name: 'Weekly Pass', duration: 7, duration_unit: 'day', price: 1500 },
      { plan_id: 'monthly', name: 'Monthly Standard', duration: 1, duration_unit: 'month', price: 5000 },
      { plan_id: '3months', name: '3 Months (Quarterly)', duration: 3, duration_unit: 'month', price: 13500 },
      { plan_id: '6months', name: '6 Months (Half-Yearly)', duration: 6, duration_unit: 'month', price: 25000 },
      { plan_id: 'yearly', name: '1 Year VIP Annual', duration: 1, duration_unit: 'year', price: 45000 }
    ]);
  }

  if (url.includes('/memberships/summary')) {
    return res.status(200).json({
      total_memberships: MEMBERSHIPS.length,
      active_memberships: MEMBERSHIPS.filter(m => m.status === 'ACTIVE').length,
      expiring_soon: 1,
      expired_memberships: 0,
      total_revenue: 15000
    });
  }

  if (url.includes('/memberships/payments')) {
    return res.status(200).json(PAYMENTS);
  }

  if (url.includes('/memberships')) {
    return res.status(200).json(MEMBERSHIPS);
  }

  // 10. People / Members Directory
  if (url.includes('/people')) {
    if (url.includes('/profile') || url.includes('/face-samples')) {
      return res.status(200).json([]);
    }
    return res.status(200).json(REGISTERED_PEOPLE);
  }

  // 11. Attendance & Visits
  if (url.includes('/attendance')) {
    if (url.includes('/today')) {
      return res.status(200).json(ATTENDANCE.slice(-10).reverse());
    }
    return res.status(200).json(ATTENDANCE);
  }

  if (url.includes('/visits')) {
    if (url.includes('/today')) {
      return res.status(200).json(VISITS.slice(-10).reverse());
    }
    return res.status(200).json(VISITS);
  }

  // 12. Activity Logs
  if (url.includes('/activity') || url.includes('/events')) {
    return res.status(200).json([
      { id: 1, action: 'User Login', user: 'admin', timestamp: new Date().toISOString(), details: 'Admin logged in' },
      { id: 2, action: 'Face Verified', user: 'Husnain', timestamp: new Date().toISOString(), details: 'Door Unlocked' },
      { id: 3, action: 'Cafe Item Sold', user: 'Ahsan', timestamp: new Date().toISOString(), details: 'Double Whey Isolate Shake' }
    ]);
  }

  // Default fallback response
  return res.status(200).json({ status: 'online', path: url });
}
