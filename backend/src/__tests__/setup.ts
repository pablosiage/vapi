// Test setup file
import { jest } from '@jest/globals';

// Mock environment variables
process.env.REPORTS_TABLE = 'test-vapi-reports';
process.env.CONFIRMATIONS_TABLE = 'test-vapi-confirmations';
process.env.PARKING_SESSIONS_TABLE = 'test-vapi-parking-sessions';
process.env.REGION = 'us-east-1';

// Global test timeout
jest.setTimeout(10000);

// Console suppression for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};