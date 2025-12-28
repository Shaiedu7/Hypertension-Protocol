# 🏥 RWJ Protocol App - Complete Deep Dive

## PART 1: What the App Does (High-Level Purpose)

This is a **real-time emergency response coordination app** designed to manage severe hypertension (dangerously high blood pressure) in pregnant and postpartum patients at RWJBarnabas hospitals. It's a collaborative tool that guides multiple healthcare professionals through a standardized protocol to rapidly treat life-threatening high blood pressure.

**Why it matters:** Severe hypertension in pregnancy can lead to eclampsia (seizures) and other serious complications. This app ensures every hospital location follows the same evidence-based treatment pathway and keeps all staff coordinated in real-time.

---

## PART 2: The Protocol Explained (For Non-Medical Understanding)

### What is "Severe Hypertension"?
- Normal blood pressure: ~120/80 mmHg
- **Severe hypertension threshold: ≥160/110 mmHg** (systolic ≥160 OR diastolic ≥110)
- Think of it like: Your heart is pumping with too much force, which can damage blood vessels and organs

### The Three Medications (Simple Explanation)

#### 1. **Labetalol** (IV injection)
   - Works like: "Applies brakes" to the heart's force
   - **⚠️ Risk:** Can trigger asthma attacks
   - Fastest: starts working in 2-5 minutes

#### 2. **Hydralazine** (IV injection)
   - Works like: "Widens blood vessels" so blood flows easier
   - Slowest to work: 5-20 minutes
   - Good backup option

#### 3. **Nifedipine** (Oral pill)
   - Works like: "Relaxes blood vessel muscles"
   - Slowest to start: 5-20 minutes
   - Only option taken by mouth (easier to give)

### The Target Goal
Get blood pressure down to **130-150 / 80-100 mmHg** (controlled but not dangerously low)

---

## PART 3: The Workflow - The Complete Journey

```
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
```

---

## PART 4: Role-Specific Views & Responsibilities

### 👩‍⚕️ NURSE (Bedside Care Provider)
**Screen: Nurse Dashboard + BP Entry Screen**

#### Primary Tasks:
1. ✅ Record blood pressure readings
2. ✅ Complete positioning checklist
3. ✅ Administer medications ordered by resident
4. ✅ Watch timers and recheck BP when timer expires
5. ✅ Document patient positioning quality

#### What They See:
- Large numeric keypad for BP entry (easy to use with gloves)
- Positioning checklist (back supported, arm position, etc.)
- Active timer countdown on screen
- List of pending medications to administer
- All previous BP readings timeline
- Patient room number / identifier

#### Key Interactions:
```
→ [Measure BP] → Enter Systolic/Diastolic
→ [Positioning Checklist] ✓✓✓ (click each box)
→ [Submit BP Reading]
→ [App shows timer or next action]
→ [Wait] → Timer countdown visible
→ [Administer Medication] when ordered appears
→ [Mark as Administered] → Submit
→ [Wait] for new timer → [Recheck BP]
→ Repeat until controlled or escalated
```

---

### 👨‍⚕️ RESIDENT (Treatment Decision Maker)
**Screen: Resident Dashboard + Algorithm Selection + Protocol Tracker**

#### Primary Tasks:
1. ✅ Receive emergency notifications
2. ✅ Review patient history and contraindications
3. ✅ Select treatment algorithm (Labetalol/Hydralazine/Nifedipine)
4. ✅ Order each medication dose in sequence
5. ✅ Monitor protocol progress
6. ✅ Escalate if algorithm fails

#### What They See:
- Dashboard: List of all active emergencies (sorted by urgency)
- Algorithm selection: 3 buttons with descriptions and warnings
- Protocol tracker: Current step, what dose to order next, BP history
- Real-time timer countdowns
- All BP readings from all nurses viewing same patient
- Asthma warning if applicable

#### Key Interactions:
```
→ [See Emergency Alert on Dashboard]
→ [Tap to view patient details]
→ [Algorithm Selection Screen]
→ [Choose: Labetalol / Hydralazine / Nifedipine]
→ [See protocol step 1 with dose]
→ [Order Medication] → "Labetalol 20mg IV"
→ [Watch] timer while nurse administers
→ [See BP recheck result after timer expires]
→ IF controlled: [Resolve Case]
→ IF still high: [Order next dose] (Steps 2, 3, etc.)
→ IF all doses given, still high: [Escalate Case]
```

---

### 🏥 CHARGE NURSE (Resource Coordinator)
**Screen: Charge Nurse Dashboard**

#### Primary Tasks:
1. ✅ Monitor ALL active emergencies hospital-wide
2. ✅ Allocate nursing staff to emergencies
3. ✅ Coordinate resource availability
4. ✅ Track "time to next action" for each case

