// ============================================================
// MineSafe AI — Common Reusable Components
// ============================================================

import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info, Loader, Inbox, WifiOff } from 'lucide-react';
import type { RiskLevel } from '../../types';

// --- Risk Badge ---
export function RiskBadge({ level, size = 'md' }: { level: RiskLevel; size?: 'sm' | 'md' | 'lg' }) {
  const labels: Record<RiskLevel, string> = { L0: 'NORMAL', L1: 'WATCH', L2: 'WARNING', L3: 'CRITICAL' };
  const icons: Record<RiskLevel, string> = { L0: '🟢', L1: '🟡', L2: '🟠', L3: '🔴' };
  const cls = size === 'lg' ? 'badge badge-lg' : size === 'sm' ? 'badge badge-sm' : 'badge';

  return (
    <span className={`${cls} badge-${level}`} style={size === 'lg' ? { fontSize: '0.8125rem', padding: '4px 12px' } : undefined}>
      <span>{icons[level]}</span>
      <span>{level} {labels[level]}</span>
    </span>
  );
}

// --- Status Badge ---
export function StatusBadge({ status, variant }: { status: string; variant?: 'success' | 'warning' | 'critical' | 'info' }) {
  const v = variant || 'success';
  const colorMap = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    critical: 'var(--critical)',
    info: 'var(--info)',
  };
  const bgMap = {
    success: 'var(--success-bg)',
    warning: 'var(--warning-bg)',
    critical: 'var(--critical-bg)',
    info: 'var(--info-light)',
  };

  return (
    <span className="badge" style={{ background: bgMap[v], color: colorMap[v] }}>
      <span className="status-dot" style={{ background: colorMap[v] }} />
      {status}
    </span>
  );
}

// --- Metric Card ---
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'stable';
  color?: string;
  bgColor?: string;
  onClick?: () => void;
}

export function MetricCard({ label, value, unit, icon, trend, color, bgColor, onClick }: MetricCardProps) {
  return (
    <div
      className="card"
      style={{
        cursor: onClick ? 'pointer' : undefined,
        borderLeft: color ? `3px solid ${color}` : undefined,
        background: bgColor || undefined,
        padding: '12px 16px',
        minWidth: 0,
      }}
      onClick={onClick}
    >
      <div className="metric-label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="flex items-center gap-sm">
        {icon}
        <span className="metric-value" style={{ color: color || undefined }}>{value}</span>
        {unit && <span className="text-sm text-muted" style={{ marginLeft: 2 }}>{unit}</span>}
      </div>
      {trend && <div className="text-xs text-muted" style={{ marginTop: 4 }}>{trend}</div>}
    </div>
  );
}

// --- Sensor Card ---
interface SensorCardProps {
  name: string;
  value: string;
  unit: string;
  threshold: string;
  isAbnormal: boolean;
  change?: string;
}

export function SensorCard({ name, value, unit, threshold, isAbnormal, change }: SensorCardProps) {
  return (
    <div className="card" style={{
      borderLeft: `3px solid ${isAbnormal ? 'var(--critical)' : 'var(--success)'}`,
      padding: '12px 16px',
    }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="metric-label">{name}</span>
        <span className={`badge ${isAbnormal ? 'badge-L3' : 'badge-L0'}`}>
          {isAbnormal ? 'ABNORMAL' : 'NORMAL'}
        </span>
      </div>
      <div className="metric-value" style={{ marginBottom: 4 }}>{value} <span className="text-sm text-muted">{unit}</span></div>
      <div className="text-xs text-muted">Threshold: {threshold} {unit}</div>
      {change && <div className="text-xs" style={{ color: isAbnormal ? 'var(--critical)' : 'var(--text-muted)', marginTop: 4 }}>{change}</div>}
    </div>
  );
}

// --- Time Range Selector ---
interface TimeRangeSelectorProps {
  selected: string;
  onChange: (range: string) => void;
  options?: string[];
}

export function TimeRangeSelector({ selected, onChange, options }: TimeRangeSelectorProps) {
  const ranges = options || ['1H', '6H', '24H', '7D', '30D'];
  return (
    <div className="btn-group">
      {ranges.map(r => (
        <button key={r} className={`btn ${selected === r ? 'active' : ''}`} onClick={() => onChange(r)}>
          {r}
        </button>
      ))}
    </div>
  );
}

// --- Node Selector ---
export function NodeSelector({ selected, onChange, nodes }: {
  selected: string;
  onChange: (nodeId: string) => void;
  nodes: { id: string; name: string }[];
}) {
  return (
    <select
      className="form-input"
      value={selected}
      onChange={e => onChange(e.target.value)}
      style={{ minWidth: 100 }}
    >
      <option value="ALL">All Nodes</option>
      {nodes.map(n => (
        <option key={n.id} value={n.id}>{n.id}</option>
      ))}
    </select>
  );
}

// --- Loading State ---
export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-md" style={{ padding: 48, color: 'var(--text-muted)' }}>
      <Loader size={24} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
      <span className="text-sm">{message || 'Loading...'}</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// --- Empty State ---
export function EmptyState({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-md" style={{ padding: 48, color: 'var(--text-muted)' }}>
      {icon || <Inbox size={32} />}
      <span className="text-sm">{message}</span>
    </div>
  );
}

// --- Error State ---
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-md" style={{ padding: 48, color: 'var(--critical)' }}>
      <WifiOff size={32} />
      <span className="text-sm">{message}</span>
      {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

// --- Toast ---
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const iconMap = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  };
  const colorMap = {
    success: 'var(--success)',
    error: 'var(--critical)',
    warning: 'var(--warning)',
    info: 'var(--info)',
  };

  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="animate-slide-in" style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
      background: 'var(--card)', border: `1px solid ${colorMap[type]}`,
      borderLeft: `4px solid ${colorMap[type]}`,
      borderRadius: 'var(--r-lg)', padding: '12px 16px',
      boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 8,
      maxWidth: 400,
    }}>
      <span style={{ color: colorMap[type] }}>{iconMap[type]}</span>
      <span className="text-sm">{message}</span>
      <button onClick={onClose} style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 18 }}>×</button>
    </div>
  );
}
