import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Typography, Spacing } from '../../theme';

declare global {
  interface Window {
    maplibregl: any;
  }
}

interface MarkedSpot {
  id: string;
  x: number;
  y: number;
  side: 'left' | 'right';
}

interface StreetDetailViewProps {
  streetName: string;
  userLocation: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onConfirm: (spots: MarkedSpot[]) => void;
  onCancel: () => void;
}

export function StreetDetailView({ streetName, userLocation, onClose, onConfirm, onCancel }: StreetDetailViewProps) {
  console.log('🚀 StreetDetailView component mounted with location:', userLocation);
  const { colors } = useTheme();
  const [markedSpots, setMarkedSpots] = useState<MarkedSpot[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  // Create PanResponder for drawing spots
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt) => {
      setIsDrawing(true);
      addSpotAtPosition(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
    },
    
    onPanResponderMove: (evt) => {
      if (isDrawing) {
        addSpotAtPosition(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      }
    },
    
    onPanResponderRelease: () => {
      setIsDrawing(false);
    },
  });

  // Initialize map when component mounts
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        if (typeof window === 'undefined' || !mapContainer.current || !userLocation) return;

        // Check if MapLibre is already loaded
        if (!window.maplibregl) {
          // Load CSS first
          if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
            const link = document.createElement('link');
            link.href = 'https://unpkg.com/maplibre-gl@4.7.0/dist/maplibre-gl.css';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
          }

          // Load JS
          if (!document.querySelector('script[src*="maplibre-gl.js"]')) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://unpkg.com/maplibre-gl@4.7.0/dist/maplibre-gl.js';
              script.onload = resolve;
              script.onerror = () => reject(new Error('Failed to load MapLibre GL'));
              document.head.appendChild(script);
            });
          }
        }

        // Wait a bit for the library to be available
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted || !window.maplibregl || !mapContainer.current) return;

        console.log('🗺️ Initializing street detail map for location:', userLocation);
        console.log('📦 Map container element:', mapContainer.current);
        console.log('📏 Container dimensions:', {
          width: mapContainer.current?.offsetWidth,
          height: mapContainer.current?.offsetHeight,
          clientWidth: mapContainer.current?.clientWidth,
          clientHeight: mapContainer.current?.clientHeight
        });

        map.current = new window.maplibregl.Map({
          container: mapContainer.current,
          attributionControl: false,
          style: 'https://demotiles.maplibre.org/style.json',
          center: [userLocation.longitude, userLocation.latitude],
          zoom: 19, // Very high zoom for street detail
          pitch: 0,
          bearing: 0,
          scrollZoom: false, // Disable zoom
          boxZoom: false, // Disable box zoom
          dragRotate: false, // Disable rotation
          dragPan: false, // Disable panning
          keyboard: false, // Disable keyboard navigation
          doubleClickZoom: false, // Disable double click zoom
          touchZoomRotate: false, // Disable touch zoom/rotate
        });

        map.current.on('load', () => {
          console.log('✅ Street detail map loaded successfully');
          console.log('🗺️ Map instance:', map.current);
          console.log('🎯 Map center:', map.current.getCenter());
          console.log('🔍 Map zoom:', map.current.getZoom());
          if (isMounted) {
            setMapLoaded(true);
          }
        });

        map.current.on('error', (e) => {
          console.error('❌ Street detail map error:', e);
        });

        map.current.on('sourcedata', (e) => {
          console.log('📡 Source data event:', e.sourceId, e.isSourceLoaded);
        });

        map.current.on('styledata', (e) => {
          console.log('🎨 Style data event');
        });

      } catch (error) {
        console.error('Failed to initialize street detail map:', error);
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [userLocation]);

  const addSpotAtPosition = (x: number, y: number) => {
    if (!map.current || !userLocation) return;

    // Convert screen coordinates to map coordinates
    const lngLat = map.current.unproject([x, y]);
    
    const newSpot: MarkedSpot = {
      id: `spot_${Date.now()}_${Math.random()}`,
      x,
      y,
      side: 'left', // We'll determine this based on actual street geometry later
    };
    
    setMarkedSpots(prev => [...prev, newSpot]);
  };

  const handleUndo = () => {
    setMarkedSpots([]);
  };

  const handleConfirm = () => {
    onConfirm(markedSpots);
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Marcar espacios libres
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Real Street Map with Drawing Overlay - Full Screen */}
      <View style={styles.mapContainer}>
        {/* Map container div */}
        <div
          ref={mapContainer}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        />
        
        {/* Transparent drawing overlay */}
        <View
          style={styles.drawingOverlay}
          {...panResponder.panHandlers}
        >
          {/* Render marked spots */}
          {markedSpots.map((spot) => (
            <View
              key={spot.id}
              style={[
                styles.markedSpot,
                {
                  left: spot.x - 8,
                  top: spot.y - 8,
                  backgroundColor: colors.success,
                  borderColor: colors.background,
                },
              ]}
            />
          ))}
          
          {/* Drawing hint overlay */}
          {!mapLoaded && (
            <View style={[styles.loadingOverlay, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Cargando vista de calle...
              </Text>
            </View>
          )}

          {/* Action Buttons - Floating over map */}
          <View style={styles.floatingActions}>
            <TouchableOpacity
              style={[styles.floatingButton, styles.undoButton, { 
                backgroundColor: colors.surfaceVariant, 
                borderColor: colors.border,
                opacity: markedSpots.length === 0 ? 0.5 : 1
              }]}
              onPress={handleUndo}
              disabled={markedSpots.length === 0}
            >
              <Ionicons name="arrow-undo" size={24} color={markedSpots.length === 0 ? colors.textTertiary : colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.floatingButton, styles.confirmButton, { 
                backgroundColor: colors.success, 
                borderColor: colors.success,
                opacity: markedSpots.length === 0 ? 0.5 : 1
              }]}
              onPress={handleConfirm}
              disabled={markedSpots.length === 0}
            >
              <Ionicons name="checkmark" size={24} color={colors.background} />
              {markedSpots.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.badgeText, { color: colors.success }]}>
                    {markedSpots.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  placeholder: {
    width: 32,
  },
  streetNameContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  streetName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  instructionsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  instructions: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  drawingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  markedSpot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  floatingActions: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
    gap: Spacing.md,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative',
  },
  undoButton: {
    // No additional styles needed
  },
  confirmButton: {
    // No additional styles needed
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00ff88',
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
});