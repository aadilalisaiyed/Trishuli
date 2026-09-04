// ============================================================
// MineSafe AI — Risk Service
// ============================================================
// Risk calculation logic per spec:
// L0 NORMAL  = 0 abnormal indicators
// L1 WATCH   = 1-2 abnormal indicators
// L2 WARNING = 3-4 abnormal indicators
// L3 CRITICAL = ALL 5 indicators abnormal
//
// PROTOTYPE LOGIC — not scientifically validated.

import type { SensorReadings, NodeThresholds, SensorStatus, RiskLevel } from '../types';

/**
 * Evaluate each indicator against location-specific thresholds.
 * Returns an object indicating which indicators are abnormal.
 */
export function evaluateThresholds(
  readings: SensorReadings,
  thresholds: NodeThresholds
): SensorStatus {
  return {
    tilt: readings.tilt > thresholds.tilt,
    displacement: readings.displacement > thresholds.displacement,
    vibration: readings.vibration > thresholds.vibration,
    crack: readings.crackDetected && thresholds.crack,
    relativeMovement: readings.relativeMovement > thresholds.relativeMovement,
  };
}

/**
 * Count number of abnormal indicators.
 */
export function countAbnormal(status: SensorStatus): number {
  return [
    status.tilt,
    status.displacement,
    status.vibration,
    status.crack,
    status.relativeMovement,
  ].filter(Boolean).length;
}

/**
 * Calculate risk level from abnormal count.
 * L3 requires ALL 5 to be abnormal.
 */
export function calculateRiskLevel(status: SensorStatus): RiskLevel {
  const count = countAbnormal(status);
  if (count === 5) return 'L3';
  if (count >= 3) return 'L2';
  if (count >= 1) return 'L1';
  return 'L0';
}

/**
 * Calculate a composite risk score (0-100) that considers severity
 * and how far each indicator exceeds its threshold.
 * 
 * PROTOTYPE: This is simulated deterministic logic, not a real ML model.
 */
export function calculateRiskScore(
  readings: SensorReadings,
  thresholds: NodeThresholds,
  status: SensorStatus
): number {
  const abnormalCount = countAbnormal(status);
  if (abnormalCount === 0) return Math.floor(Math.random() * 12) + 3;

  // Calculate severity factors for each abnormal indicator
  let severitySum = 0;
  let maxSeverity = 0;

  if (status.tilt) {
    const severity = Math.min((readings.tilt / thresholds.tilt - 1) * 100, 100);
    severitySum += severity;
    maxSeverity = Math.max(maxSeverity, severity);
  }

  if (status.displacement) {
    const severity = Math.min((readings.displacement / thresholds.displacement - 1) * 100, 100);
    severitySum += severity;
    maxSeverity = Math.max(maxSeverity, severity);
  }

  if (status.vibration) {
    const severity = Math.min((readings.vibration / thresholds.vibration - 1) * 100, 100);
    severitySum += severity;
    maxSeverity = Math.max(maxSeverity, severity);
  }

  if (status.crack) {
    severitySum += 80; // Crack detection is binary — high severity
    maxSeverity = Math.max(maxSeverity, 80);
  }

  if (status.relativeMovement) {
    const severity = Math.min((readings.relativeMovement / thresholds.relativeMovement - 1) * 100, 100);
    severitySum += severity;
    maxSeverity = Math.max(maxSeverity, severity);
  }

  // Weighted composite:
  // 40% from abnormal count ratio
  // 35% from average severity
  // 25% from max severity
  const countFactor = (abnormalCount / 5) * 100;
  const avgSeverity = abnormalCount > 0 ? severitySum / abnormalCount : 0;
  const score = countFactor * 0.4 + avgSeverity * 0.35 + maxSeverity * 0.25;

  return Math.min(Math.round(Math.max(score, 15)), 100);
}

/**
 * Get risk level description
 */
export function getRiskDescription(level: RiskLevel): string {
  switch (level) {
    case 'L0': return 'No significant abnormality detected.';
    case 'L1': return 'Early abnormal behavior detected. Monitoring required.';
    case 'L2': return 'Significant deformation pattern detected. Safety attention required.';
    case 'L3': return 'Critical deformation pattern detected. Immediate safety response should be considered.';
  }
}
