import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { putItem, queryItems, TABLES } from '../utils/dynamodb';
import { getUserIdFromEvent, createResponse, createErrorResponse } from '../utils/auth';
import { ParkingSession, ParkRequest } from '@vapi/shared';

export async function startParkingSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body: ParkRequest = JSON.parse(event.body || '{}');
    const { lat, lng, note } = body;

    if (!lat || !lng) {
      return createErrorResponse(400, 'Missing required fields: lat, lng');
    }

    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return createErrorResponse(401, 'Authentication required');
    }

    // End any existing active session
    await endExistingSession(userId);

    const timestamp = new Date().toISOString();
    
    const session: ParkingSession = {
      user_id: userId,
      start_ts: timestamp,
      car_lat: lat,
      car_lng: lng,
      note,
    };

    await putItem(TABLES.PARKING_SESSIONS, {
      pk: userId,
      sk: timestamp,
      ...session,
    });

    return createResponse(201, {
      sessionId: `${userId}#${timestamp}`,
      start_ts: timestamp,
      car_lat: lat,
      car_lng: lng,
      note,
    });

  } catch (error) {
    console.error('Error starting parking session:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function endParkingSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return createErrorResponse(401, 'Authentication required');
    }

    const result = await endExistingSession(userId);
    
    if (!result) {
      return createErrorResponse(404, 'No active parking session found');
    }

    return createResponse(200, {
      message: 'Parking session ended',
      sessionId: result.sessionId,
      end_ts: result.end_ts,
    });

  } catch (error) {
    console.error('Error ending parking session:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function getCurrentParkingSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return createErrorResponse(401, 'Authentication required');
    }

    const sessions = await queryItems(TABLES.PARKING_SESSIONS, {
      KeyConditionExpression: 'pk = :userId',
      FilterExpression: 'attribute_not_exists(end_ts)',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Most recent first
      Limit: 1,
    });

    if (sessions.length === 0) {
      return createResponse(404, {
        message: 'No active parking session found',
      });
    }

    const session = sessions[0];
    
    return createResponse(200, {
      sessionId: `${session.user_id}#${session.start_ts}`,
      start_ts: session.start_ts,
      car_lat: session.car_lat,
      car_lng: session.car_lng,
      note: session.note,
    });

  } catch (error) {
    console.error('Error getting current parking session:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

async function endExistingSession(userId: string): Promise<{ sessionId: string; end_ts: string } | null> {
  // Find active session
  const sessions = await queryItems(TABLES.PARKING_SESSIONS, {
    KeyConditionExpression: 'pk = :userId',
    FilterExpression: 'attribute_not_exists(end_ts)',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false, // Most recent first
    Limit: 1,
  });

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];
  const endTime = new Date().toISOString();

  // Update session with end time
  await putItem(TABLES.PARKING_SESSIONS, {
    ...session,
    end_ts: endTime,
  });

  return {
    sessionId: `${session.user_id}#${session.start_ts}`,
    end_ts: endTime,
  };
}