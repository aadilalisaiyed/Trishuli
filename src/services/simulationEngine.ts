// ============================================================
// MineSafe AI — Simulation Engine
// ============================================================
// Generates realistic real-time sensor updates.
// Scenarios: NORMAL, WARNING, CRITICAL
//
// PROTOTYPE: All data is simulated. No real hardware connected.

import type { NodeData, DemoScenario, SensorReadings } from '../types';
import { baseNodes } from '../data/nodes';
import { evaluateThresholds, calculateRiskLevel, calculateRiskScore } from './riskService';
import { getAIConfidence, determineTrend } from './aiService';

// Scenario target values — what each node's readings should drift toward
const scenarioTargets: Record<DemoScenario, Record<string, SensorReadings>> = {
  NORMAL: {
    N01: { tilt: 0.12, displacement: 2.3, vibration: 18, crackDetected: false, relativeMovement: 1.8 },
    N02: { tilt: 0.21, displacement: 4.1, vibration: 28, crackDetected: false, relativeMovement: 2.9 },
    N03: { tilt: 0.18, displacement: 3.5, vibration: 22, crackDetected: false, relativeMovement: 2.1 },
  },
  WARNING: {
    N01: { tilt: 0.15, displacement: 2.8, vibration: 20, crackDetected: false, relativeMovement: 2.0 },
    N02: { tilt: 0.52, displacement: 12.8, vibration: 58, crackDetected: false, relativeMovement: 3.5 },
    N03: { tilt: 0.22, displacement: 4.2, vibration: 25, crackDetected: false, relativeMovement: 2.5 },
  },
  CRITICAL: {
    N01: { tilt: 0.18, displacement: 3.2, vibration: 22, crackDetected: false, relativeMovement: 2.2 },
    N02: { tilt: 0.48, displacement: 11.5, vibration: 54, crackDetected: false, relativeMovement: 5.2 },
    N03: { tilt: 0.84, displacement: 18.4, vibration: 78, crackDetected: true, relativeMovement: 12.1 },
  },
};

/**
 * Initialize nodes from base data.
 */
export function initializeNodes(): NodeData[] {
  return baseNodes.map(n => ({
    ...n,
    readings: { ...n.readings },
    thresholds: { ...n.thresholds },
    sensorStatus: { ...n.sensorStatus },
    lastHeartbeat: new Date(),
  }));
}

/**
 * Apply a single simulation tick — drift sensor values toward scenario targets
 * with realistic noise.
 */
export function simulateTick(
  nodes: NodeData[],
  scenario: DemoScenario
): NodeData[] {
  return nodes.map(node => {
    const target = scenarioTargets[scenario][node.id];
    if (!target) return node;

    const previousDisplacement = node.readings.displacement;

    // Drift readings toward target with noise
    const newReadings: SensorReadings = {
      tilt: drift(node.readings.tilt, target.tilt, 0.02, 0.01),
      displacement: drift(node.readings.displacement, target.displacement, 0.5, 0.2),
      vibration: drift(node.readings.vibration, target.vibration, 2, 1),
      crackDetected: target.crackDetected,
      relativeMovement: drift(node.readings.relativeMovement, target.relativeMovement, 0.3, 0.1),
    };

    // Ensure non-negative
    newReadings.tilt = Math.max(0, newReadings.tilt);
    newReadings.displacement = Math.max(0, newReadings.displacement);
    newReadings.vibration = Math.max(0, Math.min(100, newReadings.vibration));
    newReadings.relativeMovement = Math.max(0, newReadings.relativeMovement);

    // Evaluate thresholds
    const sensorStatus = evaluateThresholds(newReadings, node.thresholds);
    const riskLevel = calculateRiskLevel(sensorStatus);
    const riskScore = calculateRiskScore(newReadings, node.thresholds, sensorStatus);

    // AI confidence and trend
    const updatedNode: NodeData = {
      ...node,
      readings: newReadings,
      sensorStatus,
      riskLevel,
      riskScore,
      lastHeartbeat: new Date(),
    };

    updatedNode.aiConfidence = getAIConfidence(updatedNode);
    updatedNode.trend = determineTrend(newReadings.displacement, previousDisplacement);

    // Predicted deformation — proportional to risk score
    if (riskLevel === 'L3') {
      updatedNode.predictedDeformation = parseFloat((14 + Math.random() * 6).toFixed(1));
      updatedNode.trend = 'Rapidly Increasing';
    } else if (riskLevel === 'L2') {
      updatedNode.predictedDeformation = parseFloat((6 + Math.random() * 4).toFixed(1));
      updatedNode.trend = 'Increasing';
    } else if (riskLevel === 'L1') {
      updatedNode.predictedDeformation = parseFloat((2 + Math.random() * 3).toFixed(1));
      updatedNode.trend = 'Slowly Increasing';
    } else {
      updatedNode.predictedDeformation = parseFloat((0.2 + Math.random() * 1).toFixed(1));
      updatedNode.trend = 'Stable';
    }

    updatedNode.predictionHorizon = 6;

    // Simulate battery drain (very slow)
    updatedNode.battery = Math.max(10, node.battery - Math.random() * 0.01);

    return updatedNode;
  });
}

/**
 * Drift a value toward a target with step size and noise.
 */
function drift(current: number, target: number, stepSize: number, noise: number): number {
  const diff = target - current;
  const step = Math.sign(diff) * Math.min(Math.abs(diff) * 0.15, stepSize);
  const noiseValue = (Math.random() - 0.5) * noise;
  return parseFloat((current + step + noiseValue).toFixed(3));
}

/**
 * Get the overall system status based on node risk levels.
 */
export function getSystemStatus(nodes: NodeData[]): 'OPERATIONAL' | 'WARNING' | 'CRITICAL' {
  if (nodes.some(n => n.riskLevel === 'L3')) return 'CRITICAL';
  if (nodes.some(n => n.riskLevel === 'L2')) return 'WARNING';
  return 'OPERATIONAL';
}
