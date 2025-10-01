import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { getAreaHash } from '@vapi/shared';

// In-memory connection store (in production, use DynamoDB)
const connections = new Map<string, { connectionId: string; area?: string }>();

const apiGateway = new ApiGatewayManagementApiClient({
  region: process.env.REGION || 'us-east-1',
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('WebSocket event:', JSON.stringify(event, null, 2));

  const { connectionId } = event.requestContext;
  const { routeKey } = event.requestContext;

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(connectionId);
      
      case '$disconnect':
        return await handleDisconnect(connectionId);
      
      case '$default':
        return await handleMessage(connectionId, event.body);
      
      default:
        console.error('Unknown route:', routeKey);
        return { statusCode: 400, body: 'Unknown route' };
    }
  } catch (error) {
    console.error('WebSocket handler error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function handleConnect(connectionId: string): Promise<APIGatewayProxyResult> {
  console.log('Connection established:', connectionId);
  connections.set(connectionId, { connectionId });
  return { statusCode: 200, body: 'Connected' };
}

async function handleDisconnect(connectionId: string): Promise<APIGatewayProxyResult> {
  console.log('Connection closed:', connectionId);
  connections.delete(connectionId);
  return { statusCode: 200, body: 'Disconnected' };
}

async function handleMessage(connectionId: string, body: string | null): Promise<APIGatewayProxyResult> {
  if (!body) {
    return { statusCode: 400, body: 'Missing message body' };
  }

  try {
    const message = JSON.parse(body);
    
    switch (message.action) {
      case 'subscribe':
        return await handleSubscribe(connectionId, message.area);
      
      case 'unsubscribe':
        return await handleUnsubscribe(connectionId);
      
      default:
        return { statusCode: 400, body: 'Unknown action' };
    }
  } catch (error) {
    console.error('Error parsing message:', error);
    return { statusCode: 400, body: 'Invalid message format' };
  }
}

async function handleSubscribe(connectionId: string, area: string): Promise<APIGatewayProxyResult> {
  if (!area) {
    return { statusCode: 400, body: 'Missing area parameter' };
  }

  const connection = connections.get(connectionId);
  if (connection) {
    connection.area = area;
    connections.set(connectionId, connection);
  }

  console.log(`Connection ${connectionId} subscribed to area ${area}`);
  
  // Send confirmation
  await sendMessage(connectionId, {
    type: 'subscription_confirmed',
    area,
  });

  return { statusCode: 200, body: 'Subscribed' };
}

async function handleUnsubscribe(connectionId: string): Promise<APIGatewayProxyResult> {
  const connection = connections.get(connectionId);
  if (connection) {
    connection.area = undefined;
    connections.set(connectionId, connection);
  }

  console.log(`Connection ${connectionId} unsubscribed`);
  return { statusCode: 200, body: 'Unsubscribed' };
}

export async function publishReportUpdate(geoHash6: string, side: string, countBucket: string, confidence: number, ts: string) {
  const area = getAreaHash(0, 0); // This should be derived from geoHash6
  
  const message = {
    type: 'report_update',
    geoHash6,
    side,
    count_bucket: countBucket,
    confidence,
    ts,
  };

  const subscribedConnections = Array.from(connections.values())
    .filter(conn => conn.area === area);

  const promises = subscribedConnections.map(conn => 
    sendMessage(conn.connectionId, message)
  );

  await Promise.allSettled(promises);
}

async function sendMessage(connectionId: string, message: any): Promise<void> {
  try {
    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    });

    await apiGateway.send(command);
  } catch (error: any) {
    console.error(`Failed to send message to ${connectionId}:`, error);
    
    // Remove stale connections
    if (error.statusCode === 410) {
      connections.delete(connectionId);
    }
  }
}