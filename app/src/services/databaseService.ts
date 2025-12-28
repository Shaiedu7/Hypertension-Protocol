// Database Service Layer
// Centralized CRUD operations for all tables

import { supabase, TABLES } from './supabase';
import { 
  Patient, 
  BloodPressureReading, 
  MedicationDose, 
  EmergencySession,
  Notification,
  AuditLog,
  UserRole,
  Timer
} from '../types';

export class DatabaseService {
  // ============= PATIENTS =============
  
  static async createPatient(roomNumber?: string, hasAsthma: boolean = false): Promise<Patient> {
    // Generate a short, clean identifier like "PT-A7K3"
    const randomCode = Math.random().toString(36).substr(2, 4).toUpperCase();
    const anonymousId = `PT-${randomCode}`;
    
    const { data, error } = await supabase
      .from(TABLES.PATIENTS)
      .insert({
        anonymous_identifier: anonymousId,
        room_number: roomNumber,
        has_asthma: hasAsthma,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Patient;
  }

  static async getPatient(patientId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from(TABLES.PATIENTS)
      .select('*')
      .eq('id', patientId)
      .single();

    if (error) return null;
    return data as Patient;
  }

  static async getAllActivePatients(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from(TABLES.PATIENTS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data as Patient[];
  }

  static async getAllPatientsWithEmergency(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from(TABLES.PATIENTS)
      .select('*')
      .not('current_emergency_session_id', 'is', null);

    if (error) return [];
    return data as Patient[];
  }

  static async updatePatient(patientId: string, updates: Partial<Patient>): Promise<void> {
    const { error } = await supabase
      .from(TABLES.PATIENTS)
      .update(updates)
      .eq('id', patientId);

    if (error) throw error;
  }

  static async deletePatient(patientId: string): Promise<void> {
    // Delete patient - cascading deletes will handle related records if configured
    // Otherwise we manually delete related records first
    const { error } = await supabase
      .from(TABLES.PATIENTS)
      .delete()
      .eq('id', patientId);

    if (error) throw error;
  }

  // ============= BP READINGS =============

  static async getBPReadings(patientId: string): Promise<BloodPressureReading[]> {
    const { data, error } = await supabase
      .from(TABLES.BP_READINGS)
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false });

    if (error) return [];
    return data as BloodPressureReading[];
  }

  static async getRecentBPReadings(patientId: string, limit: number = 2): Promise<BloodPressureReading[]> {
    const { data, error } = await supabase
      .from(TABLES.BP_READINGS)
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) return [];
    return data as BloodPressureReading[];
  }

  static async getLatestBPReading(patientId: string): Promise<BloodPressureReading | null> {
    const { data, error } = await supabase
      .from(TABLES.BP_READINGS)
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as BloodPressureReading;
  }

  static async getBPHistory(patientId: string): Promise<BloodPressureReading[]> {
    return this.getBPReadings(patientId);
  }

  // ============= EMERGENCY SESSIONS =============

  static async getEmergencySession(sessionId: string): Promise<EmergencySession | null> {
    const { data, error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) return null;
    return data as EmergencySession;
  }

  static async getActiveEmergencySessions(): Promise<EmergencySession[]> {
    const { data, error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .select('*')
      .eq('status', 'active')
      .order('initiated_at', { ascending: false });

    if (error) return [];
    return data as EmergencySession[];
  }

  static async getPatientActiveSession(patientId: string): Promise<EmergencySession | null> {
    const { data, error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('initiated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as EmergencySession;
  }

  // ============= MEDICATIONS =============

  static async getMedications(patientId: string): Promise<MedicationDose[]> {
    const { data, error } = await supabase
      .from(TABLES.MEDICATIONS)
      .select('*')
      .eq('patient_id', patientId)
      .order('ordered_at', { ascending: true });

    if (error) return [];
    return data as MedicationDose[];
  }

  static async getPendingMedications(patientId: string): Promise<MedicationDose[]> {
    const { data, error } = await supabase
      .from(TABLES.MEDICATIONS)
      .select('*')
      .eq('patient_id', patientId)
      .is('administered_at', null)
      .order('ordered_at', { ascending: true });

    if (error) return [];
    return data as MedicationDose[];
  }

  // ============= TIMERS =============

  static async getActiveTimer(patientId: string): Promise<Timer | null> {
    const { data, error } = await supabase
      .from(TABLES.TIMERS)
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('expires_at', { ascending: true })
      .limit(1)
      .single();

    if (error) return null;
    return data as Timer;
  }

  // ============= NOTIFICATIONS =============

  static async createNotification(
    type: 'info' | 'warning' | 'critical' | 'stat',
    title: string,
    message: string,
    recipientRole?: UserRole,
    recipientUserId?: string,
    patientId?: string
  ): Promise<Notification> {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert({
        type,
        title,
        message,
        recipient_role: recipientRole,
        recipient_user_id: recipientUserId,
        patient_id: patientId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  }

  static async getUnacknowledgedNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .or(`recipient_user_id.eq.${userId},recipient_user_id.is.null`)
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data as Notification[];
  }

  static async acknowledgeNotification(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
      })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // ============= AUDIT LOGS =============

  static async createAuditLog(
    userId: string,
    actionType: string,
    patientId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from(TABLES.AUDIT_LOGS)
      .insert({
        user_id: userId,
        action_type: actionType,
        patient_id: patientId,
        details: details || {},
      });

    if (error) throw error;
  }

  static async getAuditLogs(patientId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from(TABLES.AUDIT_LOGS)
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false });

    if (error) return [];
    return data as AuditLog[];
  }

  // ============= TIMERS =============

  static async getActiveTimers(patientId: string): Promise<Timer[]> {
    const { data, error } = await supabase
      .from(TABLES.TIMERS)
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('expires_at', { ascending: true });

    if (error) return [];
    return data as Timer[];
  }
}
