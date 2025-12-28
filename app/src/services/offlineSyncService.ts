// Offline Sync Service
// Queues actions locally and syncs when connection is restored

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedAction {
  id: string;
  timestamp: string;
  action: 'bp_reading' | 'medication_order' | 'medication_admin' | 'session_start';
  data: Record<string, any>;
  retryCount: number;
}

const QUEUE_KEY = '@offline_queue';
const MAX_RETRIES = 3;

export class OfflineSyncService {
  private static isOnline: boolean = true;
  private static syncInProgress: boolean = false;

  /**
   * Initialize the offline sync service
   */
  static async initialize() {
    // Listen for network changes
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // If we just came back online, sync queued actions
      if (wasOffline && this.isOnline) {
        this.syncQueuedActions();
      }
    });

    // Check initial state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
  }

  /**
   * Add an action to the offline queue
   */
  static async queueAction(
    action: QueuedAction['action'],
    data: Record<string, any>
  ): Promise<void> {
    const queuedAction: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      data,
      retryCount: 0,
    };

    try {
      const queue = await this.getQueue();
      queue.push(queuedAction);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      console.log('Action queued for offline sync:', action);
    } catch (error) {
      console.error('Error queuing action:', error);
    }
  }

  /**
   * Get the current queue
   */
  private static async getQueue(): Promise<QueuedAction[]> {
    try {
      const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch (error) {
      console.error('Error reading queue:', error);
      return [];
    }
  }

  /**
   * Save the queue
   */
  private static async saveQueue(queue: QueuedAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  /**
   * Sync all queued actions
   */
  static async syncQueuedActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      const queue = await this.getQueue();
      const failedActions: QueuedAction[] = [];

      for (const action of queue) {
        try {
          // Attempt to process the action
          await this.processAction(action);
          console.log('Successfully synced action:', action.id);
        } catch (error) {
          console.error('Failed to sync action:', action.id, error);
          
          // Increment retry count
          action.retryCount++;
          
          if (action.retryCount < MAX_RETRIES) {
            failedActions.push(action);
          } else {
            console.error('Max retries reached for action:', action.id);
            // TODO: Log to error tracking service
          }
        }
      }

      // Update queue with only failed actions
      await this.saveQueue(failedActions);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a queued action
   */
  private static async processAction(action: QueuedAction): Promise<void> {
    // Import services dynamically to avoid circular dependencies
    const { supabase, TABLES } = await import('./supabase');

    switch (action.action) {
      case 'bp_reading':
        await supabase.from(TABLES.BP_READINGS).insert(action.data);
        break;
      
      case 'medication_order':
        await supabase.from(TABLES.MEDICATIONS).insert(action.data);
        break;
      
      case 'medication_admin':
        await supabase
          .from(TABLES.MEDICATIONS)
          .update(action.data)
          .eq('id', action.data.id);
        break;
      
      case 'session_start':
        await supabase.from(TABLES.EMERGENCY_SESSIONS).insert(action.data);
        break;
      
      default:
        console.warn('Unknown action type:', action.action);
    }
  }

  /**
   * Check if currently online
   */
  static isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get count of queued actions
   */
  static async getQueuedCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clear the queue (use with caution)
   */
  static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}
