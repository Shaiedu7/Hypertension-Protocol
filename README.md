# RWJ Hypertension Emergency Protocol App

Mobile application supporting the RWJBarnabas Health protocol for emergent therapy of severe hypertension during pregnancy and postpartum.

## Overview

This app streamlines the hypertensive emergency workflow by:
- **Timing**: Automatic BP recheck timers (15 min observation, 10-20 min medication wait periods)
- **Protocol guidance**: Step-by-step algorithm tracking (Labetalol/Hydralazine/Nifedipine)
- **Safety**: Asthma contraindication warnings, 5-minute minimum between high BP readings
- **Team coordination**: Role-based notifications (nurse, resident, charge nurse, attending)

## Key Features

### Simplified Workflow
1. **BP Recording** → Auto-starts observation timer if high (≥160/110)
2. **Emergency Confirmation** → Second high BP triggers emergency protocol
3. **Algorithm Selection** → Nurse or resident selects treatment (one tap, asthma-safe)
4. **Medication Administration** → Nurse taps "Mark Given" → Timer starts automatically
5. **BP Rechecks** → Continue until target achieved (130-150/80-100) or escalate

### Role-Specific Dashboards
- **Nurse**: All patients, active emergencies, next dose display, "Mark Given" button
- **Resident**: Algorithm selection with dose reminders, protocol oversight, escalation
- **Charge Nurse**: Supervisor view, all emergencies, statistics

## Protocol Compliance

- **Target BP**: 130-150 systolic / 80-100 diastolic
- **Timing Requirements**: 
  - Medication within 30-60 min of confirmed emergency
  - Labetalol: 10-min wait between doses
  - Hydralazine/Nifedipine: 20-min wait between doses
- **Contraindications**: Labetalol contraindicated with asthma
- **Escalation**: Auto-alert after max doses without BP control

## Technology Stack

- **Frontend**: React Native (Expo)
- **Backend**: Supabase (PostgreSQL, real-time subscriptions, RLS policies)
- **Languages**: TypeScript, Swift (iOS Live Activities)
- **Platforms**: iOS, Android

## Getting Started

```bash
cd app
npm install
npx expo start
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)
- [RWJ Protocol](docs/RWJ%20Medical%20Hypertension%20Protocol.md)

## Notes

- App is a **workflow aid and timer**, not the official medical record
- All medications and BPs must still be documented in EMR per hospital policy
- Audit logs available for quality review and protocol compliance tracking