import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEmergencySession } from '../../contexts/EmergencySessionContext';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/databaseService';
import { Patient, MedicationDose } from '../../types';
import TimerCountdown from '../../components/TimerCountdown';
import PatientCard from '../../components/PatientCard';
import ActionButton from '../../components/ActionButton';

export default function NurseDashboard({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { activeSession, patient, activeTimer, medications } = useEmergencySession();
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

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (patient) {
      loadPendingMedications();
    }
  }, [patient, medications]);

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

      {/* Active Emergency Section */}
      {activeSession && patient && (
        <View style={styles.activeEmergency}>
          <Text style={styles.sectionTitle}>🚨 Active Emergency</Text>
          
          {/* Goal BP Banner */}
          <View style={styles.goalBPBanner}>
            <Text style={styles.goalBPTitle}>🎯 TARGET BLOOD PRESSURE</Text>
            <Text style={styles.goalBPValue}>130-150 / 80-100 mmHg</Text>
            <Text style={styles.goalBPSubtext}>Continue treatment until goal achieved</Text>
          </View>
          
          <PatientCard 
            patient={patient}
            emergencySession={activeSession}
            showDetails
          />

          {activeTimer && (
            <View style={styles.timerSection}>
              <TimerCountdown timer={activeTimer} size="medium" />
            </View>
          )}

          {pendingMeds.length > 0 && (
            <View style={styles.medicationsSection}>
              <Text style={styles.medicationTitle}>Pending Medications</Text>
              {pendingMeds.map((med) => (
                <View key={med.id} style={styles.medicationCard}>
                  <View>
                    <Text style={styles.medicationName}>
                      {med.medication_name} {med.dose_amount}
                    </Text>
                    <Text style={styles.medicationTime}>
                      Ordered at {new Date(med.ordered_at).toLocaleTimeString()}
                    </Text>
                  </View>
                  <ActionButton
                    label="Mark Administered"
                    onPress={() => {/* TODO: Implement */}}
                    variant="primary"
                  />
                </View>
              ))}
            </View>
          )}

          <ActionButton
            label="Record BP Reading"
            onPress={() => navigation.navigate('BPEntry', { patient })}
            variant="primary"
          />
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
