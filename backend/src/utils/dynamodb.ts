import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.REGION || 'us-east-1' });
export const docClient = DynamoDBDocumentClient.from(client);

export const TABLES = {
  REPORTS: process.env.REPORTS_TABLE || 'vapi_reports',
  CONFIRMATIONS: process.env.CONFIRMATIONS_TABLE || 'vapi_confirmations',
  PARKING_SESSIONS: process.env.PARKING_SESSIONS_TABLE || 'vapi_parking_sessions',
};

export async function putItem(tableName: string, item: any) {
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
  });
  return await docClient.send(command);
}

export async function getItem(tableName: string, key: any) {
  const command = new GetCommand({
    TableName: tableName,
    Key: key,
  });
  const result = await docClient.send(command);
  return result.Item;
}

export async function queryItems(tableName: string, params: any) {
  const command = new QueryCommand({
    TableName: tableName,
    ...params,
  });
  const result = await docClient.send(command);
  return result.Items || [];
}

export async function scanItems(tableName: string, params: any = {}) {
  const command = new ScanCommand({
    TableName: tableName,
    ...params,
  });
  const result = await docClient.send(command);
  return result.Items || [];
}