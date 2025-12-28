# **Developer Specification: OB-Hypertension Emergency Response App**

## **1\. Project Overview**

Goal: A real-time coordination tool for the "RWJBarnabas Hypertension Protocol."  
Problem: Communication "telephone game" and timing errors during obstetric emergencies.  
Scope: Role-based mobile/web application developed with Expo and Supabase.

## **2\. User Roles & Dedicated Views**

### **2.1 Nurse View (The "Doer")**

* **Focus:** Direct patient care and data entry.  
* **Unique UI Elements:**  
  * Large numeric keypad for BP entry.  
  * Checklist for positioning (Back supported, feet flat, etc.).  
  * "Medication Administered" toggle.  
  * Countdown timers for the next BP check.

### **2.2 Resident View (The "Decision Maker")**

* **Focus:** Treatment path selection and order verification.  
* **Unique UI Elements:**  
  * Algorithm selection (Labetalol vs. Hydralazine vs. Nifedipine).  
  * "Current Step" display (e.g., "On Step 2: Give 40mg").  
  * One-tap "Approve Dose" buttons.

### **2.3 Attending/Specialist View (The "Overseer")**

* **Focus:** Escalation management.  
* **Unique UI Elements:**  
  * High-level floor map showing all active emergencies.  
  * "STAT Request" details (Why they are being called, what has failed).

### **2.4 Charge Nurse View (The "Coordinator")**

* **Focus:** Resource allocation.  
* **Unique UI Elements:**  
  * Triage list sorted by "Time to Next Action."  
  * Staffing status (Who is assigned to which room).

## **3\. Communication & Notification Logic**

The app must replace manual phone chains with a centralized notification stream.

| Event | Notify Who? | Method |
| :---- | :---- | :---- |
| **First High BP** | Nurse | Silent Timer starts on Nurse's device. |
| **Confirmed Emergency** (2nd High BP) | Nurse \+ On-Call Resident | **High Priority Alert:** Supabase Realtime \+ Expo Push Notification. |
| **Medication Ordered** | Nurse | App update: "Resident has approved Dose 1." |
| **Window Missed** (Timer \= 0\) | Nurse \+ Resident \+ Charge Nurse | **Critical Alert:** Persistent sound/vibration until acknowledged. |
| **Algorithm Failure** (3 doses fail) | Attending \+ Specialists | **STAT Alert:** Direct notification to senior team via Supabase Edge Function. |

## **4\. Functional Requirements & Logic**

### **4.1 Entry & Validation Workflow**

1. **Input:** User enters SBP/DBP.  
2. **Trigger:** If SBP $\\ge 160$ OR DBP $\\ge 110$:  
   * Show positioning checklist.  
   * Start **15-minute countdown** for 2nd reading.  
3. **Validation:**  
   * If 2nd reading $\\ge 160/110$: **Activate Emergency Mode.**  
   * If 2nd reading \< 160/110: Return to "Observation."

### **4.2 Medication Pathways (The Algorithm)**

The app suggests the next step based on the selected drug.

* **Labetalol Path:** 20mg (10m wait) $\\rightarrow$ 40mg (10m wait) $\\rightarrow$ 80mg (10m wait) $\\rightarrow$ **Escalate**.  
* **Hydralazine Path:** 5-10mg (20m wait) $\\rightarrow$ 10mg (20m wait) $\\rightarrow$ **Escalate**.  
* **Nifedipine Path:** 10mg (20m wait) $\\rightarrow$ 20mg (20m wait) $\\rightarrow$ 20mg (20m wait) $\\rightarrow$ **Escalate**.

## **5\. Technical Requirements for Developers**

* **Development Framework:** **Expo (React Native)** for cross-platform iOS/Android support.  
* **Backend & Database:** **Supabase** for PostgreSQL storage and Auth.  
* **Real-Time Sync:** Use **Supabase Realtime** (Postgres Changes) to ensure all roles looking at a patient see the exact same timer and history instantly.  
* **Push Notifications:** Use **Expo Notifications** service to deliver alerts even when the app is in the background.  
* **Edge Functions:** Use **Supabase Edge Functions** to handle complex alert logic (e.g., triggering a STAT alert if three doses are logged in the database).  
* **Audit Trail:** Log all actions to a dedicated audit\_logs table: \[Timestamp\] \[User\_ID\] \[Action\_Type\] \[Patient\_ID\].  
* **HIPAA Compliance:** Use Supabase Row Level Security (RLS) to restrict data access. Ensure all patient data is encrypted. For prototype, use anonymous identifiers.  
* **Offline Support:** Implement local state management (e.g., AsyncStorage or SQLite) to allow data entry during Wi-Fi dead zones, with a background sync to Supabase once online.

## **6\. Safety Overrides**

* **Asthma Warning:** Displayed prominently when Labetalol is active.  
* **Goal Range:** Display target BP (SBP 130–150 / DBP 80–100) on all active treatment screens.