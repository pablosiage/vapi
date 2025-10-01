import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button } from '../UI/Button';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing } from '../../theme';
import { apiService } from '../../services/api';
import { openNavigation } from '../../services/navigation';

interface ParkingControlsProps {
  hasActiveSession: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  carLocation: { latitude: number; longitude: number } | null;
  onSessionChange: () => void;
}

export function ParkingControls({
  hasActiveSession,
  currentLocation,
  carLocation,
  onSessionChange,
}: ParkingControlsProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleStartParking = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Ubicación no disponible');
      return;
    }

    setLoading(true);
    
    try {
      await apiService.startParkingSession({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        note: 'Estacionado desde Vapi',
      });

      onSessionChange();
      
      Alert.alert(
        'Ubicación guardada',
        'Tu auto ha sido marcado en esta ubicación. Podrás volver a él más tarde.'
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo guardar la ubicación'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEndParking = async () => {
    setLoading(true);
    
    try {
      await apiService.endParkingSession();
      onSessionChange();
      
      Alert.alert(
        'Sesión finalizada',
        'Tu sesión de estacionamiento ha sido finalizada.'
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo finalizar la sesión'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToCar = () => {
    if (!carLocation) {
      Alert.alert('Error', 'Ubicación del auto no disponible');
      return;
    }

    openNavigation(carLocation.latitude, carLocation.longitude);
  };

  if (hasActiveSession) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Auto estacionado
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tu auto está guardado en el mapa
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            title="Volver al auto"
            onPress={handleNavigateToCar}
            variant="primary"
            style={styles.button}
          />
          
          <Button
            title="Finalizar sesión"
            onPress={handleEndParking}
            variant="secondary"
            loading={loading}
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Marcar ubicación
      </Text>
      
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        ¿Estacionaste aquí? Guarda la ubicación de tu auto
      </Text>

      <Button
        title="Ya estacioné aquí"
        onPress={handleStartParking}
        loading={loading}
        style={styles.fullButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    margin: 0,
    borderRadius: 0,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    letterSpacing: Typography.letterSpacing.wide,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.relaxed,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
  fullButton: {
    width: '100%',
  },
});