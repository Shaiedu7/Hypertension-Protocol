import { startActivity, stopActivity, updateActivity } from 'expo-live-activity';
import { Platform } from 'react-native';

export interface LiveActivityTimerData {
  timerType: 'bp_recheck' | 'medication_wait' | 'administration_deadline';
  expiresAt: string; // ISO string
  patientRoom: string;
}

export class LiveActivityService {
  private static currentActivityId: string | null = null;
  private static updateInterval: NodeJS.Timeout | null = null;
  private static currentTimerData: LiveActivityTimerData | null = null;

  /**
   * Check if Live Activities are available on this device
   */
  static async isAvailable(): Promise<boolean> {
    // Live Activities are only available on iOS 16.1+
    return Platform.OS === 'ios';
  }

  /**
   * Start a Live Activity for a timer
   */
  static async startTimerActivity(
    timerData: LiveActivityTimerData
  ): Promise<string | null> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        console.log('Live Activities not available (iOS only)');
        return null;
      }

      // End any existing activity first
      if (this.currentActivityId) {
        await this.endCurrentActivity();
      }

      const timerLabel = timerData.timerType === 'bp_recheck' 
        ? 'BP Recheck Timer' 
        : timerData.timerType === 'medication_wait'
        ? 'Medication Wait'
        : 'Administration Deadline';

      // Use milliseconds for Expo Live Activity
      const expiresTimestamp = new Date(timerData.expiresAt).getTime();
      
      console.log('[LiveActivity] Starting timer:', {
        expiresAt: timerData.expiresAt,
        expiresTimestamp,
        isMilliseconds: true
      });

      const activityId = startActivity(
        {
          title: `Room ${timerData.patientRoom || 'Patient'}`,
          subtitle: timerLabel,
          date: expiresTimestamp, // Pass date for native timer
          progressBar: {
            date: expiresTimestamp,
          },
        } as any,
        {
          backgroundColor: '#1a1a1a',
          titleColor: '#ffffff',
          subtitleColor: '#aaaaaa',
          progressViewTint: '#007AFF',
          progressViewLabelColor: '#ffffff',
          timerType: 'digital',
        }
      );

      if (activityId) {
        this.currentActivityId = activityId;
        this.currentTimerData = timerData;
        console.log('Live Activity started:', activityId);
        return activityId;
      }

      return null;
    } catch (error) {
      console.error('Failed to start Live Activity:', error);
      return null;
    }
  }

  /**
   * End the current Live Activity
   */
  static async endCurrentActivity(): Promise<void> {
    if (!this.currentActivityId) return;

    try {
      stopActivity(this.currentActivityId, {
        title: 'Timer Complete',
        subtitle: 'Check blood pressure now',
      });
      console.log('Live Activity ended:', this.currentActivityId);
      this.currentActivityId = null;
      this.currentTimerData = null;
    } catch (error) {
      console.error('Failed to end Live Activity:', error);
    }
  }

  /**
   * Update an existing Live Activity
   */
  static async updateActivity(
    timerData: LiveActivityTimerData
  ): Promise<void> {
    if (!this.currentActivityId) {
      // If no activity exists, start a new one
      await this.startTimerActivity(timerData);
      return;
    }

    try {
      const timerLabel = timerData.timerType === 'bp_recheck' 
        ? 'BP Recheck Timer' 
        : timerData.timerType === 'medication_wait'
        ? 'Medication Wait'
        : 'Administration Deadline';

      // Use milliseconds for Expo Live Activity
      const expiresTimestamp = new Date(timerData.expiresAt).getTime();

      updateActivity(this.currentActivityId, {
        title: `Room ${timerData.patientRoom || 'Patient'}`,
        subtitle: timerLabel,
        date: expiresTimestamp,
        progressBar: {
          date: expiresTimestamp,
        },
      } as any);
    } catch (error) {
      console.error('Failed to update Live Activity:', error);
    }
  }
}
