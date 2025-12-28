import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MedicationAlgorithm } from '../types';
import { MEDICATION_PROTOCOLS } from '../utils/constants';

interface ProtocolStepIndicatorProps {
  algorithm: MedicationAlgorithm;
  currentStep: number;
  size?: 'small' | 'medium' | 'large';
}

export default function ProtocolStepIndicator({ 
  algorithm, 
  currentStep,
  size = 'medium' 
}: ProtocolStepIndicatorProps) {
  const protocol = MEDICATION_PROTOCOLS[algorithm];
  const totalSteps = protocol.maxDoses;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, size === 'small' && styles.labelSmall]}>
        {protocol.name} Protocol
      </Text>
      
      <View style={styles.stepsContainer}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isComplete = step < currentStep;
          const isCurrent = step === currentStep;
          const isPending = step > currentStep;

          const stepStyle = [
            styles.step,
            size === 'small' && styles.stepSmall,
            size === 'large' && styles.stepLarge,
            isComplete && styles.stepComplete,
            isCurrent && styles.stepCurrent,
            isPending && styles.stepPending,
          ];

          const stepTextStyle = [
            styles.stepText,
            size === 'small' && styles.stepTextSmall,
            isComplete && styles.stepTextComplete,
            isCurrent && styles.stepTextCurrent,
          ];

          return (
            <View key={step} style={styles.stepWrapper}>
              <View style={stepStyle}>
                <Text style={stepTextStyle}>
                  {isComplete ? '✓' : step}
                </Text>
              </View>
              {step < totalSteps && (
                <View style={[
                  styles.connector, 
                  isComplete && styles.connectorComplete
                ]} />
              )}
            </View>
          );
        })}
      </View>

      <Text style={[styles.stepLabel, size === 'small' && styles.stepLabelSmall]}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  labelSmall: {
    fontSize: 14,
    marginBottom: 12,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  stepSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  stepLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  stepComplete: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  stepCurrent: {
    backgroundColor: '#c41e3a',
    borderColor: '#c41e3a',
  },
  stepPending: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  stepText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepTextSmall: {
    fontSize: 16,
  },
  stepTextComplete: {
    color: '#fff',
  },
  stepTextCurrent: {
    color: '#fff',
  },
  connector: {
    width: 24,
    height: 2,
    backgroundColor: '#ddd',
  },
  connectorComplete: {
    backgroundColor: '#28a745',
  },
  stepLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  stepLabelSmall: {
    fontSize: 12,
  },
});
