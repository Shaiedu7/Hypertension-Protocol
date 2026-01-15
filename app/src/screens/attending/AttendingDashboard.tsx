import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useEmergencySession } from '../../contexts/EmergencySessionContext';
import { DatabaseService } from '../../services/databaseService';
import { subscribeToDashboardUpdates } from '../../services/realtimeService';
import { Patient, EmergencySession, MedicationDose, Timer } from '../../types';
import { MEDICATION_PROTOCOLS } from '../../utils/constants';
import PatientCard from '../../components/PatientCard';
import TimerCountdown from '../../components/TimerCountdown';
import ActionButton from '../../components/ActionButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

interface EmergencyWithDetails {
  patient: Patient;
  session: EmergencySession;
  medications: MedicationDose[];
  bpReadings: any[];
  timer: Timer | null;
  isEscalated: boolean;
  failedDoses: number;
  initiatedBy?: { name?: string; email?: string } | null;
}

export default function AttendingDashboard({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { acknowledgeSession, resolveSession, setPatient, subscribeToSession, unsubscribeFromSession } = useEmergencySession();
  const [emergencies, setEmergencies] = useState<EmergencyWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllEmergencies();

    const subscription = subscribeToDashboardUpdates(loadAllEmergencies);
    return () => subscription.unsubscribe();
  }, []);

  const getStepDescription = (emergency: EmergencyWithDetails): string => {
    const algorithm = emergency.session.algorithm_selected;
    if (!algorithm) return 'Protocol not selected yet';

    const protocol = MEDICATION_PROTOCOLS[algorithm as keyof typeof MEDICATION_PROTOCOLS];
    if (!protocol) return `${algorithm.toUpperCase()} protocol`;

    const stepNumber = Math.max(emergency.session.current_step || 1, 1);
    const doseIndex = Math.min(stepNumber - 1, protocol.doses.length - 1);
    const dose = protocol.doses[doseIndex];

    const timerRunning = emergency.timer?.is_active;
    const lastMed = emergency.medications
      .filter(m => m.administered_at)
      .sort((a, b) => new Date(b.administered_at!).getTime() - new Date(a.administered_at!).getTime())[0];

    const status = timerRunning
      ? 'in progress — timer running'
      : lastMed
        ? `last dose at ${new Date(lastMed.administered_at!).toLocaleTimeString()}`
        : 'next dose pending';

    return `${protocol.name} Protocol • Step ${stepNumber}: ${dose.medication} ${dose.dose} ${dose.route} — ${status}`;
  };

  const loadAllEmergencies = async () => {
    try {
      const sessions = await DatabaseService.getActiveEmergencySessions();
      const emergenciesData: EmergencyWithDetails[] = [];

      for (const session of sessions) {
        const patient = await DatabaseService.getPatient(session.patient_id);
        if (!patient) continue;

        const [medications, bpReadings, timer, initiatedBy] = await Promise.all([
          DatabaseService.getMedications(patient.id),
          DatabaseService.getBPHistory(patient.id),
          DatabaseService.getActiveTimer(patient.id),
          DatabaseService.getUser(session.initiated_by)
        ]);

        // Count failed doses (administered but BP still high)
        const administeredMeds = medications.filter(m => m.administered_at);
        const failedDoses = administeredMeds.filter((med, idx) => {
          // Check if there's a subsequent BP reading that's still high
          const medTime = new Date(med.administered_at!).getTime();
          const laterBP = bpReadings.find(bp => 
            new Date(bp.timestamp).getTime() > medTime && 
            (bp.systolic >= 160 || bp.diastolic >= 110)
          );
          return !!laterBP;
        }).length;

        emergenciesData.push({
          patient,
          session,
          medications,
          bpReadings,
          timer,
          isEscalated: session.status === 'escalated',
          failedDoses,
          initiatedBy,
        });
      }

      // Sort: escalated first, then by failed doses descending
      emergenciesData.sort((a, b) => {
        if (a.isEscalated && !b.isEscalated) return -1;
        if (!a.isEscalated && b.isEscalated) return 1;
        return b.failedDoses - a.failedDoses;
      });

      setEmergencies(emergenciesData);
    } catch (error) {
      console.error('Error loading emergencies:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllEmergencies();
    setRefreshing(false);
  };

  const getUrgencyColor = (emergency: EmergencyWithDetails): string => {
    if (emergency.isEscalated) return '#dc3545';
    if (emergency.failedDoses >= 2) return '#ff6b6b';
    if (emergency.failedDoses >= 1) return '#ffc107';
    return '#17a2b8';
  };

  const getUrgencyLabel = (emergency: EmergencyWithDetails): string => {
    if (emergency.isEscalated) return 'STAT - ESCALATED';
    if (emergency.failedDoses >= 2) return 'CRITICAL - Multiple Failures';
    if (emergency.failedDoses >= 1) return 'WARNING - Treatment Failing';
    return 'MONITORING';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.protocolBanner}>
        <Text style={styles.protocolText}>RWJ Hypertension Emergency Protocol</Text>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Attending Dashboard</Text>
          <Text style={styles.subtitle}>{user?.name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{emergencies.length}</Text>
          <Text style={styles.statLabel}>Total Cases</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#dc3545' }]}>
            {emergencies.filter(e => e.isEscalated).length}
          </Text>
          <Text style={styles.statLabel}>STAT Calls</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#ffc107' }]}>
            {emergencies.filter(e => e.failedDoses >= 2).length}
          </Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
      </View>

      {/* Floor Map / Emergency List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.scrollView}
      >
        {emergencies.length === 0 ? (
          <Text style={styles.emptyText}>No active emergencies</Text>
        ) : (
          emergencies.map((emergency) => (
            <View key={emergency.session.id} style={styles.emergencyCard}>
              {emergency.isEscalated && (
                <View style={styles.urgencyBadge}>
                  <Text style={styles.urgencyText}>STAT CALL</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <PatientCard patient={emergency.patient} emergencySession={emergency.session} showDetails={false} />

                {/* Algorithm & Progress */}
                <View style={styles.treatmentInfo}>
                  <Text style={styles.infoText}>{getStepDescription(emergency)}</Text>
                </View>

                {/* What Has Failed */}
                {emergency.failedDoses > 0 && (
                  <View style={styles.failureBox}>
                    <Text style={styles.failureText}>
                      ⚠️ {emergency.failedDoses} dose{emergency.failedDoses > 1 ? 's' : ''} given, BP elevated
                    </Text>
                    {emergency.medications
                      .filter(m => m.administered_at)
                      .map(med => (
                        <Text key={med.id} style={styles.medItem}>
                          • {med.medication_name} {med.dose_amount} at {new Date(med.administered_at!).toLocaleTimeString()}
                        </Text>
                      ))}
                  </View>
                )}

                {/* Latest BP */}
                {emergency.bpReadings.length > 0 && (
                  <View style={styles.latestBP}>
                    <Text style={styles.bpLabel}>Latest BP:</Text>
                    <Text style={styles.bpValue}>
                      {emergency.bpReadings[0].systolic}/{emergency.bpReadings[0].diastolic} mmHg
                    </Text>
                    <Text style={styles.bpTime}>
                      {new Date(emergency.bpReadings[0].timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                )}

                {/* Active Timer */}
                {emergency.timer?.is_active && (
                  <View style={styles.timerSection}>
                    <TimerCountdown timer={emergency.timer} size="medium" />
                  </View>
                )}

                {/* Attending Actions for Escalated Cases */}
                {emergency.isEscalated && (
                  <View style={styles.actionSection}>
                    {!emergency.session.acknowledged_at ? (
                      <ActionButton
                        label="Acknowledge Transfer of Care"
                        onPress={() => {
                          Alert.alert(
                            'Acknowledge Transfer',
                            `Confirm you are assuming care for ${emergency.patient.anonymous_identifier}?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Acknowledge',
                                onPress: async () => {
                                  try {
                                    setPatient(emergency.patient);
                                    await subscribeToSession(emergency.session.id);
                                    await acknowledgeSession();
                                    await loadAllEmergencies();
                                  } catch (error) {
                                    console.error('Failed to acknowledge:', error);
                                    Alert.alert('Error', 'Failed to acknowledge transfer. Please try again.');
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        variant="primary"
                      />
                    ) : (
                      <View style={styles.acknowledgedBox}>
                        <Text style={styles.acknowledgedText}>
                          ✓ Transfer Acknowledged • {new Date(emergency.session.acknowledged_at).toLocaleTimeString()}
                        </Text>
                      </View>
                    )}

                    {emergency.session.acknowledged_at && (
                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => {
                            setPatient(emergency.patient);
                            subscribeToSession(emergency.session.id);
                            navigation.navigate('BPEntry', { patient: emergency.patient });
                          }}
                        >
                          <Text style={styles.secondaryButtonText}>Update Vitals</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.resolveButton}
                          onPress={() => {
                            Alert.alert(
                              'Mark Case Resolved',
                              `Confirm that ${emergency.patient.anonymous_identifier} emergency is resolved and BP is controlled?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Mark Resolved',
                                  style: 'destructive',
                                  onPress: async () => {
                                    setPatient(emergency.patient);
                                    subscribeToSession(emergency.session.id);
                                    await resolveSession();
                                    unsubscribeFromSession();
                                    await loadAllEmergencies();
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Text style={styles.resolveButtonText}>Mark Resolved</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Session Details */}
                <View style={styles.sessionMeta}>
                  <Text style={styles.metaText}>
                    Started {new Date(emergency.session.initiated_at).toLocaleTimeString()}
                    {emergency.initiatedBy?.name || emergency.initiatedBy?.email
                      ? ` by ${emergency.initiatedBy?.name || emergency.initiatedBy?.email}`
                      : ''}
                    {emergency.session.escalated_at && (
                      <Text style={styles.escalatedText}>
                        {' '}• Escalated {new Date(emergency.session.escalated_at).toLocaleTimeString()}
                      </Text>
                    )}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },  protocolBanner: {
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
  },  header: {
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
    backgroundColor: '#f5f5f5',
  },
  emergencyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  urgencyBadge: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    alignItems: 'center',
  },
  urgencyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 12,
  },
  treatmentInfo: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    lineHeight: 18,
  },
  failureBox: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  failureText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '600',
    marginBottom: 4,
  },
  medItem: {
    fontSize: 11,
    color: '#856404',
    marginBottom: 2,
  },
  latestBP: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#e7f3ff',
    borderRadius: 6,
  },
  bpLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  bpValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginRight: 12,
  },
  bpTime: {
    fontSize: 11,
    color: '#666',
  },
  timerSection: {
    marginTop: 8,
  },
  actionSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  acknowledgedBox: {
    padding: 8,
    backgroundColor: '#d4edda',
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  acknowledgedText: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resolveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionMeta: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  metaText: {
    fontSize: 11,
    color: '#666',
  },
  escalatedText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 48,
  },
});
