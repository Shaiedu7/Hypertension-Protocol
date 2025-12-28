# Implementation Decisions

## Decision Log for OB-Hypertension Protocol App

### Decision 1: Escalation Handling (Algorithm Failure)
**Date:** December 25, 2025  
**Decision:** Option C - Both automatic escalation AND manual override

**Implementation:**
- When max doses reached without BP control, system automatically:
  - Triggers STAT alert to attending + specialists via `NotificationDispatcher.notifyAlgorithmFailure()`
  - Updates session status to 'escalated'
  - Displays prominent alert on all devices viewing patient
- Resident also has manual "Escalate Case" button for early escalation if needed
- Attending receives STAT request screen with full case details

**Rationale:**
- Safety: Automatic escalation ensures no case falls through cracks
- Flexibility: Manual option allows resident to escalate before max doses if clinically warranted
- Compliance: Matches protocol requirement for STAT consultation after algorithm failure

**To Change:** Modify `WorkflowEngine.getWorkflowState()` escalation logic and remove manual button if automatic-only desired.

---

### Decision 2: Multi-Patient Views Layout
**Date:** December 25, 2025  
**Decision:** Hybrid approach

**Implementation:**
- **Charge Nurse Dashboard:** Shows all active cases in triage list at top (Option B)
  - Sorted by "Time to Next Action"
  - Full floor overview
  - Resource allocation tools
- **Nurse View:** Scroll down to see personal patient list (Option A)
  - Top section: Active emergency if assigned
  - Bottom section: All assigned patients
  - Single-screen experience

**Rationale:**
- Charge Nurse needs system-wide view for coordination
- Individual nurses need focused view of their assignments
- Reduces cognitive load by showing most urgent info first

**To Change:** Separate into distinct screens if scrolling UX is problematic. Add tabs for "My Patients" vs "All Cases".

---

### Decision 3: Authentication & User Management
**Date:** December 25, 2025  
**Decision:** Full Supabase email/password authentication

**Implementation:**
- Users sign up/sign in with email + password
- Admin assigns role (nurse/resident/attending/chargeNurse) via Supabase dashboard or admin panel
- Role stored in `users` table
- RLS policies enforce role-based access
- No role selector in app - role comes from database
- Session persists via AsyncStorage

**User Setup Process:**
1. Create user in Supabase Auth
2. Insert record in `users` table with role assignment
3. User logs in with credentials
4. App reads role from database and shows appropriate dashboard

**Rationale:**
- Production-ready security
- HIPAA compliance via proper authentication
- Clear audit trail
- Matches real-world hospital staff assignment workflow

**To Change:** Add role selector for development/testing by creating a dev mode flag. Keep production auth separate.

---

## Future Decisions to Consider

### Timer Synchronization Strategy
**Current:** Supabase Realtime subscriptions push timer updates  
**Alternative:** Local timer calculation with periodic server sync  
**Impact:** Network latency vs. local accuracy tradeoff

### Offline Queue Size Limits
**Current:** Unlimited queue in AsyncStorage  
**Alternative:** Max 100 actions, warn user if approaching limit  
**Impact:** Storage management vs. data loss risk

### Notification Sound Customization
**Current:** System default sounds for critical alerts  
**Alternative:** Custom audio files for different priority levels  
**Impact:** User recognition vs. app size

### BP Reading Validation
**Current:** Allow any numeric value  
**Alternative:** Reject readings outside physiological range (e.g., <50 or >300)  
**Impact:** Data quality vs. edge case handling

### Algorithm Switching
**Current:** Not implemented - escalate to attending for manual switch  
**Alternative:** Allow resident to switch algorithm after 2 failed doses  
**Impact:** Protocol flexibility vs. safety guardrails
