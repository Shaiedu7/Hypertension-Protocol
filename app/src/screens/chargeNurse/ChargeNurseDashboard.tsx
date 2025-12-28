import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/databaseService';
import { Patient, EmergencySession, Timer } from '../../types';
import PatientCard from '../../components/PatientCard';
import TimerCountdown from '../../components/TimerCountdown';

interface PatientWithEmergency {
  patient: Patient;
  session: EmergencySession;
  timer: Timer | null;
  minutesUntilAction: number;
}

export default function ChargeNurseDashboard() {
  const { user, signOut } = useAuth();
  const [emergencies, setEmergencies] = useState<PatientWithEmergency[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllEmergencies();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadAllEmergencies, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllEmergencies = async () => {
    try {
      const sessions = await DatabaseService.getActiveEmergencySessions();
      const emergenciesWithTimers: PatientWithEmergency[] = [];

      for (const session of sessions) {
        const patient = await DatabaseService.getPatient(session.patient_id);
        const timer = await DatabaseService.getActiveTimer(session.patient_id);
        
        let minutesUntilAction = Infinity;
        if (timer?.is_active) {
          const now = new Date();
          const expiresAt = new Date(timer.expires_at);
          minutesUntilAction = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000));
        }

        if (patient) {
          emergenciesWithTimers.push({
            patient,
            session,
            timer,
            minutesUntilAction,
          });
        }
      }

      // Sort by urgency: timers about to expire first
      emergenciesWithTimers.sort((a, b) => a.minutesUntilAction - b.minutesUntilAction);
      
      setEmergencies(emergenciesWithTimers);
    } catch (error) {
      console.error('Error loading emergencies:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllEmergencies();
    setRefreshing(false);
  };

  const getStatusColor = (session: EmergencySession): string => {
    if (session.status === 'escalated') return '#dc3545';
    if (session.algorithm_selected) return '#ffc107';
    return '#17a2b8';
  };

  const getStatusText = (session: EmergencySession): string => {
    if (session.status === 'escalated') return 'ESCALATED';
    if (session.algorithm_selected) return `Treatment: ${session.algorithm_selected.toUpperCase()}`;
    return 'Observation';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.protocolBanner}>
        <Text style={styles.protocolText}>RWJ Hypertension Emergency Protocol</Text>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Charge Nurse Dashboard</Text>
          <Text style={styles.subtitle}>{user?.name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{emergencies.length}</Text>
          <Text style={styles.statLabel}>Active Emergencies</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#dc3545' }]}>
            {emergencies.filter(e => e.session.status === 'escalated').length}
          </Text>
          <Text style={styles.statLabel}>Escalated</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#ffc107' }]}>
            {emergencies.filter(e => e.minutesUntilAction < 5 && e.timer).length}
          </Text>
          <Text style={styles.statLabel}>Urgent (&lt;5min)</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.scrollView}
      >
        {emergencies.length === 0 ? (
          <Text style={styles.emptyText}>No active emergencies</Text>
        ) : (
          emergencies.map(({ patient, session, timer }) => (
            <View key={session.id} style={styles.emergencyCard}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session) }]}>
                <Text style={styles.statusText}>{getStatusText(session)}</Text>
              </View>

              <PatientCard patient={patient} emergencySession={session} showDetails />

              {timer?.is_active && (
                <View style={styles.timerContainer}>
                  <TimerCountdown timer={timer} size="medium" />
                </View>
              )}

              <View style={styles.sessionDetails}>
                <Text style={styles.detailText}>
                  Started: {new Date(session.initiated_at).toLocaleTimeString()}
                </Text>
                <Text style={styles.detailText}>Step: {session.current_step}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  protocolBanner: {
    backgroundColor: '#e8f4f8',
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#0066cc',
  },
  protocolText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#003d99',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  signOut: {
    fontSize: 16,
    color: '#c41e3a',
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#17a2b8',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emergencyCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBadge: {
    padding: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timerContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 48,
  },
});
