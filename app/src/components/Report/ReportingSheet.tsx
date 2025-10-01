import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CountBucket } from '@vapi/shared';
import { Button } from '../UI/Button';
import { BottomSheet } from '../UI/BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing } from '../../theme';
import { apiService } from '../../services/api';

interface ReportingSheetProps {
  visible: boolean;
  onClose: () => void;
  location: { latitude: number; longitude: number } | null;
  onReportSuccess: () => void;
}

export function ReportingSheet({
  visible,
  onClose,
  location,
  onReportSuccess,
}: ReportingSheetProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState<string | null>(null);

  const handleReport = async (countBucket: CountBucket) => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    setLoading(countBucket);
    
    try {
      await apiService.createReport({
        lat: location.latitude,
        lng: location.longitude,
        count_bucket: countBucket,
      });

      onReportSuccess();
      onClose();
      
      Alert.alert(
        'Reporte enviado',
        'Gracias por ayudar a la comunidad reportando espacios disponibles!'
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo enviar el reporte'
      );
    } finally {
      setLoading(null);
    }
  };

  const reportOptions = [
    {
      id: '1' as CountBucket,
      title: '1 libre',
      description: 'Solo un espacio disponible',
      color: '#ff4444', // Tesla red
    },
    {
      id: '2_5' as CountBucket,
      title: '2-5 libres',
      description: 'Algunos espacios disponibles',
      color: '#ffcc00', // Tesla yellow
    },
    {
      id: '5_plus' as CountBucket,
      title: '+5 libres',
      description: 'Muchos espacios disponibles',
      color: '#00ff88', // Tesla green
    },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          Reportar disponibilidad
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          ¿Cuántos espacios libres ves en esta cuadra?
        </Text>

        <View style={styles.optionsContainer}>
          {reportOptions.map((option) => (
            <Button
              key={option.id}
              title={option.title}
              onPress={() => handleReport(option.id)}
              loading={loading === option.id}
              disabled={!!loading}
              style={[
                styles.optionButton,
                { backgroundColor: option.color }
              ]}
              textStyle={[
                styles.optionText,
                { color: colors.background }
              ]}
            />
          ))}
        </View>

        <Button
          title="Cancelar"
          onPress={onClose}
          variant="secondary"
          style={styles.cancelButton}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  optionsContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  optionButton: {
    borderRadius: 12,
    height: 60,
  },
  optionText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  cancelButton: {
    marginTop: Spacing.md,
  },
});