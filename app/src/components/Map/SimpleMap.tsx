import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ClusterData } from '@vapi/shared';
import { useTheme } from '../../hooks/useTheme';
import { Colors, Typography, Spacing } from '../../theme';

interface SimpleMapProps {
  centerCoordinate: [number, number];
  clusters: ClusterData[];
  onClusterPress: (cluster: ClusterData) => void;
  onMapPress: (coordinates: [number, number]) => void;
}

export function SimpleMap({ 
  centerCoordinate, 
  clusters, 
  onClusterPress, 
  onMapPress 
}: SimpleMapProps) {
  const { colors } = useTheme();

  const getClusterColor = (countBucket: string): string => {
    switch (countBucket) {
      case '5_plus':
        return Colors.cluster.available;
      case '2_5':
        return Colors.cluster.limited;
      case '1':
        return Colors.cluster.scarce;
      default:
        return Colors.cluster.limited;
    }
  };

  const getClusterLabel = (countBucket: string): string => {
    switch (countBucket) {
      case '5_plus':
        return '+5 espacios';
      case '2_5':
        return '2-5 espacios';
      case '1':
        return '1 espacio';
      default:
        return 'Espacios';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Mapa Demo - Vapi
        </Text>
        <Text style={[styles.location, { color: colors.textSecondary }]}>
          📍 {centerCoordinate[1].toFixed(4)}, {centerCoordinate[0].toFixed(4)}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.mapArea, { backgroundColor: colors.surface }]}
        onPress={() => onMapPress(centerCoordinate)}
      >
        <Text style={[styles.mapText, { color: colors.textSecondary }]}>
          🗺️ Mapa Interactivo Demo
        </Text>
        <Text style={[styles.mapSubtext, { color: colors.textTertiary }]}>
          Tap para reportar en tu ubicación actual
        </Text>
        
        {/* Mock map visualization */}
        <View style={styles.mockMapGrid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.mockMapCell, 
                { backgroundColor: i === 4 ? colors.accent + '30' : colors.border }
              ]}
            >
              {i === 4 && <Text style={styles.userDot}>📍</Text>}
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <ScrollView style={styles.clustersList}>
        <Text style={[styles.clustersTitle, { color: colors.text }]}>
          Espacios cercanos ({clusters.length})
        </Text>
        
        {clusters.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay reportes en tu zona
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Sé el primero en reportar espacios disponibles
            </Text>
          </View>
        ) : (
          clusters.map((cluster, index) => (
            <TouchableOpacity
              key={`${cluster.geoHash6}-${cluster.side}-${index}`}
              style={[
                styles.clusterItem,
                { 
                  backgroundColor: colors.surface,
                  borderLeftColor: getClusterColor(cluster.count_bucket)
                }
              ]}
              onPress={() => onClusterPress(cluster)}
            >
              <View style={styles.clusterContent}>
                <Text style={[styles.clusterLabel, { color: colors.text }]}>
                  {getClusterLabel(cluster.count_bucket)}
                </Text>
                <Text style={[styles.clusterDetails, { color: colors.textSecondary }]}>
                  Lado {cluster.side} • Confianza: {Math.round(cluster.confidence * 100)}%
                </Text>
                <Text style={[styles.clusterLocation, { color: colors.textTertiary }]}>
                  📍 {cluster.lat.toFixed(4)}, {cluster.lng.toFixed(4)}
                </Text>
              </View>
              <View style={[
                styles.clusterIndicator,
                { backgroundColor: getClusterColor(cluster.count_bucket) }
              ]} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  location: {
    fontSize: Typography.fontSize.sm,
  },
  mapArea: {
    margin: Spacing.md,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  mapText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  mapSubtext: {
    fontSize: Typography.fontSize.sm,
  },
  clustersList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  clustersTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  clusterItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  clusterContent: {
    flex: 1,
  },
  clusterLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  clusterDetails: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
  clusterLocation: {
    fontSize: Typography.fontSize.xs,
  },
  clusterIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignSelf: 'center',
  },
});