# OB-Hypertension Emergency Response App

A real-time coordination tool for the RWJBarnabas Hypertension Protocol built with Expo and Supabase.

## 🚀 Project Status
**Foundation Phase** - Core structure and fundamentals are in place. Ready for feature implementation.

## 📁 Project Structure

```
app/
├── src/
│   ├── screens/          # Role-based screen components
│   │   ├── nurse/        # Nurse view (BP entry, checklists, timers)
│   │   ├── resident/     # Resident view (algorithm selection, approvals)
│   │   ├── attending/    # Attending view (escalation management)
│   │   └── chargeNurse/  # Charge nurse view (resource allocation)
│   ├── components/       # Reusable UI components
│   ├── navigation/       # Role-based navigation logic
│   ├── contexts/         # Auth and global state management
│   ├── services/         # Supabase client, notifications
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions and constants
├── App.tsx               # Main app entry point
├── supabase-schema.sql   # Database schema documentation
└── package.json
```

## 🛠️ Tech Stack

- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **Backend:** Supabase (PostgreSQL)
- **Real-time Sync:** Supabase Realtime
- **Notifications:** Expo Notifications
- **Storage:** AsyncStorage (offline support)
- **Navigation:** React Navigation

## 📦 What's Implemented

### ✅ Core Infrastructure
- [x] Expo TypeScript project setup
- [x] All required dependencies installed
- [x] Project folder structure
- [x] TypeScript types for all data models
- [x] Protocol constants (BP thresholds, medication protocols)

### ✅ Services
- [x] Supabase client configuration
- [x] Notification service (push notifications, local alerts)
- [x] Helper utilities (BP validation, timer formatting)

### ✅ Authentication & Navigation
- [x] Auth context with role-based access
- [x] Role-based navigation system
- [x] Placeholder screens for all 4 roles

### ✅ Database Schema
- [x] Complete SQL schema documented
- [x] Tables: users, patients, emergency_sessions, bp_readings, medications, timers, notifications, audit_logs
- [x] Row Level Security (RLS) policies outlined

## 🔧 Setup Instructions

### 1. Install Dependencies (Already Done)
```bash
cd app
npm install
```

### 2. Configure Supabase
1. Create a Supabase project at https://supabase.com
2. Run the SQL schema from `supabase-schema.sql` in the Supabase SQL Editor
3. Create a `.env` file in the `app/` directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the App
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📋 Next Steps for Development

### Priority 1: Nurse View
- [ ] BP entry numeric keypad component
- [ ] Positioning checklist component
- [ ] Countdown timer component
- [ ] Medication administered toggle
- [ ] Real-time data sync

### Priority 2: Resident View
- [ ] Algorithm selection UI
- [ ] Current step display
- [ ] Dose approval buttons
- [ ] Patient overview

### Priority 3: Real-time Features
- [ ] Supabase Realtime subscriptions
- [ ] Timer synchronization across devices
- [ ] Live notification system
- [ ] Edge Functions for STAT alerts

### Priority 4: Attending & Charge Nurse Views
- [ ] Floor map visualization
- [ ] Multi-patient triage list
- [ ] Staffing status display
- [ ] STAT request management

### Priority 5: Safety & Compliance
- [ ] Asthma warning system
- [ ] Target BP range display
- [ ] Offline data sync
- [ ] Complete audit trail logging
- [ ] HIPAA compliance verification

## 🔐 Security Notes

- All Supabase tables have RLS enabled
- Patient data uses anonymous identifiers
- Audit logs track all actions
- Auth token stored securely in AsyncStorage

## 📚 Key Protocol Information

### BP Thresholds
- Emergency: ≥160/110 mmHg
- Target Range: 130-150 / 80-100 mmHg

### Medication Protocols
- **Labetalol:** 20mg → 40mg → 80mg (10min waits)
- **Hydralazine:** 5-10mg → 10mg (20min waits)
- **Nifedipine:** 10mg → 20mg → 20mg (20min waits)

## 👥 User Roles

1. **Nurse (Doer)** - Direct patient care and data entry
2. **Resident (Decision Maker)** - Treatment path selection
3. **Attending/Specialist (Overseer)** - Escalation management
4. **Charge Nurse (Coordinator)** - Resource allocation

---

**Ready to build!** The foundation is solid. Start with the Nurse View components and work your way up.
