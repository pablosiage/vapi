import { encodeGeohash, decodeGeohash, determineSide, getNeighbors } from '@vapi/shared';

describe('Geohash utilities', () => {
  test('should encode coordinates to geohash', () => {
    const lat = -34.6037;
    const lng = -58.3816;
    const hash = encodeGeohash(lat, lng, 6);
    
    expect(hash).toHaveLength(6);
    expect(typeof hash).toBe('string');
  });

  test('should decode geohash to coordinates', () => {
    const originalLat = -34.6037;
    const originalLng = -58.3816;
    const hash = encodeGeohash(originalLat, originalLng, 6);
    const decoded = decodeGeohash(hash);
    
    expect(Math.abs(decoded.lat - originalLat)).toBeLessThan(0.01);
    expect(Math.abs(decoded.lng - originalLng)).toBeLessThan(0.01);
  });

  test('should determine street side', () => {
    const lat = -34.6037;
    const lng = -58.3816;
    const side = determineSide(lat, lng);
    
    expect(['N', 'S', 'E', 'W']).toContain(side);
  });

  test('should get neighbors', () => {
    const hash = '69y6q3';
    const neighbors = getNeighbors(hash);
    
    expect(neighbors).toHaveLength(8);
    expect(neighbors.every(n => n.length === hash.length)).toBe(true);
  });

  test('should determine side based on street angle', () => {
    const lat = -34.6037;
    const lng = -58.3816;
    
    expect(determineSide(lat, lng, 0)).toBe('N');
    expect(determineSide(lat, lng, 90)).toBe('E');
    expect(determineSide(lat, lng, 180)).toBe('S');
    expect(determineSide(lat, lng, 270)).toBe('W');
  });
});