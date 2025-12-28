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
  let urgencyLabel = '';
  
  if (isEscalated) {
    urgencyLevel = 'critical';
    urgencyLabel = 'CRITICAL';
  } else if (isHighBP || timerUrgent) {
    urgencyLevel = 'high';
    urgencyLabel = 'URGENT';
  } else if (hasEmergency || isSevereBP) {
    urgencyLevel = 'medium';
    urgencyLabel = 'ACTIVE';
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
        <View>
          {patient.room_number ? (
            <>
              <Text style={styles.identifier}>
                Room {patient.room_number}
              </Text>
              <Text style={styles.secondaryIdentifier}>
                ID: {patient.anonymous_identifier}
              </Text>
            </>
          ) : (
            <Text style={styles.identifier}>
              ID: {patient.anonymous_identifier}
            </Text>
          )}
        </View>

        {urgencyLabel && (
          <View style={[
            styles.urgencyBadge,
            urgencyLevel === 'critical' && styles.urgencyBadgeCritical,
            urgencyLevel === 'high' && styles.urgencyBadgeHigh,
            urgencyLevel === 'medium' && styles.urgencyBadgeMedium,
          ]}>
            <Text style={styles.urgencyBadgeText}>{urgencyLabel}</Text>
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
          {emergencySession.algorithm_selected && (
            <Text style={styles.detailText}>
              Protocol: {emergencySession.algorithm_selected}
            </Text>
          )}
          {emergencySession.current_step > 0 && (
            <Text style={styles.detailText}>
              Step {emergencySession.current_step}
            </Text>
          )}
        </View>
      )}

      {activeTimer && (
        <View style={styles.timerSection}>
          <TimerCountdown timer={activeTimer} size="small" />
        </View>
      )}

      {patient.has_asthma && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>⚠️ Asthma</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 10,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  identifier: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  secondaryIdentifier: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  urgencyBadgeMedium: {
    backgroundColor: '#ffc107',
  },
  urgencyBadgeHigh: {
    backgroundColor: '#ff9800',
  },
  urgencyBadgeCritical: {
    backgroundColor: '#dc3545',
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  bpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bpLabel: {
    fontSize: 14,
    color: '#666',
  },
  bpTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  bpValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  bpValueHigh: {
    color: '#dc3545',
  },
  details: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timerSection: {
    marginTop: 8,
  },
  warningContainer: {
    marginTop: 6,
    padding: 4,
    backgroundColor: '#fff3cd',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
});
