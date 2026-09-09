import { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Radio, XCircle, Plus, X } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { fetchESP8266Readings, fetchESP8266History, fetchESP8266Devices, addNode, type ESP8266Reading, type ESP8266DeviceSummary } from '../services/esp8266Service';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Area,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const riskColors: Record<string, string> = {
  normal: 'var(--success)',
  watch: '#2563eb',
  warning: '#f59e0b',
  critical: 'var(--critical)',
  SENSOR_FAULT: 'var(--text-muted)',
  UNCERTAIN: '#64748b',
};
const severityOrder: Record<string, number> = {
  critical: 5,
  warning: 4,
  watch: 3,
  uncertain: 2,
  sensor_fault: 2,
  normal: 1,
};

type DeviceTiming = {
  lastReceivedMs: number;
  intervalsMs: number[];
};

function riskKey(risk: string) {
  return risk.toLowerCase() === 'sensor_fault' ? 'SENSOR_FAULT' : risk.toLowerCase();
}

function roundChartValue(value: number) {
  return Math.round(value * 100) / 100;
}

function formatChartTooltip(value: unknown, name: unknown): [string, string] {
  return [typeof value === 'number' ? value.toFixed(2) : String(value ?? ''), String(name ?? '')];
}

function Value({ label, value, unit = '', muted = false, warning = false }: { label: string; value: string | number; unit?: string; muted?: boolean; warning?: boolean }) {
  return (
    <div className="nodes-metric">
      <div className="text-xs text-muted">{label}</div>
      <div style={{ fontSize: muted ? '0.875rem' : '1.2rem', fontWeight: muted ? 400 : 700, color: warning ? 'var(--warning)' : muted ? 'var(--text-muted)' : undefined, marginTop: 4 }}>
        {value} <span className="text-xs text-muted">{unit}</span>
      </div>
    </div>
  );
}

