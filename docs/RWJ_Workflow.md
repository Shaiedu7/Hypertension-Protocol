┌─────────────────────────────────────────────────────────────────┐
│                    EMERGENCY WORKFLOW                             │
└─────────────────────────────────────────────────────────────────┘

STAGE 1: First High Reading (🟡 Yellow Alert)
─────────────────────────────────────────
Nurse measures BP → Systolic ≥160 OR Diastolic ≥110
    ↓
Nurse completes POSITIONING CHECKLIST:
    ✓ Patient back supported
    ✓ Feet flat on floor (or legs supported)
    ✓ Upper arm at heart level
    ✓ Correct blood pressure cuff size
    ✓ Patient calm (no recent nicotine/pain)
    ↓
App starts SILENT 15-minute timer
    ↓
App state: "first_high_bp"
Next action: "Wait 15 minutes and recheck"


STAGE 2: Confirmed Emergency (🔴 RED CRITICAL ALERT)
──────────────────────────────────────
After 15 minutes → Nurse takes 2nd BP reading
    ↓
IF 2nd reading is ALSO ≥160/110:
    ↓
    🚨 EMERGENCY CONFIRMED
    
    App sends CRITICAL NOTIFICATION:
    • Nurse + Resident get persistent alert + sound
    • Charge Nurse notified for resource coordination
    • 30-60 minute DEADLINE timer begins
    ↓
App state: "confirmed_emergency"
Next action: "Resident: Select treatment algorithm"


STAGE 3: Algorithm Selection (Resident Decision)
──────────────────────────────────────
Resident reviews patient and selects ONE of:
    ① Labetalol (fastest but risky with asthma)
    ② Hydralazine (slower but safer)
    ③ Nifedipine (slowest, only oral option)
    ↓
IF patient has asthma + Labetalol selected:
    ⚠️ WARNING ALERT: "Caution: Asthma risk with Labetalol"
    ↓
App displays the PROTOCOL STEPS for selected algorithm:
    Example for Labetalol:
    Step 1: Give 20mg → Wait 10 min → Check BP
    Step 2: Give 40mg → Wait 10 min → Check BP
    Step 3: Give 80mg → Wait 10 min → Check BP
    (Max 3 doses before escalation)
    ↓
App state: "treatment"
Next action: "Resident: Order Step 1 medication"


STAGE 4: Medication Cycle (Resident Orders → Nurse Administers)
──────────────────────────────────────────────────────────
RESIDENT SIDE:
    • Resident orders next dose (e.g., "Labetalol 20mg IV")
    • Notation added to emergency session
    • Medication recorded in database
    
NURSE SIDE:
    • Gets notification: "Medication Ordered: Labetalol 20mg"
    • Administers the injection/pill
    • Marks as "Administered" in app
    
SYSTEM SIDE:
    • App creates MEDICATION WAIT TIMER
      (10 mins for Labetalol, 20 mins for Hydralazine/Nifedipine)
    • Timer displays to all users viewing patient
    • Countdown shown on nurse/resident screens
    
NEXT ACTION: "Wait, then recheck BP"


STAGE 5: Results Check & Cycle Repeat
──────────────────────────────────────
Timer expires → 🚨 CRITICAL ALERT to Nurse
    ↓
Nurse takes BP reading
    ↓
    CASE 1: BP Now Controlled (130-150 / 80-100)
    └─→ 🎉 Session marked "RESOLVED"
        └─→ Continue monitoring, document outcome
    
    CASE 2: BP Still High (≥160/110)
    └─→ Go to NEXT STEP in algorithm
        └─→ Back to Stage 4 (order next dose, wait, recheck)
    
    CASE 3: No More Doses Available (Escalation Needed)
    └─→ Go to Stage 6 (ESCALATION)


STAGE 6: Escalation (Algorithm Failure)
──────────────────────────────────────
Trigger: 3 doses of medication given, BP still ≥160/110
    ↓
    🚨 STAT ALERT (Maximum priority notification)
    
    Recipients: 
    • Attending physician
    • Maternal-Fetal Medicine specialist
    • Internal Medicine specialist
    • Anesthesia or Critical Care specialist
    
Message: "Algorithm failure - Specialist intervention required"
    ↓
App state: "escalated"
Next action: "Await specialist evaluation and IV infusion"

All staff see case flagged as ESCALATED
Case transferred to specialist care