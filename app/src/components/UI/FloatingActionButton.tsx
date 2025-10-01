import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  size?: number;
}

export function FloatingActionButton({
  onPress,
  icon = 'add',
  style,
  size = 56,
}: FloatingActionButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: colors.accent,
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: colors.shadow,
          borderWidth: 2,
          borderColor: colors.surface,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons
        name={icon}
        size={size * 0.4}
        color={colors.background}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Spacing.lg + 80, // Above parking controls
    right: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
});