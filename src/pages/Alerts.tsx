// ============================================================
// MineSafe AI — Alerts & Threshold Rules Page (Screen 5)
// ============================================================

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sliders,
  Filter,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MetricCard, TimeRangeSelector, NodeSelector } from '../components/common';
import { AlertTable } from '../components/alerts';
import { filterAlerts } from '../services/alertService';
import type { AlertSeverity, AlertStatus } from '../types';

export function AlertsPage() {
  const { state, acknowledgeAlert, resolveAlert } = useApp();
  const [searchParams] = useSearchParams();

  const urlNode = searchParams.get('node');

  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [nodeFilter, setNodeFilter] = useState<string>(urlNode || 'ALL');
  const [timeRange, setTimeRange] = useState<string>('7D');

  const hoursBack = useMemo(() => {
    switch (timeRange) {
      case '1H': return 1;
      case '6H': return 6;
      case '24H': return 24;
      case '7D': return 168;
      case '30D': return 720;
      default: return 168;
    }
  }, [timeRange]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return filterAlerts(state.alerts, {
      severity: severityFilter,
      status: statusFilter,
      nodeId: nodeFilter,
      hoursBack,
    });
  }, [state.alerts, severityFilter, statusFilter, nodeFilter, hoursBack]);

  // Counts for KPI cards
  const l3Count = state.alerts.filter(a => a.severity === 'L3' && a.status === 'ACTIVE').length;
  const l2Count = state.alerts.filter(a => a.severity === 'L2' && a.status === 'ACTIVE').length;
  const l1Count = state.alerts.filter(a => a.severity === 'L1' && a.status === 'ACTIVE').length;
  const resolvedCount = state.alerts.filter(a => a.status === 'RESOLVED').length;

  return (
    <div style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Safety Alerts & Threshold Management</h1>
          <p className="text-xs text-muted">
            Real-time subsidence anomaly detection, threshold infractions, and safety response lifecycle
          </p>
        </div>
      </div>

      {/* Summary KPI Cards (Spec §33) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--sp-md)',
      }}>
        <MetricCard
          label="L3 Critical (Active)"
          value={l3Count}
          color="var(--critical)"
          trend="All 5 indicators abnormal"
          onClick={() => { setSeverityFilter('L3'); setStatusFilter('ACTIVE'); }}
        />
        <MetricCard
          label="L2 Warning (Active)"
          value={l2Count}
          color="var(--warning)"
          trend="3-4 indicators abnormal"
          onClick={() => { setSeverityFilter('L2'); setStatusFilter('ACTIVE'); }}
        />
        <MetricCard
          label="L1 Watch (Active)"
          value={l1Count}
          color="#A16207"
          trend="1-2 indicators abnormal"
          onClick={() => { setSeverityFilter('L1'); setStatusFilter('ACTIVE'); }}
        />
        <MetricCard
          label="Resolved Alerts"
          value={resolvedCount}
          color="var(--success)"
          trend="Safety cleared"
          onClick={() => { setStatusFilter('RESOLVED'); setSeverityFilter('ALL'); }}
        />
      </div>

      {/* Filter Toolbar (Spec §34) */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="flex items-center justify-between flex-wrap gap-md">
          <div className="flex items-center gap-sm flex-wrap">
            <span className="text-xs text-muted flex items-center gap-xs">
              <Filter size={13} /> Filters:
            </span>

            {/* Severity Filter */}
            <select
              className="form-input"
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as any)}
            >
              <option value="ALL">All Severities</option>
              <option value="L3">L3 Critical</option>
              <option value="L2">L2 Warning</option>
              <option value="L1">L1 Watch</option>
            </select>

            {/* Status Filter */}
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            {/* Node Filter */}
            <NodeSelector
              selected={nodeFilter}
              onChange={setNodeFilter}
              nodes={state.nodes}
            />
          </div>

          <div className="flex items-center gap-sm">
            <span className="text-xs text-muted">Time Horizon:</span>
            <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
          </div>
        </div>
      </div>

      {/* Main Alert Data Table (Spec §33, 35) */}
      <AlertTable
        alerts={filteredAlerts}
        onAcknowledge={acknowledgeAlert}
        onResolve={resolveAlert}
      />

      {/* Location-Specific Threshold Configuration Section (Spec §36) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title flex items-center gap-xs">
            <Sliders size={16} color="var(--primary)" />
            <span>Location-Specific Sensor Threshold Configurations</span>
          </div>
          <span className="badge badge-ai">CALIBRATED LOCALLY</span>
        </div>

        <p className="text-xs text-muted" style={{ marginBottom: 16 }}>
          Thresholds vary by node location based on surface topography, underlying geological stratum depth,
          and proximity to active coal extraction workings.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-md)' }}>
          {state.nodes.map(node => (
            <div
              key={node.id}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                padding: '14px',
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: '0.9375rem' }}>Node {node.id}</span>
                <span className="text-xs text-muted">ESP32 &bull; ({node.latitude.toFixed(4)}, {node.longitude.toFixed(4)})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8125rem' }}>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">1. Tilt Threshold:</span>
                  <strong>{node.thresholds.tilt.toFixed(2)}°</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">2. Displacement Threshold:</span>
                  <strong>{node.thresholds.displacement} mm</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">3. Vibration Threshold:</span>
                  <strong>{node.thresholds.vibration}%</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">4. Crack Sensor:</span>
                  <strong>On Detection</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">5. Relative Movement:</span>
                  <strong>{node.thresholds.relativeMovement} mm</strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={14} color="var(--text-muted)" />
          <span>Notice: These threshold examples are for prototype testing and should be configured to site-specific geotechnical specifications in production.</span>
        </div>
      </div>
    </div>
  );
}
