import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
}

export default function ActionButton({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
}: ActionButtonProps) {
  const buttonStyle = [
    styles.button,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'danger' && styles.buttonDanger,
    variant === 'success' && styles.buttonSuccess,
    size === 'small' && styles.buttonSmall,
    size === 'large' && styles.buttonLarge,
    (disabled || loading) && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.text,
    variant === 'secondary' && styles.textSecondary,
    size === 'small' && styles.textSmall,
    size === 'large' && styles.textLarge,
  ];

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyle,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#333' : '#fff'} />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    cursor: 'pointer',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonPrimary: {
    backgroundColor: '#c41e3a',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  buttonDanger: {
    backgroundColor: '#dc3545',
  },
  buttonSuccess: {
    backgroundColor: '#28a745',
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  buttonLarge: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 60,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
    cursor: 'not-allowed',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textSecondary: {
    color: '#333',
  },
  textSmall: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 18,
  },
});
