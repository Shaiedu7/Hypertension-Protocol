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
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.headerBox}>
              <Text style={styles.alertIcon}>🚨</Text>
              <Text style={styles.title}>STAT - CASE ESCALATED</Text>
              <Text style={styles.subtitle}>Senior physician on-call notified</Text>
            </View>

            {/* Escalation Reason */}
            <View style={styles.reasonBox}>
              <Text style={styles.reasonTitle}>Why This Case Was Escalated:</Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.reasonText}>
                  Standard protocol medications have been ineffective
                </Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.reasonText}>
                  Blood pressure remains critically elevated despite treatment
                </Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.reasonText}>
                  Additional specialist evaluation is required
                </Text>
              </View>
            </View>

            {/* Case Summary */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Case Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Selected Algorithm:</Text>
                <Text style={styles.summaryValue}>
                  {session.algorithm_selected?.toUpperCase() || 'N/A'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Protocol Step:</Text>
                <Text style={styles.summaryValue}>{session.current_step}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Status:</Text>
                <Text style={[styles.summaryValue, { color: '#dc3545' }]}>
                  {session.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Escalated:</Text>
                <Text style={styles.summaryValue}>{escalatedAt}</Text>
              </View>
            </View>

            {/* Next Steps */}
            <View style={styles.nextStepsBox}>
              <Text style={styles.nextStepsTitle}>Next Steps:</Text>
              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>
                  Attending physician will contact you shortly
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>
                  Continue monitoring patient vital signs
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>
                  Be prepared to provide case history and medication details
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Text style={styles.stepNumber}>4</Text>
                <Text style={styles.stepText}>
                  Attend to any additional orders from attending
                </Text>
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
    padding: 16,
  },
  headerBox: {
    alignItems: 'center',
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
  reasonBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 12,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#721c24',
    marginRight: 12,
    fontWeight: 'bold',
  },
  reasonText: {
    fontSize: 14,
    color: '#721c24',
    lineHeight: 20,
    flex: 1,
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
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
  nextStepsBox: {
    backgroundColor: '#d1ecf1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bee5eb',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c5460',
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c5460',
    marginRight: 12,
    minWidth: 24,
  },
  stepText: {
    fontSize: 14,
    color: '#0c5460',
    lineHeight: 20,
    flex: 1,
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
