// Core Types for OB-Hypertension Emergency Response App

export type UserRole = 'nurse' | 'resident' | 'attending' | 'chargeNurse';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  push_token?: string;
  created_at: string;
  updated_at: string;
}

export interface BloodPressureReading {
  id: string;
  patient_id: string;
  systolic: number;
  diastolic: number;
  timestamp: string;
  recorded_by: string;
  is_positioned_correctly: boolean;
  notes?: string;
}

export type MedicationAlgorithm = 'labetalol' | 'hydralazine' | 'nifedipine';

export interface MedicationDose {
  id: string;
  patient_id: string;
  emergency_session_id?: string;
  medication_name: string;
  algorithm: MedicationAlgorithm;
  route: 'IV' | 'PO';
  dose_number: number;
  dose_amount: number;
  unit: string;
  ordered_by: string;
  administered_by?: string;
  ordered_at: string;
  administered_at?: string;
  next_bp_check_at?: string;
}

export interface EmergencySession {
  id: string;
  patient_id: string;
  initiated_at: string;
  initiated_by: string;
  algorithm_selected?: MedicationAlgorithm;
  current_step: number;
  status: 'active' | 'resolved' | 'escalated';
  resolved_at?: string;
  escalated_at?: string;
}

export interface Patient {
  id: string;
  anonymous_identifier: string;
  room_number?: string;
  has_asthma: boolean;
  current_emergency_session_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  action_type: string;
  patient_id?: string;
  details: Record<string, any>;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'critical' | 'stat';
  title: string;
  message: string;
  recipient_role?: UserRole;
  recipient_user_id?: string;
  patient_id?: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export interface PositioningChecklist {
  back_supported: boolean;
  feet_flat: boolean;
  arm_supported: boolean;
  correct_cuff_size: boolean;
  patient_calm: boolean;
}

export interface Timer {
  id: string;
  patient_id: string;
  type: 'bp_recheck' | 'medication_wait' | 'administration_deadline';
  started_at: string;
  duration_minutes: number;
  expires_at: string;
  is_active: boolean;
}
