import type {
  NodeData,
  Alert,
  Notification,
  AIRiskAssessment,
  NodeHistory,
  TimeSeriesPoint,
  RiskLevel,
  Trend,
  AlertSeverity,
  AlertStatus,
} from '../types';

/**
 * Maps backend NodeOut JSON payload (joined with latest_reading) to frontend NodeData interface.
 */
export function mapBackendNodeToFrontend(node: any): NodeData {
  const latest = node.latest_reading || {};

  const readings = {
    tilt: Number(latest.tilt ?? 0),
    displacement: Number(latest.displacement ?? 0),
    vibration: Number(latest.vibration ?? 0),
    crackDetected: Boolean(latest.crack_detected ?? false),
    relativeMovement: Number(latest.relative_movement ?? 0),
  };

  const thresholds = {
    tilt: Number(node.thr_tilt ?? 2.5),
    displacement: Number(node.thr_displacement ?? 10.0),
    vibration: Number(node.thr_vibration ?? 50.0),
    crack: Boolean(node.thr_crack ?? true),
    relativeMovement: Number(node.thr_relative_movement ?? 8.0),
  };

  const sensorStatus = {
    tilt: readings.tilt > thresholds.tilt,
    displacement: readings.displacement > thresholds.displacement,
    vibration: readings.vibration > thresholds.vibration,
    crack: readings.crackDetected && thresholds.crack,
    relativeMovement: readings.relativeMovement > thresholds.relativeMovement,
  };

  return {
    id: String(node.id),
    name: String(node.name || node.id),
    latitude: Number(node.latitude ?? 0),
    longitude: Number(node.longitude ?? 0),
    readings,
    thresholds,
    sensorStatus,
    riskLevel: (latest.risk_level as RiskLevel) || 'L0',
    riskScore: Number(latest.risk_score ?? 0),
    aiConfidence: Number(latest.ai_confidence ?? 95),
    predictedDeformation: Number(latest.predicted_deformation ?? 0),
    predictionHorizon: Number(latest.prediction_horizon ?? 6),
    trend: (latest.trend as Trend) || 'Stable',
    battery: Number(node.battery ?? 100),
    wifiSignal: Number(node.wifi_signal ?? -60),
    packetReception: Number(node.packet_reception ?? 100),
    lastHeartbeat: node.last_heartbeat ? new Date(node.last_heartbeat) : new Date(),
    status: (node.status as 'Online' | 'Offline' | 'Degraded') || 'Online',
  };
}

/**
 * Maps backend AlertOut JSON payload to frontend Alert interface.
 */
export function mapBackendAlertToFrontend(alert: any): Alert {
  return {
    id: String(alert.id),
    severity: (alert.severity as AlertSeverity) || 'L1',
    nodeId: String(alert.node_id),
    timestamp: alert.timestamp ? new Date(alert.timestamp) : new Date(),
    duration: Number(alert.duration ?? 0),
    trigger: String(alert.trigger || ''),
    aiRiskScore: Number(alert.ai_risk_score ?? 0),
    predictedDeformation: Number(alert.predicted_deformation ?? 0),
    status: (alert.status as AlertStatus) || 'ACTIVE',
    acknowledgedAt: alert.acknowledged_at ? new Date(alert.acknowledged_at) : undefined,
    resolvedAt: alert.resolved_at ? new Date(alert.resolved_at) : undefined,
    acknowledgedBy: alert.acknowledged_by ? String(alert.acknowledged_by) : undefined,
  };
}

/**
 * Maps backend NotificationOut JSON payload to frontend Notification interface.
 */
export function mapBackendNotificationToFrontend(notif: any): Notification {
  return {
    id: String(notif.id),
    type: (notif.type as 'critical' | 'warning' | 'watch' | 'system') || 'system',
    title: String(notif.title || ''),
    message: String(notif.message || ''),
    timestamp: notif.timestamp ? new Date(notif.timestamp) : new Date(),
    read: Boolean(notif.read),
    nodeId: notif.node_id ? String(notif.node_id) : undefined,
    alertId: notif.alert_id ? String(notif.alert_id) : undefined,
  };
}

/**
 * Maps backend AIRiskAssessmentResponse JSON payload to frontend AIRiskAssessment interface.
 */
export function mapBackendAIAssessmentToFrontend(ai: any): AIRiskAssessment {
  return {
    nodeId: String(ai.node_id),
    riskScore: Number(ai.risk_score ?? 0),
    confidence: Number(ai.confidence ?? 95),
    predictedDeformation: Number(ai.predicted_deformation ?? 0),
    predictionHorizon: Number(ai.prediction_horizon ?? 6),
    trend: (ai.trend as Trend) || 'Stable',
    contributingFactors: (ai.contributing_factors || []).map((f: any) => ({
      indicator: String(f.indicator),
      status: (f.status as 'normal' | 'abnormal') || 'normal',
      description: String(f.description),
      value: String(f.value),
      threshold: String(f.threshold),
    })),
    recommendedActions: (ai.recommended_actions || []).map(String),
    explanation: String(ai.explanation || ''),
  };
}

/**
 * Maps backend NodeHistoryResponse JSON payload to frontend NodeHistory interface.
 */
export function mapBackendHistoryToFrontend(history: any): NodeHistory {
  const mapPoints = (arr: any[]): TimeSeriesPoint[] =>
    (arr || []).map((p) => ({
      timestamp: new Date(p.timestamp),
      value: Number(p.value),
    }));

  return {
    nodeId: String(history.node_id),
    tilt: mapPoints(history.tilt),
    displacement: mapPoints(history.displacement),
    vibration: mapPoints(history.vibration),
    crackEvents: mapPoints(history.crack_events),
    relativeMovement: mapPoints(history.relative_movement),
    riskScore: mapPoints(history.risk_score),
    predictedDeformation: mapPoints(history.predicted_deformation),
    actualDeformation: mapPoints(history.actual_deformation || history.displacement),
  };
}
