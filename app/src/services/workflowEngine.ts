// Protocol Workflow Engine
// Manages protocol progression and determines next steps based on current state

import { MedicationAlgorithm, EmergencySession, BloodPressureReading, MedicationDose } from '../types';
import { MEDICATION_PROTOCOLS, BP_THRESHOLDS, TIMING } from '../utils/constants';
import { isBPHigh, hasAlgorithmFailed } from '../utils/helpers';

export interface WorkflowState {
  stage: 'observation' | 'first_high_bp' | 'confirmed_emergency' | 'treatment' | 'escalated' | 'resolved';
  nextAction: string;
  nextActionTime?: Date;
  canProceed: boolean;
  requiresEscalation: boolean;
  warnings: string[];
}

export interface ProtocolStep {
  stepNumber: number;
  action: string;
  doseAmount: number;
  unit: string;
  waitMinutes: number;
  nextCheckTime?: Date;
}

export class WorkflowEngine {
  /**
   * Determine current workflow state based on BP readings and medications
   */
  static getWorkflowState(
    bpReadings: BloodPressureReading[],
    session: EmergencySession | null,
    medications: MedicationDose[],
    patientHasAsthma: boolean
  ): WorkflowState {
    const warnings: string[] = [];

    // No readings yet
    if (bpReadings.length === 0) {
      return {
        stage: 'observation',
        nextAction: 'Record initial BP reading',
        canProceed: true,
        requiresEscalation: false,
        warnings,
      };
    }

    const latestBP = bpReadings[0];
    const isLatestHigh = isBPHigh(latestBP.systolic, latestBP.diastolic);

    // First high BP reading
    if (isLatestHigh && bpReadings.length === 1) {
      return {
        stage: 'first_high_bp',
        nextAction: 'Complete positioning checklist and wait 15 minutes for confirmatory reading',
        nextActionTime: new Date(Date.now() + TIMING.INITIAL_BP_RECHECK_MINUTES * 60 * 1000),
        canProceed: false,
        requiresEscalation: false,
        warnings: ['⚠️ First high BP reading detected. Confirm positioning and recheck in 15 minutes.'],
      };
    }

    // Check if emergency confirmed (2nd high reading)
    if (isLatestHigh && bpReadings.length >= 2) {
      const secondReading = bpReadings[1];
      if (isBPHigh(secondReading.systolic, secondReading.diastolic)) {
        
        // Check if session exists
        if (!session) {
          return {
            stage: 'confirmed_emergency',
            nextAction: 'EMERGENCY: Notify resident and select treatment algorithm',
            canProceed: true,
            requiresEscalation: false,
            warnings: ['🚨 CONFIRMED HYPERTENSIVE EMERGENCY - Immediate treatment required'],
          };
        }

        // Emergency session exists - check treatment progress
        if (session.status === 'escalated') {
          return {
            stage: 'escalated',
            nextAction: 'Await specialist intervention',
            canProceed: false,
            requiresEscalation: true,
            warnings: ['🚨 CASE ESCALATED TO SPECIALIST'],
          };
        }

        // Check if algorithm selected
        if (!session.algorithm_selected) {
          return {
            stage: 'confirmed_emergency',
            nextAction: 'Resident: Select treatment algorithm (Labetalol/Hydralazine/Nifedipine)',
            canProceed: true,
            requiresEscalation: false,
            warnings: ['🚨 CONFIRMED EMERGENCY - Algorithm selection required'],
          };
        }

        // Check for asthma warning with Labetalol
        if (session.algorithm_selected === 'labetalol' && patientHasAsthma) {
          warnings.push('⚠️ CAUTION: Patient has asthma - Labetalol may be contraindicated');
        }

        // In treatment - check if algorithm failed
        const protocol = MEDICATION_PROTOCOLS[session.algorithm_selected];
        if (hasAlgorithmFailed(session.algorithm_selected, session.current_step)) {
          return {
            stage: 'treatment',
            nextAction: 'ALGORITHM FAILURE: Escalate to attending and switch protocol',
            canProceed: false,
            requiresEscalation: true,
            warnings: [
              '🚨 ALGORITHM FAILURE: Maximum doses reached without BP control',
              '🚨 STAT consult required: MFM, Internal Medicine, Anesthesia, or Critical Care',
            ],
          };
        }

        // Get next protocol step
        const nextStep = this.getNextProtocolStep(session.algorithm_selected, session.current_step);
        
        if (nextStep) {
          // Check if we're waiting for a medication to be administered
          const lastMed = medications[medications.length - 1];
          if (lastMed && !lastMed.administered_at) {
            return {
              stage: 'treatment',
              nextAction: `Nurse: Administer ${nextStep.action}`,
              canProceed: true,
              requiresEscalation: false,
              warnings,
            };
          }

          // Check if we're in waiting period
          if (lastMed && lastMed.administered_at && lastMed.next_bp_check_at) {
            const checkTime = new Date(lastMed.next_bp_check_at);
            if (checkTime > new Date()) {
              return {
                stage: 'treatment',
                nextAction: `Wait ${nextStep.waitMinutes} minutes, then recheck BP`,
                nextActionTime: checkTime,
                canProceed: false,
                requiresEscalation: false,
                warnings: [...warnings, `Target BP: 130-150 / 80-100 mmHg`],
              };
            }
          }

          // Ready for next dose order
          return {
            stage: 'treatment',
            nextAction: `Resident: Order ${nextStep.action}`,
            canProceed: true,
            requiresEscalation: false,
            warnings: [...warnings, `Step ${nextStep.stepNumber} of ${protocol.maxDoses}`],
          };
        }
      }
    }

    // BP normalized
    return {
      stage: 'resolved',
      nextAction: 'BP within target range - Continue monitoring',
      canProceed: true,
      requiresEscalation: false,
      warnings: ['✅ BP controlled'],
    };
  }

