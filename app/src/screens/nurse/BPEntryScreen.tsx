import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEmergencySession } from '../../contexts/EmergencySessionContext';
import { isBPHigh, isBPInTargetRange } from '../../utils/helpers';
import { DatabaseService } from '../../services/databaseService';
import { BloodPressureReading } from '../../types';
import ActionButton from '../../components/ActionButton';
import TimerCountdown from '../../components/TimerCountdown';

interface BPEntryScreenProps {
  navigation: any;
  route: any;
}

export default function BPEntryScreen({ navigation, route }: BPEntryScreenProps) {
  const routePatient = route.params?.patient;
  const { recordBPReading, setPatient } = useEmergencySession();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [bpHistory, setBpHistory] = useState<BloodPressureReading[]>([]);
  const [bpHistoryWithUsers, setBpHistoryWithUsers] = useState<any[]>([]);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [emergencySession, setEmergencySession] = useState<any>(null);
  const [checklist, setChecklist] = useState({
    back_supported: false,
    feet_flat: false,
    arm_supported: false,
    correct_cuff_size: false,
    patient_calm: false,
  });
  const [loading, setLoading] = useState(false);

  // Load BP history when patient is available
  React.useEffect(() => {
    if (routePatient) {
      loadBPHistory();
      loadTimerAndSession();
    }
  }, [routePatient]);

  const loadBPHistory = async () => {
    if (!routePatient) return;
    try {
      const history = await DatabaseService.getBPReadings(routePatient.id);
      setBpHistory(history.slice(0, 5)); // Show last 5 readings
      
      // Load user names for each BP reading
      const historyWithUsers = await Promise.all(history.slice(0, 5).map(async (bp) => {
        if (bp.recorded_by) {
          const user = await DatabaseService.getUser(bp.recorded_by);
          return { ...bp, recordedByName: user?.name || user?.email || 'Unknown' };
        }
        return { ...bp, recordedByName: 'Unknown' };
      }));
      setBpHistoryWithUsers(historyWithUsers);
    } catch (error) {
      console.error('Error loading BP history:', error);
    }
  };

  const loadTimerAndSession = async () => {
    if (!routePatient) return;
    try {
      // Load active timer
      const timers = await DatabaseService.getActiveTimers(routePatient.id);
      if (timers && timers.length > 0) {
        setActiveTimer(timers[0]);
      }
      
      // Load active emergency session
      const sessions = await DatabaseService.getActiveEmergencySessions();
      const session = sessions.find(s => s.patient_id === routePatient.id);
      if (session) {
        setEmergencySession(session);
      }
    } catch (error) {
      console.error('Error loading timer and session:', error);
    }
  };

  const positioningGuides = {
    back_supported: {
      title: 'Back Support',
      sections: [
        {
          heading: 'Protocol Requirement',
          content: 'Patient must be seated with back fully supported or semi-reclining (30-45°).'
        },
        {
          heading: '⚠️ Critical Warning',
          content: 'Do NOT reposition patient to lying down/supine to lower BP. This causes false readings.',
          isWarning: true
        },
        {
          heading: 'Why It Matters',
          content: 'Unsupported back causes muscle tension, raising BP readings falsely.'
        }
      ]
    },
    feet_flat: {
      title: 'Feet & Legs',
      sections: [
        {
          heading: 'Protocol Requirement',
          content: 'Feet must be flat on the floor. Legs must be uncrossed.'
        },
        {
          heading: 'Why It Matters',
          content: 'Crossed legs can increase systolic BP by 2-8 mmHg due to vascular resistance.'
        },
        {
          heading: 'Quick Tip',
          content: 'If patient is short, use a footstool. If in bed, ensure legs are uncrossed.'
        }
      ]
    },
    arm_supported: {
      title: 'Arm Position',
      sections: [
        {
          heading: 'Protocol Requirement',
          content: 'Arm must be bare (no clothing) and supported at heart level (mid-sternum).'
        },
        {
          heading: 'Impact on Reading',
          content: '• Below Heart: False HIGH\n• Above Heart: False LOW\n• Unsupported: False HIGH'
        },
        {
          heading: 'Action',
          content: 'Support arm with pillows or table. Do not let arm dangle.'
        }
      ]
    },
    correct_cuff_size: {
      title: 'Cuff Size',
      sections: [
        {
          heading: 'Protocol Requirement',
          content: 'Cuff bladder must encircle 80% of arm. Width should be 40% of circumference.'
        },
        {
          heading: 'Impact on Reading',
          content: '• Too Small: False HIGH (+10-30 mmHg)\n• Too Large: False LOW'
        },
        {
          heading: 'Action',
          content: 'Measure arm circumference if unsure. Do not guess.'
        }
      ]
    },
    patient_calm: {
      title: 'Patient State',
      sections: [
        {
          heading: 'Protocol Requirement',
          content: '5 minutes of quiet rest. No recent nicotine, caffeine, or severe pain.'
        },
        {
          heading: 'Validation',
          content: 'Severe automated readings MUST be validated with a MANUAL cuff.'
        },
        {
          heading: 'Why It Matters',
          content: 'Pain, anxiety, and full bladder can significantly spike BP temporarily.'
        }
      ]
    }
  };

  // Ensure patient is set in context if passed via route
  React.useEffect(() => {
    if (routePatient && !setPatient) {
      console.warn('setPatient not available in context');
    }
  }, [routePatient, setPatient]);

  const handleClear = () => {
    setSystolic('');
    setDiastolic('');
    setShowChecklist(false);
    setChecklist({
      back_supported: false,
      feet_flat: false,
      arm_supported: false,
      correct_cuff_size: false,
      patient_calm: false,
    });
  };

  const isChecklistComplete = () => {
    return Object.values(checklist).every(value => value === true);
  };

  const handleCheckAll = () => {
    setChecklist({
      back_supported: true,
      feet_flat: true,
      arm_supported: true,
      correct_cuff_size: true,
      patient_calm: true,
    });
  };

  const openGuide = (guideKey: string) => {
    setSelectedGuide(guideKey);
    setShowChecklist(false);
    setShowGuide(true);
  };

  const closeGuide = () => {
    setShowGuide(false);
    setSelectedGuide(null);
    setShowChecklist(true);
  };

  const showAlert = (title: string, message: string, onPress?: () => void) => {
    if (Platform.OS === 'web') {
      // Use a small timeout to allow UI to update before blocking alert
      setTimeout(() => {
        window.alert(`${title}\n\n${message}`);
        if (onPress) onPress();
      }, 100);
    } else {
      Alert.alert(title, message, [
        { text: 'OK', onPress }
      ]);
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);

    if (!sys || !dia) {
      showAlert('Error', 'Please enter both systolic and diastolic values');
      return;
    }

    if (!routePatient) {
      showAlert('Error', 'No patient selected');
      return;
    }

    const isHigh = isBPHigh(sys, dia);

    // Show checklist for high BP readings
    if (isHigh && !isChecklistComplete()) {
      setShowChecklist(true);
      return;
    }

    setLoading(true);

    try {
      await recordBPReading(sys, dia, isChecklistComplete(), undefined, routePatient);

      const isControlled = isBPInTargetRange(sys, dia);
      const title = isHigh ? 'High BP Recorded' : isControlled ? '✓ BP Normalized' : 'BP Recorded';
      const message = isHigh
        ? 'Reading saved. Protocol timers/alerts updated. Follow the next action prompt.'
        : isControlled
        ? 'Blood pressure is within target (130-150/80-100). If an emergency was active it will be resolved.'
        : 'Blood pressure has been recorded successfully.';

      showAlert(title, message, async () => {
        handleClear();
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadBPHistory();
        await loadTimerAndSession();
        navigation.goBack();
      });
    } catch (error: any) {
      console.error('Error submitting BP:', error);
      showAlert('Error', error.message || 'Failed to record blood pressure');
    } finally {
      setLoading(false);
    }
  };

  if (!routePatient) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No patient selected</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>BP Entry</Text>
        </View>

        <View style={styles.patientInfo}>
          <View style={styles.patientHeader}>
            <Text style={styles.patientName}>
              {routePatient.room_number ? `Room ${routePatient.room_number}` : `ID: ${routePatient.anonymous_identifier}`}
            </Text>
          </View>
          {routePatient.room_number && (
            <Text style={styles.patientId}>ID: {routePatient.anonymous_identifier}</Text>
          )}
          {routePatient.has_asthma && (
            <View style={styles.asthmaBadge}>
              <Text style={styles.asthmaText}>⚠️ Asthma</Text>
            </View>
          )}
        </View>

        {emergencySession && (
          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyBannerText}>
              🚨 Active Emergency {emergencySession.status === 'escalated' ? '- ESCALATED' : ''}
            </Text>
            {emergencySession.algorithm_selected && (
              <Text style={styles.emergencyAlgorithmText}>
                Protocol: {emergencySession.algorithm_selected.toUpperCase()}
              </Text>
            )}
          </View>
        )}

        {activeTimer && (
          <View style={styles.timerContainer}>
            <TimerCountdown timer={activeTimer} size="small" />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Blood Pressure (mmHg)</Text>
          <View style={styles.bpInputRow}>
            <View style={styles.bpInputWrapper}>
              <TextInput
                style={styles.bpInput}
                placeholder="SYS"
                keyboardType="numeric"
                value={systolic}
                onChangeText={setSystolic}
                maxLength={3}
              />
              <Text style={styles.bpInputSublabel}>Systolic</Text>
            </View>
            
            <Text style={styles.bpDivider}>/</Text>
            
            <View style={styles.bpInputWrapper}>
              <TextInput
                style={styles.bpInput}
                placeholder="DIA"
                keyboardType="numeric"
                value={diastolic}
                onChangeText={setDiastolic}
                maxLength={3}
              />
              <Text style={styles.bpInputSublabel}>Diastolic</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <ActionButton
            label="Clear"
            onPress={handleClear}
            variant="secondary"
          />
          <ActionButton
            label={loading ? "Submitting..." : "Submit"}
            onPress={handleSubmit}
            variant="primary"
            disabled={loading}
          />
        </View>

        {/* Recent Readings Section */}
        {bpHistoryWithUsers.length > 0 && (
          <View style={styles.recentReadings}>
            <Text style={styles.sectionTitle}>Recent Readings</Text>
            {bpHistoryWithUsers.map((reading, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyContent}>
                  <Text style={styles.historyBP}>
                    {reading.systolic}/{reading.diastolic} mmHg
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(reading.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
                </View>
                <View style={styles.historyFooter}>
                  {reading.recordedByName && (
                    <Text style={styles.recordedBy}>by {reading.recordedByName}</Text>
                  )}
                  {isBPHigh(reading.systolic, reading.diastolic) && (
                    <View style={styles.highIndicatorContainer}>
                      <Text style={styles.highIndicator}>HIGH</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Positioning Checklist Modal */}
      <Modal
        visible={showChecklist}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChecklist(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.checklistTitle}>Positioning Checklist</Text>
            <Text style={styles.checklistSubtitle}>
              Per RWJ Protocol: Verify proper positioning
            </Text>

            <View style={styles.protocolNote}>
              <Text style={styles.protocolNoteText}>
                ⚠️ Do NOT reposition patient to lower BP
              </Text>
            </View>

            <ScrollView style={styles.checklistScroll} bounces={false}>
              {[
                { key: 'back_supported', label: 'Back supported' },
                { key: 'feet_flat', label: 'Feet flat on floor' },
                { key: 'arm_supported', label: 'Arm at heart level' },
                { key: 'correct_cuff_size', label: 'Correct cuff size' },
                { key: 'patient_calm', label: 'Patient calm & rested' },
              ].map((item) => (
                <View key={item.key} style={styles.checklistItemRow}>
                  <TouchableOpacity
                    style={styles.checklistItem}
                    onPress={() => setChecklist({ ...checklist, [item.key]: !checklist[item.key as keyof typeof checklist] })}
                  >
                    <View style={[
                      styles.checkbox,
                      checklist[item.key as keyof typeof checklist] && styles.checkboxChecked
                    ]}>
                      {checklist[item.key as keyof typeof checklist] && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.checklistLabel}>{item.label}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => openGuide(item.key)}
                  >
                    <Text style={styles.infoIcon}>ⓘ</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={styles.checkAllButton} 
              onPress={handleCheckAll}
              activeOpacity={0.7}
            >
              <Text style={styles.checkAllText}>Check All</Text>
            </TouchableOpacity>

            <View style={styles.checklistActions}>
              <ActionButton
                label="Close"
                onPress={() => setShowChecklist(false)}
                variant="secondary"
                disabled={loading}
              />
              {isChecklistComplete() && (
                <ActionButton
                  label="Confirm & Submit"
                  onPress={handleSubmit}
                  variant="primary"
                  loading={loading}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Detailed Guide Modal */}
      <Modal
        visible={showGuide}
        transparent
        animationType="slide"
        onRequestClose={closeGuide}
      >
        <View style={styles.guideModalOverlay}>
          <View style={styles.guideSheetContainer}>
            <View style={styles.guideHeaderBar}>
              <TouchableOpacity
                onPress={closeGuide}
                style={styles.guideCloseButton}
              >
                <Text style={styles.guideCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.guideHeaderTitle}>
                {selectedGuide && positioningGuides[selectedGuide as keyof typeof positioningGuides]?.title}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.guideScrollContent} bounces={false}>
              {selectedGuide && positioningGuides[selectedGuide as keyof typeof positioningGuides]?.sections.map((section, index) => (
                <View key={index} style={[
                  styles.guideSectionBox,
                  ('isWarning' in section && section.isWarning) && styles.guideSectionWarningBox
                ]}>
                  <Text style={[
                    styles.guideSectionTitle,
                    ('isWarning' in section && section.isWarning) && styles.guideSectionTitleWarning
                  ]}>
                    {section.heading}
                  </Text>
                  <Text style={[
                    styles.guideSectionText,
                    ('isWarning' in section && section.isWarning) && styles.guideSectionTextWarning
                  ]}>
                    {section.content}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  patientInfo: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  patientId: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  asthmaBadge: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#fff3cd',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  asthmaText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: 'bold',
  },
  emergencyBanner: {
    backgroundColor: '#fffbf0',
    borderColor: '#ffc107',
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emergencyBannerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  emergencyAlgorithmText: {
    fontSize: 12,
    color: '#856404',
  },
  timerContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  bpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  bpInputWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bpInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  bpInputSublabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bpDivider: {
    fontSize: 36,
    color: '#dee2e6',
    marginHorizontal: 12,
    fontWeight: '200',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  recentReadings: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyContent: {
    flex: 1,
  },
  historyFooter: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  historyBP: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 13,
    color: '#999',
  },
  recordedBy: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  highIndicator: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#d9534f',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#ffe5e5',
    borderRadius: 4,
  },
  highIndicatorContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  checklistTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  checklistSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  checklistScroll: {
    maxHeight: 400,
  },
  protocolNote: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  protocolNoteText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checklistItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checklistLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  infoButton: {
    padding: 8,
    marginLeft: 8,
  },
  infoIcon: {
    fontSize: 24,
    color: '#007AFF',
  },
  checkAllButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkAllText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  checklistActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  guideModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  guideSheetContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  guideHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
  },
  guideHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  guideCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCloseText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  guideScrollContent: {
    padding: 16,
  },
  guideSectionBox: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  guideSectionWarningBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  guideSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  guideSectionTitleWarning: {
    color: '#856404',
  },
  guideSectionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  guideSectionTextWarning: {
    color: '#856404',
  },
});
