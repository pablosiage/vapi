import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { encodeGeohash, determineSide, getNeighbors, getAreaHash } from '@vapi/shared';
import { putItem, queryItems, TABLES } from '../utils/dynamodb';
import { getUserIdFromEvent, createResponse, createErrorResponse } from '../utils/auth';
import { ParkingReport, ReportRequest, CountBucket, Side } from '@vapi/shared';

const RATE_LIMIT_WINDOW = 15 * 1000; // 15 seconds
const TTL_DURATION = 15 * 60; // 15 minutes

export async function createReport(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body: ReportRequest = JSON.parse(event.body || '{}');
    const { lat, lng, count_bucket, side } = body;

    if (!lat || !lng || !count_bucket) {
      return createErrorResponse(400, 'Missing required fields: lat, lng, count_bucket');
    }

    if (!['1', '2_5', '5_plus'].includes(count_bucket)) {
      return createErrorResponse(400, 'Invalid count_bucket. Must be: 1, 2_5, or 5_plus');
    }

    const userId = getUserIdFromEvent(event);
    
    // Rate limiting check
    if (userId) {
      const now = Date.now();
      const recentReports = await queryItems(TABLES.REPORTS, {
        IndexName: 'UserReportsIndex', // We'd need to add this GSI
        KeyConditionExpression: 'user_id = :userId',
        FilterExpression: 'ts > :recentTime',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':recentTime': new Date(now - RATE_LIMIT_WINDOW).toISOString(),
        },
      });

      if (recentReports.length > 0) {
        return createErrorResponse(429, 'Rate limit exceeded. Please wait before submitting another report.');
      }
    }

    const geoHash6 = encodeGeohash(lat, lng, 6);
    const detectedSide = side || determineSide(lat, lng);
    const timestamp = new Date().toISOString();
    const expiresAt = Math.floor(Date.now() / 1000) + TTL_DURATION;

    const report: ParkingReport = {
      geoHash6,
      side: detectedSide,
      lat,
      lng,
      count_bucket: count_bucket as CountBucket,
      user_id: userId || undefined,
      confidence: 1.0,
      expiresAt,
      source: 'user',
      ts: timestamp,
    };

    const pk = `${geoHash6}#${detectedSide}`;
    const sk = timestamp;

    await putItem(TABLES.REPORTS, {
      pk,
      sk,
      ...report,
    });

    // TODO: Publish to WebSocket subscribers

    return createResponse(201, {
      reportId: `${pk}#${sk}`,
      geoHash6,
      side: detectedSide,
      count_bucket,
      confidence: 1.0,
      ts: timestamp,
    });

  } catch (error) {
    console.error('Error creating report:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function confirmReport(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { reportId, status } = body;

    if (!reportId || !status) {
      return createErrorResponse(400, 'Missing required fields: reportId, status');
    }

    if (!['still_free', 'taken'].includes(status)) {
      return createErrorResponse(400, 'Invalid status. Must be: still_free or taken');
    }

    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return createErrorResponse(401, 'Authentication required');
    }

    const timestamp = new Date().toISOString();

    await putItem(TABLES.CONFIRMATIONS, {
      pk: reportId,
      sk: `${userId}#${timestamp}`,
      status,
      userId,
      ts: timestamp,
    });

    // TODO: Update report confidence based on confirmations
    // TODO: Publish to WebSocket subscribers

    return createResponse(200, {
      reportId,
      status,
      ts: timestamp,
    });

  } catch (error) {
    console.error('Error confirming report:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function getNearbyReports(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { lat, lng, radius } = event.queryStringParameters || {};

    if (!lat || !lng) {
      return createErrorResponse(400, 'Missing required parameters: lat, lng');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = radius ? parseFloat(radius) : 1000; // Default 1km

    if (isNaN(latitude) || isNaN(longitude)) {
      return createErrorResponse(400, 'Invalid lat/lng values');
    }

    const centerHash = encodeGeohash(latitude, longitude, 6);
    const neighbors = getNeighbors(centerHash);
    const searchHashes = [centerHash, ...neighbors];

    const allReports: any[] = [];

    // Query each geohash area
    for (const hash of searchHashes) {
      const hashReports = await queryItems(TABLES.REPORTS, {
        KeyConditionExpression: 'pk BEGINS_WITH :hash',
        ExpressionAttributeValues: {
          ':hash': hash,
        },
      });
      allReports.push(...hashReports);
    }

    // Filter by actual distance and group by location
    const now = Date.now();
    const clusters = new Map();

    for (const report of allReports) {
      // Skip expired reports
      if (report.expiresAt * 1000 < now) continue;

      const distance = calculateDistance(latitude, longitude, report.lat, report.lng);
      if (distance > searchRadius) continue;

      const key = `${report.geoHash6}#${report.side}`;
      
      if (!clusters.has(key)) {
        clusters.set(key, {
          geoHash6: report.geoHash6,
          side: report.side,
          lat: report.lat,
          lng: report.lng,
          count_bucket: report.count_bucket,
          confidence: report.confidence,
          last_ts: report.ts,
          reports: []
        });
      }

      clusters.get(key).reports.push(report);
      
      // Update with most recent data
      if (report.ts > clusters.get(key).last_ts) {
        clusters.get(key).count_bucket = report.count_bucket;
        clusters.get(key).last_ts = report.ts;
      }
    }

    // Calculate aggregate confidence for each cluster
    const result = Array.from(clusters.values()).map(cluster => {
      const avgConfidence = cluster.reports.reduce((sum: number, r: any) => sum + r.confidence, 0) / cluster.reports.length;
      return {
        geoHash6: cluster.geoHash6,
        side: cluster.side,
        lat: cluster.lat,
        lng: cluster.lng,
        count_bucket: cluster.count_bucket,
        confidence: Math.round(avgConfidence * 100) / 100,
        last_ts: cluster.last_ts,
      };
    });

    return createResponse(200, {
      clusters: result,
      total: result.length,
    });

  } catch (error) {
    console.error('Error getting nearby reports:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
}