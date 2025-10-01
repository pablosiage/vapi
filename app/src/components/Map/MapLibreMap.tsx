import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { ClusterData } from '@vapi/shared';
import { Colors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface MapLibreMapProps {
  centerCoordinate: [number, number];
  clusters: ClusterData[];
  onClusterPress: (cluster: ClusterData) => void;
  onMapPress: (coordinates: [number, number]) => void;
}

const MAPBOX_STYLE_URL = process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL || 'https://demotiles.maplibre.org/style.json';

export function MapLibreMap({ 
  centerCoordinate, 
  clusters, 
  onClusterPress, 
  onMapPress 
}: MapLibreMapProps) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapLibreGL.MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (isMapReady && mapRef.current) {
      mapRef.current.setCamera({
        centerCoordinate,
        zoomLevel: 16,
        animationDuration: 500,
      });
    }
  }, [centerCoordinate, isMapReady]);

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

  const handleMapPress = (feature: any) => {
    const coordinates = feature.geometry.coordinates;
    onMapPress([coordinates[0], coordinates[1]]);
  };

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MAPBOX_STYLE_URL}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        onPress={handleMapPress}
      >
        <MapLibreGL.Camera
          zoomLevel={16}
          centerCoordinate={centerCoordinate}
        />

        {clusters.map((cluster, index) => (
          <MapLibreGL.PointAnnotation
            key={`${cluster.geoHash6}-${cluster.side}-${index}`}
            id={`cluster-${cluster.geoHash6}-${cluster.side}`}
            coordinate={[cluster.lng, cluster.lat]}
            onSelected={() => onClusterPress(cluster)}
          >
            <View style={[
              styles.clusterMarker,
              { 
                backgroundColor: getClusterColor(cluster.count_bucket),
                borderColor: colors.background,
              }
            ]}>
              <View style={[
                styles.clusterInner,
                { backgroundColor: colors.background }
              ]}>
                <View style={[
                  styles.clusterDot,
                  { backgroundColor: getClusterColor(cluster.count_bucket) }
                ]} />
              </View>
            </View>
          </MapLibreGL.PointAnnotation>
        ))}
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  clusterMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});