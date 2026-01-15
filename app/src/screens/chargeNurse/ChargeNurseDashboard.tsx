import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/databaseService';
import { subscribeToDashboardUpdates } from '../../services/realtimeService';
import { Patient, EmergencySession, Timer } from '../../types';
import PatientCard from '../../components/PatientCard';
import TimerCountdown from '../../components/TimerCountdown';

interface PatientWithEmergency {
  patient: Patient;
  session: EmergencySession | null;
  timer: Timer | null;
  minutesUntilAction: number;
  latestBP?: { systolic: number; diastolic: number; recordedBy?: string };
}

export default function ChargeNurseDashboard({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [emergencies, setEmergencies] = useState<PatientWithEmergency[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllEmergencies();

    const subscription = subscribeToDashboardUpdates(loadAllEmergencies);
    return () => subscription.unsubscribe();
  }, []);

  const loadAllEmergencies = async () => {
    try {
      // Get all active emergency sessions
      const sessions = await DatabaseService.getActiveEmergencySessions();
      const emergenciesWithTimers: PatientWithEmergency[] = [];

      // First, add patients with confirmed emergency sessions
      for (const session of sessions) {
        const patient = await DatabaseService.getPatient(session.patient_id);
        const timer = await DatabaseService.getActiveTimer(session.patient_id);
        const latestBP = await DatabaseService.getLatestBPReading(session.patient_id);
        
        let recordedByName = undefined;
        if (latestBP?.recorded_by) {
          const recordedByUser = await DatabaseService.getUser(latestBP.recorded_by);
          recordedByName = recordedByUser?.name || recordedByUser?.email || 'Unknown';
        }
        
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
            latestBP: latestBP ? { 
              systolic: latestBP.systolic, 
              diastolic: latestBP.diastolic,
              recordedBy: recordedByName 
            } : undefined,
          });
        }
      }

      // Now, add ALL other patients (including those with normal BP)
      const allPatients = await DatabaseService.getAllActivePatients();
      for (const patient of allPatients) {
        // Skip if already in emergencies list
        if (emergenciesWithTimers.some(e => e.patient.id === patient.id)) continue;

        const timer = await DatabaseService.getActiveTimer(patient.id);
        const latestBP = await DatabaseService.getLatestBPReading(patient.id);
        
        let recordedByName = undefined;
        if (latestBP?.recorded_by) {
          const recordedByUser = await DatabaseService.getUser(latestBP.recorded_by);
          recordedByName = recordedByUser?.name || recordedByUser?.email || 'Unknown';
        }
        
        // Include ALL patients - charge nurses need to see everyone
        let minutesUntilAction = Infinity;
        if (timer?.is_active) {
          const now = new Date();
          const expiresAt = new Date(timer.expires_at);
          minutesUntilAction = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000));
        }

        emergenciesWithTimers.push({
          patient,
          session: null, // No emergency session - normal or observation
          timer,
          minutesUntilAction,
          latestBP: latestBP ? { 
            systolic: latestBP.systolic, 
            diastolic: latestBP.diastolic,
            recordedBy: recordedByName 
          } : undefined,
        });
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

  const handlePatientPress = (patient: Patient) => {
    navigation.navigate('BPEntry', { patient });
  };

  const getStatusColor = (session: EmergencySession | null, timer: Timer | null): string => {
    if (!session && !timer) return '#28a745'; // Green for normal
    if (!session) return '#6c757d'; // Gray for observation
    if (session.status === 'escalated') return '#dc3545';
    if (session.algorithm_selected) return '#ffc107';
    return '#17a2b8';
  };

  const getStatusText = (session: EmergencySession | null, timer: Timer | null): string => {
    if (!session && !timer) return 'NORMAL';
    if (!session) return 'OBSERVATION';
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
          <Text style={styles.statNumber}>
            {emergencies.filter(e => e.session || e.timer).length}
          </Text>
          <Text style={styles.statLabel}>Total Cases</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#6c757d' }]}>
            {emergencies.filter(e => !e.session && e.timer).length}
          </Text>
          <Text style={styles.statLabel}>Observation</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#17a2b8' }]}>
            {emergencies.filter(e => e.session && e.session.status !== 'escalated').length}
          </Text>
          <Text style={styles.statLabel}>Emergency</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#dc3545' }]}>
            {emergencies.filter(e => e.session?.status === 'escalated').length}
          </Text>
          <Text style={styles.statLabel}>Escalated</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.scrollView}
      >
        {emergencies.length === 0 ? (
          <Text style={styles.emptyText}>No active cases</Text>
        ) : (
          emergencies.map(({ patient, session, timer, latestBP }) => {
            const isNormal = !session && !timer;
            
            return (
              <TouchableOpacity key={session?.id || patient.id} onPress={() => handlePatientPress(patient)}>
                {isNormal ? (
                  // Compressed card for normal patients
                  <View style={styles.compactCard}>
                    <View style={styles.compactBody}>
                      <View style={styles.compactLeft}>
                        <View style={styles.compactRoomRow}>
                          <Text style={styles.compactRoom}>
                            {patient.room_number ? `Room ${patient.room_number}` : patient.anonymous_identifier}
                          </Text>
                          <View style={[styles.compactStatusBadge, { backgroundColor: '#28a745' }]}>
                            <Text style={styles.compactStatusText}>NORMAL</Text>
                          </View>
                        </View>
                        {patient.has_asthma && (
                          <Text style={styles.compactAsthmaText}>⚠️ Asthma</Text>
                        )}
                      </View>
                      <View style={styles.compactRight}>
                        {latestBP && (
                          <Text style={styles.compactBP}>{latestBP.systolic}/{latestBP.diastolic}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  // Full card for active cases
                  <View style={styles.emergencyCard}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session, timer) }]}>
                      <Text style={styles.statusText}>{getStatusText(session, timer)}</Text>
                    </View>

                    <PatientCard patient={patient} emergencySession={session} showDetails />

                    {latestBP && (
                      <View style={styles.bpDisplay}>
                        <Text style={styles.bpText}>Latest BP: {latestBP.systolic}/{latestBP.diastolic} mmHg</Text>
                        {latestBP.recordedBy && (
                          <Text style={styles.recordedByText}>Recorded by: {latestBP.recordedBy}</Text>
                        )}
                      </View>
                    )}

                    {timer?.is_active && (
                      <View style={styles.timerContainer}>
                        <TimerCountdown timer={timer} size="small" />
                      </View>
                    )}

                    {session && (
                      <View style={styles.sessionDetails}>
                        <Text style={styles.detailText}>
                          Started: {new Date(session.initiated_at).toLocaleTimeString()}
                        </Text>
                        <Text style={styles.detailText}>Step: {session.current_step}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
  compactCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  compactBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  compactLeft: {
    flex: 1,
    gap: 2,
  },
  compactRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactRoom: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  compactStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  compactStatusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  compactAsthmaText: {
    fontSize: 11,
    color: '#856404',
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  compactBP: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
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
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bpDisplay: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bpText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  recordedByText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 16,
    color: '#c41e3a',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  bpHistoryItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bpHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bpHistoryNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  bpHistoryTime: {
    fontSize: 12,
    color: '#999',
  },
  bpHistoryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bpHistoryRecorder: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  bpHistoryPositioned: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 4,
  },
});
