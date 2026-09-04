// ============================================================
// MineSafe AI — Base Node Data
// ============================================================
// Coordinates are near Dhanbad, Jharkhand, India (demo/prototype).
// These are FICTIONAL demonstration coordinates.

import type { NodeData, NodeThresholds, SafeZone, EvacuationRouteData, Mine } from '../types';

// Location-specific thresholds — each node has unique thresholds
export const nodeThresholds: Record<string, NodeThresholds> = {
  N01: {
    tilt: 0.40,           // degrees
    displacement: 8,       // mm
    vibration: 55,         // percentage
    crack: true,           // triggered on detection
    relativeMovement: 6,   // mm
  },
  N02: {
    tilt: 0.45,
    displacement: 10,
    vibration: 50,
    crack: true,
    relativeMovement: 7,
  },
  N03: {
    tilt: 0.50,
    displacement: 10,
    vibration: 52,
    crack: true,
    relativeMovement: 8,
  },
};

// Base node data — initial readings for NORMAL scenario
export const baseNodes: NodeData[] = [
  {
    id: 'N01',
    name: 'Node N01',
    latitude: 23.7958,
    longitude: 86.4304,
    readings: {
      tilt: 0.12,
      displacement: 2.3,
      vibration: 18,
      crackDetected: false,
      relativeMovement: 1.8,
    },
    thresholds: nodeThresholds.N01,
    sensorStatus: {
      tilt: false,
      displacement: false,
      vibration: false,
      crack: false,
      relativeMovement: false,
    },
    riskLevel: 'L0',
    riskScore: 8,
    aiConfidence: 95,
    predictedDeformation: 0.5,
    predictionHorizon: 6,
    trend: 'Stable',
    battery: 84,
    wifiSignal: -52,
    packetReception: 99.2,
    lastHeartbeat: new Date(),
    status: 'Online',
  },
  {
    id: 'N02',
    name: 'Node N02',
    latitude: 23.7945,
    longitude: 86.4325,
    readings: {
      tilt: 0.21,
      displacement: 4.1,
      vibration: 28,
      crackDetected: false,
      relativeMovement: 2.9,
    },
    thresholds: nodeThresholds.N02,
    sensorStatus: {
      tilt: false,
      displacement: false,
      vibration: false,
      crack: false,
      relativeMovement: false,
    },
    riskLevel: 'L0',
    riskScore: 15,
    aiConfidence: 93,
    predictedDeformation: 1.2,
    predictionHorizon: 6,
    trend: 'Stable',
    battery: 77,
    wifiSignal: -61,
    packetReception: 98.8,
    lastHeartbeat: new Date(),
    status: 'Online',
  },
  {
    id: 'N03',
    name: 'Node N03',
    latitude: 23.7935,
    longitude: 86.4290,
    readings: {
      tilt: 0.18,
      displacement: 3.5,
      vibration: 22,
      crackDetected: false,
      relativeMovement: 2.1,
    },
    thresholds: nodeThresholds.N03,
    sensorStatus: {
      tilt: false,
      displacement: false,
      vibration: false,
      crack: false,
      relativeMovement: false,
    },
    riskLevel: 'L0',
    riskScore: 12,
    aiConfidence: 94,
    predictedDeformation: 0.8,
    predictionHorizon: 6,
    trend: 'Stable',
    battery: 72,
    wifiSignal: -68,
    packetReception: 97.9,
    lastHeartbeat: new Date(),
    status: 'Online',
  },
];

// Mine boundary polygon (demo)
export const mineData: Mine = {
  id: 'PROTO-01',
  name: 'Prototype Mine',
  location: 'Demonstration Site, Jharkhand, India',
  latitude: 23.7945,
  longitude: 86.4305,
  boundary: [
    [23.7970, 86.4270],
    [23.7970, 86.4345],
    [23.7920, 86.4345],
    [23.7920, 86.4270],
  ],
  nodeIds: ['N01', 'N02', 'N03'],
};

// Safe zones / refuge areas
export const safeZones: SafeZone[] = [
  {
    id: 'R-01',
    name: 'Safe Zone R-01',
    type: 'refuge',
    latitude: 23.7965,
    longitude: 86.4335,
    capacity: 30,
  },
  {
    id: 'R-02',
    name: 'Safe Zone R-02',
    type: 'assembly',
    latitude: 23.7925,
    longitude: 86.4315,
    capacity: 50,
  },
];

// Evacuation routes (simulated)
export const evacuationRoutes: EvacuationRouteData[] = [
  {
    id: 'EVR-01',
    name: 'Route to R-01',
    fromNodeId: 'N03',
    toSafeZoneId: 'R-01',
    distance: 420,
    points: [
      [23.7935, 86.4290],
      [23.7940, 86.4300],
      [23.7948, 86.4312],
      [23.7955, 86.4325],
      [23.7965, 86.4335],
    ],
  },
  {
    id: 'EVR-02',
    name: 'Route to R-02',
    fromNodeId: 'N03',
    toSafeZoneId: 'R-02',
    distance: 340,
    points: [
      [23.7935, 86.4290],
      [23.7932, 86.4298],
      [23.7928, 86.4308],
      [23.7925, 86.4315],
    ],
  },
];
