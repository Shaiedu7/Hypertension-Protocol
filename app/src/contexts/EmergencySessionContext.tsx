import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, TABLES } from '../services/supabase';
import { EmergencySession, Patient, BloodPressureReading, MedicationDose, Timer } from '../types';
import { useAuth } from './AuthContext';
import { TimerService } from '../services/timerService';
import { MEDICATION_PROTOCOLS } from '../utils/constants';
import { NotificationDispatcher } from '../services/notificationDispatcher';
import { DatabaseService } from '../services/databaseService';
import { isBPHigh, isBPInTargetRange } from '../utils/helpers';

interface EmergencySessionContextType {
  activeSession: EmergencySession | null;
  patient: Patient | null;
  bpReadings: BloodPressureReading[];
  medications: MedicationDose[];
  activeTimer: Timer | null;
  loading: boolean;
  
  // Actions
  startEmergencySession: (patientId: string) => Promise<EmergencySession>;
  recordBPReading: (systolic: number, diastolic: number, isPositioned: boolean, notes?: string, patientParam?: Patient) => Promise<void>;
  selectAlgorithm: (algorithm: 'labetalol' | 'hydralazine' | 'nifedipine') => Promise<void>;
  orderMedication: (medicationName: string, dose: string, route: 'IV' | 'PO', waitTime: number) => Promise<void>;
  administerMedication: (medicationId: string) => Promise<void>;
  resolveSession: () => Promise<void>;
  escalateSession: () => Promise<void>;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;
  setPatient: (p: Patient) => void;
  focusSession: (session: EmergencySession, patient?: Patient) => void;
}

const EmergencySessionContext = createContext<EmergencySessionContextType | undefined>(undefined);

