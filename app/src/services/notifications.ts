import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority;
    
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: priority === 'critical' || priority === 'stat',
      shouldSetBadge: true,
    };
  },
});

/**
 * Request permissions for push notifications
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: '02cffa13-e2bd-48aa-a43b-277477f9df31',
    })).data;
    console.log('Push token:', token);

    // Android specific configuration
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('critical', {
        name: 'Critical Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('high-priority', {
        name: 'High Priority',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
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
  priority: 'info' | 'warning' | 'critical' | 'stat' = 'info'
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, priority },
        priority: priority === 'critical' || priority === 'stat' 
          ? Notifications.AndroidNotificationPriority.MAX 
          : Notifications.AndroidNotificationPriority.HIGH,
        sound: priority === 'critical' || priority === 'stat' ? 'default' : false,
      },
      trigger: null, // Trigger immediately
    });
  } catch (error) {
    console.warn('Failed to schedule notification:', error);
    // Don't throw, just log - notifications are enhancement, not critical path
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
