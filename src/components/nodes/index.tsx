// ============================================================
// MineSafe AI — Node Domain Components
// ============================================================

import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, Battery, Wifi } from 'lucide-react';
import type { NodeData, SensorStatus, NodeThresholds, SensorReadings } from '../../types';
import { RiskBadge, StatusBadge } from '../common';

// --- Node Card (Compact Summary) ---
export function NodeCard({
  node,
  isSelected,
  onClick,
}: {
  node: NodeData;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const isL3 = node.riskLevel === 'L3';

  return (
    <div
      className={`card ${isL3 ? 'pulse-critical' : ''}`}
      style={{
        cursor: 'pointer',
        borderColor: isSelected ? 'var(--primary)' : undefined,
        background: isSelected ? 'var(--card-hover)' : 'var(--card)',
        transition: 'all 0.15s ease',
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-sm">
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{node.id}</span>
          <span className="text-xs text-muted">Node {node.id}</span>
        </div>
        <RiskBadge level={node.riskLevel} />
      </div>

      <div className="flex items-center justify-between" style={{
        background: 'var(--bg)',
        padding: '6px 8px',
        borderRadius: 'var(--r-md)',
        marginBottom: 8,
      }}>
        <div className="flex items-center gap-xs">
          <Sparkles size={13} color="var(--ai)" />
          <span className="text-xs" style={{ fontWeight: 600, color: 'var(--ai)' }}>
            AI Risk: {node.riskScore}%
          </span>
        </div>
        <span className="text-xs text-muted">
          Pred: {node.predictedDeformation > 0 ? `+${node.predictedDeformation}` : node.predictedDeformation} mm
        </span>
      </div>

      {/* 5 Indicators Quick Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 8 }}>
        <IndicatorMiniDot label="Tilt" abnormal={node.sensorStatus.tilt} />
        <IndicatorMiniDot label="Disp" abnormal={node.sensorStatus.displacement} />
        <IndicatorMiniDot label="Vib" abnormal={node.sensorStatus.vibration} />
        <IndicatorMiniDot label="Crk" abnormal={node.sensorStatus.crack} />
        <IndicatorMiniDot label="Rel" abnormal={node.sensorStatus.relativeMovement} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted" style={{ paddingTop: 6, borderTop: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-sm">
          <span className="flex items-center gap-xs"><Wifi size={12} /> {node.wifiSignal} dBm</span>
          <span className="flex items-center gap-xs"><Battery size={12} /> {node.battery.toFixed(0)}%</span>
        </div>
        <button
          className="btn-icon text-xs flex items-center gap-xs"
          style={{ color: 'var(--primary)', padding: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/detail/${node.id}`);
          }}
        >
          Detail <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function IndicatorMiniDot({ label, abnormal }: { label: string; abnormal: boolean }) {
  return (
    <div style={{
      textAlign: 'center',
      background: abnormal ? 'var(--critical-bg)' : 'var(--success-bg)',
      color: abnormal ? 'var(--critical)' : 'var(--success)',
      borderRadius: 'var(--r-sm)',
      padding: '2px 0',
      fontSize: '0.625rem',
      fontWeight: 600,
    }}>
      {label}
    </div>
  );
}

// --- Sensor Status Grid (5-Indicator Grid for Node Detail) ---
export function SensorStatusGrid({
  readings,
  thresholds,
  status,
}: {
  readings: SensorReadings;
  thresholds: NodeThresholds;
  status: SensorStatus;
}) {
  const indicators = [
    {
      name: 'Tilt (MPU6050)',
      value: `${readings.tilt.toFixed(2)}°`,
      threshold: `${thresholds.tilt.toFixed(2)}°`,
      abnormal: status.tilt,
      desc: 'Ground inclination & angular deviation',
    },
    {
      name: 'Displacement (ToF)',
      value: `${readings.displacement.toFixed(1)} mm`,
      threshold: `${thresholds.displacement.toFixed(1)} mm`,
      abnormal: status.displacement,
      desc: 'Vertical ground displacement/distance',
    },
    {
      name: 'Vibration Sensor',
      value: `${readings.vibration.toFixed(0)}%`,
      threshold: `${thresholds.vibration.toFixed(0)}%`,
      abnormal: status.vibration,
      desc: 'Ground micro-seismic vibration',
    },
    {
      name: 'Crack Sensor',
      value: readings.crackDetected ? 'DETECTED' : 'None',
      threshold: 'On Detection',
      abnormal: status.crack,
      desc: 'Surface tensile fracture presence',
    },
    {
      name: 'Relative Movement',
      value: `${readings.relativeMovement.toFixed(1)} mm`,
      threshold: `${thresholds.relativeMovement.toFixed(1)} mm`,
      abnormal: status.relativeMovement,
      desc: 'Derived differential spatial movement',
    },
  ];

  const abnormalCount = Object.values(status).filter(Boolean).length;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">5 Monitored Indicators Status</div>
        <span className="text-xs" style={{ fontWeight: 600, color: abnormalCount === 5 ? 'var(--critical)' : abnormalCount >= 3 ? 'var(--warning)' : 'var(--text-secondary)' }}>
          {abnormalCount} / 5 Abnormal
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {indicators.map((ind, idx) => (
          <div
            key={idx}
            style={{
              background: ind.abnormal ? 'var(--critical-bg)' : 'var(--card)',
              border: `1px solid ${ind.abnormal ? 'var(--critical-light)' : 'var(--border)'}`,
              borderLeft: `4px solid ${ind.abnormal ? 'var(--critical)' : 'var(--success)'}`,
              borderRadius: 'var(--r-md)',
              padding: '10px 12px',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{ind.name}</span>
              <span className={`badge ${ind.abnormal ? 'badge-L3' : 'badge-L0'}`}>
                {ind.abnormal ? 'ABNORMAL' : 'NORMAL'}
              </span>
            </div>
            <div className="metric-value-sm" style={{ color: ind.abnormal ? 'var(--critical)' : 'var(--text-primary)', marginBottom: 2 }}>
              {ind.value}
            </div>
            <div className="text-xs text-muted">Local Threshold: {ind.threshold}</div>
            <div className="text-xs text-muted" style={{ marginTop: 4, fontSize: '0.6875rem' }}>{ind.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Node Data Table ---
export function NodeTable({ nodes }: { nodes: NodeData[] }) {
  const navigate = useNavigate();

  return (
    <div className="card overflow-auto" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Node</th>
            <th>Risk Level</th>
            <th>AI Risk Score</th>
            <th>Tilt</th>
            <th>Displacement</th>
            <th>Vibration</th>
            <th>Crack</th>
            <th>Relative Mvt</th>
            <th>Predicted Def</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map(node => (
            <tr key={node.id}>
              <td>
                <div style={{ fontWeight: 700 }}>{node.id}</div>
                <div className="text-xs text-muted">ESP32</div>
              </td>
              <td><RiskBadge level={node.riskLevel} /></td>
              <td>
                <div className="flex items-center gap-xs">
                  <Sparkles size={12} color="var(--ai)" />
                  <span style={{ fontWeight: 700, color: 'var(--ai)' }}>{node.riskScore}%</span>
                </div>
              </td>
              <td style={{ color: node.sensorStatus.tilt ? 'var(--critical)' : undefined, fontWeight: node.sensorStatus.tilt ? 700 : 400 }}>
                {node.readings.tilt.toFixed(2)}°
              </td>
              <td style={{ color: node.sensorStatus.displacement ? 'var(--critical)' : undefined, fontWeight: node.sensorStatus.displacement ? 700 : 400 }}>
                {node.readings.displacement.toFixed(1)} mm
              </td>
              <td style={{ color: node.sensorStatus.vibration ? 'var(--critical)' : undefined, fontWeight: node.sensorStatus.vibration ? 700 : 400 }}>
                {node.readings.vibration.toFixed(0)}%
              </td>
              <td>
                <span className={`badge ${node.sensorStatus.crack ? 'badge-L3' : 'badge-L0'}`}>
                  {node.readings.crackDetected ? 'DETECTED' : 'None'}
                </span>
              </td>
              <td style={{ color: node.sensorStatus.relativeMovement ? 'var(--critical)' : undefined, fontWeight: node.sensorStatus.relativeMovement ? 700 : 400 }}>
                {node.readings.relativeMovement.toFixed(1)} mm
              </td>
              <td style={{ fontWeight: 600, color: 'var(--ai)' }}>
                {node.predictedDeformation > 0 ? `+${node.predictedDeformation}` : node.predictedDeformation} mm
              </td>
              <td><StatusBadge status={node.status} variant={node.status === 'Online' ? 'success' : 'critical'} /></td>
              <td>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/detail/${node.id}`)}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
