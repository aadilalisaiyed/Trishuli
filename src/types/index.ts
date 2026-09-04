// ============================================================
// MineSafe AI — Core Type Definitions
// ============================================================

// --- Risk Model ---

export type RiskLevel = 'L0' | 'L1' | 'L2' | 'L3';

export type SystemStatus = 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'DEGRADED';

export type Trend = 'Stable' | 'Slowly Increasing' | 'Increasing' | 'Rapidly Increasing' | 'Decreasing';

// --- Sensor Model ---

export interface SensorReadings {
  tilt: number;           // degrees
  displacement: number;   // mm
  vibration: number;      // percentage (0-100)
  crackDetected: boolean;
  relativeMovement: number; // mm
}

export interface NodeThresholds {
  tilt: number;
  displacement: number;
  vibration: number;
  crack: boolean;         // threshold is simply "detected"
  relativeMovement: number;
}

export interface SensorStatus {
  tilt: boolean;          // true = abnormal
  displacement: boolean;
  vibration: boolean;
  crack: boolean;
  relativeMovement: boolean;
}

// --- Node Model ---

export interface NodeData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  readings: SensorReadings;
  thresholds: NodeThresholds;
  sensorStatus: SensorStatus;
  riskLevel: RiskLevel;
  riskScore: number;        // 0-100
  aiConfidence: number;     // 0-100
  predictedDeformation: number; // mm
  predictionHorizon: number;    // hours
  trend: Trend;
  battery: number;          // percentage
  wifiSignal: number;       // dBm (negative)
  packetReception: number;  // percentage
  lastHeartbeat: Date;
  status: 'Online' | 'Offline' | 'Degraded';
}

// --- Historical Data ---

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface NodeHistory {
  nodeId: string;
  tilt: TimeSeriesPoint[];
  displacement: TimeSeriesPoint[];
  vibration: TimeSeriesPoint[];
  crackEvents: TimeSeriesPoint[];
  relativeMovement: TimeSeriesPoint[];
  riskScore: TimeSeriesPoint[];
  predictedDeformation: TimeSeriesPoint[];
  actualDeformation: TimeSeriesPoint[];
}

// --- AI Model ---

export interface ContributingFactor {
  indicator: string;
  status: 'normal' | 'abnormal';
  description: string;
  value: string;
  threshold: string;
}

export interface AIRiskAssessment {
  nodeId: string;
  riskScore: number;
  confidence: number;
  predictedDeformation: number;
  predictionHorizon: number;  // hours
  trend: Trend;
  contributingFactors: ContributingFactor[];
  recommendedActions: string[];
  explanation: string;
}

// --- Alerts ---

export type AlertSeverity = 'L1' | 'L2' | 'L3';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  nodeId: string;
  timestamp: Date;
  duration: number;         // seconds
  trigger: string;
  aiRiskScore: number;
  predictedDeformation: number;
  status: AlertStatus;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}

// --- Map ---

export type MapProvider = 'esri' | 'osm' | 'mapbox';

export interface MapLayerConfig {
  satellite: boolean;
  sensorNodes: boolean;
  sensorRiskHeatmap: boolean;
  aiPredictionHeatmap: boolean;
  mineBoundary: boolean;
  safeZones: boolean;
  evacuationRoute: boolean;
}

export interface SafeZone {
  id: string;
  name: string;
  type: 'refuge' | 'exit' | 'assembly';
  latitude: number;
  longitude: number;
  capacity: number;
}

export interface EvacuationRouteData {
  id: string;
  name: string;
  points: [number, number][];
  distance: number;        // meters
  fromNodeId: string;
  toSafeZoneId: string;
}

// --- Mine ---

export interface Mine {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  boundary: [number, number][];
  nodeIds: string[];
}

// --- Report ---

export interface ReportSection {
  id: string;
  label: string;
  enabled: boolean;
}

export interface ReportConfig {
  mine: string;
  dateRange: { start: Date; end: Date };
  nodeScope: string[];
  region: string;
  sections: ReportSection[];
}

export interface ReportData {
  config: ReportConfig;
  generatedAt: Date;
  summary: string;
  riskOverview: {
    overallRisk: RiskLevel;
    l0Percentage: number;
    l1Percentage: number;
    l2Percentage: number;
    l3Percentage: number;
  };
  nodeStatistics: {
    nodeId: string;
    avgTilt: number;
    maxDisplacement: number;
    peakVibration: number;
    crackEvents: number;
    avgRiskScore: number;
  }[];
  alerts: Alert[];
  aiPredictions: {
    nodeId: string;
    avgPredictionAccuracy: number;
    avgConfidence: number;
    predictedDeformation: number;
  }[];
}

// --- System Health ---

export type ServiceHealthStatus = 'Healthy' | 'Degraded' | 'Down';

export interface ServiceHealth {
  name: string;
  status: ServiceHealthStatus;
  latency?: number;
  uptime?: number;
  lastCheck: Date;
}

// --- Time Range ---

export type TimeRangeOption = '1H' | '6H' | '24H' | '7D' | '30D' | 'CUSTOM';

export interface TimeRange {
  option: TimeRangeOption;
  start: Date;
  end: Date;
}

// --- Demo ---

export type DemoScenario = 'NORMAL' | 'WARNING' | 'CRITICAL';

// --- Auth ---

export interface User {
  id: string;
  username: string;
  role: string;
  name: string;
}

// --- Notification ---

export interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'watch' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  nodeId?: string;
  alertId?: string;
}
