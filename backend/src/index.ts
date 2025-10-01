import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createReport, confirmReport, getNearbyReports } from './handlers/reports';
import { startParkingSession, endParkingSession, getCurrentParkingSession } from './handlers/parking';
import { createErrorResponse } from './utils/auth';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, resource } = event;

    // Handle CORS preflight requests
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: '',
      };
    }

    // Route to appropriate handler
    switch (`${httpMethod} ${resource}`) {
      case 'POST /report':
        return await createReport(event);
      
      case 'POST /confirm':
        return await confirmReport(event);
      
      case 'GET /nearby':
        return await getNearbyReports(event);
      
      case 'POST /park/start':
        return await startParkingSession(event);
      
      case 'POST /park/end':
        return await endParkingSession(event);
      
      case 'GET /me/park':
        return await getCurrentParkingSession(event);
      
      default:
        return createErrorResponse(404, `Route not found: ${httpMethod} ${resource}`);
    }

  } catch (error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
};