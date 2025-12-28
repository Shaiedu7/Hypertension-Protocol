// Utility functions for BP validation and protocol logic

import { BP_THRESHOLDS, MEDICATION_PROTOCOLS } from './constants';
import { MedicationAlgorithm, BloodPressureReading } from '../types';

/**
 * Check if BP reading is high (emergency threshold)
 */
export function isBPHigh(systolic: number, diastolic: number): boolean {
  return systolic >= BP_THRESHOLDS.SYSTOLIC_HIGH || diastolic >= BP_THRESHOLDS.DIASTOLIC_HIGH;
}

/**
 * Check if BP is within target range
 */
export function isBPInTargetRange(systolic: number, diastolic: number): boolean {
  return (
    systolic >= BP_THRESHOLDS.TARGET_SYSTOLIC_MIN &&
    systolic <= BP_THRESHOLDS.TARGET_SYSTOLIC_MAX &&
    diastolic >= BP_THRESHOLDS.TARGET_DIASTOLIC_MIN &&
    diastolic <= BP_THRESHOLDS.TARGET_DIASTOLIC_MAX
  );
}

/**
 * Get next medication dose for a given algorithm and step
 */
export function getNextDose(algorithm: MedicationAlgorithm, currentStep: number) {
  const protocol = MEDICATION_PROTOCOLS[algorithm];
  const nextStep = currentStep + 1;
  
  if (nextStep > protocol.maxDoses) {
    return null; // Escalation needed
  }
  
  return protocol.doses.find(d => d.step === nextStep) || null;
}

/**
 * Check if algorithm has failed (max doses reached)
 */
export function hasAlgorithmFailed(algorithm: MedicationAlgorithm, currentStep: number): boolean {
  const protocol = MEDICATION_PROTOCOLS[algorithm];
  return currentStep >= protocol.maxDoses;
}

/**
 * Calculate time remaining until next BP check
 */
export function calculateTimeRemaining(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 1000)); // Return seconds
}

/**
 * Format seconds into MM:SS
 */
export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format BP reading for display
 */
export function formatBP(systolic: number, diastolic: number): string {
  return `${systolic}/${diastolic}`;
}

/**
 * Validate positioning checklist completion
 */
export function isPositioningComplete(checklist: Record<string, boolean>): boolean {
  return Object.values(checklist).every(value => value === true);
}
