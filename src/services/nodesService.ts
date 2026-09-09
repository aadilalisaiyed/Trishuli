import { api } from './api';
import {
  mapBackendNodeToFrontend,
  mapBackendHistoryToFrontend,
  mapBackendAIAssessmentToFrontend,
} from './transformers';
import type { NodeData, NodeHistory, AIRiskAssessment, NodeThresholds, SensorReadings } from '../types';

/**
 * Fetch all nodes for a mine, joined with their latest sensor readings.
 */
export async function fetchMineNodesApi(mineId: string = 'PROTO-01'): Promise<NodeData[]> {
  const response = await api.get(`/mines/${mineId}/nodes`);
  return (response.data || []).map(mapBackendNodeToFrontend);
}

/**
 * Fetch detail view for a specific sensor node.
 */
export async function fetchNodeDetailApi(nodeId: string): Promise<NodeData> {
  const response = await api.get(`/nodes/${nodeId}`);
  return mapBackendNodeToFrontend(response.data);
}

/**
 * Update risk threshold configuration for a node.
 */
export async function updateNodeThresholdsApi(
  nodeId: string,
  thresholds: Partial<NodeThresholds>
): Promise<NodeData> {
  const payload: Record<string, any> = {};
  if (thresholds.tilt !== undefined) payload.thr_tilt = thresholds.tilt;
  if (thresholds.displacement !== undefined) payload.thr_displacement = thresholds.displacement;
  if (thresholds.vibration !== undefined) payload.thr_vibration = thresholds.vibration;
  if (thresholds.crack !== undefined) payload.thr_crack = thresholds.crack;
  if (thresholds.relativeMovement !== undefined) payload.thr_relative_movement = thresholds.relativeMovement;

  const response = await api.patch(`/nodes/${nodeId}/thresholds`, payload);
  return mapBackendNodeToFrontend(response.data);
}

/**
 * Fetch historical time-series telemetry data for a node.
 */
export async function fetchNodeHistoryApi(
  nodeId: string,
  metric: string = 'all',
  limit: number = 100,
  from?: Date,
  to?: Date,
): Promise<NodeHistory> {
  const response = await api.get(`/nodes/${nodeId}/history`, {
    params: { metric, limit, from: from?.toISOString(), to: to?.toISOString() },
  });
  return mapBackendHistoryToFrontend(response.data);
}

export interface AnalyticsSummary {
  avgTilt: number;
  maxDisplacement: number;
  peakVibration: number;
  crackEventsTotal: number;
  avgRiskScore: number;
  aiPredictionAccuracy: number;
}

export interface RiskDistributionItem {
  level: string;
  percentage: number;
  color: string;
}

export async function fetchAnalyticsSummaryApi(
  mineId: string,
  from?: Date,
  to?: Date,
): Promise<AnalyticsSummary> {
  const response = await api.get(`/mines/${mineId}/analytics/summary`, {
    params: { from: from?.toISOString(), to: to?.toISOString() },
  });
  const data = response.data;
  return {
    avgTilt: data.avg_tilt,
    maxDisplacement: data.max_displacement,
    peakVibration: data.peak_vibration,
    crackEventsTotal: data.crack_events_total,
    avgRiskScore: data.avg_risk_score,
    aiPredictionAccuracy: data.ai_prediction_accuracy,
  };
}

export async function fetchRiskDistributionApi(
  mineId: string,
  from?: Date,
  to?: Date,
): Promise<RiskDistributionItem[]> {
  const response = await api.get(`/mines/${mineId}/analytics/risk-distribution`, {
    params: { from: from?.toISOString(), to: to?.toISOString() },
  });
  return (response.data?.distribution || []).map((item: any) => ({
    level: item.level,
    percentage: item.percentage,
    color: item.color,
  }));
}

/**
 * Fetch detailed AI risk assessment breakdown for a node.
 */
export async function fetchNodeAIAssessmentApi(nodeId: string): Promise<AIRiskAssessment> {
  const response = await api.get(`/nodes/${nodeId}/ai-assessment`);
  return mapBackendAIAssessmentToFrontend(response.data);
}

/**
 * Ingest a new sensor reading payload into the backend.
 */
export async function ingestSensorReadingApi(
  nodeId: string,
  readings: SensorReadings & { battery?: number; wifiSignal?: number; packetReception?: number }
): Promise<any> {
  const payload = {
    tilt: readings.tilt,
    displacement: readings.displacement,
    vibration: readings.vibration,
    crack_detected: readings.crackDetected,
    relative_movement: readings.relativeMovement,
    battery: readings.battery,
    wifi_signal: readings.wifiSignal,
    packet_reception: readings.packetReception,
  };

  const response = await api.post(`/nodes/${nodeId}/readings`, payload);
  return response.data;
}
