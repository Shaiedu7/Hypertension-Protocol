import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModals } from '../contexts/ModalContext';

export default function TimerExpiredModal() {
  const { modals, dismissTimerExpiredModal } = useModals();

  if (!modals.timerExpired || !modals.timerExpiredData) {
    return null;
  }

  const timerType = modals.timerExpiredData.type;
  const isRecheckTimer = timerType === 'bp_recheck';
  const isMedicationTimer = timerType === 'medication_wait';

  return (
    <Modal visible={modals.timerExpired} transparent animationType="fade">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.alertBox}>
            {/* Alert Icon and Title */}
            <Text style={styles.alertIcon}>⏰</Text>
            <Text style={styles.title}>
              {isRecheckTimer ? 'BP RECHECK TIME' : 'MEDICATION WAIT TIME EXPIRED'}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {isRecheckTimer
                ? 'It is time to recheck the patient\'s blood pressure. Patient should have been on BP-lowering medication for 15 minutes.'
                : 'The medication wait period has expired. Reassess patient\'s blood pressure and vital signs.'}
            </Text>

            {/* Action Prompt */}
            <View style={styles.actionBox}>
              <Text style={styles.actionTitle}>REQUIRED ACTION:</Text>
              <Text style={styles.actionText}>
                {isRecheckTimer
                  ? 'Take BP reading and report it in the system'
                  : 'Reassess patient and report new BP reading'}
              </Text>
            </View>

            {/* Timer Details */}
            <View style={styles.detailsBox}>
              <Text style={styles.detailLabel}>Expired at:</Text>
              <Text style={styles.detailValue}>
                {new Date(modals.timerExpiredData.expires_at).toLocaleTimeString()}
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={dismissTimerExpiredModal}
            >
              <Text style={styles.primaryButtonText}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffc107',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  alertIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  actionBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
  detailsBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    width: '100%',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#ffc107',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});
