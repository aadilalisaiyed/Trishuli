// ============================================================
// MineSafe AI — Server & Infrastructure Status (Screen 4)
// ============================================================

import {
  Database,
  Wifi,
  Cpu,
  Radio,
  Layers,
  Clock,
  Battery,
  Activity,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common';
import { formatDistanceToNowStrict } from 'date-fns';

export function ServerStatusPage() {
  const { state } = useApp();

  const services = [
    { name: 'Telemetry Data Ingestion', icon: <Radio size={18} color="var(--primary)" />, status: 'Healthy', latency: '12ms', uptime: '99.98%' },
    { name: 'Subsidence AI Inference Engine', icon: <Cpu size={18} color="var(--ai)" />, status: 'Healthy', latency: '45ms', uptime: '99.95%' },
    { name: 'Time-Series Geotechnical DB', icon: <Database size={18} color="var(--info)" />, status: 'Healthy', latency: '8ms', uptime: '99.99%' },
    { name: 'GIS & Satellite Map Tile Server', icon: <Layers size={18} color="var(--success)" />, status: 'Healthy', latency: '24ms', uptime: '99.90%' },
    { name: 'ESP32 Wi-Fi Gateway Interface', icon: <Wifi size={18} color="var(--warning)" />, status: 'Healthy', latency: '18ms', uptime: '99.85%' },
    { name: 'Early Warning Dispatch API', icon: <Activity size={18} color="var(--critical)" />, status: 'Healthy', latency: '15ms', uptime: '100.0%' },
  ];

  return (
    <div style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>System Health & Edge Infrastructure</h1>
          <p className="text-xs text-muted">
            Status of ESP32 surface sensor nodes, Wi-Fi telemetry pipelines, and AI computing layers
          </p>
        </div>
        <span className="badge badge-ai">FRONTEND SIMULATION ARCHITECTURE</span>
      </div>

      {/* System Infrastructure Health Grid (Spec §41) */}
      <div>
        <div className="card-title" style={{ marginBottom: 10 }}>
          Core Infrastructure Subsystems
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--sp-md)',
        }}>
          {services.map((svc, idx) => (
            <div key={idx} className="card" style={{ padding: '14px 16px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div className="flex items-center gap-sm">
                  {svc.icon}
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{svc.name}</span>
                </div>
                <span className="badge" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                  <span className="status-dot status-dot-success" />
                  {svc.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-light)' }}>
                <span>Latency: <strong>{svc.latency}</strong></span>
                <span>Uptime: <strong>{svc.uptime}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Node Connectivity Table (Spec §40, 72) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title flex items-center gap-xs">
            <Wifi size={16} color="var(--primary)" />
            <span>ESP32 Physical Nodes Telemetry & Wireless Link Quality</span>
          </div>
          <span className="text-xs text-muted">3 / 3 Nodes Connected</span>
        </div>

        <div className="overflow-auto" style={{ margin: '-8px -16px -16px -16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Hardware Status</th>
                <th>Last Heartbeat</th>
                <th>Wi-Fi Signal Strength</th>
                <th>Battery Level</th>
                <th>Packet Reception</th>
                <th>GPS Latitude</th>
                <th>GPS Longitude</th>
              </tr>
            </thead>
            <tbody>
              {state.nodes.map(node => (
                <tr key={node.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>Node {node.id}</div>
                    <div className="text-xs text-muted">ESP32 + MPU6050 + ToF</div>
                  </td>
                  <td>
                    <StatusBadge status={node.status} variant="success" />
                  </td>
                  <td className="text-xs text-muted">
                    <div className="flex items-center gap-xs">
                      <Clock size={12} />
                      <span>{formatDistanceToNowStrict(node.lastHeartbeat, { addSuffix: false })} ago</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-xs">
                      <Wifi size={14} color={node.wifiSignal > -60 ? 'var(--success)' : 'var(--warning)'} />
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{node.wifiSignal} dBm</strong>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-xs">
                      <Battery size={14} color={node.battery > 50 ? 'var(--success)' : 'var(--warning)'} />
                      <strong>{node.battery.toFixed(0)}%</strong>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--success)' }}>{node.packetReception}%</strong>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {node.latitude.toFixed(6)}°N
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {node.longitude.toFixed(6)}°E
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network Architecture Documentation Box */}
      <div className="card" style={{ background: 'var(--bg)' }}>
        <div className="card-title" style={{ marginBottom: 6 }}>
          Wireless Communication Topology
        </div>
        <p className="text-xs text-secondary" style={{ lineHeight: 1.6 }}>
          <strong>Current Prototype:</strong> N01, N02, and N03 connect via direct Wi-Fi transmission to the localized monitoring station.
          The software and data service layers are fully architected to support future scaling to 10, 50, and 100+ nodes,
          as well as eventual multi-hop Wireless Mesh Network topologies without UI restructuring.
        </p>
      </div>
    </div>
  );
}
