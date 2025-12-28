import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Timer } from '../types';
import { TimerService } from '../services/timerService';

interface TimerCountdownProps {
  timer: Timer | null;
  size?: 'small' | 'medium' | 'large';
  onExpire?: () => void;
}

export default function TimerCountdown({ timer, size = 'medium', onExpire }: TimerCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!timer || !timer.is_active) {
      setTimeRemaining(0);
      return;
    }

    // Initial calculation
    const remaining = TimerService.getTimeRemaining(timer);
    setTimeRemaining(remaining);

    if (remaining <= 0 && onExpire) {
      onExpire();
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      const newRemaining = TimerService.getTimeRemaining(timer);
      setTimeRemaining(newRemaining);

      if (newRemaining <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, onExpire]);

  if (!timer) {
    return null;
  }

  // Handle overdue timers
  const isOverdue = timeRemaining <= 0;
  
  if (isOverdue) {
    const overdueSeconds = Math.abs(timeRemaining);
    const overdueMinutes = Math.floor(overdueSeconds / 60);
    const overdueHours = Math.floor(overdueMinutes / 60);
    
    let overdueText = '';
    if (overdueHours > 0) {
      overdueText = `${overdueHours}h ${overdueMinutes % 60}m`;
    } else if (overdueMinutes > 0) {
      overdueText = `${overdueMinutes}m`;
    } else {
      overdueText = `${overdueSeconds}s`;
    }

    const containerStyle = [
      styles.container,
      size === 'small' && styles.containerSmall,
      size === 'large' && styles.containerLarge,
      styles.containerOverdue,
    ];

    const timerStyle = [
      styles.timerText,
      size === 'small' && styles.timerSmall,
      size === 'large' && styles.timerLarge,
      styles.timerOverdue,
    ];

    const labelStyle = [
      styles.label,
      size === 'small' && styles.labelSmall,
      styles.labelOverdue,
    ];

    return (
      <View style={containerStyle}>
        <Text style={labelStyle}>⚠️ OVERDUE BY</Text>
        <Text style={timerStyle}>{overdueText}</Text>
      </View>
    );
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isUrgent = timeRemaining <= 60; // Last minute
  const isCritical = timeRemaining <= 30; // Last 30 seconds

  const containerStyle = [
    styles.container,
    size === 'small' && styles.containerSmall,
    size === 'large' && styles.containerLarge,
    isUrgent && styles.containerUrgent,
    isCritical && styles.containerCritical,
  ];

  const timerStyle = [
    styles.timerText,
    size === 'small' && styles.timerSmall,
    size === 'large' && styles.timerLarge,
    isUrgent && styles.timerUrgent,
  ];

  const labelStyle = [
    styles.label,
    size === 'small' && styles.labelSmall,
  ];

  const timerLabel = timer.type === 'bp_recheck' ? 'BP Recheck In' : 'Next BP Check In';

  return (
    <View style={containerStyle}>
      <Text style={labelStyle}>{timerLabel}</Text>
      <Text style={timerStyle}>{formattedTime}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  containerSmall: {
    padding: 8,
  },
  containerLarge: {
    padding: 24,
  },
  containerUrgent: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  containerCritical: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  containerOverdue: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: 12,
  },
  labelOverdue: {
    color: '#721c24',
    fontWeight: '600',
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    fontVariant: ['tabular-nums'],
  },
  timerSmall: {
    fontSize: 20,
  },
  timerLarge: {
    fontSize: 56,
  },
  timerUrgent: {
    color: '#dc3545',
  },
  timerOverdue: {
    color: '#721c24',
  },
});
