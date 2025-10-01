import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClusterData } from '@vapi/shared';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing } from '../../theme';

interface NearestSpotButtonProps {
  clusters: ClusterData[];
  userLocation: { latitude: number; longitude: number } | null;
  onPress: (nearestCluster: ClusterData) => void;
}

export function NearestSpotButton({ clusters, userLocation, onPress }: NearestSpotButtonProps) {
  const { colors } = useTheme();

  const findNearestCluster = (): ClusterData | null => {
    if (!userLocation || clusters.length === 0) return null;

    let nearest = clusters[0];
    let shortestDistance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      nearest.lat,
      nearest.lng
    );

    for (const cluster of clusters) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        cluster.lat,
        cluster.lng
      );
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearest = cluster;
      }
    }

    return nearest;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getSpotDescription = (countBucket: string): string => {
    switch (countBucket) {
      case '5_plus': return 'Muchos espacios';
      case '2_5': return 'Algunos espacios';
      case '1': return 'Un espacio';
      default: return 'Espacios disponibles';
    }
  };

  const nearestCluster = findNearestCluster();
  
  if (!nearestCluster || !userLocation) {
    return (
      <View style={[styles.container, styles.disabledContainer, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.disabledText, { color: colors.textTertiary }]}>
          Buscando espacios cercanos...
        </Text>
      </View>
    );
  }

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    nearestCluster.lat,
    nearestCluster.lng
  );

  return (
    <TouchableOpacity
      style={[styles.container, { 
        backgroundColor: colors.success,
        borderColor: colors.border,
      }]}
      onPress={() => onPress(nearestCluster)}
      activeOpacity={0.9}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="navigate" 
            size={24} 
            color={colors.background} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.background }]}>
            Ir al sitio más próximo
          </Text>
          <Text style={[styles.subtitle, { color: colors.background }]}>
            {getSpotDescription(nearestCluster.count_bucket)} • {formatDistance(distance)}
          </Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={colors.background} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 24,
    borderWidth: 2,
  },
  disabledContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  disabledText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    opacity: 0.9,
  },
  arrowContainer: {
    marginLeft: Spacing.md,
  },
});