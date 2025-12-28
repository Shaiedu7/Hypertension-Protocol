import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AlertBannerProps {
  type: 'info' | 'warning' | 'critical' | 'stat';
  message: string;
  onDismiss?: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export default function AlertBanner({ 
  type, 
  message, 
  onDismiss, 
  onAction, 
  actionLabel 
}: AlertBannerProps) {
  const containerStyle = [
    styles.container,
    type === 'info' && styles.containerInfo,
    type === 'warning' && styles.containerWarning,
    type === 'critical' && styles.containerCritical,
    type === 'stat' && styles.containerStat,
  ];

  const icon = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
    stat: '🆘',
  }[type];

  return (
    <View style={containerStyle}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.actions}>
        {onAction && actionLabel && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerInfo: {
    backgroundColor: '#d1ecf1',
    borderLeftWidth: 4,
    borderLeftColor: '#0c5460',
  },
  containerWarning: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#856404',
  },
  containerCritical: {
    backgroundColor: '#f8d7da',
    borderLeftWidth: 4,
    borderLeftColor: '#721c24',
  },
  containerStat: {
    backgroundColor: '#dc3545',
    borderLeftWidth: 4,
    borderLeftColor: '#8b0000',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  message: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
});