export function EmergencySessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<EmergencySession | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [bpReadings, setBpReadings] = useState<BloodPressureReading[]>([]);
  const [medications, setMedications] = useState<MedicationDose[]>([]);
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time subscriptions
  useEffect(() => {
    if (!activeSession) return;

    const channel = supabase
      .channel(`emergency_session:${activeSession.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.BP_READINGS, filter: `patient_id=eq.${activeSession.patient_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBpReadings(prev => [...prev, payload.new as BloodPressureReading]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.MEDICATIONS, filter: `patient_id=eq.${activeSession.patient_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMedications(prev => [...prev, payload.new as MedicationDose]);
          } else if (payload.eventType === 'UPDATE') {
            setMedications(prev => prev.map(m => m.id === payload.new.id ? payload.new as MedicationDose : m));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.EMERGENCY_SESSIONS, filter: `id=eq.${activeSession.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setActiveSession(payload.new as EmergencySession);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.TIMERS, filter: `patient_id=eq.${activeSession.patient_id}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const timer = payload.new as Timer;
            if (timer.is_active) {
              setActiveTimer(timer);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession]);

  async function startEmergencySession(patientId: string): Promise<EmergencySession> {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .insert({
        patient_id: patientId,
        initiated_by: user.id,
        status: 'active',
        current_step: 0,
      })
      .select()
      .single();

    if (error) throw error;

    const session = data as EmergencySession;
    setActiveSession(session);
    
    // Update patient's current_emergency_session_id
    await supabase
      .from(TABLES.PATIENTS)
      .update({ 
        current_emergency_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId);
    
    // Load patient data
    await loadPatientData(patientId);
    
    // Create 30-60 min administration deadline timer per RWJ protocol
    await TimerService.createAdministrationDeadlineTimer(patientId);
    
    return session;
  }

  function focusSession(session: EmergencySession, patientOverride?: Patient) {
    setActiveSession(session);
    if (patientOverride) {
      setPatient(patientOverride);
    }
    subscribeToSession(session.id);
  }

  async function loadPatientData(patientId: string) {
    const { data: patientData } = await supabase
      .from(TABLES.PATIENTS)
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientData) setPatient(patientData as Patient);

    const { data: bpData } = await supabase
      .from(TABLES.BP_READINGS)
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false });

    if (bpData) setBpReadings(bpData as BloodPressureReading[]);
  }

  async function recordBPReading(
    systolic: number, 
    diastolic: number, 
    isPositioned: boolean,
    notes?: string,
    patientParam?: Patient
  ) {
    if (!user) throw new Error('Missing user');
    
    // Use provided patient or fallback to context patient
    const targetPatient = patientParam || patient;
    if (!targetPatient) throw new Error('Missing patient');

    const { error } = await supabase
      .from(TABLES.BP_READINGS)
      .insert({
        patient_id: targetPatient.id,
        systolic,
        diastolic,
        recorded_by: user.id,
        is_positioned_correctly: isPositioned,
        notes,
      });

    if (error) throw error;

    const latestReadings = await DatabaseService.getRecentBPReadings(targetPatient.id, 2);
    const previousReading = latestReadings.length > 1 ? latestReadings[1] : null;
    const latestIsHigh = isBPHigh(systolic, diastolic);
    const previousIsHigh = previousReading ? isBPHigh(previousReading.systolic, previousReading.diastolic) : false;

    // Existing emergency session handling
    if (activeSession?.algorithm_selected) {
      const protocol = MEDICATION_PROTOCOLS[activeSession.algorithm_selected];
      const hasReachedMaxDose = (activeSession.current_step || 0) >= protocol.maxDoses;

      if (latestIsHigh && hasReachedMaxDose) {
        await escalateSession();
        await NotificationDispatcher.notifyAlgorithmFailure(
          targetPatient.id,
          activeSession.algorithm_selected,
          `${systolic}/${diastolic}`,
          targetPatient.room_number
        );
      }
    }

    // Resolve when controlled during an active session
    if (activeSession && isBPInTargetRange(systolic, diastolic)) {
      await resolveSession();
      await TimerService.deactivateAllTimers(targetPatient.id);
      await logAudit('bp_controlled_auto_resolved', { systolic, diastolic });
      await NotificationDispatcher.notifySessionResolved(
        targetPatient.id,
        `BP normalized to ${systolic}/${diastolic}`,
        targetPatient.room_number
      );
    }

    // If no active session, manage first/second high workflow
    if (!activeSession) {
      if (latestIsHigh) {
        if (previousIsHigh) {
          // Confirmed emergency (second high reading)
          await TimerService.deactivateAllTimers(targetPatient.id);
          await startEmergencySession(targetPatient.id);
          await NotificationDispatcher.notifyConfirmedEmergency(
            targetPatient.id,
            systolic,
            diastolic,
            targetPatient.room_number
          );
        } else {
          // First high reading -> start silent recheck timer
          await TimerService.deactivateAllTimers(targetPatient.id);
          await TimerService.createBPRecheckTimer(targetPatient.id);
          await NotificationDispatcher.notifyFirstHighBP(targetPatient.id, systolic, diastolic);
        }
      } else if (isBPInTargetRange(systolic, diastolic)) {
        // Normalize without an active session: clear any stray timers
        await TimerService.deactivateAllTimers(targetPatient.id);
      }
    }

    // If BP is high during treatment and a timer is running, stop that timer after the reading
    // (Don't deactivate during first/second high BP confirmation - let the recheck timer run)
    if (latestIsHigh && activeSession) {
      const patientTimer = await TimerService.getActiveTimer(targetPatient.id);
      if (patientTimer) {
        await TimerService.deactivateTimer(patientTimer.id);
      }
    }

    await logAudit('bp_reading_recorded', { systolic, diastolic, isPositioned });
  }

  async function selectAlgorithm(algorithm: 'labetalol' | 'hydralazine' | 'nifedipine') {
    if (!activeSession) throw new Error('No active session');

    const { error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .update({ algorithm_selected: algorithm })
      .eq('id', activeSession.id);

    if (error) throw error;

    await logAudit('algorithm_selected', { algorithm });
  }

  async function orderMedication(
    medicationName: string, 
    dose: string, 
    route: 'IV' | 'PO', 
    waitTime: number
  ) {
    if (!user || !activeSession || !patient) throw new Error('Missing required data');

    // Extract dose number and amount from current step
    const currentStep = (activeSession.current_step || 0) + 1;
    const doseAmount = parseFloat(dose.replace(/\D/g, ''));

    const { error } = await supabase
      .from(TABLES.MEDICATIONS)
      .insert({
        patient_id: patient.id,
        emergency_session_id: activeSession.id,
        medication_name: medicationName,
        algorithm: activeSession.algorithm_selected!,
        route: route,
        dose_number: currentStep,
        dose_amount: doseAmount,
        unit: 'mg',
        ordered_by: user.id,
      });

    if (error) throw error;

    // Update session step
    await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .update({ current_step: currentStep })
      .eq('id', activeSession.id);

    await logAudit('medication_ordered', { 
      medicationName, 
      dose, 
      route, 
      waitTime,
      doseNumber: currentStep 
    });
  }

  async function administerMedication(medicationId: string) {
    if (!user || !patient) throw new Error('User not authenticated or no patient');

    // Get medication details to determine wait time
    const { data: medication, error: fetchError } = await supabase
      .from(TABLES.MEDICATIONS)
      .select('*')
      .eq('id', medicationId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate next BP check time
    const med = medication as MedicationDose;
    const algorithm = med.algorithm;
    
    // Get wait time from protocol
    let waitTime = 10; // default
    if (algorithm === 'labetalol') waitTime = 10;
    else if (algorithm === 'hydralazine') waitTime = 20;
    else if (algorithm === 'nifedipine') waitTime = 20;
    
    const nextBPCheckAt = new Date(Date.now() + waitTime * 60 * 1000);

    const { error } = await supabase
      .from(TABLES.MEDICATIONS)
      .update({
        administered_by: user.id,
        administered_at: new Date().toISOString(),
        next_bp_check_at: nextBPCheckAt.toISOString(),
      })
      .eq('id', medicationId);

    if (error) throw error;
    
    // Create wait timer
    await TimerService.createMedicationWaitTimer(patient.id, waitTime);

    await logAudit('medication_administered', { 
      medicationId, 
      algorithm,
      waitTime 
    });
  }

  async function resolveSession() {
    if (!activeSession || !patient) throw new Error('No active session');

    const { error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', activeSession.id);

    if (error) throw error;

    // Clear patient's current_emergency_session_id
    await supabase
      .from(TABLES.PATIENTS)
      .update({ 
        current_emergency_session_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', patient.id);

    await logAudit('session_resolved', {});
    setActiveSession(null);
  }

  async function escalateSession() {
    if (!activeSession || !patient) throw new Error('No active session');

    const { error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .update({
        status: 'escalated',
        escalated_at: new Date().toISOString(),
      })
      .eq('id', activeSession.id);

    if (error) throw error;

    // Update patient's updated_at timestamp
    await supabase
      .from(TABLES.PATIENTS)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', patient.id);

    await logAudit('session_escalated', {});
  }

  async function logAudit(actionType: string, details: Record<string, any>) {
    if (!user || !patient) return;

    await supabase
      .from(TABLES.AUDIT_LOGS)
      .insert({
        user_id: user.id,
        action_type: actionType,
        patient_id: patient.id,
        details,
      });
  }

  function subscribeToSession(sessionId: string) {
    // Load session data
    loadSessionData(sessionId);
  }

  async function loadSessionData(sessionId: string) {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase
        .from(TABLES.EMERGENCY_SESSIONS)
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        setActiveSession(sessionData as EmergencySession);
        await loadPatientData(sessionData.patient_id);
        
        // Load medications
        const { data: medsData } = await supabase
          .from(TABLES.MEDICATIONS)
          .select('*')
          .eq('patient_id', sessionData.patient_id)
          .order('ordered_at', { ascending: true });
        
        if (medsData) setMedications(medsData as MedicationDose[]);

        // Load active timer
        const { data: timerData } = await supabase
          .from(TABLES.TIMERS)
          .select('*')
          .eq('patient_id', sessionData.patient_id)
          .eq('is_active', true)
          .order('expires_at', { ascending: true })
          .limit(1)
          .single();
        
        if (timerData) setActiveTimer(timerData as Timer);
      }
    } finally {
      setLoading(false);
    }
  }

  function unsubscribeFromSession() {
    setActiveSession(null);
    setPatient(null);
    setBpReadings([]);
    setMedications([]);
    setActiveTimer(null);
  }

  return (
    <EmergencySessionContext.Provider
      value={{
        activeSession,
        patient,
        bpReadings,
        medications,
        activeTimer,
        loading,
        startEmergencySession,
        recordBPReading,
        selectAlgorithm,
        orderMedication,
        administerMedication,
        resolveSession,
        escalateSession,
        subscribeToSession,
        unsubscribeFromSession,
        setPatient,
        focusSession,
      }}
    >
      {children}
    </EmergencySessionContext.Provider>
  );
}

export function useEmergencySession() {
  const context = useContext(EmergencySessionContext);
  if (context === undefined) {
    throw new Error('useEmergencySession must be used within an EmergencySessionProvider');
  }
  return context;
}
