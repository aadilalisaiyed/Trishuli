import { api } from './api';
import { mapBackendAlertToFrontend } from './transformers';
import type { Alert, AlertSeverity, AlertStatus, NodeData } from '../types';

/**
 * Fetch alerts from backend REST API with optional filtering.
 */
export async function fetchAlertsApi(filters?: {
  severity?: AlertSeverity | 'ALL';
  status?: AlertStatus | 'ALL';
  nodeId?: string | 'ALL';
  limit?: number;
}): Promise<Alert[]> {
  const params: Record<string, any> = { limit: filters?.limit || 100 };
  if (filters?.severity && filters.severity !== 'ALL') params.severity = filters.severity;
  if (filters?.status && filters.status !== 'ALL') params.status = filters.status;
  if (filters?.nodeId && filters.nodeId !== 'ALL') params.node_id = filters.nodeId;

  const response = await api.get('/alerts', { params });
  return (response.data || []).map(mapBackendAlertToFrontend);
}

/**
 * Acknowledge an active alert via REST API.
 */
export async function acknowledgeAlertApi(alertId: string, acknowledgedBy?: string): Promise<Alert> {
  const response = await api.patch(`/alerts/${alertId}/acknowledge`, {
    acknowledged_by: acknowledgedBy,
  });
  return mapBackendAlertToFrontend(response.data);
}

/**
 * Resolve an alert via REST API.
 */
export async function resolveAlertApi(alertId: string): Promise<Alert> {
  const response = await api.patch(`/alerts/${alertId}/resolve`);
  return mapBackendAlertToFrontend(response.data);
}

// ── Legacy / Client-Side Simulation Helpers ──────────────────
let alertCounter = 100;

function generateId(): string {
  alertCounter++;
  return `ALT-${alertCounter}`;
}

export function generateSeedAlerts(): Alert[] {
  const now = new Date();
  return [
    {
      id: 'ALT-001',
      severity: 'L1',
      nodeId: 'N02',
      timestamp: new Date(now.getTime() - 3600000),
      duration: 3600,
      trigger: 'Vibration anomaly detected',
      aiRiskScore: 28,
      predictedDeformation: 2.1,
      status: 'RESOLVED',
      resolvedAt: new Date(now.getTime() - 1800000),
    },
    {
      id: 'ALT-002',
      severity: 'L1',
      nodeId: 'N01',
      timestamp: new Date(now.getTime() - 7200000),
      duration: 1200,
      trigger: 'Tilt reading elevated',
      aiRiskScore: 22,
      predictedDeformation: 1.5,
      status: 'RESOLVED',
      resolvedAt: new Date(now.getTime() - 6000000),
    },
  ];
}

export function createAlert(node: NodeData): Alert | null {
  if (node.riskLevel === 'L0') return null;

  const severity: AlertSeverity = node.riskLevel as AlertSeverity;
  const triggers: string[] = [];

  if (node.sensorStatus.tilt) triggers.push('tilt');
  if (node.sensorStatus.displacement) triggers.push('displacement');
  if (node.sensorStatus.vibration) triggers.push('vibration');
  if (node.sensorStatus.crack) triggers.push('crack detection');
  if (node.sensorStatus.relativeMovement) triggers.push('relative movement');

  let triggerText: string;
  if (triggers.length === 5) {
    triggerText = 'All 5 indicators abnormal.';
  } else {
    triggerText = `${triggers.join(' + ')} anomaly detected.`;
  }

  return {
    id: generateId(),
    severity,
    nodeId: node.id,
    timestamp: new Date(),
    duration: 0,
    trigger: triggerText,
    aiRiskScore: node.riskScore,
    predictedDeformation: node.predictedDeformation,
    status: 'ACTIVE',
  };
}

export function acknowledgeAlert(alert: Alert, user: string = 'Safety Officer'): Alert {
  return {
    ...alert,
    status: 'ACKNOWLEDGED' as AlertStatus,
    acknowledgedAt: new Date(),
    acknowledgedBy: user,
  };
}

export function resolveAlert(alert: Alert): Alert {
  return {
    ...alert,
    status: 'RESOLVED' as AlertStatus,
    resolvedAt: new Date(),
  };
}

export function filterAlerts(
  alerts: Alert[],
  filters: {
    severity?: AlertSeverity | 'ALL';
    status?: AlertStatus | 'ALL';
    nodeId?: string | 'ALL';
    hoursBack?: number;
  }
): Alert[] {
  let filtered = [...alerts];

  if (filters.severity && filters.severity !== 'ALL') {
    filtered = filtered.filter(a => a.severity === filters.severity);
  }

  if (filters.status && filters.status !== 'ALL') {
    filtered = filtered.filter(a => a.status === filters.status);
  }

  if (filters.nodeId && filters.nodeId !== 'ALL') {
    filtered = filtered.filter(a => a.nodeId === filters.nodeId);
  }

  if (filters.hoursBack) {
    const cutoff = new Date(Date.now() - filters.hoursBack * 3600000);
    filtered = filtered.filter(a => a.timestamp > cutoff);
  }

  return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
