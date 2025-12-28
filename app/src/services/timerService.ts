// Timer Management Service
// Handles creation, tracking, and expiration of protocol timers

import { supabase, TABLES } from './supabase';
import { Timer } from '../types';
import { scheduleNotification } from './notifications';

export class TimerService {
  /**
   * Create a BP recheck timer (15 minutes after first high BP)
   */
  static async createBPRecheckTimer(patientId: string): Promise<Timer> {
    const durationMinutes = 15;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from(TABLES.TIMERS)
      .insert({
        patient_id: patientId,
        type: 'bp_recheck',
        duration_minutes: durationMinutes,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule local notification
    await scheduleNotification(
      'BP Recheck Required',
      'Time to take confirmatory blood pressure reading',
      { patientId, type: 'bp_recheck' },
      'warning'
    );

    return data as Timer;
  }

  /**
   * Create an administration deadline timer (30-60 min after emergency confirmed)
   * Per RWJ protocol: medication should be administered within 30-60 minutes
   */
  static async createAdministrationDeadlineTimer(patientId: string): Promise<Timer> {
    // Using 45 minutes as midpoint of 30-60 min window
    const durationMinutes = 45;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from(TABLES.TIMERS)
      .insert({
        patient_id: patientId,
        type: 'administration_deadline',
        duration_minutes: durationMinutes,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule urgent notification
    await scheduleNotification(
      '🚨 MEDICATION DEADLINE',
      'First medication dose must be administered soon (30-60 min window)',
      { patientId, type: 'administration_deadline' },
      'critical'
    );

    return data as Timer;
  }
  /**
   * Create a medication wait timer
   */
  static async createMedicationWaitTimer(
    patientId: string,
    waitMinutes: number
  ): Promise<Timer> {
    const expiresAt = new Date(Date.now() + waitMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from(TABLES.TIMERS)
      .insert({
        patient_id: patientId,
        type: 'medication_wait',
        duration_minutes: waitMinutes,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule local notification for when timer expires
    await scheduleNotification(
      'BP Check Required',
      `Time to check blood pressure (${waitMinutes} min wait complete)`,
      { patientId, type: 'medication_wait' },
      'critical'
    );

    return data as Timer;
  }

  /**
   * Deactivate a timer
   */
  static async deactivateTimer(timerId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.TIMERS)
      .update({ 
        is_active: false
      })
      .eq('id', timerId);

    if (error) throw error;
  }

  /**
   * Mark timer as expired
   */
  static async markTimerExpired(timerId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.TIMERS)
      .update({ 
        is_active: false
      })
      .eq('id', timerId);

    if (error) throw error;
  }

  /**
   * Get active timer for a patient
   */
  static async getActiveTimer(patientId: string): Promise<Timer | null> {
    const { data, error } = await supabase
      .from(TABLES.TIMERS)
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as Timer;
  }

  /**
   * Check if timer has expired
   */
  static isTimerExpired(timer: Timer): boolean {
    return new Date(timer.expires_at) <= new Date();
  }

  /**
   * Get time remaining in seconds
   */
  static getTimeRemaining(timer: Timer): number {
    const now = new Date();
    const expiry = new Date(timer.expires_at);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.floor(diffMs / 1000); // Can be negative when overdue
  }

  /**
   * Deactivate all timers for a patient
   */
  static async deactivateAllTimers(patientId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.TIMERS)
      .update({ is_active: false })
      .eq('patient_id', patientId)
      .eq('is_active', true);

    if (error) throw error;
  }
}
