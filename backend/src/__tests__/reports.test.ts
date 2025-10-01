import { APIGatewayProxyEvent } from 'aws-lambda';
import { createReport, getNearbyReports } from '../handlers/reports';

// Mock AWS SDK
jest.mock('../utils/dynamodb', () => ({
  putItem: jest.fn().mockResolvedValue({}),
  queryItems: jest.fn().mockResolvedValue([]),
  TABLES: {
    REPORTS: 'test-reports',
    CONFIRMATIONS: 'test-confirmations',
    PARKING_SESSIONS: 'test-sessions',
  },
}));

describe('Reports handler', () => {
  const mockEvent = (body: any, queryParams: any = {}, userId?: string): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    queryStringParameters: queryParams,
    requestContext: {
      authorizer: userId ? { claims: { sub: userId } } : undefined,
    } as any,
  } as APIGatewayProxyEvent);

  test('should create report successfully', async () => {
    const event = mockEvent({
      lat: -34.6037,
      lng: -58.3816,
      count_bucket: '2_5',
    }, {}, 'test-user');

    const result = await createReport(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.count_bucket).toBe('2_5');
    expect(body.geoHash6).toBeDefined();
    expect(body.side).toMatch(/^[NSEW]$/);
  });

  test('should reject invalid count_bucket', async () => {
    const event = mockEvent({
      lat: -34.6037,
      lng: -58.3816,
      count_bucket: 'invalid',
    });

    const result = await createReport(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Invalid count_bucket');
  });

  test('should reject missing coordinates', async () => {
    const event = mockEvent({
      count_bucket: '2_5',
    });

    const result = await createReport(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Missing required fields');
  });

  test('should get nearby reports', async () => {
    const event = mockEvent(null, {
      lat: '-34.6037',
      lng: '-58.3816',
      radius: '1000',
    });

    const result = await getNearbyReports(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.clusters).toBeDefined();
    expect(Array.isArray(body.clusters)).toBe(true);
  });

  test('should reject invalid coordinates for nearby search', async () => {
    const event = mockEvent(null, {
      lat: 'invalid',
      lng: '-58.3816',
    });

    const result = await getNearbyReports(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Invalid lat/lng values');
  });
});