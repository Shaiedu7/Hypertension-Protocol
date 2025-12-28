# App Architecture Documentation

## 🏗️ How the App Works

This app implements the RWJBarnabas Hypertension Protocol with real-time collaboration between multiple healthcare roles.

## 📊 Data Flow Architecture

### 1. **State Management**
- **AuthContext**: User authentication and role management
- **EmergencySessionContext**: Real-time emergency session state with Supabase subscriptions

### 2. **Service Layer**
- **WorkflowEngine**: Protocol logic and state machine
- **TimerService**: Countdown timers for BP checks and medication waits
- **DatabaseService**: CRUD operations for all tables
- **NotificationDispatcher**: Event-driven notification system
- **OfflineSyncService**: Queue and sync actions when offline

### 3. **Real-time Collaboration**
All users viewing the same patient see synchronized data via Supabase Realtime:
- BP readings appear instantly for all roles
- Timer countdowns sync across devices
- Medication orders update in real-time
- Session status changes propagate immediately

## 🔄 Protocol Workflow

### Stage 1: First High BP (≥160/110)
**Nurse Action:**
1. Enter BP reading
2. App detects high reading
3. Positioning checklist appears
4. 15-minute timer starts (silent)

**System Actions:**
- Creates timer in database
- Workflow state: `first_high_bp`
- Next action: "Wait 15 min and recheck"

### Stage 2: Confirmed Emergency (2nd High BP)
**Nurse Action:**
1. Takes 2nd BP reading after 15 minutes
2. If still ≥160/110, emergency confirmed

**System Actions:**
- Sends CRITICAL alert to Nurse + Resident
- Push notification + in-app alert
- Workflow state: `confirmed_emergency`
- Next action: "Select treatment algorithm"

### Stage 3: Algorithm Selection
**Resident Action:**
1. Reviews patient data
2. Checks for asthma (contraindication for Labetalol)
3. Selects algorithm (Labetalol/Hydralazine/Nifedipine)

**System Actions:**
- Updates emergency session with algorithm
- Displays protocol steps
- Shows asthma warning if applicable
- Workflow state: `treatment`

### Stage 4: Treatment Progression
**Resident Action:**
1. Reviews current step
2. Orders medication dose (e.g., "Labetalol 20mg")

**Nurse Action:**
1. Receives notification "Medication ordered"
2. Administers dose
3. Marks as administered in app

**System Actions:**
- Creates medication wait timer (10/20 min depending on drug)
- Displays countdown to all users viewing patient
- Next action: "Wait X minutes, then check BP"

### Stage 5: BP Recheck Cycle
**Nurse Action:**
1. Timer expires → CRITICAL alert
2. Takes BP reading

**System Actions:**
- If BP still high: Proceed to next dose (Step 2, 3, etc.)
- If BP controlled (130-150 / 80-100): Session resolved
- If max doses reached without control: ESCALATE

### Stage 6: Escalation (Algorithm Failure)
**Trigger:** 3 doses administered, BP still ≥160/110

**System Actions:**
- Sends STAT alert to Attending + Specialists
- Notification: "Algorithm failure - specialist required"
- Session status: `escalated`
- Workflow state: `escalated`

## 🔔 Notification Priority Levels

| Priority | Use Case | Sound/Vibration | Recipients |
|----------|----------|-----------------|------------|
| **Silent** | First high BP | None | Nurse only |
| **Info** | Medication ordered/administered | Silent | Specific role |
| **Warning** | Asthma contraindication | Single alert | Resident |
| **Critical** | Confirmed emergency, Timer expired | Persistent until acknowledged | Nurse + Resident + Charge Nurse |
| **STAT** | Algorithm failure | Maximum alert | Attending + Specialists |

## 🧩 Role-Specific Views

### Nurse View
**Focus:** Direct patient care
- Large BP entry keypad
- Positioning checklist
- Active timer countdown
- "Administer medication" button
- Patient vitals history

### Resident View
**Focus:** Treatment decisions
- Algorithm selection buttons
- Current protocol step display
- "Approve dose" buttons
- Multiple patient overview
- Real-time BP trends

### Attending/Specialist View
**Focus:** Escalation management
- Floor map of all active emergencies
- STAT request details
- Algorithm failure alerts
- Multi-patient triage

### Charge Nurse View
**Focus:** Resource coordination
- All active cases sorted by urgency
- "Time to next action" for each patient
- Staffing assignments
- Resource allocation

## 🔐 Data Security

### HIPAA Compliance
- Row Level Security (RLS) on all tables
- Anonymous patient identifiers
- Audit trail for all actions
- Encrypted data at rest and in transit

### Role-Based Access Control
```sql
-- Example RLS policy
CREATE POLICY "Nurses can insert BP readings"
ON bp_readings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'nurse'
  )
);
```

## 📱 Offline Support

### Queued Actions
When offline, the app queues:
- BP readings
- Medication administrations
- Session updates

### Auto-Sync
When connection restored:
- Queued actions sync automatically
- Retries up to 3 times
- Failed actions logged for review

## 🚀 Next Implementation Steps

### Phase 1: Nurse Interface (Priority)
- [ ] BP entry component with numeric keypad
- [ ] Positioning checklist component
- [ ] Timer display with countdown
- [ ] Medication administration toggle
- [ ] Patient list view

### Phase 2: Resident Interface
- [ ] Algorithm selection screen
- [ ] Protocol step tracker
- [ ] Dose approval buttons
- [ ] Patient detail view
- [ ] Active cases dashboard

### Phase 3: Real-time Features
- [ ] Test Supabase Realtime subscriptions
- [ ] Timer synchronization
- [ ] Push notification handling
- [ ] Edge function for STAT alerts

### Phase 4: Attending & Charge Nurse Views
- [ ] Floor map visualization
- [ ] Multi-patient triage list
- [ ] Staffing dashboard
- [ ] STAT request management

### Phase 5: Testing & Refinement
- [ ] End-to-end protocol testing
- [ ] Multi-device synchronization testing
- [ ] Offline sync testing
- [ ] Notification delivery testing
- [ ] Performance optimization

---

**The foundation is complete. All core services are implemented and ready for UI development.**