#### What They See:
- All active emergency cases sorted by urgency
- Time remaining until next BP check needed
- Which resources are deployed
- Alert summary (number of critical alerts active)
- Estimated workload

#### Urgency Ranking:
1. 🚨 Escalated cases (algorithm failed) = HIGHEST
2. 🔴 Critical timers expiring soon (< 3 minutes)
3. 🔴 Active emergencies with high BP
4. 🟡 First high BP waiting for confirmation

---

### 👨‍⚕️ ATTENDING PHYSICIAN (Escalation Management)
**Screen: Attending Dashboard + STAT Request Details**

#### Primary Tasks:
1. ✅ Receive STAT alerts for escalated cases
2. ✅ Review algorithm failure details
3. ✅ Order specialist consults
4. ✅ Approve continuous IV infusion or transfer

#### What They See:
- All active escalated cases (TOP PRIORITY)
- Which algorithm failed and why
- Complete BP history
- All medications already given
- Current patient status
- Option to mark case as "Acknowledged"

#### STAT Alert Triggers:
- Maximum doses given with BP still ≥160/110
- Requires immediate specialist evaluation
- Cannot dismiss without acknowledging

---

## PART 5: Data Architecture & Real-Time Sync

### Database Tables
```
┌──────────────────────────────────────────────────┐
│                  PATIENT                           │
│  id, room_number, has_asthma, current_session_id  │
└──────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    ┌──────────┐  ┌──────────────┐  ┌──────────┐
    │ BP_READINGS  │ EMERGENCY_SESSIONS  │ MEDICATIONS │
    │ (readings)   │ (sessions)         │ (doses)   │
    └──────────┘  └──────────────┘  └──────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                ┌──────────────┐
                │  TIMERS       │
                │ (countdowns)  │
                └──────────────┘
                        │
                        ▼
                ┌──────────────┐
                │ NOTIFICATIONS │
                │  (alerts)    │
                └──────────────┘
```

### Real-Time Sync Features
All users viewing the **same patient** see:
- ✅ BP readings appear instantly (within seconds of nurse entry)
- ✅ Timer countdowns synchronized across devices
- ✅ Medication orders update immediately
- ✅ Session status changes propagate in real-time
- ✅ No page refresh needed

**Technology:** Supabase Realtime subscriptions (WebSockets)

---

## PART 6: Key Business Rules & Logic

### Rule 1: BP Thresholds
```
Systolic ≥ 160  OR  Diastolic ≥ 110  =  EMERGENCY
Systolic 130-150  AND  Diastolic 80-100  =  CONTROLLED
```

### Rule 2: Timing Requirements
```
First high BP found → 15 minutes → Recheck
Labetalol administered → 10 minutes → Recheck
Hydralazine/Nifedipine → 20 minutes → Recheck
30-60 minutes total → Medication must be given by this time
```

### Rule 3: Medication Sequencing
```
Labetalol path:     20mg → 40mg → 80mg → (if failed: Hydralazine)
Hydralazine path:   5-10mg → 10mg → (if failed: switch to Labetalol)
Nifedipine path:    10mg → 20mg → 20mg → (if failed: switch to Labetalol)
```

### Rule 4: Asthma Contraindication
```
IF patient.has_asthma AND algorithm = "labetalol"
  → ⚠️ WARNING displayed to resident
  → Resident can override with acknowledgment
```

### Rule 5: Escalation Trigger
```
IF (max_doses_given AND bp_still_≥160/110) OR escalated_flag_set
  → STAT alert to Attending + Specialists
  → All staff notified
  → Case locked to specialist care
```

### Rule 6: Session Resolution
```
IF latest_bp = 130-150 / 80-100
  → Mark session as "RESOLVED"
  → Stop sending alerts
  → Continue monitoring
```

---

## PART 7: Notification System (Alert Priorities)

| **Level** | **Sound** | **Use Case** | **Recipients** | **Behavior** |
|-----------|-----------|-------------|----------------|-------------|
| **Silent** | None | First high BP reading | Nurse only | Appears in-app, no sound |
| **Info** | Silent | Medication ordered/given | Specific role | Shows in notification center |
| **Warning** | Single alert | Asthma + Labetalol | Resident | Attention-getting |
| **Critical** | Persistent | Confirmed emergency, Timer expired | Nurse + Resident + Charge Nurse | Loud/vibration, requires acknowledgment |
| **STAT** | Max alert | Algorithm failure | Attending + Specialists | Loudest possible, keeps alerting until acknowledged |

---

## PART 8: Workflow Engine (The Brain)

