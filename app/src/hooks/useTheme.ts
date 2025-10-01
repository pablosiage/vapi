import { useColorScheme } from 'react-native';
import { Colors } from '../theme';

export function useTheme() {
  const colorScheme = useColorScheme();
  // TODO: Remove forced dark mode - Tesla style defaults to dark
  const isDark = true; // Force dark mode for Tesla aesthetic
  // const isDark = colorScheme === 'dark';
  
  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
}