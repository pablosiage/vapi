import * as geohash from 'ngeohash';
import { Side } from './types';

export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  return geohash.encode(lat, lng, precision);
}

export function decodeGeohash(hash: string): { lat: number; lng: number } {
  const decoded = geohash.decode(hash);
  return { lat: decoded.latitude, lng: decoded.longitude };
}

export function getNeighbors(hash: string): string[] {
  return geohash.neighbors(hash);
}

export function determineSide(lat: number, lng: number, streetAngle?: number): Side {
  if (streetAngle !== undefined) {
    const normalizedAngle = ((streetAngle % 360) + 360) % 360;
    
    if (normalizedAngle >= 315 || normalizedAngle < 45) return 'N';
    if (normalizedAngle >= 45 && normalizedAngle < 135) return 'E';
    if (normalizedAngle >= 135 && normalizedAngle < 225) return 'S';
    return 'W';
  }
  
  const hashPrecision = encodeGeohash(lat, lng, 8);
  const lastChar = hashPrecision.slice(-1);
  const charCode = lastChar.charCodeAt(0);
  
  if (charCode % 4 === 0) return 'N';
  if (charCode % 4 === 1) return 'E';
  if (charCode % 4 === 2) return 'S';
  return 'W';
}

export function getBoundingBox(hash: string): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const bbox = geohash.decode_bbox(hash);
  return {
    minLat: bbox[0],
    maxLat: bbox[2],
    minLng: bbox[1],
    maxLng: bbox[3]
  };
}

export function getAreaHash(lat: number, lng: number): string {
  return encodeGeohash(lat, lng, 5);
}

export function snapToStreet(lat: number, lng: number): { lat: number; lng: number } {
  const precision = 0.0001;
  return {
    lat: Math.round(lat / precision) * precision,
    lng: Math.round(lng / precision) * precision
  };
}