import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-loaded expo-live-activity functions
let liveActivityModule: any = null;
let loadAttempted = false;

async function getLiveActivityModule(): Promise<any> {
  if (isExpoGo) return null;
  if (loadAttempted) return liveActivityModule;
  
  loadAttempted = true;
  try {
    liveActivityModule = await import('expo-live-activity');
    console.log('[LiveActivity] Module loaded successfully');
    return liveActivityModule;
  } catch (e) {
    console.log('[LiveActivity] Native module not available (Expo Go mode)');
    return null;
  }
}

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
    if (isExpoGo || Platform.OS !== 'ios') return false;
    const mod = await getLiveActivityModule();
    return mod !== null;
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
        console.log('[LiveActivity] Not available');
        return null;
      }

      const mod = await getLiveActivityModule();
      if (!mod) return null;

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

      const activityId = mod.startActivity(
        {
          title: `Room ${timerData.patientRoom || 'Patient'}`,
          subtitle: timerLabel,
          date: expiresTimestamp,
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
        console.log('[LiveActivity] Started:', activityId);
        return activityId;
      }

      return null;
    } catch (error) {
      console.error('[LiveActivity] Start failed:', error);
      return null;
    }
  }

  /**
   * End the current Live Activity
   */
  static async endCurrentActivity(): Promise<void> {
    if (!this.currentActivityId) return;

    try {
      const mod = await getLiveActivityModule();
      if (!mod) {
        this.currentActivityId = null;
        this.currentTimerData = null;
        return;
      }

      mod.stopActivity(this.currentActivityId, {
        title: 'Timer Complete',
        subtitle: 'Check blood pressure now',
      });
      console.log('[LiveActivity] Ended:', this.currentActivityId);
      this.currentActivityId = null;
      this.currentTimerData = null;
    } catch (error) {
      console.error('[LiveActivity] End failed:', error);
    }
  }

  /**
   * Update an existing Live Activity
   */
  static async updateActivity(
    timerData: LiveActivityTimerData
  ): Promise<void> {
    if (!this.currentActivityId) {
      await this.startTimerActivity(timerData);
      return;
    }

    try {
      const mod = await getLiveActivityModule();
      if (!mod) return;

      const timerLabel = timerData.timerType === 'bp_recheck' 
        ? 'BP Recheck Timer' 
        : timerData.timerType === 'medication_wait'
        ? 'Medication Wait'
        : 'Administration Deadline';

      const expiresTimestamp = new Date(timerData.expiresAt).getTime();

      mod.updateActivity(this.currentActivityId, {
        title: `Room ${timerData.patientRoom || 'Patient'}`,
        subtitle: timerLabel,
        date: expiresTimestamp,
        progressBar: {
          date: expiresTimestamp,
        },
      } as any);
    } catch (error) {
      console.error('[LiveActivity] Update failed:', error);
    }
  }
}
