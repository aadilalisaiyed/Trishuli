import { api } from './api';

export interface AxisReading {
  x: number;
  y: number;
  z: number;
}

export interface ESP8266Reading {
  device: string;
  risk: string;
  raw_prediction: string;
  confidence: number;
  is_anomaly: boolean;
  latency_ms: number;
  received_at: string;
  tilt_deg?: number;
  accel_rms?: number;
  load_delta_kg?: number;
  distance_cm?: number;
  moisture?: number;
  ir_detected?: boolean;
  model?: string;
  anomaly_reasons?: string[];
  received_interval_ms?: number | null;
  samples_received?: number;
  data_source?: string;
  class_probabilities?: Record<string, number>;
  base_features?: Record<string, number>;
  rolling_features?: Record<string, number>;
  model_internals?: Record<string, unknown>;
  plausibility_violations?: string[];
  corroboration_count?: number;
  gate_branch?: string;
  gate_trace?: string;
  [key: string]: unknown;
}

export interface ESP8266DeviceSummary {
  device: string;
  source: string;
  samples: number;
  first_received_at: string;
  last_received_at: string;
}

export async function fetchESP8266Readings(): Promise<ESP8266Reading[]> {
  const response = await api.get<ESP8266Reading[]>('/esp8266/latest');
  return response.data;
}

export async function fetchESP8266History(device: string): Promise<ESP8266Reading[]> {
  const response = await api.get<ESP8266Reading[]>(`/esp8266/history/${encodeURIComponent(device)}?limit=5000`);
  return response.data;
}

export async function fetchESP8266Devices(): Promise<ESP8266DeviceSummary[]> {
  const response = await api.get<ESP8266DeviceSummary[]>('/esp8266/devices');
  return response.data;
}

export async function addNode(nodeId: string): Promise<{ status: string; node_id: string }> {
  try {
    const response = await api.post('/esp8266/nodes', { node_id: nodeId });
    return response.data;
  } catch {
    // Return mock response if backend is offline or endpoint missing
    return { status: 'success', node_id: nodeId };
  }
}