The **WorkflowEngine** is a state machine that determines:
1. **Current stage** (observation → first_high_bp → confirmed_emergency → treatment → escalated/resolved)
2. **Next action** (what the next person should do)
3. **Can proceed?** (is it time to proceed or should we wait?)
4. **Warnings** (asthma, escalation needed?)

```typescript
// Example: WorkflowEngine logic
if (no BP readings) {
  stage = "observation"
  nextAction = "Record initial BP"
}
else if (first high BP AND < 15 min elapsed) {
  stage = "first_high_bp"
  nextAction = "Wait 15 min and recheck"
}
else if (second high BP) {
  stage = "confirmed_emergency"
  nextAction = "Resident: Select algorithm"
}
// ... continues for treatment, escalation, resolution
```

---

## PART 9: Offline Support

**If internet drops:**
- ✅ Nurses can still record BP readings
- ✅ Medications can still be marked as administered
- ✅ All actions queue locally

**When internet returns:**
- ✅ All queued actions sync automatically
- ✅ Retries up to 3 times if sync fails
- ✅ Failed syncs logged for review

---

## PART 10: Security & HIPAA Compliance

**Patient Privacy:**
- ❌ NO patient names stored in app
- ✅ Only anonymous identifiers (e.g., "ANON-001") + room number
- ✅ All data encrypted in transit and at rest

**Access Control:**
- ✅ Row-Level Security (RLS) on all database tables
- ✅ Nurses can only see their own BP entries
- ✅ Residents can only see active emergencies
- ✅ Attending only sees escalated cases

**Audit Trail:**
- ✅ Every action logged (who did what, when)
- ✅ Timestamp recorded for all entries
- ✅ Completely traceable for legal/compliance

---

## PART 11: App Navigation Structure

```
Login Screen
    │
    ├─→ Nurse Role
    │   ├─→ Nurse Dashboard (patient list, active emergency view)
    │   └─→ BP Entry Screen (keypad + checklist)
    │
    ├─→ Resident Role
    │   ├─→ Resident Dashboard (all active emergencies)
    │   ├─→ Algorithm Selection Screen
    │   └─→ Protocol Tracker (steps, timer, next actions)
    │
    ├─→ Attending Role
    │   └─→ Attending Dashboard (escalated cases, STAT alerts)
    │
    └─→ Charge Nurse Role
        └─→ Charge Nurse Dashboard (all cases, urgency ranking)
```

---

## PART 12: A Real Example Scenario

**2:30 PM - Patient in Room 401, 34 weeks pregnant**

```
2:30 PM - NURSE measures BP: 165/112
         App: "First high BP! Complete checklist."
         Nurse ✓ positions correctly, starts 15-min SILENT timer

2:45 PM - Timer expires (no alert)
         Nurse checks BP again: 164/115
         App: 🚨 EMERGENCY CONFIRMED
         Nurse + Resident get CRITICAL alert + sound
         Charge Nurse notified

2:46 PM - RESIDENT gets alert, reviews case
         Sees: "Room 401, Patient has asthma"
         Chooses: Hydralazine (safer for asthma than Labetalol)
         Orders: "Hydralazine 5-10mg IV"

2:47 PM - NURSE gets alert: "Medication ordered"
         Administers IV Hydralazine injection
         Marks "Administered"
         App starts 20-minute timer

3:07 PM - Timer expires 🚨 CRITICAL ALERT
         Nurse checks BP: 155/105 (better, but still high)
         Resident orders: "Hydralazine 10mg IV" (Step 2)

3:27 PM - Timer expires
         Nurse checks BP: 142/88 ✅ CONTROLLED
         App: "Session Resolved"
         Resident marks case complete
         Case moved to "Monitoring" status
         All alerts stop, staff can reassign

Result: Emergency managed, protocol followed, patient safe
```

---

## PART 13: Implementation Status

### ✅ Completed:
- Authentication system (login, role-based access)
- Database schema (all tables)
- Type definitions
- Core services (database, timer, notifications, workflow engine)
- Nurse Dashboard (patient list, BP entry)
- Real-time subscriptions (Supabase)
- Offline queuing

### 🚧 In Progress/Planned:
- Resident screens (algorithm selection, protocol tracker)
- Attending escalation dashboard
- Charge Nurse resource view
- Visual timer displays
- Push notifications (native mobile alerts)
- Analytics/reporting

---

## Summary

This app is essentially a **real-time protocol execution engine** that:
1. **Detects** when a patient needs emergency hypertension treatment
2. **Guides** residents through medication selection
3. **Coordinates** nurses and residents in real-time
4. **Tracks** timing and escalates automatically
5. **Notifies** all staff instantly

It transforms a complex, time-critical medical protocol into a **structured, synchronized workflow** where every role knows exactly what to do next, and critical timing is never missed.
