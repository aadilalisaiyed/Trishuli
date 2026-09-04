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
  limit: number = 100
): Promise<NodeHistory> {
  const response = await api.get(`/nodes/${nodeId}/history`, {
    params: { metric, limit },
  });
  return mapBackendHistoryToFrontend(response.data);
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