  /**
   * Get the next protocol step for a given algorithm
   */
  static getNextProtocolStep(algorithm: MedicationAlgorithm, currentStep: number): ProtocolStep | null {
    const protocol = MEDICATION_PROTOCOLS[algorithm];
    const nextStepNumber = currentStep + 1;

    if (nextStepNumber > protocol.maxDoses) {
      return null; // Escalation needed
    }

    const dose = protocol.doses.find(d => d.step === nextStepNumber);
    if (!dose) return null;

    return {
      stepNumber: dose.step,
      action: `${dose.medication} ${dose.dose} ${dose.route}`,
      doseAmount: parseFloat(dose.dose.replace(/\D/g, '')),
      unit: 'mg',
      waitMinutes: dose.waitTime,
    };
  }

  /**
   * Get all steps for a protocol algorithm (for display)
   */
  static getProtocolSteps(algorithm: MedicationAlgorithm): ProtocolStep[] {
    const protocol = MEDICATION_PROTOCOLS[algorithm];
    return protocol.doses.map(dose => ({
      stepNumber: dose.step,
      action: `${dose.medication} ${dose.dose} ${dose.route}`,
      doseAmount: parseFloat(dose.dose.replace(/\D/g, '')),
      unit: 'mg',
      waitMinutes: dose.waitTime,
    }));
  }

  /**
   * Determine which roles should be notified based on event
   */
  static getNotificationRecipients(event: string): ('nurse' | 'resident' | 'attending' | 'chargeNurse')[] {
    switch (event) {
      case 'first_high_bp':
        return ['nurse'];
      case 'confirmed_emergency':
        return ['nurse', 'resident'];
      case 'medication_ordered':
        return ['nurse'];
      case 'medication_administered':
        return ['resident'];
      case 'timer_expired':
        return ['nurse', 'resident', 'chargeNurse'];
      case 'algorithm_failure':
        return ['attending', 'resident'];
      default:
        return [];
    }
  }

  /**
   * Determine notification priority
   */
  static getNotificationPriority(event: string): 'info' | 'warning' | 'critical' | 'stat' {
    switch (event) {
      case 'first_high_bp':
        return 'info';
      case 'confirmed_emergency':
        return 'critical';
      case 'medication_ordered':
        return 'info';
      case 'timer_expired':
        return 'critical';
      case 'algorithm_failure':
        return 'stat';
      default:
        return 'info';
    }
  }

  /**
   * Check if BP is within target range
   */
  static isBPInTarget(systolic: number, diastolic: number): boolean {
    return (
      systolic >= BP_THRESHOLDS.TARGET_SYSTOLIC_MIN &&
      systolic <= BP_THRESHOLDS.TARGET_SYSTOLIC_MAX &&
      diastolic >= BP_THRESHOLDS.TARGET_DIASTOLIC_MIN &&
      diastolic <= BP_THRESHOLDS.TARGET_DIASTOLIC_MAX
    );
  }
}
