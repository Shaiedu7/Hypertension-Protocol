# Complete Implementation Guide

## Remaining Screens to Build

This document lists all screens that need to be implemented. The core services and components are complete.

### Nurse Screens

**1. NurseDashboard.tsx** ✅ (Update needed)
- Shows active emergency at top
- Scrollable patient list below
- Timer countdown if active
- "Add BP Reading" button

**2. BPEntryScreen.tsx** ✅ COMPLETE
- Numeric keypad for BP entry
- Positioning checklist
- Submission logic

**3. ActiveEmergencyView.tsx** (New component for NurseDashboard)
- Patient vitals display
- Timer countdown
- Medication pending list
- "Mark as Administered" toggle
- BP history timeline

### Resident Screens

**4. ResidentDashboard.tsx** (Update needed)
- List of all active emergencies
- Sort by urgency
- Tap to view details

**5. AlgorithmSelectionScreen.tsx** (New)
- Three large buttons (Labetalol/Hydralazine/Nifedipine)
- Asthma warning display
- Protocol overview for each option

**6. ProtocolTrackerScreen.tsx** (New)
- Current step indicator
- Patient BP history graph
- "Order Next Dose" button
- Manual "Escalate Case" button
- Timer display

**7. PatientDetailScreen.tsx** (New)
- Complete BP timeline
- All medications administered
- Protocol progress
- Notes section

### Attending Screen

**8. AttendingDashboard.tsx** (Update needed)
- STAT request queue at top
- All active emergencies below
- Color-coded by urgency
- Tap to view full details

**9. STATRequestDetailScreen.tsx** (New)
- Full case details
- Failed algorithm info
- Current BP and history
- "Acknowledge and Respond" button

### Charge Nurse Screen

**10. ChargeNurseDashboard.tsx** (Update needed)
- Triage list sorted by "Time to Next Action"
- All active cases with status
- Staffing assignments
- Resource allocation view

### Shared Screens

**11. TimerExpiredModal.tsx** (New)
- Full-screen blocking modal
- Persistent alert until acknowledged
- "Check BP Now" button
- Cannot be dismissed without action

**12. EscalationModal.tsx** (New)
- Triggered on algorithm failure
- Shows STAT alert details
- Notifies all relevant roles
- Switch algorithm option

## Implementation Strategy

### Phase 1: Core Workflow (Days 1-3)
1. Update NurseDashboard with active emergency view
2. Complete Resident dashboard and algorithm selection
3. Build protocol tracker for resident
4. Test end-to-end: Nurse BP → Timer → Resident order → Nurse administer

### Phase 2: Multi-Patient (Days 4-5)
5. Build patient list views
6. Add navigation between patients
7. Test concurrent emergencies

### Phase 3: Escalation & Coordination (Days 6-7)
8. Implement timer expired modal
9. Build escalation flow and STAT alerts
10. Create Attending dashboard
11. Complete Charge Nurse view

### Phase 4: Polish (Days 8-10)
12. Error handling throughout
13. Loading states
14. Offline indicators
15. Notification tap handling
16. Real-time sync testing across devices
17. Accessibility improvements

## Code Patterns to Follow

### Screen Template
```typescript
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useEmergencySession } from '../../contexts/EmergencySessionContext';
import { useAuth } from '../../contexts/AuthContext';

export default function ScreenName({ navigation, route }: any) {
  const { user } = useAuth();
  const { activeSession, /* other context */ } = useEmergencySession();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Subscribe to real-time updates
    // Load initial data
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* Screen content */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
});
```

### Navigation Setup
All screens need to be added to `AppNavigator.tsx` with proper role-based routing.

### Real-time Updates Pattern
```typescript
useEffect(() => {
  if (!patientId) return;

  const channel = supabase
    .channel(`patient:${patientId}`)
    .on('postgres_changes', { /* config */ }, (payload) => {
      // Handle real-time update
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [patientId]);
```

## Testing Checklist

- [ ] Login with different roles
- [ ] Enter first high BP → verify timer starts
- [ ] Second high BP → verify emergency confirmed
- [ ] Resident selects algorithm → verify nurse sees update
- [ ] Resident orders medication → verify nurse notification
- [ ] Nurse administers → verify timer starts
- [ ] Timer expires → verify all roles notified
- [ ] Complete 3 doses → verify escalation triggered
- [ ] Test on 2+ devices simultaneously
- [ ] Test offline → online sync
- [ ] Test notification taps

## Next Steps

Run: `npm start` and begin building screens one by one following the implementation strategy above.
