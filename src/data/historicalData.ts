// ============================================================
// MineSafe AI — Historical Data Generator
// ============================================================
// Generates realistic time-series data with natural noise and trends.

import type { TimeSeriesPoint, NodeHistory } from '../types';

function generateNoisyTimeSeries(
  baseValue: number,
  variance: number,
  points: number,
  hoursBack: number,
  trend: 'stable' | 'increasing' | 'decreasing' = 'stable',
  spikeProbability: number = 0.02,
  spikeMultiplier: number = 2.5
): TimeSeriesPoint[] {
  const now = new Date();
  const data: TimeSeriesPoint[] = [];
  const intervalMs = (hoursBack * 3600 * 1000) / points;

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now.getTime() - (points - i) * intervalMs);
    let value = baseValue;

    // Add trend
    const progress = i / points;
    if (trend === 'increasing') {
      value += baseValue * 0.3 * progress;
    } else if (trend === 'decreasing') {
      value -= baseValue * 0.2 * progress;
    }

    // Add noise
    value += (Math.random() - 0.5) * variance * 2;

    // Occasional spikes
    if (Math.random() < spikeProbability) {
      value += variance * spikeMultiplier * (Math.random() > 0.5 ? 1 : -1);
    }

    // Ensure non-negative
    value = Math.max(0, value);

    data.push({ timestamp, value: parseFloat(value.toFixed(3)) });
  }

  return data;
}

function generateCrackEvents(points: number, hoursBack: number, eventCount: number): TimeSeriesPoint[] {
  const now = new Date();
  const data: TimeSeriesPoint[] = [];
  const intervalMs = (hoursBack * 3600 * 1000) / points;

  // Fill with zeros
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now.getTime() - (points - i) * intervalMs);
    data.push({ timestamp, value: 0 });
  }

  // Add events at random positions (biased toward recent)
  for (let e = 0; e < eventCount; e++) {
    const idx = Math.floor(points * (0.5 + Math.random() * 0.5));
    if (idx < points) {
      data[idx].value = 1;
    }
  }

  return data;
}

export function generateNodeHistory(
  nodeId: string,
  hoursBack: number = 24,
  points: number = 100,
  scenario: 'normal' | 'warning' | 'critical' = 'normal'
): NodeHistory {
  const isN02Warning = nodeId === 'N02' && (scenario === 'warning' || scenario === 'critical');
  const isN03Critical = nodeId === 'N03' && scenario === 'critical';

  const tiltBase = isN03Critical ? 0.55 : isN02Warning ? 0.35 : 0.15;
  const tiltTrend = isN03Critical ? 'increasing' as const : 'stable' as const;

  const dispBase = isN03Critical ? 12 : isN02Warning ? 7.5 : 3;
  const dispTrend = isN03Critical ? 'increasing' as const : 'stable' as const;

  const vibBase = isN03Critical ? 58 : isN02Warning ? 42 : 20;
  const relBase = isN03Critical ? 8.5 : isN02Warning ? 5 : 2;

  const crackEvents = isN03Critical ? 8 : isN02Warning ? 2 : 0;

  const riskBase = isN03Critical ? 75 : isN02Warning ? 45 : 10;
  const riskTrend = isN03Critical ? 'increasing' as const : 'stable' as const;

  // Predicted deformation — AI model output (purple line)
  const predBase = isN03Critical ? 14 : isN02Warning ? 6 : 1;
  const predTrend = isN03Critical ? 'increasing' as const : 'stable' as const;

  // Actual deformation — ground truth (blue line)
  const actualBase = isN03Critical ? 12 : isN02Warning ? 5.5 : 0.8;
  const actualTrend = isN03Critical ? 'increasing' as const : 'stable' as const;

  return {
    nodeId,
    tilt: generateNoisyTimeSeries(tiltBase, tiltBase * 0.15, points, hoursBack, tiltTrend),
    displacement: generateNoisyTimeSeries(dispBase, dispBase * 0.12, points, hoursBack, dispTrend),
    vibration: generateNoisyTimeSeries(vibBase, vibBase * 0.15, points, hoursBack),
    crackEvents: generateCrackEvents(points, hoursBack, crackEvents),
    relativeMovement: generateNoisyTimeSeries(relBase, relBase * 0.12, points, hoursBack),
    riskScore: generateNoisyTimeSeries(riskBase, riskBase * 0.1, points, hoursBack, riskTrend),
    predictedDeformation: generateNoisyTimeSeries(predBase, predBase * 0.08, points, hoursBack, predTrend, 0),
    actualDeformation: generateNoisyTimeSeries(actualBase, actualBase * 0.1, points, hoursBack, actualTrend),
  };
}

// Generate historical data for all nodes
export function generateAllNodeHistory(
  hoursBack: number = 24,
  points: number = 100,
  scenario: 'normal' | 'warning' | 'critical' = 'normal'
): Record<string, NodeHistory> {
  return {
    N01: generateNodeHistory('N01', hoursBack, points, scenario),
    N02: generateNodeHistory('N02', hoursBack, points, scenario),
    N03: generateNodeHistory('N03', hoursBack, points, scenario),
  };
}