function BooleanStatus({ label, value, positiveIsGood }: { label: string; value: boolean; positiveIsGood: boolean }) {
  const isGood = value === positiveIsGood;
  return (
    <span className="nodes-boolean flex items-center gap-xs text-xs" style={{ color: isGood ? 'var(--success)' : 'var(--critical)' }}>
      {isGood ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {label}: {value ? 'Yes' : 'No'}
    </span>
  );
}

// --- Add Node Modal ---
function AddNodeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (nodeId: string) => void }) {
  const [nodeId, setNodeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeId.trim()) {
      setError('Please enter a Node ID.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(nodeId.trim());
      onClose();
    } catch {
      setError('Failed to add node. Check your connection.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}
      onClick={onClose}
    >
      <div
        className="card animate-fade-in"
        style={{ width: 400, maxWidth: '90vw', padding: 'var(--sp-xl)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-lg)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Add New Node</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
          <div className="form-group">
            <label className="form-label">Node ID</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%' }}
              value={nodeId}
              onChange={e => setNodeId(e.target.value)}
              placeholder="e.g. ESP_001 or sensor-node-5"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="text-xs" style={{ color: 'var(--critical)' }}>{error}</div>
          )}

          <div className="flex items-center gap-sm" style={{ justifyContent: 'flex-end', marginTop: 'var(--sp-sm)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ESP8266LivePage() {
  const [readings, setReadings] = useState<ESP8266Reading[]>([]);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const deviceTiming = useRef<Record<string, DeviceTiming>>({});
  const [, refreshCadence] = useState(0);
  const [showAddNode, setShowAddNode] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [chartHistory, setChartHistory] = useState<ESP8266Reading[]>([]);
  const [deviceCatalog, setDeviceCatalog] = useState<ESP8266DeviceSummary[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadReadings = async () => {
      try {
        const nextReadings = await fetchESP8266Readings();
        if (mounted) {
          nextReadings.forEach(reading => {
            const receivedMs = new Date(reading.received_at).getTime();
            const timing = deviceTiming.current[reading.device];
            if (!timing) {
              deviceTiming.current[reading.device] = { lastReceivedMs: receivedMs, intervalsMs: [] };
            } else if (receivedMs > timing.lastReceivedMs) {
              const intervalMs = receivedMs - timing.lastReceivedMs;
              timing.intervalsMs = [...timing.intervalsMs, intervalMs].slice(-5);
              timing.lastReceivedMs = receivedMs;
            }
          });
          setReadings(nextReadings);
          setSelectedDevice(current => current || nextReadings[0]?.device || '');
          refreshCadence(value => value + 1);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      }
    };

    loadReadings();
    fetchESP8266Devices().then(devices => {
      setDeviceCatalog(devices);
      setSelectedDevice(current => current || devices[0]?.device || '');
    }).catch(() => undefined);
    const timer = window.setInterval(loadReadings, 1000);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;
    let mounted = true;
    const loadHistory = async () => {
      try {
        const history = await fetchESP8266History(selectedDevice);
        if (mounted) setChartHistory(history);
      } catch {
        if (mounted) setChartHistory([]);
      }
    };
    loadHistory();
    const timer = window.setInterval(loadHistory, 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [selectedDevice]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchESP8266Devices().then(setDeviceCatalog).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const latestReceivedAt = [...readings, ...chartHistory].reduce<Date | null>((latest, reading) => {
    const receivedAt = new Date(reading.received_at);
    return !latest || receivedAt > latest ? receivedAt : latest;
  }, null);
  const getReportingInterval = (device: string) => {
    const intervals = deviceTiming.current[device]?.intervalsMs || [];
    if (intervals.length === 0) return null;
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  };
  const getNodeState = (reading: ESP8266Reading) => {
    const ageMs = Math.max(0, now.getTime() - new Date(reading.received_at).getTime());
    const intervalMs = getReportingInterval(reading.device);
    // Keep a node live while learning its cadence from the first two updates.
    if (intervalMs === null) return 'LIVE' as const;
    if (ageMs > intervalMs * 10) return 'OFFLINE' as const;
    if (ageMs > intervalMs * 3) return 'STALE' as const;
    return 'LIVE' as const;
  };
  const sortedReadings = [...readings].sort((a, b) => {
    const stateDifference = (getNodeState(b) === 'LIVE' ? 1 : 0) - (getNodeState(a) === 'LIVE' ? 1 : 0);
    if (stateDifference) return stateDifference;
    return (severityOrder[riskKey(b.risk).toLowerCase()] || 0) - (severityOrder[riskKey(a.risk).toLowerCase()] || 0);
  });
  const liveReadings = readings.filter(reading => getNodeState(reading) === 'LIVE');
  const staleCount = readings.filter(reading => getNodeState(reading) === 'STALE').length;
  const offlineCount = readings.filter(reading => getNodeState(reading) === 'OFFLINE').length;
  const allRiskCounts = readings.reduce<Record<string, number>>((counts, reading) => {
    const key = riskKey(reading.risk);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const activeEscalations = liveReadings.filter(reading => ['warning', 'critical'].includes(riskKey(reading.risk).toLowerCase()));
  const selectedReading = readings.find(reading => reading.device === selectedDevice) || chartHistory[chartHistory.length - 1] || readings[0];
  const chartData = chartHistory.map((reading, index) => ({
    sample: index + 1,
    time: format(new Date(reading.received_at), 'HH:mm:ss'),
    confidence: roundChartValue(reading.confidence * 100),
    latency: roundChartValue(reading.latency_ms),
    tilt: roundChartValue(reading.base_features?.tilt_deg ?? reading.tilt_deg ?? 0),
    tiltMean: roundChartValue(reading.rolling_features?.tilt_deg_roll_mean ?? reading.tilt_deg ?? 0),
    tiltStd: roundChartValue(reading.rolling_features?.tilt_deg_roll_std ?? 0),
    tiltLower: roundChartValue(Math.max(0, (reading.rolling_features?.tilt_deg_roll_mean ?? reading.tilt_deg ?? 0) - (reading.rolling_features?.tilt_deg_roll_std ?? 0))),
    tiltBand: roundChartValue((reading.rolling_features?.tilt_deg_roll_std ?? 0) * 2),
    anomalyTilt: reading.is_anomaly ? roundChartValue(reading.base_features?.tilt_deg ?? reading.tilt_deg ?? 0) : null,
  }));
  const riskChartColors: Record<string, string> = { normal: '#16a34a', watch: '#2563eb', warning: '#f59e0b', critical: '#dc2626', uncertain: '#64748b', sensor_fault: '#94a3b8' };
  const riskBarData = [{
    name: 'Recent assessments',
    normal: allRiskCounts.normal || 0,
    watch: allRiskCounts.watch || 0,
    warning: allRiskCounts.warning || 0,
    critical: allRiskCounts.critical || 0,
    uncertain: allRiskCounts.uncertain || 0,
  }];
  const probabilityBars = Object.entries(selectedReading?.class_probabilities || {}).map(([name, value]) => ({ name, value: value * 100 }));
  const transitions = chartHistory.reduce<Array<{ from: string; to: string; timestamp: string }>>((items, reading, index) => {
    const previous = chartHistory[index - 1];
    if (previous && previous.risk !== reading.risk) {
      items.push({ from: previous.risk, to: reading.risk, timestamp: reading.received_at });
    }
    return items;
  }, []);
  const internals = selectedReading?.model_internals || {};
  const violations = selectedReading?.plausibility_violations || [];
  const operatorReason = selectedReading?.is_anomaly
    ? 'The anomaly detector found this sample outside the learned normal pattern.'
    : selectedReading?.risk === 'normal'
      ? 'All available indicators are within the model\'s normal operating pattern.'
      : 'The classifier detected an elevated risk pattern in the incoming sensor data.';
  const internalEntries = [
    ['Classifier', internals.classifier],
    ['Estimators', internals.n_estimators],
    ['Max depth', internals.max_depth],
    ['Features', internals.feature_count],
    ['Anomaly model', internals.anomaly_model],
    ['Anomaly estimators', internals.anomaly_estimators],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');

  const handleAddNode = async (nodeId: string) => {
    await addNode(nodeId);
  };

  return (
    <div className="nodes-data-page" style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      <div className="nodes-data-header flex items-center justify-between flex-wrap gap-md">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Nodes Data</h1>
          <p className="text-xs text-muted">ML assessments received through the Raspberry Pi gateway</p>
        </div>
        <div className="flex items-center gap-md">
          <span className="text-xs text-muted">Last data received: {latestReceivedAt ? latestReceivedAt.toLocaleString() : 'Waiting for telemetry'}</span>
          <span className="nodes-live-pill"><span className="nodes-live-dot" /> <Radio size={13} /> POLLING EVERY 1S</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddNode(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} />
            Add Node
          </button>
        </div>
      </div>

      {error && <div className="card text-sm" style={{ color: 'var(--critical)' }}>Telemetry endpoint unavailable. Retrying...</div>}

      {activeEscalations.length > 0 && (
        <div style={{ background: 'var(--critical)', color: 'white', padding: '12px 16px', borderRadius: 'var(--r-md)', fontWeight: 700 }}>
          Alert: {activeEscalations.length} live node{activeEscalations.length !== 1 ? 's' : ''} reporting {activeEscalations.map(reading => reading.risk.toUpperCase()).join(' and ')}: {activeEscalations.map(reading => reading.device).join(', ')}
        </div>
      )}

      {selectedReading && (
        <section className="card nodes-monitor-card" style={{ padding: 'var(--sp-lg)' }}>
          <div className="flex items-center justify-between flex-wrap gap-md" style={{ marginBottom: 'var(--sp-lg)' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Live ML Monitoring</h2>
              <p className="text-xs text-muted">Persisted assessments for the selected device, refreshed every second</p>
              <p className="text-xs" style={{ color: selectedReading.data_source === 'LIVE HARDWARE' ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>{selectedReading.data_source || 'SOURCE UNKNOWN'}</p>
            </div>
            <select className="form-input" value={selectedDevice} onChange={event => setSelectedDevice(event.target.value)} style={{ width: 260 }}>
              {deviceCatalog.map(device => <option key={device.device} value={device.device}>{device.device} ({device.samples} stored)</option>)}
            </select>
          </div>
          <div className="nodes-chart-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-lg)' }}>
            <div className="nodes-chart-card">
              <div className="text-xs text-muted">Confidence (%)</div>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#eef1f5" strokeOpacity={0.8} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis yAxisId="confidence" domain={[0, 100]} tickFormatter={value => `${value}%`} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={formatChartTooltip} />
                  <defs><linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs>
                  <Area yAxisId="confidence" type="monotone" dataKey="confidence" stroke="none" fill="url(#confidenceFill)" />
                  <Line yAxisId="confidence" type="monotone" dataKey="confidence" stroke="#2563eb" dot={{ r: 3, strokeWidth: 2 }} strokeWidth={2.5} name="Confidence (%)" />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-xs" style={{ color: '#2563eb', marginTop: 4 }}>● Actual classifier confidence</div>
              <div className="text-xs text-muted" style={{ marginTop: 8 }}>Inference latency (ms)</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#eef1f5" strokeOpacity={0.8} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={formatChartTooltip} />
                  <defs><linearGradient id="latencyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.18} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
                  <Area type="monotone" dataKey="latency" stroke="none" fill="url(#latencyFill)" />
                  <Line type="monotone" dataKey="latency" stroke="#f97316" dot={{ r: 3, strokeWidth: 2 }} strokeWidth={2.5} name="Inference latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-xs" style={{ color: '#f97316', marginTop: 4 }}>● Backend model inference time</div>
            </div>
            <div className="nodes-chart-card">
              <div className="text-xs text-muted">Risk distribution over recent samples</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={riskBarData} layout="vertical" stackOffset="sign">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip formatter={formatChartTooltip} />
                  <Bar dataKey="normal" stackId="risk" fill={riskChartColors.normal} name="Normal" />
                  <Bar dataKey="watch" stackId="risk" fill={riskChartColors.watch} name="Watch" />
                  <Bar dataKey="warning" stackId="risk" fill={riskChartColors.warning} name="Warning" />
                  <Bar dataKey="critical" stackId="risk" fill={riskChartColors.critical} name="Critical" />
                  <Bar dataKey="uncertain" stackId="risk" fill={riskChartColors.uncertain} name="Uncertain" />
                </BarChart>
              </ResponsiveContainer>
              <div className="text-xs flex items-center gap-sm flex-wrap" style={{ marginTop: 4 }}>{['normal', 'watch', 'warning', 'critical', 'uncertain'].map(name => <span key={name} style={{ color: riskChartColors[name] }}>● {name}: {allRiskCounts[name] || 0}</span>)}</div>
            </div>
            <div className="nodes-chart-card">
              <div className="text-xs text-muted">Sensor trend and anomaly flag</div>
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={chartData}>
                  <CartesianGrid stroke="#eef1f5" strokeOpacity={0.8} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis label={{ value: 'Degrees (°)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={formatChartTooltip} />
                  <Area dataKey="tiltLower" stackId="deviation" stroke="none" fill="transparent" name="Rolling mean lower bound" />
                  <Area dataKey="tiltBand" stackId="deviation" stroke="none" fill="#93c5fd" fillOpacity={0.35} name="Rolling std band" />
                  <Line type="linear" dataKey="tilt" stroke="#8b5cf6" dot={false} strokeWidth={1.5} name="Tilt (deg)" />
                  <Line type="linear" dataKey="tiltMean" stroke="#2563eb" dot={false} strokeWidth={2.5} name="Rolling mean (deg)" />
                  <Line type="linear" dataKey="anomalyTilt" stroke="transparent" dot={{ r: 4, fill: '#dc2626', stroke: '#dc2626' }} connectNulls={false} name="Anomaly flag" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="text-xs flex items-center gap-sm flex-wrap" style={{ marginTop: 4 }}><span style={{ color: '#8b5cf6' }}>● Tilt</span><span style={{ color: '#2563eb' }}>● Rolling mean</span><span style={{ color: '#60a5fa' }}>▰ Rolling std band</span><span style={{ color: '#dc2626' }}>● Anomaly</span></div>
            </div>
          </div>
          <div className="nodes-insight-card nodes-explanation-card" style={{ marginTop: 'var(--sp-lg)', padding: '12px 14px', background: 'var(--surface-muted)', borderRadius: 'var(--r-md)' }}>
            <div className="flex items-center justify-between gap-md flex-wrap">
              <strong>Why this result?</strong>
              <span className="nodes-metadata-badge">{selectedReading.model || 'risk_classifier_v3 + anomaly_model_v3'}</span>
            </div>
            <div className="text-sm" style={{ marginTop: 8 }}>
              <div style={{ marginTop: 4 }}>{operatorReason}</div>
            </div>
            <details className="nodes-debug-details" style={{ marginTop: 12 }}>
              <summary className="text-xs" style={{ cursor: 'pointer', fontWeight: 700 }}>Advanced / Debug</summary>
              <div className="text-xs" style={{ marginTop: 8, fontFamily: 'monospace' }}>
                <div><strong>Gate audit:</strong> {selectedReading.gate_trace || 'Not returned'}</div>
                <div style={{ marginTop: 4 }}>Violations: {violations.length ? violations.join(', ') : 'none'}</div>
                <div style={{ marginTop: 4 }}>Corroboration count: {selectedReading.corroboration_count ?? '—'}</div>
                <div style={{ marginTop: 4 }}>Decision branch: {selectedReading.gate_branch || 'Not returned'}</div>
                <div style={{ marginTop: 8 }}>Model internals: {internalEntries.map(([label, value]) => `${label}=${String(value)}`).join(' | ') || 'Unavailable'}</div>
              </div>
            </details>
          </div>
          <div className="nodes-lower-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-lg)', marginTop: 'var(--sp-lg)' }}>
            <div className="nodes-insight-card nodes-probability-card">
              <div className="text-xs text-muted">Full classifier probability vector</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {probabilityBars.map(({ name, value }) => <div key={name} className="nodes-probability-row">
                  <span className="nodes-probability-label">{name}</span>
                  <div className="nodes-probability-track"><div style={{ width: `${Math.min(100, value)}%`, background: riskChartColors[name] || '#2563eb' }} /></div>
                  <strong className="nodes-probability-value">{value.toFixed(2)}%</strong>
                </div>)}
              </div>
            </div>
          </div>
          <div className="nodes-insight-card nodes-transition-card" style={{ marginTop: 'var(--sp-lg)' }}>
            <div className="text-xs text-muted">Gated-risk transitions</div>
            {transitions.length === 0 ? <div className="text-xs text-muted" style={{ marginTop: 8 }}>No state transitions in retained history.</div> : <div className="text-xs" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>{transitions.map(transition => <div key={`${transition.timestamp}-${transition.to}`}><strong>{transition.from} → {transition.to}</strong> <span className="text-muted">{formatDistanceToNowStrict(new Date(transition.timestamp), { addSuffix: true })}</span></div>)}</div>}
          </div>
        </section>
      )}

      {deviceCatalog.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Activity size={24} color="var(--text-muted)" />
          <div className="text-sm text-muted" style={{ marginTop: 10 }}>Waiting for the first node sample...</div>
        </div>
      ) : (
        <>
          <div className="card nodes-summary-card" style={{ padding: '12px 16px' }}>
            <div className="flex items-center justify-between flex-wrap gap-md">
              <strong>{deviceCatalog.length} node{deviceCatalog.length !== 1 ? 's' : ''} stored</strong>
              <div className="flex items-center gap-md flex-wrap text-xs">
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>Live: {liveReadings.length}</span>
                {staleCount > 0 && <span style={{ color: 'var(--warning)', fontWeight: 700 }}>Stale: {staleCount}</span>}
                {offlineCount > 0 && <span style={{ color: 'var(--critical)', fontWeight: 700 }}>Offline: {offlineCount}</span>}
                {(['normal', 'watch', 'warning', 'critical'] as const).map(risk => (
                  <span key={risk} className="flex items-center gap-xs" style={{ color: riskColors[risk] }}>
                    <span className="status-dot" style={{ background: riskColors[risk] }} />
                    {allRiskCounts[risk] || 0} {risk[0].toUpperCase() + risk.slice(1)}
                  </span>
                ))}
                {(['SENSOR_FAULT', 'UNCERTAIN'] as const).map(risk => <span key={risk} className="flex items-center gap-xs" style={{ color: riskColors[risk] }}><span className="status-dot" style={{ background: riskColors[risk] }} />{allRiskCounts[riskKey(risk)] || 0} {risk === 'SENSOR_FAULT' ? 'Sensor Fault' : 'Uncertain'}</span>)}
              </div>
            </div>
          </div>
          <div className="nodes-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--sp-lg)' }}>
          {sortedReadings.map(reading => (
            (() => {
              const receivedAt = new Date(reading.received_at);
              const nodeState = getNodeState(reading);
              const stale = nodeState !== 'LIVE';
              const offline = nodeState === 'OFFLINE';
              const intervalMs = getReportingInterval(reading.device);
              const intervalSeconds = intervalMs === null ? null : intervalMs / 1000;
              const limitedSensors = reading.tilt_deg === undefined && reading.accel_rms === undefined && reading.load_delta_kg === undefined && reading.moisture === undefined;
              const legacyTestNode = reading.data_source !== 'LIVE HARDWARE' && /^n\d+$/i.test(reading.device);
              const latencyWarning = reading.latency_ms > 100;
              const color = riskColors[riskKey(reading.risk)] || 'var(--text-muted)';
              return <div className="card nodes-node-card" key={reading.device} style={{ opacity: stale ? 0.64 : 1, filter: stale ? 'grayscale(0.85)' : undefined, borderTop: `3px solid ${offline ? 'var(--critical)' : stale ? 'var(--warning)' : color}` }}>
              <div className="card-header">
                <div>
                  <div className="card-title flex items-center gap-xs">{reading.device} {legacyTestNode && <span className="badge">TEST</span>}</div>
                  <div className="text-xs text-muted">{limitedSensors ? 'Limited sensor set (ultrasonic + IR only)' : 'Full forwarded sensor set'}</div>
                </div>
                <span className="badge" style={{ color: stale ? 'var(--text-muted)' : color, borderColor: stale ? 'var(--text-muted)' : color }}>{offline ? 'OFFLINE: ' : stale ? 'LAST KNOWN: ' : 'Gated Risk: '}{reading.risk}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-md)' }}>
                <Value label="Raw prediction (pre-gate, for debugging)" value={reading.raw_prediction} muted />
                <Value label="Confidence" value={`${(reading.confidence * 100).toFixed(1)}%`} />
                <Value label="Inference latency" value={reading.latency_ms.toFixed(1)} unit="ms" warning={latencyWarning} />
                {reading.received_interval_ms != null && <Value label="ESP receive interval" value={(reading.received_interval_ms / 1000).toFixed(2)} unit="sec" />}
                <Value label="Tilt" value={reading.tilt_deg?.toFixed(3) ?? '—'} unit="deg" muted={reading.tilt_deg === undefined} />
                <Value label="Acceleration RMS" value={reading.accel_rms?.toFixed(3) ?? '—'} muted={reading.accel_rms === undefined} />
                <Value label="Load delta" value={reading.load_delta_kg?.toFixed(3) ?? '—'} unit="kg" muted={reading.load_delta_kg === undefined} />
                <Value label="Distance" value={reading.distance_cm?.toFixed(1) ?? '—'} unit="cm" muted={reading.distance_cm === undefined} />
                <Value label="Moisture" value={reading.moisture?.toFixed(3) ?? '—'} muted={reading.moisture === undefined} />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-sm" style={{ borderTop: '1px solid var(--border-light)', marginTop: 16, paddingTop: 12 }}>
                <div className="flex items-center gap-md flex-wrap">
                  <BooleanStatus label="Anomaly Detected" value={reading.is_anomaly} positiveIsGood={false} />
                  <BooleanStatus label="Crack Sensor Triggered" value={reading.ir_detected ?? false} positiveIsGood={false} />
                </div>
                <span className="flex items-center gap-xs text-xs" style={{ color: stale ? 'var(--critical)' : 'var(--text-muted)' }}>
                  {stale ? <AlertTriangle size={13} /> : <Activity size={13} />}
                  {offline ? `Offline (cadence ~${intervalSeconds?.toFixed(1)}s): ` : stale ? `Stale (cadence ~${intervalSeconds?.toFixed(1)}s): ` : 'Updated '}{formatDistanceToNowStrict(receivedAt, { addSuffix: true })}
                </span>
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 8 }}>
                {intervalSeconds === null ? 'Learning reporting cadence...' : `Browser cadence: ~${intervalSeconds.toFixed(1)}s`} {reading.samples_received ? `• ${reading.samples_received} samples received` : ''}
              </div>
              {latencyWarning && <div className="text-xs" style={{ color: 'var(--warning)', marginTop: 10 }}><AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Inference exceeds 100 ms</div>}
            </div>;
            })()
          ))}
          </div>
        </>
      )}

      {showAddNode && (
        <AddNodeModal
          onClose={() => setShowAddNode(false)}
          onSubmit={handleAddNode}
        />
      )}
    </div>
  );
}