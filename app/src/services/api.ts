import { ReportRequest, ConfirmRequest, ParkRequest, ClusterData } from '@vapi/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || '';

class ApiService {
  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async createReport(report: ReportRequest) {
    return this.makeRequest('/report', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async confirmReport(confirmation: ConfirmRequest) {
    return this.makeRequest('/confirm', {
      method: 'POST',
      body: JSON.stringify(confirmation),
    });
  }

  async getNearbyReports(lat: number, lng: number, radius = 1000): Promise<{ clusters: ClusterData[] }> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius.toString(),
    });

    return this.makeRequest(`/nearby?${params}`);
  }

  async startParkingSession(park: ParkRequest) {
    return this.makeRequest('/park/start', {
      method: 'POST',
      body: JSON.stringify(park),
    });
  }

  async endParkingSession() {
    return this.makeRequest('/park/end', {
      method: 'POST',
    });
  }

  async getCurrentParkingSession() {
    return this.makeRequest('/me/park');
  }

  createWebSocketConnection(): WebSocket {
    const ws = new WebSocket(WS_URL);
    return ws;
  }
}

export const apiService = new ApiService();