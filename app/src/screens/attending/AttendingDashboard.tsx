import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/databaseService';
import { Patient, EmergencySession, MedicationDose, Timer } from '../../types';
import PatientCard from '../../components/PatientCard';
import TimerCountdown from '../../components/TimerCountdown';

interface EmergencyWithDetails {
  patient: Patient;
  session: EmergencySession;
  medications: MedicationDose[];
  bpReadings: any[];
  timer: Timer | null;
  isEscalated: boolean;
  failedDoses: number;
}

export default function AttendingDashboard() {
  const { user, signOut } = useAuth();
  const [emergencies, setEmergencies] = useState<EmergencyWithDetails[]>([]);
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
      const emergenciesData: EmergencyWithDetails[] = [];

      for (const session of sessions) {
        const patient = await DatabaseService.getPatient(session.patient_id);
        if (!patient) continue;

        const [medications, bpReadings, timer] = await Promise.all([
          DatabaseService.getMedications(patient.id),
          DatabaseService.getBPHistory(patient.id),
          DatabaseService.getActiveTimer(patient.id)
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
          failedDoses
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
              {/* Urgency Badge */}
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(emergency) }]}>
                <Text style={styles.urgencyText}>{getUrgencyLabel(emergency)}</Text>
              </View>

              <View style={styles.cardContent}>
                <PatientCard patient={emergency.patient} emergencySession={emergency.session} showDetails />

                {/* Algorithm & Progress */}
                <View style={styles.treatmentInfo}>
                  <Text style={styles.infoLabel}>Treatment:</Text>
                  <Text style={styles.infoValue}>
                    {emergency.session.algorithm_selected?.toUpperCase() || 'Not Selected'}
                  </Text>
                  <Text style={styles.infoLabel}>Step:</Text>
                  <Text style={styles.infoValue}>{emergency.session.current_step}</Text>
                </View>

                {/* What Has Failed */}
                {emergency.failedDoses > 0 && (
                  <View style={styles.failureBox}>
                    <Text style={styles.failureTitle}>⚠️ Treatment Challenges</Text>
                    <Text style={styles.failureText}>
                      {emergency.failedDoses} dose{emergency.failedDoses > 1 ? 's' : ''} administered, BP remains elevated
                    </Text>
                    <View style={styles.medsGiven}>
                      {emergency.medications
                        .filter(m => m.administered_at)
                        .map(med => (
                          <Text key={med.id} style={styles.medItem}>
                            • {med.medication_name} {med.dose_amount} at{' '}
                            {new Date(med.administered_at!).toLocaleTimeString()}
                          </Text>
                        ))}
                    </View>
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

                {/* Session Details */}
                <View style={styles.sessionMeta}>
                  <Text style={styles.metaText}>
                    Started: {new Date(emergency.session.initiated_at).toLocaleString()}
                  </Text>
                  {emergency.session.escalated_at && (
                    <Text style={[styles.metaText, { color: '#dc3545', fontWeight: 'bold' }]}>
                      Escalated: {new Date(emergency.session.escalated_at).toLocaleString()}
                    </Text>
                  )}
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
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  urgencyBadge: {
    padding: 12,
    alignItems: 'center',
  },
  urgencyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardContent: {
    padding: 16,
  },
  treatmentInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 16,
  },
  failureBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  failureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  failureText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
  },
  medsGiven: {
    marginTop: 4,
  },
  medItem: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
  latestBP: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
  },
  bpLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  bpValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginRight: 12,
  },
  bpTime: {
    fontSize: 12,
    color: '#666',
  },
  timerSection: {
    marginTop: 12,
  },
  sessionMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 48,
  },
});
