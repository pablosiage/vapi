import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ClusterData } from '@vapi/shared';
import { useTheme } from '../../hooks/useTheme';
import * as turf from '@turf/turf';
import { Ionicons } from '@expo/vector-icons';

interface WebMapProps {
  centerCoordinate: [number, number];
  clusters: ClusterData[];
  onClusterPress: (cluster: ClusterData) => void;
  onMapPress: (coordinates: [number, number]) => void;
}

declare global {
  interface Window {
    maplibregl: any;
  }
}

export function WebMap({ 
  centerCoordinate, 
  clusters, 
  onClusterPress, 
  onMapPress 
}: WebMapProps) {
  const { colors, isDark } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<any[]>([]);
  const loadStreetGeometryRef = useRef<((center: [number, number]) => Promise<void>) | null>(null);
  const lastLoadedCenterRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        if (typeof window === 'undefined' || !mapContainer.current) return;

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

        console.log('Initializing MapLibre GL map...');

        map.current = new window.maplibregl.Map({
          container: mapContainer.current,
          attributionControl: false,
          style: {
            version: 8,
            sources: {
              'osm': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: ''
              }
            },
            layers: [
              {
                id: 'background',
                type: 'background',
                paint: {
                  'background-color': '#0a0a0a'
                }
              },
              {
                id: 'osm-tiles',
                type: 'raster',
                source: 'osm',
                paint: {
                  'raster-opacity': 0.7,
                  'raster-contrast': -0.3,
                  'raster-brightness-min': 0.2,
                  'raster-brightness-max': 0.5,
                  'raster-saturation': -0.9,
                  'raster-hue-rotate': 0
                }
              }
            ]
          },
          center: centerCoordinate,
          zoom: 17,
          pitch: 0,
          bearing: 0,
        });

        map.current.on('load', () => {
          console.log('Map loaded successfully');
          if (!isMounted) return;
          
          setMapLoaded(true);
          
          // Clean map by hiding buildings and numbers for Tesla aesthetic
          console.log('🧹 Cleaning map - hiding buildings and numbers');
          setTimeout(() => {
            if (!map.current || !isMounted) return;
            const style = map.current.getStyle();
            if (style && style.layers) {
              style.layers.forEach((layer: any) => {
                if (layer.id.includes('building') || 
                    layer.id.includes('house') || 
                    layer.id.includes('poi') ||
                    layer.id.includes('label') ||
                    layer.id.includes('place-label') ||
                    layer.id.includes('road-label')) {
                  try {
                    map.current.setLayoutProperty(layer.id, 'visibility', 'none');
                    console.log(`🗑️ Hidden layer: ${layer.id}`);
                  } catch (e) {
                    // Some layers might not support visibility changes
                  }
                }
              });
            }
          }, 500);
          
          // Add user location marker with navigation arrow (not a pin!)
          const locationEl = document.createElement('div');
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '26');
          svg.setAttribute('height', '26');
          svg.setAttribute('viewBox', '0 0 512 512');
          svg.setAttribute('fill', 'none');
          
          // Navigation arrow from Ionicons (triangle pointing up)
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M256 48L464 464H48z');
          path.setAttribute('fill', '#007AFF');
          path.setAttribute('stroke', '#ffffff');
          path.setAttribute('stroke-width', '24');
          path.setAttribute('stroke-linejoin', 'round');
          
          svg.appendChild(path);
          locationEl.appendChild(svg);
          locationEl.style.cssText = `
            transform: rotate(0deg);
            z-index: 1000;
            text-align: center;
            width: 26px;
            height: 26px;
            filter: drop-shadow(0 0 3px rgba(0,0,0,0.8));
          `;
          
          const userMarker = new window.maplibregl.Marker({ 
            element: locationEl,
            anchor: 'center'
          })
            .setLngLat(centerCoordinate)
            .addTo(map.current);
          
          markersRef.current.push(userMarker);

          // Load street geometry from OpenStreetMap immediately
          console.log('🎯 Loading initial street geometry for center:', centerCoordinate);
          lastLoadedCenterRef.current = centerCoordinate;
          loadStreetGeometry(centerCoordinate);

          // Add click handler
          map.current.on('click', (e: any) => {
            console.log('Map clicked:', e.lngLat);
            onMapPress([e.lngLat.lng, e.lngLat.lat]);
          });
        });

        map.current.on('error', (e: any) => {
          console.error('Map error:', e);
          setError('Error loading map: ' + e.error?.message || 'Unknown error');
        });

      } catch (err) {
        console.error('Failed to initialize map:', err);
        if (isMounted) {
          setError('Failed to load map: ' + (err as Error).message);
        }
      }
    };

    const loadStreetGeometry = async (center: [number, number]) => {
      if (!map.current) {
        console.log('⏳ Map not ready, skipping street geometry load');
        return;
      }
      
      try {
        console.log('🚗 Loading street geometry for center:', center);
        const radius = 0.004; // Larger radius ~400m for more parking lines
        const bbox = {
          south: center[1] - radius,
          north: center[1] + radius,
          west: center[0] - radius,
          east: center[0] + radius
        };

        // Overpass API query for streets with parking data
        const overpassQuery = `[out:json][timeout:20];
(
  way[highway~"^(primary|secondary|tertiary|residential)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out geom;`;

        console.log('🌐 Fetching from Overpass API...');
        console.log('📋 Query:', overpassQuery);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`https://overpass-api.de/api/interpreter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const osmData = await response.json();
        console.log('📊 OSM Response:', osmData);

        if (osmData.elements && osmData.elements.length > 0) {
          console.log('✅ Loaded', osmData.elements.length, 'streets from OSM');
          await createParkingLanesFromOSM(osmData.elements);
        } else {
          console.log('⚠️ No streets found in OSM data, using fallback');
          createMockParkingLanes(center);
        }
      } catch (error) {
        console.error('❌ Error loading street geometry:', error);
        // Try alternative approach: extract streets from map source
        console.log('🔄 Trying to extract street data from map tiles...');
        
        try {
          await extractStreetsFromMapTiles(center);
        } catch (extractError) {
          console.log('⚠️ Map extraction failed, using enhanced mock data');
          createMockParkingLanes(center);
        }
      }
    };

    // Assign function to ref so it can be called from outside useEffect
    loadStreetGeometryRef.current = loadStreetGeometry;

    const extractStreetsFromMapTiles = async (center: [number, number]) => {
      console.log('🗺️ Attempting to extract street geometry from OpenStreetMap tiles...');
      
      // Use a simplified API that should be more reliable
      const zoom = 17;
      const tileX = Math.floor((center[0] + 180) / 360 * Math.pow(2, zoom));
      const tileY = Math.floor((1 - Math.log(Math.tan(center[1] * Math.PI / 180) + 1 / Math.cos(center[1] * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
      
      // Use a direct OSM XML API call that's more reliable
      const bbox = {
        south: center[1] - 0.002,
        north: center[1] + 0.002,
        west: center[0] - 0.002,
        east: center[0] + 0.002
      };
      
      try {
        console.log('📡 Fetching OSM data via direct API...');
        const osmResponse = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
        
        if (osmResponse.ok) {
          const xmlText = await osmResponse.text();
          console.log('✅ Got OSM XML data, parsing...');
          await parseOSMXMLAndCreateParking(xmlText, center);
        } else {
          throw new Error('OSM API failed');
        }
      } catch (error) {
        console.log('❌ OSM direct API failed, creating realistic mock data');
        createRealisticMockParkingLanes(center);
      }
    };

    const parseOSMXMLAndCreateParking = async (xmlText: string, center: [number, number]) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const nodes = new Map();
        const ways = [];
        
        // Parse nodes
        xmlDoc.querySelectorAll('node').forEach(node => {
          const id = node.getAttribute('id');
          const lat = parseFloat(node.getAttribute('lat') || '0');
          const lon = parseFloat(node.getAttribute('lon') || '0');
          nodes.set(id, [lon, lat]);
        });
        
        // Parse ways (streets)
        xmlDoc.querySelectorAll('way').forEach(way => {
          const tags = new Map();
          way.querySelectorAll('tag').forEach(tag => {
            tags.set(tag.getAttribute('k'), tag.getAttribute('v'));
          });
          
          const highway = tags.get('highway');
          if (highway && ['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street'].includes(highway)) {
            const nodeRefs = Array.from(way.querySelectorAll('nd')).map(nd => nd.getAttribute('ref'));
            const coordinates = nodeRefs.map(ref => nodes.get(ref)).filter(coord => coord);
            
            if (coordinates.length >= 2) {
              ways.push({
                id: way.getAttribute('id'),
                highway,
                coordinates,
                tags
              });
            }
          }
        });
        
        console.log(`🛣️ Found ${ways.length} streets from OSM XML`);
        
        if (ways.length > 0) {
          const parkingFeatures = ways.flatMap(way => {
            // Create parking lanes on both sides of each street
            return [
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: way.coordinates
                },
                properties: {
                  side: 'left',
                  street_id: `osm-${way.id}-left`,
                  availability: Math.random() > 0.3 ? 'available' : 'full',
                  spots_count: Math.floor(Math.random() * 8) + 2
                }
              },
              {
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: way.coordinates
                },
                properties: {
                  side: 'right',
                  street_id: `osm-${way.id}-right`,
                  availability: Math.random() > 0.3 ? 'available' : 'full',
                  spots_count: Math.floor(Math.random() * 8) + 2
                }
              }
            ];
          });
          
          console.log(`🚗 Created ${parkingFeatures.length} parking lane features from real streets`);
          
          // Remove intersections from parking lines
          const cleanedFeatures = removeIntersectionsFromParkingLines(parkingFeatures.filter(f => f.properties.availability === 'available'), ways);
          addParkingLayers(cleanedFeatures);
        } else {
          throw new Error('No valid streets found');
        }
      } catch (error) {
        console.error('❌ Failed to parse OSM XML:', error);
        createRealisticMockParkingLanes(center);
      }
    };

    const createRealisticMockParkingLanes = (center: [number, number]) => {
      console.log('🎯 Creating ultra-realistic mock parking based on Buenos Aires street patterns');
      createMockParkingLanes(center);
    };

    const removeIntersectionsFromParkingLines = (parkingFeatures: any[], allWays: any[]) => {
      console.log('✂️ Removing intersections from parking lines using Turf.js...');
      
      try {
        // Create a collection of all street lines for intersection detection
        const streetLines = allWays.map(way => 
          turf.lineString(way.coordinates, { street_id: way.id })
        );
        
        console.log(`🛣️ Processing ${streetLines.length} street lines for intersections`);
        
        // Find all intersection points using Turf.js
        const intersectionPoints: turf.Feature<turf.Point>[] = [];
        
        for (let i = 0; i < streetLines.length; i++) {
          for (let j = i + 1; j < streetLines.length; j++) {
            try {
              const intersections = turf.lineIntersect(streetLines[i], streetLines[j]);
              intersectionPoints.push(...intersections.features);
            } catch (e) {
              // Skip invalid intersections
            }
          }
        }
        
        console.log(`🔍 Found ${intersectionPoints.length} intersection points with Turf.js`);
        
        // Process each parking line
        const cleanedFeatures: any[] = [];
        
        parkingFeatures.forEach((feature, featureIndex) => {
          try {
            const parkingLine = turf.lineString(feature.geometry.coordinates);
            
            // Create buffer zones around intersections (5 meters as per OSM guidelines)
            const intersectionBuffers = intersectionPoints.map(point => 
              turf.buffer(point, 5, { units: 'meters' })
            );
            
            if (intersectionBuffers.length === 0) {
              // No intersections, keep the original line
              cleanedFeatures.push(feature);
              return;
            }
            
            // Split the parking line where it intersects with buffers
            let remainingLine = parkingLine;
            const validSegments: turf.Feature<turf.LineString>[] = [];
            
            intersectionBuffers.forEach((buffer, bufferIndex) => {
              try {
                // Check if line intersects with intersection buffer
                const intersects = turf.booleanIntersects(remainingLine, buffer);
                
                if (intersects) {
                  // Use point-based filtering instead of turf.difference
                  const coords = remainingLine.geometry.coordinates;
                  const filteredCoords: [number, number][] = [];
                  
                  coords.forEach(coord => {
                    const point = turf.point(coord);
                    const isInBuffer = turf.booleanPointInPolygon(point, buffer);
                    if (!isInBuffer) {
                      filteredCoords.push(coord);
                    }
                  });
                  
                  // Create segments from filtered coordinates
                  if (filteredCoords.length >= 2) {
                    const segments = createContinuousSegments(filteredCoords);
                    validSegments.push(...segments);
                  }
                } else {
                  // No intersection, keep the line
                  validSegments.push(remainingLine);
                }
              } catch (e) {
                console.log(`⚠️ Error processing buffer ${bufferIndex}:`, e);
              }
            });
            
            // If no valid segments were created, try a simpler approach
            if (validSegments.length === 0) {
              const simpleSegments = createSimpleIntersectionFreeSegments(
                feature.geometry.coordinates, 
                intersectionPoints
              );
              validSegments.push(...simpleSegments);
            }
            
            // If still no segments, keep original feature to ensure visibility
            if (validSegments.length === 0) {
              console.log(`⚠️ No segments created for feature ${featureIndex}, keeping original`);
              cleanedFeatures.push(feature);
              return;
            }
            
            // Add valid segments as separate features
            validSegments.forEach((segment, segIndex) => {
              if (segment.geometry.coordinates.length >= 2) {
                cleanedFeatures.push({
                  ...feature,
                  properties: {
                    ...feature.properties,
                    street_id: `${feature.properties.street_id}-seg${segIndex}`
                  },
                  geometry: segment.geometry
                });
              }
            });
            
          } catch (e) {
            console.log(`⚠️ Error processing feature ${featureIndex}:`, e);
            // Keep original feature as fallback
            cleanedFeatures.push(feature);
          }
        });
        
        console.log(`✅ Split ${parkingFeatures.length} lines into ${cleanedFeatures.length} intersection-free segments`);
        return cleanedFeatures;
        
      } catch (error) {
        console.error('❌ Error in Turf.js intersection removal:', error);
        // Fallback to original features
        return parkingFeatures;
      }
    };

    const createContinuousSegments = (coordinates: [number, number][]): turf.Feature<turf.LineString>[] => {
      const segments: turf.Feature<turf.LineString>[] = [];
      
      if (coordinates.length < 2) {
        return segments;
      }
      
      let currentSegment: [number, number][] = [];
      
      for (let i = 0; i < coordinates.length; i++) {
        const coord = coordinates[i];
        const nextCoord = coordinates[i + 1];
        
        currentSegment.push(coord);
        
        // Check if there's a gap to the next coordinate (indicating intersection removal)
        if (nextCoord) {
          try {
            const distance = turf.distance(turf.point(coord), turf.point(nextCoord), { units: 'meters' });
            
            if (distance > 15) { // Gap larger than 15 meters indicates intersection
              if (currentSegment.length >= 2) {
                segments.push(turf.lineString([...currentSegment]));
              }
              currentSegment = [];
            }
          } catch (e) {
            // If distance calculation fails, continue with current segment
          }
        }
      }
      
      // Add final segment
      if (currentSegment.length >= 2) {
        segments.push(turf.lineString([...currentSegment]));
      }
      
      return segments;
    };

    const createSimpleIntersectionFreeSegments = (
      coordinates: [number, number][], 
      intersectionPoints: turf.Feature<turf.Point>[]
    ): turf.Feature<turf.LineString>[] => {
      const segments: turf.Feature<turf.LineString>[] = [];
      let currentSegment: [number, number][] = [];
      
      coordinates.forEach(coord => {
        const point = turf.point(coord);
        
        // Check if coordinate is near any intersection (within 8 meters)
        const nearIntersection = intersectionPoints.some(intersection => {
          const distance = turf.distance(point, intersection, { units: 'meters' });
          return distance < 8;
        });
        
        if (nearIntersection) {
          // End current segment
          if (currentSegment.length >= 2) {
            segments.push(turf.lineString([...currentSegment]));
          }
          currentSegment = [];
        } else {
          currentSegment.push(coord);
        }
      });
      
      // Add final segment
      if (currentSegment.length >= 2) {
        segments.push(turf.lineString(currentSegment));
      }
      
      return segments;
    };

    const createParkingLanesFromOSM = async (streets: any[]) => {
      const parkingFeatures: any[] = [];

      streets.forEach((street) => {
        if (street.geometry && street.geometry.length > 1) {
          const coordinates = street.geometry.map((node: any) => [node.lon, node.lat]);
          
          // Create parking lanes on both sides of each street
          // TODO: Remove mock - randomly assign parking availability
          const hasLeftParking = Math.random() > 0.3;
          const hasRightParking = Math.random() > 0.3;

          if (hasLeftParking) {
            parkingFeatures.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              },
              properties: {
                side: 'left',
                street_id: street.id,
                availability: ['available', 'limited', 'full'][Math.floor(Math.random() * 3)],
                spots_count: Math.floor(Math.random() * 8) + 1
              }
            });
          }

          if (hasRightParking) {
            parkingFeatures.push({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              },
              properties: {
                side: 'right',
                street_id: street.id,
                availability: ['available', 'limited', 'full'][Math.floor(Math.random() * 3)],
                spots_count: Math.floor(Math.random() * 8) + 1
              }
            });
          }
        }
      });

      if (parkingFeatures.length > 0) {
        // Convert streets to the format expected by removeIntersectionsFromParkingLines
        const formattedStreets = streets.map(street => ({
          id: street.id,
          coordinates: street.geometry.map((node: any) => [node.lon, node.lat])
        }));
        
        // Remove intersections from parking lines using Turf.js
        console.log('🚀 About to process intersections with Turf.js');
        const cleanedFeatures = removeIntersectionsFromParkingLines(
          parkingFeatures.filter(f => f.properties.availability === 'available'), 
          formattedStreets
        );
        addParkingLayers(cleanedFeatures);
      }
    };

    const createMockParkingLanes = (center: [number, number]) => {
      console.log('🎯 Creating improved mock parking lanes that follow street patterns');
      
      // Create mock parking lanes that follow typical Buenos Aires street grid
      const mockFeatures = [
        // Avenida Corrientes (major east-west street)
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] - 0.004, center[1] + 0.001],
              [center[0] + 0.004, center[1] + 0.001]
            ]
          },
          properties: {
            side: 'left',
            street_id: 'corrientes-n',
            availability: 'available',
            spots_count: 8
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] - 0.004, center[1] + 0.001],
              [center[0] + 0.004, center[1] + 0.001]
            ]
          },
          properties: {
            side: 'right',
            street_id: 'corrientes-s',
            availability: 'available',
            spots_count: 6
          }
        },
        // Avenida Santa Fe (parallel street)
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] - 0.003, center[1] - 0.0015],
              [center[0] + 0.003, center[1] - 0.0015]
            ]
          },
          properties: {
            side: 'left',
            street_id: 'santafe-n',
            availability: 'available',
            spots_count: 4
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] - 0.003, center[1] - 0.0015],
              [center[0] + 0.003, center[1] - 0.0015]
            ]
          },
          properties: {
            side: 'right',
            street_id: 'santafe-s',
            availability: 'available',
            spots_count: 5
          }
        },
        // Avenida Callao (north-south avenue)
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] - 0.001, center[1] - 0.003],
              [center[0] - 0.001, center[1] + 0.003]
            ]
          },
          properties: {
            side: 'left',
            street_id: 'callao-w',
            availability: 'available',
            spots_count: 7
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] - 0.001, center[1] - 0.003],
              [center[0] - 0.001, center[1] + 0.003]
            ]
          },
          properties: {
            side: 'right',
            street_id: 'callao-e',
            availability: 'available',
            spots_count: 3
          }
        },
        // Avenida Pueyrredón (parallel avenue)
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] + 0.0012, center[1] - 0.0025],
              [center[0] + 0.0012, center[1] + 0.0025]
            ]
          },
          properties: {
            side: 'left',
            street_id: 'pueyrredon-w',
            availability: 'available',
            spots_count: 6
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] + 0.0012, center[1] - 0.0025],
              [center[0] + 0.0012, center[1] + 0.0025]
            ]
          },
          properties: {
            side: 'right',
            street_id: 'pueyrredon-e',
            availability: 'available',
            spots_count: 4
          }
        }
      ];
      
      console.log('🟢 Adding', mockFeatures.length, 'realistic street-pattern mock features');
      addParkingLayers(mockFeatures);
    };

    const addParkingLayers = (features: any[]) => {
      if (!map.current) {
        console.log('❌ No map instance available');
        return;
      }

      console.log('🎨 Adding parking layers with', features.length, 'features');

      // Remove existing parking layers
      try {
        if (map.current.getLayer('parking-available-glow')) {
          map.current.removeLayer('parking-available-glow');
          console.log('🗑️ Removed existing glow layer');
        }
        if (map.current.getLayer('parking-available-main')) {
          map.current.removeLayer('parking-available-main');
          console.log('🗑️ Removed existing main layer');
        }
        if (map.current.getSource('street-parking')) {
          map.current.removeSource('street-parking');
          console.log('🗑️ Removed existing source');
        }
      } catch (e) {
        console.log('ℹ️ No existing layers to remove');
      }

      // Add source with street-based parking data
      const sourceData = {
        type: 'FeatureCollection',
        features: features
      };
      console.log('📍 Adding source data:', sourceData);
      
      map.current.addSource('street-parking', {
        type: 'geojson',
        data: sourceData
      });

      // Add glow effect layer
      map.current.addLayer({
        id: 'parking-available-glow',
        type: 'line',
        source: 'street-parking',
        filter: ['==', ['get', 'availability'], 'available'],
        paint: {
          'line-color': '#00ff88',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 1.5,
            18, 3
          ],
          'line-opacity': 0.15,
          'line-blur': 2,
          'line-offset': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, ['case', ['==', ['get', 'side'], 'left'], -8, 8],
            18, ['case', ['==', ['get', 'side'], 'left'], -12, 12]
          ]
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });

      // Add main parking line layer
      map.current.addLayer({
        id: 'parking-available-main',
        type: 'line',
        source: 'street-parking',
        filter: ['==', ['get', 'availability'], 'available'],
        paint: {
          'line-color': '#00ff66',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 1,
            18, 2
          ],
          'line-opacity': 0.4,
          'line-blur': 1,
          'line-offset': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, ['case', ['==', ['get', 'side'], 'left'], -8, 8],
            18, ['case', ['==', ['get', 'side'], 'left'], -12, 12]
          ]
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });

      // Add click handlers
      map.current.on('click', 'parking-available-main', (e: any) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const coords = e.lngLat;
          onClusterPress({
            geoHash6: 'street-' + feature.properties.street_id,
            side: feature.properties.side,
            lat: coords.lat,
            lng: coords.lng,
            count_bucket: feature.properties.spots_count > 5 ? '5_plus' : 
                        feature.properties.spots_count > 2 ? '2_5' : '1',
            confidence: 0.9,
            last_ts: new Date().toISOString()
          });
        }
      });

      // Cursor change on hover
      map.current.on('mouseenter', 'parking-available-main', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'parking-available-main', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });

      console.log('✅ Successfully added', features.length, 'parking lane features to map');
      console.log('🎯 Layers added: parking-available-glow, parking-available-main');
    };


    initializeMap();

    return () => {
      isMounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markersRef.current = [];
    };
  }, []);

  // Update center when coordinates change
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.setCenter(centerCoordinate);
      
      // Update user marker
      if (markersRef.current[0]) {
        markersRef.current[0].setLngLat(centerCoordinate);
      }
      
      // Reload street geometry for new location only if it's a significant change
      const shouldReload = !lastLoadedCenterRef.current || 
        Math.abs(lastLoadedCenterRef.current[0] - centerCoordinate[0]) > 0.001 ||
        Math.abs(lastLoadedCenterRef.current[1] - centerCoordinate[1]) > 0.001;
      
      if (shouldReload && loadStreetGeometryRef.current) {
        console.log('📍 Location changed significantly, reloading street geometry');
        lastLoadedCenterRef.current = centerCoordinate;
        loadStreetGeometryRef.current(centerCoordinate);
      }
    }
  }, [centerCoordinate, mapLoaded]);

  // Update clusters - now handled by street geometry loading
  useEffect(() => {
    // Street-based parking is loaded automatically on map load
    // This effect is kept for future real-time updates
  }, [clusters, mapLoaded]);


  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          ❌ Error del mapa
        </Text>
        <Text style={[styles.errorDetails, { color: colors.textSecondary }]}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
          position: 'relative',
        }}
      />
      
      {/* Center Control Button */}
      <View style={styles.centerControlContainer}>
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={() => {
            if (map.current && centerCoordinate) {
              map.current.setCenter(centerCoordinate);
              map.current.setZoom(17);
              console.log('🎯 Map centered on user location');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="locate" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {!mapLoaded && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.surface }]}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            🗺️ Cargando mapa...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  centerControlContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 1000,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  centerButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});