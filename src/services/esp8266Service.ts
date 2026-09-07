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
  [key: string]: unknown;
}

export async function fetchESP8266Readings(): Promise<ESP8266Reading[]> {
  const response = await api.get<ESP8266Reading[]>('/esp8266/latest');
  return response.data;
}