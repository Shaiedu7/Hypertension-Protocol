import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { EmergencySessionProvider } from './src/contexts/EmergencySessionContext';
import { ModalProvider } from './src/contexts/ModalContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { registerForPushNotifications, setupNotificationListeners } from './src/services/notifications';
import { OfflineSyncService } from './src/services/offlineSyncService';
import TimerExpiredModal from './src/components/TimerExpiredModal';
import EscalationModal from './src/components/EscalationModal';

export default function App() {
  useEffect(() => {
    // Initialize offline sync
    OfflineSyncService.initialize();

    // Initialize push notifications
    registerForPushNotifications();

    // Set up notification listeners
    const cleanup = setupNotificationListeners(
      (notification) => {
        // Log received notification
        const type = notification.request.content.data?.type;
        console.log('Notification received:', type);
      },
      (response) => {
        // Handle notification tap
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);
        
        // Navigation and modal logic can be added here
        // For example: navigate to appropriate screen, show modal, etc.
        // This requires passing navigation ref from AppNavigator
      }
    );

    return cleanup;
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
