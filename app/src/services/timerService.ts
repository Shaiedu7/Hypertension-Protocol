// Timer Management Service
// Handles creation, tracking, and expiration of protocol timers

import { supabase, TABLES } from './supabase';
import { Timer } from '../types';
import { scheduleNotification } from './notifications';
import { LiveActivityService } from './liveActivityService';

export class TimerService {
  /**
   * Create a BP recheck timer (15 minutes after first high BP)
   */
  static async createBPRecheckTimer(patientId: string, patientRoom?: string): Promise<Timer> {
    const durationSeconds = 10; // 10 seconds for testing
    const durationMinutes = 1; // Store as 1 minute in DB (minimum integer)
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

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

    // Schedule a time-based notification so it fires even if app is backgrounded/killed
    await scheduleNotification(
      'BP Recheck Due',
      'Take confirmatory blood pressure reading now.',
      { patientId, type: 'bp_recheck' },
      'critical',
      { type: 'timeInterval', seconds: durationSeconds, repeats: false }
    );

    // Start Live Activity for the timer
    await LiveActivityService.startTimerActivity({
      timerType: 'bp_recheck',
      expiresAt: expiresAt.toISOString(),
      patientRoom: patientRoom || 'Patient'
    });

    return data as Timer;
  }

  /**
   * Create an administration deadline timer (30-60 min after emergency confirmed)
   * Per RWJ protocol: medication should be administered within 30-60 minutes
   */
  static async createAdministrationDeadlineTimer(patientId: string, patientRoom?: string): Promise<Timer> {
    // Using 45 minutes as midpoint of 30-60 min window
    const durationSeconds = 10; // 10 seconds for testing
    const durationMinutes = 1; // Store as 1 minute in DB (minimum integer)
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

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

    // Notify resident - they need to select algorithm and order medication
    const location = patientRoom ? ` (Room ${patientRoom})` : '';
    await scheduleNotification(
      '⏰ MEDICATION DEADLINE',
      `Select algorithm and order first dose${location}. Must be administered within 45 minutes.`,
      { patientId, type: 'administration_deadline' },
      'critical'
    );

    // Create database notification for resident only (next action required by them)
    const { DatabaseService } = await import('./databaseService');
    await DatabaseService.createNotification(
      'critical',
      'MEDICATION DEADLINE - SELECT ALGORITHM',
      `Emergency protocol requires first medication dose within 30-60 minutes${location}. Select treatment algorithm and order medication immediately.`,
      'resident',
      undefined,
      patientId
    );

    return data as Timer;
  }
  /**
   * Create a medication wait timer
   */
  static async createMedicationWaitTimer(
    patientId: string,
    waitMinutes: number,
    patientRoom?: string
  ): Promise<Timer> {
    const expiresAt = new Date(Date.now() + waitMinutes * 60 * 1000);
    const durationMinutesForDb = Math.max(1, Math.round(waitMinutes)); // Store as integer, minimum 1

    const { data, error } = await supabase
      .from(TABLES.TIMERS)
      .insert({
        patient_id: patientId,
        type: 'medication_wait',
        duration_minutes: durationMinutesForDb,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Create database notification for nurse (they need to record next BP)
    const { DatabaseService } = await import('./databaseService');
    const location = patientRoom ? ` (Room ${patientRoom})` : '';
    await DatabaseService.createNotification(
      'critical',
      'MEDICATION WAIT COMPLETE - BP CHECK REQUIRED',
      `${waitMinutes}-minute wait period complete${location}. Record blood pressure now to assess medication response.`,
      'nurse',
      undefined,
      patientId
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

    // End Live Activity when timer is deactivated
    await LiveActivityService.endCurrentActivity();
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

    // End Live Activity when all timers are deactivated
    await LiveActivityService.endCurrentActivity();
  }
}
