import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModals } from '../contexts/ModalContext';

export default function EscalationModal() {
  const { modals, dismissEscalationModal } = useModals();

  if (!modals.escalation || !modals.escalationData) {
    return null;
  }

  const session = modals.escalationData;
  const escalatedAt = session.escalated_at
    ? new Date(session.escalated_at).toLocaleTimeString()
    : 'Unknown';

  return (
    <Modal visible={modals.escalation} transparent animationType="slide">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.headerBox}>
              <Text style={styles.alertIcon}>🚨</Text>
              <Text style={styles.title}>STAT - CASE ESCALATED</Text>
              <Text style={styles.subtitle}>Attending physician notified</Text>
            </View>

            {/* Case Summary */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Algorithm:</Text>
                <Text style={styles.summaryValue}>
                  {session.algorithm_selected?.toUpperCase() || 'N/A'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Step Reached:</Text>
                <Text style={styles.summaryValue}>{session.current_step}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Escalated:</Text>
                <Text style={styles.summaryValue}>{escalatedAt}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={dismissEscalationModal}
              >
                <Text style={styles.primaryButtonText}>Acknowledge</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={dismissEscalationModal}
              >
                <Text style={styles.secondaryButtonText}>Return to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  headerBox: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#dc3545',
    marginBottom: 20,
  },
  alertIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#dc3545',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc3545',
  },
});
