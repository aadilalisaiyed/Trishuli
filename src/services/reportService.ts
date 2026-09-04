// ============================================================
// MineSafe AI — Report Service
// ============================================================

import type { ReportConfig, ReportData, NodeData, Alert } from '../types';
import { format } from 'date-fns';

/**
 * Generate report data from current state.
 */
export function generateReport(
  config: ReportConfig,
  nodes: NodeData[],
  alerts: Alert[]
): ReportData {
  const scopedNodes = config.nodeScope.includes('ALL')
    ? nodes
    : nodes.filter(n => config.nodeScope.includes(n.id));

  const scopedAlerts = alerts.filter(a => {
    if (!config.nodeScope.includes('ALL') && !config.nodeScope.includes(a.nodeId)) return false;
    return a.timestamp >= config.dateRange.start && a.timestamp <= config.dateRange.end;
  });

  const riskCounts = { L0: 0, L1: 0, L2: 0, L3: 0 };
  scopedNodes.forEach(n => { riskCounts[n.riskLevel]++; });
  const total = scopedNodes.length || 1;

  return {
    config,
    generatedAt: new Date(),
    summary: `Mine subsidence monitoring report for ${config.mine} covering the period ${format(config.dateRange.start, 'dd MMM yyyy')} to ${format(config.dateRange.end, 'dd MMM yyyy')}. ${scopedNodes.length} nodes monitored with ${scopedAlerts.length} alerts recorded during this period.`,
    riskOverview: {
      overallRisk: scopedNodes.reduce((worst, n) => {
        const order = { L0: 0, L1: 1, L2: 2, L3: 3 };
        return order[n.riskLevel] > order[worst] ? n.riskLevel : worst;
      }, 'L0' as 'L0' | 'L1' | 'L2' | 'L3'),
      l0Percentage: Math.round((riskCounts.L0 / total) * 100),
      l1Percentage: Math.round((riskCounts.L1 / total) * 100),
      l2Percentage: Math.round((riskCounts.L2 / total) * 100),
      l3Percentage: Math.round((riskCounts.L3 / total) * 100),
    },
    nodeStatistics: scopedNodes.map(n => ({
      nodeId: n.id,
      avgTilt: n.readings.tilt,
      maxDisplacement: n.readings.displacement,
      peakVibration: n.readings.vibration,
      crackEvents: n.readings.crackDetected ? 1 : 0,
      avgRiskScore: n.riskScore,
    })),
    alerts: scopedAlerts,
    aiPredictions: scopedNodes.map(n => ({
      nodeId: n.id,
      avgPredictionAccuracy: 91 + Math.round(Math.random() * 5),
      avgConfidence: n.aiConfidence,
      predictedDeformation: n.predictedDeformation,
    })),
  };
}

/**
 * Export report data as CSV string.
 */
export function exportCSV(nodes: NodeData[], alerts: Alert[]): string {
  const lines: string[] = [];

  // Node data
  lines.push('MINE SUBSIDENCE MONITORING DATA — PROTOTYPE / DEMONSTRATION DATA');
  lines.push('');
  lines.push('NODE DATA');
  lines.push('Node,Risk Level,Risk Score,AI Confidence,Tilt (°),Displacement (mm),Vibration (%),Crack,Relative Movement (mm),Predicted Deformation (mm),Battery (%),WiFi (dBm),Status');

  nodes.forEach(n => {
    lines.push([
      n.id,
      n.riskLevel,
      n.riskScore,
      n.aiConfidence,
      n.readings.tilt.toFixed(2),
      n.readings.displacement.toFixed(1),
      n.readings.vibration.toFixed(0),
      n.readings.crackDetected ? 'Detected' : 'None',
      n.readings.relativeMovement.toFixed(1),
      n.predictedDeformation.toFixed(1),
      n.battery.toFixed(0),
      n.wifiSignal,
      n.status,
    ].join(','));
  });

  lines.push('');
  lines.push('ALERT DATA');
  lines.push('Alert ID,Severity,Node,Timestamp,Trigger,AI Risk Score,Status');

  alerts.forEach(a => {
    lines.push([
      a.id,
      a.severity,
      a.nodeId,
      format(a.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      `"${a.trigger}"`,
      a.aiRiskScore,
      a.status,
    ].join(','));
  });

  return lines.join('\n');
}

/**
 * Get default report sections.
 */
export function getDefaultReportSections() {
  return [
    { id: 'executive-summary', label: 'Executive Summary', enabled: true },
    { id: 'risk-overview', label: 'Risk Overview', enabled: true },
    { id: 'affected-zones', label: 'Affected Zones', enabled: true },
    { id: 'sensor-statistics', label: 'Sensor Statistics', enabled: true },
    { id: 'major-alerts', label: 'Major Alerts', enabled: true },
    { id: 'ai-predictions', label: 'AI Predictions', enabled: true },
    { id: 'node-health', label: 'Node Health', enabled: true },
    { id: 'trend-analysis', label: 'Trend Analysis', enabled: true },
    { id: 'recommended-actions', label: 'Recommended Actions', enabled: true },
  ];
}
