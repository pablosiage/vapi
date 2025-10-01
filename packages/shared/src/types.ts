export type CountBucket = '1' | '2_5' | '5_plus';

export type Side = 'N' | 'S' | 'E' | 'W';

export type ReportStatus = 'still_free' | 'taken';

export type ReportSource = 'user' | 'system';

export interface ParkingReport {
  geoHash6: string;
  side: Side;
  lat: number;
  lng: number;
  count_bucket: CountBucket;
  user_id?: string;
  confidence: number;
  expiresAt: number;
  source: ReportSource;
  ts: string;
}

export interface ReportConfirmation {
  reportId: string;
  userId: string;
  status: ReportStatus;
  ts: string;
}

export interface ParkingSession {
  user_id: string;
  start_ts: string;
  car_lat: number;
  car_lng: number;
  note?: string;
  end_ts?: string;
}

export interface ReportRequest {
  lat: number;
  lng: number;
  side?: Side;
  count_bucket: CountBucket;
}

export interface ConfirmRequest {
  reportId: string;
  status: ReportStatus;
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  radius: number;
}

export interface ParkRequest {
  lat: number;
  lng: number;
  note?: string;
}

export interface ClusterData {
  geoHash6: string;
  side: Side;
  count_bucket: CountBucket;
  confidence: number;
  last_ts: string;
  lat: number;
  lng: number;
}

export interface WebSocketMessage {
  type: 'report_update';
  geoHash6: string;
  side: Side;
  count_bucket: CountBucket;
  confidence: number;
  ts: string;
}

export interface WebSocketSubscription {
  action: 'subscribe' | 'unsubscribe';
  area: string;
}