import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface UserAccountButtonProps {
  onPress: () => void;
  isLoggedIn?: boolean;
  avatarUrl?: string;
}

export function UserAccountButton({ onPress, isLoggedIn = false, avatarUrl }: UserAccountButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.surfaceVariant,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isLoggedIn && avatarUrl ? (
        // TODO: Implement avatar image when user has one
        <Ionicons
          name="person"
          size={28}
          color={colors.accent}
        />
      ) : (
        <Ionicons
          name="person-outline"
          size={28}
          color={colors.text}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});