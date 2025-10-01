import { APIGatewayProxyEvent } from 'aws-lambda';

export function getUserIdFromEvent(event: APIGatewayProxyEvent): string | null {
  const claims = event.requestContext.authorizer?.claims;
  return claims?.sub || null;
}

export function isAuthenticated(event: APIGatewayProxyEvent): boolean {
  return !!getUserIdFromEvent(event);
}

export function createResponse(statusCode: number, body: any, headers: any = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function createErrorResponse(statusCode: number, message: string) {
  return createResponse(statusCode, { error: message });
}