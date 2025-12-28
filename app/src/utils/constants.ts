// Protocol Constants based on RWJBarnabas Hypertension Protocol

export const BP_THRESHOLDS = {
  SYSTOLIC_HIGH: 160,
  DIASTOLIC_HIGH: 110,
  TARGET_SYSTOLIC_MIN: 130,
  TARGET_SYSTOLIC_MAX: 150,
  TARGET_DIASTOLIC_MIN: 80,
  TARGET_DIASTOLIC_MAX: 100,
} as const;

export const TIMING = {
  INITIAL_BP_RECHECK_MINUTES: 15,
  LABETALOL_WAIT_MINUTES: 10,
  HYDRALAZINE_WAIT_MINUTES: 20,
  NIFEDIPINE_WAIT_MINUTES: 20,
} as const;

export const MEDICATION_PROTOCOLS = {
  labetalol: {
    name: 'Labetalol',
    route: 'IV' as const,
    doses: [
      { step: 1, medication: 'Labetalol', dose: '20mg', route: 'IV' as const, waitTime: 10 },
      { step: 2, medication: 'Labetalol', dose: '40mg', route: 'IV' as const, waitTime: 10 },
      { step: 3, medication: 'Labetalol', dose: '80mg', route: 'IV' as const, waitTime: 10 },
    ],
    contraindications: ['asthma', 'severe_bradycardia'],
    maxDoses: 3,
  },
  hydralazine: {
    name: 'Hydralazine',
    route: 'IV' as const,
    doses: [
      { step: 1, medication: 'Hydralazine', dose: '5-10mg', route: 'IV' as const, waitTime: 20 },
      { step: 2, medication: 'Hydralazine', dose: '10mg', route: 'IV' as const, waitTime: 20 },
    ],
    contraindications: [],
    maxDoses: 2,
  },
  nifedipine: {
    name: 'Nifedipine',
    route: 'PO' as const,
    doses: [
      { step: 1, medication: 'Nifedipine', dose: '10mg', route: 'PO' as const, waitTime: 20 },
      { step: 2, medication: 'Nifedipine', dose: '20mg', route: 'PO' as const, waitTime: 20 },
      { step: 3, medication: 'Nifedipine', dose: '20mg', route: 'PO' as const, waitTime: 20 },
    ],
    contraindications: [],
    maxDoses: 3,
  },
} as const;

export const NOTIFICATION_TYPES = {
  FIRST_HIGH_BP: 'first_high_bp',
  CONFIRMED_EMERGENCY: 'confirmed_emergency',
  MEDICATION_ORDERED: 'medication_ordered',
  MEDICATION_ADMINISTERED: 'medication_administered',
  TIMER_EXPIRED: 'timer_expired',
  ALGORITHM_FAILURE: 'algorithm_failure',
  STAT_ALERT: 'stat_alert',
} as const;

export const USER_ROLES = {
  NURSE: 'nurse',
  RESIDENT: 'resident',
  ATTENDING: 'attending',
  CHARGE_NURSE: 'chargeNurse',
} as const;
