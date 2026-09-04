// ============================================================
// MineSafe AI — Alert Domain Components
// ============================================================

import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import type { Alert } from '../../types';
import { RiskBadge } from '../common';
import { format, formatDistanceToNowStrict } from 'date-fns';

// --- Alert Card ---
export function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onViewMap,
}: {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onViewMap?: (nodeId: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${
          alert.severity === 'L3' ? 'var(--critical)' : alert.severity === 'L2' ? 'var(--warning)' : 'var(--watch)'
        }`,
        padding: '12px 16px',
        marginBottom: 8,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <div className="flex items-center gap-sm">
          <RiskBadge level={alert.severity as any} size="sm" />
          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Node {alert.nodeId}</span>
          <span className="text-xs text-muted">({alert.id})</span>
        </div>
        <div className="flex items-center gap-xs text-xs text-muted">
          <Clock size={12} />
          <span>{format(alert.timestamp, 'HH:mm:ss')}</span>
          <span>({formatDistanceToNowStrict(alert.timestamp, { addSuffix: true })})</span>
        </div>
      </div>

      <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: 8 }}>
        {alert.trigger}
      </div>

      <div className="flex items-center gap-md text-xs text-muted" style={{ marginBottom: 10 }}>
        <div className="flex items-center gap-xs">
          <Sparkles size={12} color="var(--ai)" />
          <span>AI Risk: <strong style={{ color: 'var(--ai)' }}>{alert.aiRiskScore}%</strong></span>
        </div>
        <div>
          Pred Deformation: <strong>+{alert.predictedDeformation} mm</strong>
        </div>
        <div>
          Status: <strong style={{
            color: alert.status === 'ACTIVE' ? 'var(--critical)' : alert.status === 'ACKNOWLEDGED' ? 'var(--warning)' : 'var(--success)'
          }}>{alert.status}</strong>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
        <div className="flex items-center gap-sm">
          {alert.status === 'ACTIVE' && onAcknowledge && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onAcknowledge(alert.id)}
            >
              Acknowledge
            </button>
          )}
          {alert.status === 'ACKNOWLEDGED' && onResolve && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onResolve(alert.id)}
            >
              Mark Resolved
            </button>
          )}
          {alert.status === 'RESOLVED' && (
            <span className="text-xs text-muted flex items-center gap-xs">
              <CheckCircle2 size={13} color="var(--success)" /> Resolved
            </span>
          )}
        </div>

        <div className="flex items-center gap-xs">
          {onViewMap && (
            <button
              className="btn btn-secondary btn-sm flex items-center gap-xs"
              onClick={() => onViewMap(alert.nodeId)}
              title="View on Map"
            >
              <MapPin size={12} /> Map
            </button>
          )}
          <button
            className="btn btn-primary btn-sm flex items-center gap-xs"
            onClick={() => navigate(`/detail/${alert.nodeId}`)}
          >
            Node Detail <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Compact Alert Feed (for Main Dashboard Sidebar) ---
export function AlertFeed({
  alerts,
  maxItems = 4,
}: {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
  maxItems?: number;
}) {
  const navigate = useNavigate();
  const displayAlerts = alerts.slice(0, maxItems);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title flex items-center gap-xs">
          <ShieldAlert size={14} color="var(--warning)" />
          <span>Recent Alerts</span>
        </div>
        <button
          className="text-xs"
          style={{ color: 'var(--primary)', fontWeight: 600 }}
          onClick={() => navigate('/alerts')}
        >
          View All ({alerts.length})
        </button>
      </div>

      {displayAlerts.length === 0 ? (
        <div className="text-xs text-muted text-center" style={{ padding: 20 }}>
          No active or recent alerts.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {displayAlerts.map(alert => (
            <div
              key={alert.id}
              style={{
                background: 'var(--bg)',
                borderLeft: `3px solid ${
                  alert.severity === 'L3' ? 'var(--critical)' : alert.severity === 'L2' ? 'var(--warning)' : 'var(--watch)'
                }`,
                borderRadius: 'var(--r-sm)',
                padding: '8px 10px',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/detail/${alert.nodeId}`)}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                <span className="text-xs" style={{ fontWeight: 700 }}>
                  {alert.nodeId} — {alert.severity}
                </span>
                <span className="text-xs text-muted">{format(alert.timestamp, 'HH:mm:ss')}</span>
              </div>
              <div className="text-xs text-secondary truncate">{alert.trigger}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Full Alert Table ---
export function AlertTable({
  alerts,
  onAcknowledge,
  onResolve,
}: {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="card overflow-auto" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Node</th>
            <th>Trigger Event</th>
            <th>Timestamp</th>
            <th>AI Risk</th>
            <th>Pred Def</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {alerts.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                No alerts found matching the selected filters.
              </td>
            </tr>
          ) : (
            alerts.map(alert => (
              <tr key={alert.id}>
                <td><RiskBadge level={alert.severity as any} size="sm" /></td>
                <td><strong style={{ cursor: 'pointer' }} onClick={() => navigate(`/detail/${alert.nodeId}`)}>{alert.nodeId}</strong></td>
                <td style={{ maxWidth: 280 }}>
                  <div style={{ fontWeight: 600 }}>{alert.trigger}</div>
                  <div className="text-xs text-muted">ID: {alert.id}</div>
                </td>
                <td className="text-xs text-muted">
                  <div>{format(alert.timestamp, 'dd MMM yyyy')}</div>
                  <div>{format(alert.timestamp, 'HH:mm:ss')}</div>
                </td>
                <td>
                  <div className="flex items-center gap-xs">
                    <Sparkles size={12} color="var(--ai)" />
                    <span style={{ fontWeight: 700, color: 'var(--ai)' }}>{alert.aiRiskScore}%</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--ai)' }}>+{alert.predictedDeformation} mm</td>
                <td>
                  <span className="badge" style={{
                    background: alert.status === 'ACTIVE' ? 'var(--critical-bg)' : alert.status === 'ACKNOWLEDGED' ? 'var(--warning-bg)' : 'var(--success-bg)',
                    color: alert.status === 'ACTIVE' ? 'var(--critical)' : alert.status === 'ACKNOWLEDGED' ? '#C2410C' : 'var(--success)',
                  }}>
                    {alert.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-xs">
                    {alert.status === 'ACTIVE' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onAcknowledge(alert.id)}
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === 'ACKNOWLEDGED' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onResolve(alert.id)}
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/detail/${alert.nodeId}`)}
                    >
                      Detail
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
