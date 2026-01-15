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
  giveNextDose: () => Promise<void>;
  administerMedication: (medicationId: string) => Promise<void>;
  acknowledgeSession: () => Promise<void>;
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

    // Deactivate all existing timers (including observation timer)
    await TimerService.deactivateAllTimers(patientId);

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
    
    // Get patient info for notifications
    const patientData = await supabase
      .from(TABLES.PATIENTS)
      .select('room_number')
      .eq('id', patientId)
      .single();
    
    // Create 30-60 min administration deadline timer per RWJ protocol
    await TimerService.createAdministrationDeadlineTimer(
      patientId,
      patientData.data?.room_number
    );
    
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

    // Check time interval between readings (for emergency confirmation)
    let sufficientTimeGap = false;
    if (previousReading) {
      const previousTime = new Date(previousReading.timestamp);
      const now = new Date();
      const minutesSincePrevious = (now.getTime() - previousTime.getTime()) / (1000 * 60);
      sufficientTimeGap = minutesSincePrevious >= 0.01; // 0.01 minutes (0.6 seconds) for testing
    }

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
        if (previousIsHigh && sufficientTimeGap) {
          // Confirmed emergency (second high reading with sufficient time gap)
          await TimerService.deactivateAllTimers(targetPatient.id);
          await startEmergencySession(targetPatient.id);
          await NotificationDispatcher.notifyConfirmedEmergency(
            targetPatient.id,
            systolic,
            diastolic,
            targetPatient.room_number
          );
        } else if (previousIsHigh && !sufficientTimeGap) {
          // Second high BP too soon - keep observation timer active
          // Log for audit but don't confirm emergency yet
          await logAudit('bp_high_insufficient_time_gap', { 
            systolic, 
            diastolic, 
            minutesSincePrevious: previousReading ? 
              ((new Date().getTime() - new Date(previousReading.timestamp).getTime()) / (1000 * 60)).toFixed(1) : 
              '0' 
          });
        } else {
          // First high reading -> start silent recheck timer
          await TimerService.deactivateAllTimers(targetPatient.id);
          const timer = await TimerService.createBPRecheckTimer(targetPatient.id, targetPatient.room_number);
          setActiveTimer(timer);
          await NotificationDispatcher.notifyFirstHighBP(targetPatient.id, systolic, diastolic);
        }
      } else {
        // BP is not high (either in target range or borderline)
        // Deactivate any observation timers - emergency threshold not met
        await TimerService.deactivateAllTimers(targetPatient.id);
        
        if (isBPInTargetRange(systolic, diastolic)) {
          // In target range - fully normalized
          await logAudit('bp_normalized', { systolic, diastolic });
        } else {
          // Borderline (not high, not in target) - keep monitoring but no active protocol
          await logAudit('bp_borderline_recorded', { systolic, diastolic });
        }
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
    if (!activeSession || !patient) throw new Error('No active session or patient');

    const { error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .update({ algorithm_selected: algorithm })
      .eq('id', activeSession.id);

    if (error) throw error;

    // Create administration deadline timer (45 minutes)
    await TimerService.createAdministrationDeadlineTimer(patient.id, patient.room);

    // Notify team about algorithm selection
    await NotificationDispatcher.notifyAlgorithmSelected(patient, algorithm);

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

  async function giveNextDose() {
    if (!user || !activeSession || !patient) throw new Error('Missing required data');

    const algorithm = activeSession.algorithm_selected;
    if (!algorithm) throw new Error('Algorithm not selected');

    const protocol = MEDICATION_PROTOCOLS[algorithm];
    const stepIndex = activeSession.current_step || 0;
    const nextDose = protocol.doses[stepIndex];

    if (!nextDose) {
      await logAudit('medication_protocol_complete', { algorithm });
      return;
    }

    const doseNumber = stepIndex + 1;
    const doseAmount = parseFloat(nextDose.dose) || 0;
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from(TABLES.MEDICATIONS)
      .insert({
        patient_id: patient.id,
        emergency_session_id: activeSession.id,
        medication_name: nextDose.medication,
        algorithm,
        route: nextDose.route,
        dose_number: doseNumber,
        dose_amount: doseAmount,
        unit: 'mg',
        ordered_by: user.id,
        ordered_at: nowIso,
        administered_by: user.id,
        administered_at: nowIso,
      });

    if (error) throw error;

    await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .update({ current_step: doseNumber })
      .eq('id', activeSession.id);

    // Reset timers and start the medication wait timer
    await TimerService.deactivateAllTimers(patient.id);
    const timer = await TimerService.createMedicationWaitTimer(patient.id, nextDose.waitTime, patient.room_number);
    setActiveTimer(timer);

    await logAudit('medication_given', {
      medication: nextDose.medication,
      dose: nextDose.dose,
      route: nextDose.route,
      doseNumber,
      waitTime: nextDose.waitTime,
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
    await TimerService.createMedicationWaitTimer(patient.id, waitTime, patient.room_number);

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

  async function acknowledgeSession() {
    if (!activeSession || !patient || !user) throw new Error('No active session or user');

    const { error } = await supabase
      .from(TABLES.EMERGENCY_SESSIONS)
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      })
      .eq('id', activeSession.id);

    if (error) throw error;

    // Notify charge nurse and primary nurse
    await NotificationDispatcher.notifyTransferAcknowledged(patient.id, patient.room_number);

    await logAudit('session_acknowledged', {});
    
    // Reload session to update UI
    await loadSessionData(activeSession.id);
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

    // Deactivate all timers and clear Live Activity when escalated
    await TimerService.deactivateAllTimers(patient.id);

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
        giveNextDose,
        administerMedication,
        acknowledgeSession,
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
