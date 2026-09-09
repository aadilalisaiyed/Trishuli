// ============================================================
// MineSafe AI — Server & Infrastructure Status (Screen 4)
// ============================================================

import { Wifi, Clock, Battery, Radio } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/common';
import { formatDistanceToNowStrict } from 'date-fns';
import { fetchESP8266Readings, type ESP8266Reading } from '../services/esp8266Service';
import { api } from '../services/api';

export function ServerStatusPage() {
  const { state } = useApp();
  const [telemetry, setTelemetry] = useState<ESP8266Reading[]>([]);
  const [systemHealth, setSystemHealth] = useState<Array<{ name: string; status: string; latency_ms?: number | null }>>([]);

  useEffect(() => {
    Promise.all([
      fetchESP8266Readings(),
      api.get('/system/health').then(response => response.data),
    ]).then(([readings, health]) => {
      setTelemetry(readings);
      setSystemHealth(health);
    }).catch(() => {
      setTelemetry([]);
      setSystemHealth([]);
    });
  }, []);

  const averageLatency = useMemo(() => {
    if (!telemetry.length) return null;
    return telemetry.reduce((sum, reading) => sum + reading.latency_ms, 0) / telemetry.length;
  }, [telemetry]);

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
        <span className="badge badge-ai">MEASURED BACKEND STATUS</span>
      </div>

      <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div className="card-title flex items-center gap-xs"><Radio size={16} color="var(--primary)" /> Live Pi telemetry</div>
        <div className="flex items-center gap-lg flex-wrap text-sm" style={{ marginTop: 10 }}>
          <span>Devices reporting: <strong>{telemetry.length}</strong></span>
          <span>Measured Pi inference latency: <strong>{averageLatency === null ? '—' : `${averageLatency.toFixed(1)} ms`}</strong></span>
          <span>Source: <strong>GET /api/v1/esp8266/latest</strong></span>
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 8 }}>Values below are measured from persisted telemetry and backend health checks.</p>
      </div>

      {/* System Infrastructure Health Grid (Spec §41) */}
      <div>
        <div className="card-title" style={{ marginBottom: 10 }}>
          Core Infrastructure Subsystems
        </div>
          <div className="card" style={{ background: 'var(--bg)' }}>
          <div className="text-sm" style={{ display: 'grid', gap: 8 }}>
            {systemHealth.map(service => <div key={service.name} className="flex items-center justify-between gap-md"><span>{service.name}</span><span className="text-xs text-muted">{service.status}{service.latency_ms != null ? ` · ${service.latency_ms.toFixed(2)} ms` : ''}</span></div>)}
          </div>
          {!systemHealth.length && <div className="text-xs text-muted">Backend health data unavailable.</div>}
        </div>
      </div>

      {/* Node Connectivity Table (Spec §40, 72) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title flex items-center gap-xs">
            <Wifi size={16} color="var(--primary)" />
            <span>ESP32 Physical Nodes Telemetry & Wireless Link Quality</span>
          </div>
          <span className="text-xs text-muted">{state.nodes.filter(node => node.status === 'Online').length} / {state.nodes.length} backend nodes online</span>
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
