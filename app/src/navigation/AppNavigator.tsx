import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

// Placeholder screens - to be implemented
import LoginScreen from '../screens/LoginScreen';
import NurseDashboard from '../screens/nurse/NurseDashboard';
import BPEntryScreen from '../screens/nurse/BPEntryScreen';
import ResidentDashboard from '../screens/resident/ResidentDashboard';
import AttendingDashboard from '../screens/attending/AttendingDashboard';
import ChargeNurseDashboard from '../screens/chargeNurse/ChargeNurseDashboard';

const Stack = createStackNavigator();

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // TODO: Add loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {user.role === 'nurse' && (
              <>
                <Stack.Screen name="NurseDashboard" component={NurseDashboard} />
                <Stack.Screen name="BPEntry" component={BPEntryScreen} />
              </>
            )}
            {user.role === 'resident' && (
              <>
                <Stack.Screen name="ResidentDashboard" component={ResidentDashboard} />
                <Stack.Screen name="BPEntry" component={BPEntryScreen} />
              </>
            )}
            {user.role === 'attending' && (
              <>
                <Stack.Screen name="AttendingDashboard" component={AttendingDashboard} />
                <Stack.Screen name="BPEntry" component={BPEntryScreen} />
              </>
            )}
            {user.role === 'chargeNurse' && (
              <>
                <Stack.Screen name="ChargeNurseDashboard" component={ChargeNurseDashboard} />
                <Stack.Screen name="BPEntry" component={BPEntryScreen} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
