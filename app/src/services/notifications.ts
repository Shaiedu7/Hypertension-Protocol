import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';

console.log('[Notifications] Running in Expo Go:', isExpoGo);

// Completely avoid loading expo-notifications in Expo Go
let Notifications: any = null;
let handlerConfigured = false;

function getNotifications(): any {
  if (isExpoGo) {
    console.log('[Notifications] Skipping - Expo Go detected');
    return null;
  }
  if (Notifications) return Notifications;
  
  try {
    // Use require instead of dynamic import to avoid Metro bundling issues
    Notifications = require('expo-notifications');
    console.log('[Notifications] Module loaded successfully');
    return Notifications;
  } catch (e) {
    console.warn('[Notifications] Failed to load expo-notifications:', e);
    return null;
  }
}

function configureHandler() {
  if (isExpoGo || handlerConfigured) return;
  const notifications = getNotifications();
  if (!notifications) return;
  
  try {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    handlerConfigured = true;
  } catch (e) {
    console.warn('[Notifications] Failed to configure handler:', e);
  }
}

/**
 * Request permissions for push notifications
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Expo Go cannot do remote push; skip entirely
  if (isExpoGo) {
    console.log('[Notifications] Expo Go detected; skipping push registration.');
    return null;
  }

  try {
    configureHandler();
    const notifications = getNotifications();
    if (!notifications) return null;

    const { status: existingStatus } = await notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted:', finalStatus);
      return null;
    }

    console.log('[Notifications] Permission granted');

    const token = (await notifications.getExpoPushTokenAsync({
      projectId: '02cffa13-e2bd-48aa-a43b-277477f9df31',
    })).data;
    console.log('[Notifications] Push token:', token);

    // Android channels - only in production builds
    if (Platform.OS === 'android' && !__DEV__) {
      try {
        await notifications.setNotificationChannelAsync('critical', {
          name: 'Critical Alerts',
          importance: notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
        await notifications.setNotificationChannelAsync('high-priority', {
          name: 'High Priority',
          importance: notifications.AndroidImportance.HIGH,
        });
      } catch (e) {
        console.warn('[Notifications] Failed to set channels:', e);
      }
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Registration error:', error);
    return null;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  data: Record<string, any>,
  priority: 'info' | 'warning' | 'critical' | 'stat' = 'info',
  trigger: any = null
) {
  if (isExpoGo) return;

  try {
    configureHandler();
    const notifications = getNotifications();
    if (!notifications) return;

    const notificationId = await notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, priority },
        sound: true,
      },
      trigger,
    });
    console.log(`[Notifications] Scheduled: ${notificationId}`);
  } catch (error) {
    console.warn('[Notifications] Schedule failed:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  if (isExpoGo) return;

  try {
    const notifications = getNotifications();
    if (!notifications) return;
    await notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[Notifications] Cancel failed:', e);
  }
}

/**
 * Set up notification listeners
 */
export async function setupNotificationListeners(
  onNotificationReceived: (notification: any) => void,
  onNotificationResponse: (response: any) => void
): Promise<() => void> {
  if (isExpoGo) {
    return () => {};
  }

  try {
    configureHandler();
    const notifications = getNotifications();
    if (!notifications) return () => {};

    const receivedSub = notifications.addNotificationReceivedListener(onNotificationReceived);
    const responseSub = notifications.addNotificationResponseReceivedListener(onNotificationResponse);

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  } catch (e) {
    console.warn('[Notifications] Listener setup failed:', e);
    return () => {};
  }
}
