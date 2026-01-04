import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/databaseService';
import { Patient, EmergencySession, MedicationDose, MedicationAlgorithm } from '../../types';
import { useEmergencySession } from '../../contexts/EmergencySessionContext';
import PatientCard from '../../components/PatientCard';
import ProtocolStepIndicator from '../../components/ProtocolStepIndicator';
import ActionButton from '../../components/ActionButton';
import TimerCountdown from '../../components/TimerCountdown';
import { MEDICATION_PROTOCOLS } from '../../utils/constants';

export default function ResidentDashboard() {
  const { user, signOut } = useAuth();
  const { 
    activeSession, 
    patient, 
    selectAlgorithm, 
    escalateSession,
    activeTimer,
    focusSession
  } = useEmergencySession();
  
  const [allEmergencies, setAllEmergencies] = useState<Array<{ patient: Patient; session: EmergencySession }>>([]);
  const [bpHistory, setBpHistory] = useState<any[]>([]);
  const [medications, setMedications] = useState<MedicationDose[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false);
  const [selectedPatientSession, setSelectedPatientSession] = useState<EmergencySession | null>(null);

  useEffect(() => {
    loadAllEmergencies();
  }, []);

  useEffect(() => {
    if (patient) {
      loadPatientData();
    }
  }, [patient, activeSession]);

  const loadAllEmergencies = async () => {
    try {
      const sessions = await DatabaseService.getActiveEmergencySessions();
      const emergencies = [];

      for (const session of sessions) {
        const p = await DatabaseService.getPatient(session.patient_id);
        if (p) emergencies.push({ patient: p, session });
      }

      setAllEmergencies(emergencies);
    } catch (error) {
      console.error('Error loading emergencies:', error);
    }
  };

  const loadPatientData = async () => {
    if (!patient) return;
    
    try {
      const [bp, meds] = await Promise.all([
        DatabaseService.getBPHistory(patient.id),
        DatabaseService.getMedications(patient.id)
      ]);
      
      setBpHistory(bp);
      setMedications(meds);
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllEmergencies();
    await loadPatientData();
    setRefreshing(false);
  };

  const handleSelectAlgorithm = async (algorithm: MedicationAlgorithm) => {
    if (selectedPatientSession) {
      await selectAlgorithm(algorithm);
      setShowAlgorithmModal(false);
      setSelectedPatientSession(null);
      // Refresh data while keeping session focused
      await loadPatientData();
      await loadAllEmergencies();
    }
  };

  const getNextDoseInfo = () => {
    if (!activeSession?.algorithm_selected) return null;
    
    const protocol = MEDICATION_PROTOCOLS[activeSession.algorithm_selected];
    const nextDose = protocol.doses[activeSession.current_step];
    
    return nextDose;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.protocolBanner}>
        <Text style={styles.protocolText}>RWJ Hypertension Emergency Protocol</Text>
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Resident Dashboard</Text>
          <Text style={styles.subtitle}>{user?.name || user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.scrollView}
      >
        {/* Active Case Section */}
        {activeSession && patient ? (
          <View style={styles.activeCaseSection}>
            <Text style={styles.sectionTitle}>🏥 Active Case</Text>
            
            {/* Goal BP Banner */}
            <View style={styles.goalBPBanner}>
              <Text style={styles.goalBPTitle}>🎯 TARGET BLOOD PRESSURE</Text>
              <Text style={styles.goalBPValue}>130-150 / 80-100 mmHg</Text>
              <Text style={styles.goalBPSubtext}>Continue treatment until goal achieved</Text>
            </View>
            
            <PatientCard patient={patient} emergencySession={activeSession} showDetails />

            {/* Algorithm Selection or Protocol Tracker */}
            {!activeSession.algorithm_selected ? (
              <View style={styles.algorithmPrompt}>
                <Text style={styles.promptTitle}>⚠️ Algorithm Selection Required</Text>
                <Text style={styles.promptText}>
                  Emergency confirmed. Select treatment algorithm based on patient history.
                </Text>
                <ActionButton
                  label="Select Algorithm"
                  onPress={() => {
                    setSelectedPatientSession(activeSession);
                    setShowAlgorithmModal(true);
                  }}
                  variant="primary"
                />
              </View>
            ) : (
              <View style={styles.protocolSection}>
                <Text style={styles.protocolTitle}>
                  {activeSession.algorithm_selected.toUpperCase()} Protocol
                </Text>
                
                <ProtocolStepIndicator
                  algorithm={activeSession.algorithm_selected}
                  currentStep={activeSession.current_step}
                />

                {activeTimer && (
                  <View style={styles.timerBox}>
                    <Text style={styles.timerLabel}>
                      {activeTimer.type === 'medication_wait' ? '⏱️ Wait Time' : '⚠️ Administration Deadline'}
                    </Text>
                    <TimerCountdown timer={activeTimer} size="medium" />
                  </View>
                )}

                {/* Next Dose Info (read-only) */}
                {getNextDoseInfo() && (
                  <View style={styles.nextDoseCard}>
                    <Text style={styles.nextDoseTitle}>Next Dose</Text>
                    <Text style={styles.nextDoseDetails}>
                      {getNextDoseInfo()?.medication} {getNextDoseInfo()?.dose} {getNextDoseInfo()?.route}
                    </Text>
                    <Text style={styles.nextDoseNote}>
                      Nurse will administer and record; app tracks timing automatically.
                    </Text>
                  </View>
                )}

                {/* BP History */}
                <View style={styles.bpHistorySection}>
                  <Text style={styles.subsectionTitle}>BP History</Text>
                  {bpHistory.map((bp, idx) => (
                    <View key={bp.id} style={styles.bpRow}>
                      <Text style={styles.bpText}>
                        {bp.systolic}/{bp.diastolic} mmHg
                      </Text>
                      <Text style={styles.bpTime}>
                        {new Date(bp.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Medications Given */}
                <View style={styles.medsSection}>
                  <Text style={styles.subsectionTitle}>Medications</Text>
                  {medications.map((med) => (
                    <View key={med.id} style={styles.medRow}>
                      <Text style={styles.medText}>
                        {med.medication_name} {med.dose_amount}
                      </Text>
                      <Text style={styles.medStatus}>
                        {med.administered_at ? '✅ Given' : '⏳ Ordered'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Escalate Button */}
                <ActionButton
                  label="Escalate to Attending"
                  onPress={() => escalateSession()}
                  variant="danger"
                />
              </View>
            )}
          </View>
        ) : (
          /* All Emergencies List */
          <View style={styles.emergenciesSection}>
            <Text style={styles.sectionTitle}>Active Emergencies</Text>
            
            {allEmergencies.length === 0 ? (
              <Text style={styles.emptyText}>No active emergencies</Text>
            ) : (
              allEmergencies.map(({ patient: p, session }) => (
                <TouchableOpacity 
                  key={session.id} 
                  style={styles.emergencyCard}
                  onPress={() => focusSession(session, p)}
                >
                  <PatientCard patient={p} emergencySession={session} />
                  {!session.algorithm_selected && (
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => {
                        focusSession(session, p);
                        setSelectedPatientSession(session);
                        setShowAlgorithmModal(true);
                      }}
                    >
                      <Text style={styles.selectButtonText}>Select Algorithm</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Algorithm Selection Modal */}
      <Modal
        visible={showAlgorithmModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAlgorithmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Treatment Algorithm</Text>
            
            {patient?.has_asthma && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ PATIENT HAS ASTHMA</Text>
                <Text style={styles.warningSubtext}>Labetalol is contraindicated</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.algorithmButton, patient?.has_asthma && styles.contraindicated]}
              onPress={() => !patient?.has_asthma && handleSelectAlgorithm('labetalol')}
              disabled={patient?.has_asthma}
            >
              <Text style={styles.algorithmButtonTitle}>Labetalol IV</Text>
              <Text style={styles.algorithmButtonDesc}>20mg → 40mg → 80mg</Text>
              <Text style={styles.algorithmDetails}>• Wait 10 min between doses</Text>
              <Text style={styles.algorithmDetails}>• Combined α and β-blocker</Text>
              <Text style={styles.algorithmDetails}>• Contraindicated: Asthma</Text>
              <Text style={styles.algorithmDetails}>• Peak effect: 15-30 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.algorithmButton}
              onPress={() => handleSelectAlgorithm('hydralazine')}
            >
              <Text style={styles.algorithmButtonTitle}>Hydralazine IV</Text>
              <Text style={styles.algorithmButtonDesc}>5-10mg → 10mg → 10mg</Text>
              <Text style={styles.algorithmDetails}>• Wait 20 min between doses</Text>
              <Text style={styles.algorithmDetails}>• Arterial smooth muscle dilator</Text>
              <Text style={styles.algorithmDetails}>• Side effects: Headache, flushing</Text>
              <Text style={styles.algorithmDetails}>• Peak effect: 5 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.algorithmButton}
              onPress={() => handleSelectAlgorithm('nifedipine')}
            >
              <Text style={styles.algorithmButtonTitle}>Nifedipine PO</Text>
              <Text style={styles.algorithmButtonDesc}>10mg → 20mg → 20mg</Text>
              <Text style={styles.algorithmDetails}>• Wait 20 min between doses</Text>
              <Text style={styles.algorithmDetails}>• Calcium channel blocker</Text>
              <Text style={styles.algorithmDetails}>• Side effects: Tachycardia, headache</Text>
              <Text style={styles.algorithmDetails}>• Peak effect: 30-60 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAlgorithmModal(false);
                setSelectedPatientSession(null);
              }}
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
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  activeCaseSection: {
    padding: 16,
  },
  goalBPBanner: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e7e34',
  },
  goalBPTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  goalBPValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  goalBPSubtext: {
    fontSize: 12,
    color: '#d4edda',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  algorithmPrompt: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 16,
  },
  protocolSection: {
    marginTop: 12,
  },
  protocolTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 10,
  },
  timerBox: {
    marginVertical: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  nextDoseCard: {
    backgroundColor: '#d4edda',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  nextDoseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  nextDoseDetails: {
    fontSize: 14,
    color: '#155724',
    marginBottom: 8,
    fontWeight: '600',
  },
  nextDoseNote: {
    fontSize: 12,
    color: '#155724',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  waitingCard: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  waitingText: {
    fontSize: 14,
    color: '#856404',
  },
  bpHistorySection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bpText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bpTime: {
    fontSize: 14,
    color: '#666',
  },
  medsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  medText: {
    fontSize: 14,
    color: '#333',
  },
  medStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  emergenciesSection: {
    padding: 16,
  },
  emergencyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectButton: {
    backgroundColor: '#007bff',
    padding: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  contraindicated: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  algorithmButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  algorithmButtonDesc: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '600',
  },
  algorithmDetails: {
    fontSize: 12,
    color: '#e8f4f8',
    marginTop: 2,
    paddingLeft: 4,
  },
  cancelButton: {
    padding: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
