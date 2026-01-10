import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useEmergencySession } from '../../contexts/EmergencySessionContext';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/databaseService';
import { Patient, MedicationDose } from '../../types';
import { MEDICATION_PROTOCOLS } from '../../utils/constants';
import TimerCountdown from '../../components/TimerCountdown';
import PatientCard from '../../components/PatientCard';
import ActionButton from '../../components/ActionButton';

export default function NurseDashboard({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { activeSession, patient, activeTimer, medications, selectAlgorithm, giveNextDose, focusSession } = useEmergencySession();
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [pendingMeds, setPendingMeds] = useState<MedicationDose[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientRoom, setNewPatientRoom] = useState('');
  const [newPatientAsthma, setNewPatientAsthma] = useState(false);
  const [creating, setCreating] = useState(false);
  const [patientBPs, setPatientBPs] = useState<{ [key: string]: { systolic: number; diastolic: number; timestamp: string } }>({});
  const [patientTimers, setPatientTimers] = useState<{ [key: string]: any }>({});
  const [patientSessions, setPatientSessions] = useState<{ [key: string]: any }>({});
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState<{ session: any; patient: Patient } | null>(null);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPatients();
    }, [])
  );

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (patient) {
      loadPendingMedications();
    }
  }, [patient, medications]);

  // Auto-focus on single active emergency
  useEffect(() => {
    if (Object.keys(patientSessions).length === 1 && !activeSession) {
      const patientId = Object.keys(patientSessions)[0];
      const patient = allPatients.find(p => p.id === patientId);
      const session = patientSessions[patientId];
      if (patient && session) {
        focusSession(session, patient);
      }
    }
  }, [patientSessions, activeSession, allPatients, focusSession]);

  const loadPatients = async () => {
    const patients = await DatabaseService.getAllActivePatients();
    
    // Load latest BP, timers, and sessions for each patient
    const bpMap: { [key: string]: { systolic: number; diastolic: number; timestamp: string } } = {};
    const timerMap: { [key: string]: any } = {};
    const sessionMap: { [key: string]: any } = {};
    
    for (const p of patients) {
      const latestBP = await DatabaseService.getLatestBPReading(p.id);
      if (latestBP) {
        bpMap[p.id] = {
          systolic: latestBP.systolic,
          diastolic: latestBP.diastolic,
          timestamp: latestBP.timestamp
        };
      }
      
      // Load active timer
      const timers = await DatabaseService.getActiveTimers(p.id);
      if (timers && timers.length > 0) {
        timerMap[p.id] = timers[0];
      }
      
      // Load active session
      const sessions = await DatabaseService.getActiveEmergencySessions();
      const session = sessions.find(s => s.patient_id === p.id);
      if (session) {
        sessionMap[p.id] = session;
      }
    }
    
    // Sort patients by criticality
    const sortedPatients = patients.sort((a, b) => {
      const getUrgencyScore = (p: Patient) => {
        const latestBP = bpMap[p.id];
        const emergencySession = sessionMap[p.id];
        const activeTimer = timerMap[p.id];
        
        const isEscalated = emergencySession?.status === 'escalated';
        const isHighBP = latestBP && (latestBP.systolic >= 180 || latestBP.diastolic >= 120);
        const isSevereBP = latestBP && (latestBP.systolic >= 160 || latestBP.diastolic >= 110);
        const hasEmergency = emergencySession?.status === 'active';
        const timerUrgent = activeTimer && activeTimer.expires_at ? 
          (new Date(activeTimer.expires_at).getTime() - Date.now()) / 1000 < 180 : false;
        
        // Assign scores: higher = more critical
        if (isEscalated) return 4;
        if (isHighBP || timerUrgent) return 3;
        if (hasEmergency || isSevereBP) return 2;
        return 1;
      };
      
      return getUrgencyScore(b) - getUrgencyScore(a); // Descending order
    });
    
    setAllPatients(sortedPatients);
    setPatientBPs(bpMap);
    setPatientTimers(timerMap);
    setPatientSessions(sessionMap);
  };

  const loadPendingMedications = async () => {
    if (!patient) return;
    const pending = await DatabaseService.getPendingMedications(patient.id);
    setPendingMeds(pending);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    await loadPendingMedications();
    setRefreshing(false);
  };

  const getNextDose = (session: any) => {
    if (!session?.algorithm_selected) return null;
    const protocol = MEDICATION_PROTOCOLS[session.algorithm_selected as keyof typeof MEDICATION_PROTOCOLS];
    if (!protocol) return null;
    return protocol.doses[session.current_step];
  };

  const handleSelectAlgorithm = async (algorithm: 'labetalol' | 'hydralazine' | 'nifedipine', session: any, p: Patient) => {
    focusSession(session, p);
    await selectAlgorithm(algorithm);
    await loadPatients();
  };

  const handleGiveNextDose = async (session: any, p: Patient) => {
    focusSession(session, p);
    await giveNextDose();
    await loadPatients();
  };

  const handleCreatePatient = async () => {
    if (!newPatientRoom.trim()) {
      Alert.alert('Error', 'Please enter a room number');
      return;
    }

    setCreating(true);
    try {
      const newPatient = await DatabaseService.createPatient(newPatientRoom, newPatientAsthma);
      setShowAddPatientModal(false);
      setNewPatientRoom('');
      setNewPatientAsthma(false);
      await loadPatients();
      Alert.alert('Success', 'Patient added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create patient');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePatient = (patientToDelete: Patient) => {
    Alert.alert(
      'Delete Patient',
      `Are you sure you want to delete ${patientToDelete.room_number ? `Room ${patientToDelete.room_number}` : patientToDelete.anonymous_identifier}?\n\nThis will permanently delete all BP readings, timers, and sessions for this patient.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deletePatient(patientToDelete.id);
              await loadPatients();
              Alert.alert('Success', 'Patient deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete patient');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      <View style={styles.protocolBanner}>
        <Text style={styles.protocolText}>RWJ Hypertension Emergency Protocol</Text>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nurse Dashboard</Text>
          <Text style={styles.subtitle}>{user?.name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Active Emergencies Section - Show ALL active emergencies */}
      {Object.keys(patientSessions).length > 0 && (
        <View style={styles.activeEmergency}>
          <Text style={styles.sectionTitle}>🚨 Active Emergencies</Text>
          
          {allPatients
            .filter(p => patientSessions[p.id])
            .map(p => {
              const session = patientSessions[p.id];
              const timer = patientTimers[p.id];
              
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.emergencyCard}
                  onPress={() => navigation.navigate('BPEntry', { patient: p })}
                  activeOpacity={0.7}
                >
                  <View style={styles.emergencyHeader}>
                    <Text style={styles.emergencyRoom}>
                      {p.room_number ? `Room ${p.room_number}` : p.anonymous_identifier}
                    </Text>
                    {p.has_asthma && (
                      <Text style={styles.emergencyAsthma}>⚠️ Asthma</Text>
                    )}
                  </View>

                  {patientBPs[p.id] && (
                    <Text style={styles.emergencyBP}>
                      BP: {patientBPs[p.id].systolic}/{patientBPs[p.id].diastolic} mmHg
                    </Text>
                  )}

                  {session.algorithm_selected && (
                    <Text style={styles.emergencyAlgorithm}>
                      {session.algorithm_selected.toUpperCase()} - Step {session.current_step}
                    </Text>
                  )}

                  {timer && (
                    <View style={styles.emergencyTimerCompact} pointerEvents="none">
                      <TimerCountdown timer={timer} size="small" />
                    </View>
                  )}

                  {!session.algorithm_selected && (
                    <View style={styles.algorithmInline}>
                      <Text style={styles.algorithmInlineLabel}>Select Algorithm:</Text>
                      <View style={styles.algorithmButtonsRow}>
                        <TouchableOpacity
                          style={[styles.inlineAlgoBtn, p.has_asthma && styles.inlineAlgoBtnDisabled]}
                          onPress={() => !p.has_asthma && handleSelectAlgorithm('labetalol', session, p)}
                          disabled={p.has_asthma}
                        >
                          <Text style={styles.inlineAlgoBtnText}>Labetalol</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.inlineAlgoBtn}
                          onPress={() => handleSelectAlgorithm('hydralazine', session, p)}
                        >
                          <Text style={styles.inlineAlgoBtnText}>Hydralazine</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.inlineAlgoBtn}
                          onPress={() => handleSelectAlgorithm('nifedipine', session, p)}
                        >
                          <Text style={styles.inlineAlgoBtnText}>Nifedipine</Text>
                        </TouchableOpacity>
                      </View>
                      {p.has_asthma && (
                        <Text style={styles.asthmaWarningInline}>⚠️ Labetalol contraindicated with asthma</Text>
                      )}
                    </View>
                  )}

                  {session.algorithm_selected && getNextDose(session) && (
                    <View style={styles.nextDoseCompact}>
                      <Text style={styles.nextDoseLabel}>Next Dose</Text>
                      <Text style={styles.nextDoseValue}>
                        {getNextDose(session)?.medication} {getNextDose(session)?.dose} {getNextDose(session)?.route}
                      </Text>
                      <ActionButton
                        label="Mark Given"
                        onPress={() => handleGiveNextDose(session, p)}
                        variant="primary"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            
          <View style={styles.targetBanner}>
            <Text style={styles.targetText}>🎯 Target: 130-150 / 80-100 mmHg</Text>
          </View>
        </View>
      )}

      {/* All Patients Section */}
      <View style={styles.patientsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Patients</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddPatientModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add Patient</Text>
          </TouchableOpacity>
        </View>
        
        {allPatients.length === 0 ? (
          <Text style={styles.emptyText}>No patients. Tap "Add Patient" to begin.</Text>
        ) : (
          allPatients.map((p) => (
            <TouchableOpacity 
              key={p.id}
              onPress={() => navigation.navigate('BPEntry', { patient: p })}
              onLongPress={() => handleDeletePatient(p)}
            >
              <PatientCard 
                patient={p} 
                latestBP={patientBPs[p.id]}
                emergencySession={patientSessions[p.id]}
                activeTimer={patientTimers[p.id]}
              />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>

    {/* Add Patient Modal */}
    <Modal
      visible={showAddPatientModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowAddPatientModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add New Patient</Text>
          
          <Text style={styles.label}>Room Number</Text>
          <TextInput
            style={styles.input}
            value={newPatientRoom}
            onChangeText={setNewPatientRoom}
            placeholder="e.g., 201A"
            autoCapitalize="characters"
            editable={!creating}
          />

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setNewPatientAsthma(!newPatientAsthma)}
          >
            <View style={[styles.checkbox, newPatientAsthma && styles.checkboxChecked]}>
              {newPatientAsthma && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Patient has asthma</Text>
          </TouchableOpacity>

          <ActionButton
            label={creating ? 'Creating...' : 'Create Patient'}
            onPress={handleCreatePatient}
            variant="primary"
            disabled={creating}
          />

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowAddPatientModal(false);
              setNewPatientRoom('');
              setNewPatientAsthma(false);
            }}
            disabled={creating}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginTop: 4,
  },
  algorithmButton: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  contraindicated: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  algorithmButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  algorithmButtonDesc: {
    fontSize: 13,
    color: '#e8f4f8',
  },
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
  activeEmergency: {
    padding: 12,
    backgroundColor: '#fff5f5',
    borderBottomWidth: 3,
    borderBottomColor: '#dc3545',
  },
  goalBPBanner: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e7e34',
  },
  goalBPTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  goalBPValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  goalBPSubtext: {
    fontSize: 10,
    color: '#d4edda',
    marginTop: 2,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emergencyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  emergencyRoom: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  emergencyAsthma: {
    fontSize: 11,
    color: '#856404',
  },
  emergencyBP: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 4,
  },
  emergencyAlgorithm: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  emergencyTimerCompact: {
    marginTop: 4,
  },
  algorithmInline: {
    marginTop: 10,
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  algorithmInlineLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565c0',
    marginBottom: 8,
  },
  algorithmButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  inlineAlgoBtn: {
    flex: 1,
    backgroundColor: '#2196f3',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  inlineAlgoBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  inlineAlgoBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  asthmaWarningInline: {
    fontSize: 11,
    color: '#d32f2f',
    fontWeight: '600',
  },
  selectAlgoButton: {
    marginTop: 8,
    backgroundColor: '#007bff',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectAlgoText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  nextDoseCompact: {
    marginTop: 10,
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  nextDoseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 4,
  },
  nextDoseValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  targetBanner: {
    backgroundColor: '#e8f4f8',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  targetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066cc',
  },
  timerSection: {
    marginVertical: 12,
  },
  medicationsSection: {
    marginVertical: 16,
  },
  medicationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  medicationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  medicationTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  patientsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
  },
  cancelButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
