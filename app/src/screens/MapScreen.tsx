import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClusterData } from '@vapi/shared';
import { WebMap } from '../components/Map/WebMap';
import { NearestSpotButton } from '../components/UI/NearestSpotButton';
import { ReportSpotButton } from '../components/UI/ReportSpotButton';
import { StreetDetailView } from '../components/Map/StreetDetailView';
import { useLocation } from '../hooks/useLocation';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../hooks/useTheme';
import { apiService } from '../services/api';
import { openNavigation } from '../services/navigation';
import { liveActivityService } from '../services/liveActivity';
import { overlayService } from '../services/overlay';
import { getAreaHash } from '@vapi/shared';

export function MapScreen() {
  const { colors, isDark } = useTheme();
  const { location, error: locationError, loading: locationLoading } = useLocation();
  const { connected: wsConnected, messages, subscribe } = useWebSocket();
  
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStreetDetail, setShowStreetDetail] = useState(false);

  // Load nearby reports when location changes
  const loadNearbyReports = useCallback(async () => {
    if (!location) return;

    try {
      setLoading(true);
      const response = await apiService.getNearbyReports(
        location.latitude,
        location.longitude,
        1000
      );
      setClusters(response.clusters);
    } catch (error) {
      console.error('Error loading nearby reports:', error);
      
      // TODO: Remove demo data - Generate mock parking spots when API fails
      const mockClusters: ClusterData[] = [];
      const sides = ['N', 'S', 'E', 'W'];
      const countBuckets = ['5_plus', '2_5', '1'];
      
      // Generate spots in 4-block radius (approximately 400m)
      for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * (Math.PI / 180); // Every 30 degrees
        const distance = Math.random() * 0.004 + 0.001; // 100m to 500m
        
        const lat = location.latitude + Math.cos(angle) * distance;
        const lng = location.longitude + Math.sin(angle) * distance;
        
        mockClusters.push({
          geoHash6: `mock${i}`,
          side: sides[Math.floor(Math.random() * sides.length)],
          lat,
          lng,
          count_bucket: countBuckets[Math.floor(Math.random() * countBuckets.length)] as any,
          confidence: 0.8 + Math.random() * 0.2,
          last_ts: new Date().toISOString(),
        });
      }
      
      setClusters(mockClusters);
    } finally {
      setLoading(false);
    }
  }, [location]);


  // Subscribe to WebSocket updates for current area
  useEffect(() => {
    if (location && wsConnected) {
      const area = getAreaHash(location.latitude, location.longitude);
      subscribe(area);
    }
  }, [location, wsConnected, subscribe]);

  // Update clusters when WebSocket messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      loadNearbyReports();
    }
  }, [messages, loadNearbyReports]);

  // Initial data loading
  useEffect(() => {
    loadNearbyReports();
  }, [loadNearbyReports]);

  // Update Live Activity and Overlay
  useEffect(() => {
    if (location && clusters.length > 0) {
      const nearbyCount = clusters.length;
      const distance = '150m'; // Calculate actual distance to nearest cluster
      
      // Update Live Activity (iOS)
      liveActivityService.updateActivity(
        `${nearbyCount} espacios`,
        distance
      );
      
      // Update Overlay (Android)
      overlayService.updateOverlay(
        `${nearbyCount} espacios`,
        distance
      );
    }
  }, [location, clusters]);

  const handleNearestSpotPress = (cluster: ClusterData) => {
    openNavigation(cluster.lat, cluster.lng);
  };

  const handleMapPress = () => {
    // Map press handler - currently not used
  };

  const handleReportSpotPress = () => {
    console.log('🟢 Report spot button pressed, showing street detail view');
    setShowStreetDetail(true);
  };

  const handleStreetDetailClose = () => {
    setShowStreetDetail(false);
  };

  const handleStreetDetailConfirm = (spots: any[]) => {
    console.log('Confirmed spots:', spots);
    // TODO: Send spots to API
    setShowStreetDetail(false);
  };

  const handleStreetDetailCancel = () => {
    setShowStreetDetail(false);
  };


  if (locationError) {
    Alert.alert(
      'Error de ubicación',
      'No se pudo obtener tu ubicación. Verifica los permisos de la app.'
    );
  }

  const centerCoordinate: [number, number] = location
    ? [location.longitude, location.latitude]
    : [-58.3816, -34.6037]; // Buenos Aires default

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      <WebMap
        centerCoordinate={centerCoordinate}
        clusters={clusters}
        onClusterPress={handleNearestSpotPress}
        onMapPress={handleMapPress}
      />

      <View style={styles.topContainer}>
        <NearestSpotButton
          clusters={clusters}
          userLocation={location}
          onPress={handleNearestSpotPress}
        />
      </View>

      <View style={styles.bottomRightContainer}>
        <ReportSpotButton
          onPress={handleReportSpotPress}
          disabled={!location}
        />
      </View>

      {showStreetDetail && (
        <StreetDetailView
          streetName="Calle actual" // TODO: Get actual street name from location
          userLocation={location}
          onClose={handleStreetDetailClose}
          onConfirm={handleStreetDetailConfirm}
          onCancel={handleStreetDetailCancel}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
  },
  bottomRightContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});