import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { EmergencySessionProvider } from './src/contexts/EmergencySessionContext';
import { ModalProvider } from './src/contexts/ModalContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OfflineSyncService } from './src/services/offlineSyncService';
import TimerExpiredModal from './src/components/TimerExpiredModal';
import EscalationModal from './src/components/EscalationModal';

export default function App() {
  useEffect(() => {
    // Initialize offline sync
    OfflineSyncService.initialize();

    let notificationCleanup: (() => void) | undefined;

    if (Constants.appOwnership !== 'expo') {
      (async () => {
        const { registerForPushNotifications, setupNotificationListeners } = await import('./src/services/notifications');

        // Initialize push notifications
        await registerForPushNotifications();

        // Set up notification listeners
        notificationCleanup = await setupNotificationListeners(
          (notification) => {
            const type = notification.request.content.data?.type;
            console.log('Notification received:', type);
          },
          (response) => {
            const data = response.notification.request.content.data;
            console.log('Notification tapped:', data);
          }
        );
      })();
    }

    return () => {
      if (notificationCleanup) {
        notificationCleanup();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EmergencySessionProvider>
          <ModalProvider>
            <AppNavigator />
            <TimerExpiredModal />
            <EscalationModal />
            <StatusBar style="auto" />
          </ModalProvider>
        </EmergencySessionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
