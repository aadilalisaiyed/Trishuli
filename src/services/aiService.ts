// ============================================================
// MineSafe AI — AI Service
// ============================================================
// Simulated AI prediction layer.
// PROTOTYPE: Uses deterministic logic derived from sensor readings.
// No real ML model runs in the browser.
// This service can be replaced by a real ML API endpoint.

import type { NodeData, AIRiskAssessment, ContributingFactor, Trend } from '../types';
import { countAbnormal } from './riskService';

/**
 * Generate a realistic AI risk prediction for a node.
 * The output dynamically corresponds to current sensor conditions.
 */
export function getRiskPrediction(node: NodeData): AIRiskAssessment {
  const factors = getContributingFactors(node);
  const abnormalCount = countAbnormal(node.sensorStatus);

  return {
    nodeId: node.id,
    riskScore: node.riskScore,
    confidence: node.aiConfidence,
    predictedDeformation: node.predictedDeformation,
    predictionHorizon: node.predictionHorizon,
    trend: node.trend,
    contributingFactors: factors,
    recommendedActions: getRecommendedActions(node),
    explanation: getAnomalyExplanation(node, abnormalCount),
  };
}

/**
 * Get predicted deformation for a given timeframe.
 * PROTOTYPE: Scales current prediction linearly by timeframe ratio.
 */
export function getPredictedDeformation(node: NodeData, timeframeHours: number): number {
  const baseRate = node.predictedDeformation / node.predictionHorizon;
  const noise = 1 + (Math.random() - 0.5) * 0.1;
  return parseFloat((baseRate * timeframeHours * noise).toFixed(1));
}

/**
 * Get AI confidence for a node prediction.
 * Higher abnormal count + higher severity = slightly lower confidence
 * (more uncertain conditions).
 */
export function getAIConfidence(node: NodeData): number {
  const abnormalCount = countAbnormal(node.sensorStatus);
  // Base confidence decreases slightly as situation worsens
  const base = 96 - abnormalCount * 2;
  const noise = (Math.random() - 0.5) * 4;
  return Math.min(Math.max(Math.round(base + noise), 75), 98);
}

/**
 * Generate explanation of WHY the AI assessed this risk level.
 * Must dynamically correspond to actual sensor conditions.
 */
export function getAnomalyExplanation(node: NodeData, abnormalCount: number): string {
  if (abnormalCount === 0) {
    return 'All monitored indicators are within normal thresholds. No significant deformation pattern detected.';
  }

  const parts: string[] = [];

  if (abnormalCount === 5) {
    parts.push('All five monitored indicators show abnormal readings.');
  } else {
    parts.push(`${abnormalCount} of 5 monitored indicators show abnormal readings.`);
  }

  if (node.sensorStatus.tilt) {
    const exceedance = ((node.readings.tilt / node.thresholds.tilt - 1) * 100).toFixed(0);
    parts.push(`Tilt exceeds local threshold by ${exceedance}%.`);
  }
  if (node.sensorStatus.displacement) {
    parts.push(`Displacement is ${node.trend === 'Rapidly Increasing' ? 'increasing rapidly' : 'elevated'} at ${node.readings.displacement.toFixed(1)} mm.`);
  }
  if (node.sensorStatus.vibration) {
    parts.push('Abnormal ground vibration detected.');
  }
  if (node.sensorStatus.crack) {
    parts.push('Crack sensor has detected surface cracking.');
  }
  if (node.sensorStatus.relativeMovement) {
    parts.push(`Relative movement between nodes exceeds threshold at ${node.readings.relativeMovement.toFixed(1)} mm.`);
  }

  if (node.trend === 'Rapidly Increasing' || node.trend === 'Increasing') {
    parts.push(`Trend is ${node.trend.toLowerCase()}, suggesting worsening conditions.`);
  }

  return parts.join(' ');
}

/**
 * Get contributing factors with status for UI display.
 */
