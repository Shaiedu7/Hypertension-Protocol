import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Patient, EmergencySession, Timer } from '../types';
import { formatBP } from '../utils/helpers';
import TimerCountdown from './TimerCountdown';

interface PatientCardProps {
  patient: Patient;
  latestBP?: { systolic: number; diastolic: number; timestamp?: string };
  emergencySession?: EmergencySession | null;
  activeTimer?: Timer | null;
  onPress?: () => void;
  showDetails?: boolean;
}

export default function PatientCard({ 
  patient, 
  latestBP, 
  emergencySession,
  activeTimer,
  onPress,
  showDetails = false 
}: PatientCardProps) {
  const hasEmergency = emergencySession?.status === 'active';
  const isEscalated = emergencySession?.status === 'escalated';

  // Determine urgency level
  const isHighBP = latestBP && (latestBP.systolic >= 180 || latestBP.diastolic >= 120);
  const isSevereBP = latestBP && (latestBP.systolic >= 160 || latestBP.diastolic >= 110);
  const timerUrgent = activeTimer && activeTimer.expires_at ? 
    (new Date(activeTimer.expires_at).getTime() - Date.now()) / 1000 < 180 : false; // Less than 3 min

  // Priority levels: CRITICAL > HIGH > MEDIUM > NORMAL
  let urgencyLevel = 'normal';
  
  if (isEscalated) {
    urgencyLevel = 'critical';
  } else if (isHighBP || timerUrgent) {
    urgencyLevel = 'high';
  } else if (hasEmergency || isSevereBP) {
    urgencyLevel = 'medium';
  }

  const containerStyle = [
    styles.container,
    urgencyLevel === 'critical' && styles.containerCritical,
    urgencyLevel === 'high' && styles.containerHigh,
    urgencyLevel === 'medium' && styles.containerMedium,
  ];

  return (
    <TouchableOpacity 
      style={containerStyle} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Text style={styles.identifier}>
          {patient.room_number ? `Room ${patient.room_number} • ` : ''}ID {patient.anonymous_identifier}
        </Text>

        {patient.has_asthma && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>⚠️ Asthma</Text>
          </View>
        )}
      </View>

      {latestBP && (
        <View style={styles.bpContainer}>
          <View>
            <Text style={styles.bpLabel}>Latest BP:</Text>
            {latestBP.timestamp && (
              <Text style={styles.bpTime}>
                {new Date(latestBP.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </Text>
            )}
          </View>
          <Text style={[styles.bpValue, hasEmergency && styles.bpValueHigh]}>
            {formatBP(latestBP.systolic, latestBP.diastolic)}
          </Text>
        </View>
      )}

      {showDetails && emergencySession && (
        <View style={styles.details}>
          <Text style={styles.detailText}>
            {emergencySession.algorithm_selected
              ? `${emergencySession.algorithm_selected.toUpperCase()} Protocol`
              : 'Protocol pending'}
            {emergencySession.current_step > 0 ? ` • Step ${emergencySession.current_step}` : ''}
          </Text>
        </View>
      )}

      {activeTimer && (
        <View style={styles.timerSection}>
          <TimerCountdown timer={activeTimer} size="small" />
        </View>
      )}

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  containerMedium: {
    borderColor: '#ffc107',
    backgroundColor: '#fffbf0',
  },
  containerHigh: {
    borderColor: '#ff9800',
    backgroundColor: '#fff8f0',
  },
  containerCritical: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  identifier: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  bpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bpLabel: {
    fontSize: 13,
    color: '#666',
  },
  bpTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  bpValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bpValueHigh: {
    color: '#dc3545',
  },
  details: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailText: {
    fontSize: 13,
    color: '#555',
  },
  warningContainer: {
    backgroundColor: '#ffe08a',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e0a800',
    alignSelf: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#7a4b00',
    fontWeight: '700',
  },
  timerSection: {
    marginTop: 6,
  },
});
