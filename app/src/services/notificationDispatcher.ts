// Notification Dispatcher Service
// Handles protocol-driven notification logic

import { DatabaseService } from './databaseService';
import { WorkflowEngine } from './workflowEngine';
import { scheduleNotification } from './notifications';
import { UserRole } from '../types';

export class NotificationDispatcher {
  /**
   * Dispatch notification for first high BP reading
   */
  static async notifyFirstHighBP(patientId: string, systolic: number, diastolic: number) {
    const priority = WorkflowEngine.getNotificationPriority('first_high_bp');
    
    await scheduleNotification(
      'High BP Detected',
      `BP: ${systolic}/${diastolic}. Complete positioning checklist and recheck in 15 minutes.`,
      { patientId, event: 'first_high_bp' },
      priority
    );

    await DatabaseService.createNotification(
      priority,
      'High BP Detected',
      `Patient BP: ${systolic}/${diastolic}. Recheck required in 15 minutes.`,
      'nurse',
      undefined,
      patientId
    );
  }

  /**
   * Dispatch notification for confirmed emergency (2nd high BP)
   */
  static async notifyConfirmedEmergency(
    patientId: string,
    systolic: number,
    diastolic: number,
    roomNumber?: string
  ) {
    const priority = WorkflowEngine.getNotificationPriority('confirmed_emergency');
    const location = roomNumber ? ` in Room ${roomNumber}` : '';
    
    // Notify nurse and resident
    await scheduleNotification(
      '🚨 HYPERTENSIVE EMERGENCY',
      `Confirmed emergency${location}. BP: ${systolic}/${diastolic}. Immediate treatment required.`,
      { patientId, event: 'confirmed_emergency', priority: 'critical' },
      priority
    );

    // Create notifications for both roles
    await DatabaseService.createNotification(
      priority,
      'HYPERTENSIVE EMERGENCY CONFIRMED',
      `Patient${location} has confirmed severe hypertension (BP: ${systolic}/${diastolic}). Immediate intervention required.`,
      'nurse',
      undefined,
      patientId
    );

    await DatabaseService.createNotification(
      priority,
      'HYPERTENSIVE EMERGENCY - ACTION REQUIRED',
      `New emergency${location}. BP: ${systolic}/${diastolic}. Select treatment algorithm.`,
      'resident',
      undefined,
      patientId
    );
  }

  /**
   * Dispatch notification when medication is ordered
   */
  static async notifyMedicationOrdered(
    patientId: string,
    medicationName: string,
    dose: string,
    orderedBy: string
  ) {
    await scheduleNotification(
      'Medication Ordered',
      `${medicationName} ${dose} ordered by resident. Administer dose.`,
      { patientId, event: 'medication_ordered' },
      'info'
    );

    await DatabaseService.createNotification(
      'info',
      'Medication Order Ready',
      `${medicationName} ${dose} has been ordered. Please administer.`,
      'nurse',
      undefined,
      patientId
    );
  }

  /**
   * Dispatch notification when medication is administered
   */
  static async notifyMedicationAdministered(
    patientId: string,
    medicationName: string,
    dose: string,
    waitMinutes: number
  ) {
    await DatabaseService.createNotification(
      'info',
      'Medication Administered',
      `${medicationName} ${dose} administered. Recheck BP in ${waitMinutes} minutes.`,
      'resident',
      undefined,
      patientId
    );
  }

  /**
   * Dispatch notification when emergency session is resolved
   */
  static async notifySessionResolved(
    patientId: string,
    details: string,
    roomNumber?: string
  ) {
    const roomInfo = roomNumber ? `Room ${roomNumber}` : `Patient ${patientId.substring(0, 8)}`;
    
    await DatabaseService.createNotification(
      'info',
      '✓ BP Emergency Resolved',
      `${roomInfo}: ${details}. Emergency session closed.`,
      undefined,
      undefined,
      patientId
    );
  }

  /**
   * Dispatch critical notification when timer expires
   */
  static async notifyTimerExpired(
    patientId: string,
    timerType: 'bp_recheck' | 'medication_wait',
    roomNumber?: string
  ) {
    const priority = WorkflowEngine.getNotificationPriority('timer_expired');
    const location = roomNumber ? ` (Room ${roomNumber})` : '';
    const message = timerType === 'bp_recheck' 
      ? `BP recheck timer expired${location}. Take confirmatory reading NOW.`
      : `Medication wait complete${location}. Check BP NOW.`;

    // Critical alert - notify nurse, resident, and charge nurse
    await scheduleNotification(
      '⚠️ TIMER EXPIRED',
      message,
      { patientId, event: 'timer_expired', priority: 'critical' },
      priority
    );

    const recipients: UserRole[] = ['nurse', 'resident', 'chargeNurse'];
    for (const role of recipients) {
      await DatabaseService.createNotification(
        priority,
        'TIMER EXPIRED - ACTION REQUIRED',
        message,
        role,
        undefined,
        patientId
      );
    }
  }

  /**
   * Dispatch STAT alert for algorithm failure
   */
  static async notifyAlgorithmFailure(
    patientId: string,
    algorithm: string,
    currentBP: string,
    roomNumber?: string
  ) {
    const priority = WorkflowEngine.getNotificationPriority('algorithm_failure');
    const location = roomNumber ? ` in Room ${roomNumber}` : '';
    
    // STAT alert - highest priority
    await scheduleNotification(
      '🚨 STAT ALERT - ALGORITHM FAILURE',
      `${algorithm} protocol failed${location}. Current BP: ${currentBP}. Specialist consultation required NOW.`,
      { patientId, event: 'algorithm_failure', priority: 'stat' },
      priority
    );

    // Notify attending and specialists
    await DatabaseService.createNotification(
      priority,
      'STAT CONSULTATION REQUIRED',
      `Hypertension algorithm failure${location}. ${algorithm} protocol completed without BP control. Current BP: ${currentBP}. Immediate specialist intervention required.`,
      'attending',
      undefined,
      patientId
    );

    // Also notify resident
    await DatabaseService.createNotification(
      priority,
      'ALGORITHM FAILURE - ESCALATED',
      `Maximum doses reached without BP control. Case escalated to attending. Continue monitoring.`,
      'resident',
      undefined,
      patientId
    );
  }

  /**
   * Dispatch notification for BP within target range
   */
  static async notifyBPControlled(patientId: string, bp: string) {
    await scheduleNotification(
      'BP Controlled',
      `Blood pressure now in target range: ${bp}. Continue monitoring.`,
      { patientId, event: 'bp_controlled' },
      'info'
    );

    await DatabaseService.createNotification(
      'info',
      'BP Within Target Range',
      `Patient BP controlled at ${bp}. Continue routine monitoring.`,
      'resident',
      undefined,
      patientId
    );
  }

  /**
   * Dispatch notification when asthma warning needed
   */
  static async notifyAsthmaWarning(patientId: string) {
    await DatabaseService.createNotification(
      'warning',
      'CAUTION: Patient Has Asthma',
      'Labetalol may be contraindicated. Consider alternative algorithm.',
      'resident',
      undefined,
      patientId
    );
  }
}