function getContributingFactors(node: NodeData): ContributingFactor[] {
  return [
    {
      indicator: 'Tilt',
      status: node.sensorStatus.tilt ? 'abnormal' : 'normal',
      description: node.sensorStatus.tilt
        ? 'Tilt exceeded local threshold'
        : 'Tilt within normal range',
      value: `${node.readings.tilt.toFixed(2)}°`,
      threshold: `${node.thresholds.tilt.toFixed(2)}°`,
    },
    {
      indicator: 'Displacement',
      status: node.sensorStatus.displacement ? 'abnormal' : 'normal',
      description: node.sensorStatus.displacement
        ? `Displacement is ${node.trend === 'Rapidly Increasing' ? 'increasing rapidly' : 'elevated'}`
        : 'Displacement within normal range',
      value: `${node.readings.displacement.toFixed(1)} mm`,
      threshold: `${node.thresholds.displacement.toFixed(1)} mm`,
    },
    {
      indicator: 'Vibration',
      status: node.sensorStatus.vibration ? 'abnormal' : 'normal',
      description: node.sensorStatus.vibration
        ? 'Abnormal vibration detected'
        : 'Vibration within normal range',
      value: `${node.readings.vibration.toFixed(0)}%`,
      threshold: `${node.thresholds.vibration.toFixed(0)}%`,
    },
    {
      indicator: 'Crack Detection',
      status: node.sensorStatus.crack ? 'abnormal' : 'normal',
      description: node.sensorStatus.crack
        ? 'Crack sensor detected a crack'
        : 'No crack detected',
      value: node.readings.crackDetected ? 'Detected' : 'None',
      threshold: 'Detection',
    },
    {
      indicator: 'Relative Movement',
      status: node.sensorStatus.relativeMovement ? 'abnormal' : 'normal',
      description: node.sensorStatus.relativeMovement
        ? 'Relative movement exceeded threshold'
        : 'Relative movement within normal range',
      value: `${node.readings.relativeMovement.toFixed(1)} mm`,
      threshold: `${node.thresholds.relativeMovement.toFixed(1)} mm`,
    },
  ];
}

/**
 * Get recommended safety actions based on current risk level.
 * Dynamically generated based on conditions, NOT generic.
 */
export function getRecommendedActions(node: NodeData): string[] {
  const actions: string[] = [];

  switch (node.riskLevel) {
    case 'L0':
      actions.push('Continue routine monitoring.');
      break;

    case 'L1':
      actions.push('Increase monitoring frequency for affected indicators.');
      if (node.sensorStatus.tilt) actions.push(`Monitor tilt readings at ${node.id}.`);
      if (node.sensorStatus.displacement) actions.push(`Track displacement trends near ${node.id}.`);
      actions.push('No immediate safety action required.');
      break;

    case 'L2':
      actions.push(`Inspect surface deformation near ${node.id}.`);
      actions.push('Notify designated mine safety personnel.');
      if (node.sensorStatus.crack) actions.push('Investigate crack detection area.');
      actions.push('Review access restrictions for the affected monitoring zone.');
      actions.push('Prepare for possible escalation.');
      break;

    case 'L3':
      actions.push(`Restrict access to the affected monitoring zone near ${node.id}.`);
      actions.push(`Inspect surface deformation near ${node.id} immediately.`);
      actions.push('Notify designated mine safety personnel.');
      actions.push('Prepare personnel movement toward an approved safe/refuge location if required.');
      actions.push('Review and activate emergency response procedures.');
      break;
  }

  return actions;
}

/**
 * Determine trend based on recent values
 */
export function determineTrend(currentValue: number, previousValue: number): Trend {
  const changeRate = previousValue > 0 ? (currentValue - previousValue) / previousValue : 0;

  if (changeRate > 0.15) return 'Rapidly Increasing';
  if (changeRate > 0.05) return 'Increasing';
  if (changeRate > 0.01) return 'Slowly Increasing';
  if (changeRate < -0.05) return 'Decreasing';
  return 'Stable';
}
