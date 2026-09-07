import { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Radio, XCircle } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { fetchESP8266Readings, type ESP8266Reading } from '../services/esp8266Service';

const riskColors: Record<string, string> = {
  normal: 'var(--success)',
  watch: 'var(--watch)',
  warning: '#f97316',
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

function Value({ label, value, unit = '', muted = false, warning = false }: { label: string; value: string | number; unit?: string; muted?: boolean; warning?: boolean }) {
  return (
    <div>
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
    <span className="flex items-center gap-xs text-xs" style={{ color: isGood ? 'var(--success)' : 'var(--critical)' }}>
      {isGood ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {label}: {value ? 'Yes' : 'No'}
    </span>
  );
}

export function ESP8266LivePage() {
  const [readings, setReadings] = useState<ESP8266Reading[]>([]);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const deviceTiming = useRef<Record<string, DeviceTiming>>({});
  const [, refreshCadence] = useState(0);

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
          refreshCadence(value => value + 1);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      }
    };

    loadReadings();
    const timer = window.setInterval(loadReadings, 1000);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.clearInterval(clock);
    };
  }, []);

  const latestReceivedAt = readings.reduce<Date | null>((latest, reading) => {
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
  const riskCounts = liveReadings.reduce<Record<string, number>>((counts, reading) => {
    const key = riskKey(reading.risk);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const activeEscalations = liveReadings.filter(reading => ['warning', 'critical'].includes(riskKey(reading.risk).toLowerCase()));

  return (
    <div style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>ESP8266 Live Telemetry</h1>
          <p className="text-xs text-muted">ML assessments received through the Raspberry Pi gateway</p>
        </div>
        <div className="flex items-center gap-md">
          <span className="text-xs text-muted">Last data received: {latestReceivedAt ? formatDistanceToNowStrict(latestReceivedAt, { addSuffix: true }) : '—'}</span>
          <span className="badge badge-ai"><Radio size={13} /> LIVE POLL</span>
        </div>
      </div>

      {error && <div className="card text-sm" style={{ color: 'var(--critical)' }}>Telemetry endpoint unavailable. Retrying...</div>}

      {activeEscalations.length > 0 && (
        <div style={{ background: 'var(--critical)', color: 'white', padding: '12px 16px', borderRadius: 'var(--r-md)', fontWeight: 700 }}>
          Alert: {activeEscalations.length} live node{activeEscalations.length !== 1 ? 's' : ''} reporting {activeEscalations.map(reading => reading.risk.toUpperCase()).join(' and ')}: {activeEscalations.map(reading => reading.device).join(', ')}
        </div>
      )}

      {readings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Activity size={24} color="var(--text-muted)" />
          <div className="text-sm text-muted" style={{ marginTop: 10 }}>Waiting for the first ESP8266 sample...</div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '12px 16px' }}>
            <div className="flex items-center justify-between flex-wrap gap-md">
              <strong>{readings.length} node{readings.length !== 1 ? 's' : ''} received</strong>
              <div className="flex items-center gap-md flex-wrap text-xs">
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>Live: {liveReadings.length}</span>
                {staleCount > 0 && <span style={{ color: 'var(--warning)', fontWeight: 700 }}>Stale: {staleCount}</span>}
                {offlineCount > 0 && <span style={{ color: 'var(--critical)', fontWeight: 700 }}>Offline: {offlineCount}</span>}
                {(['normal', 'watch', 'warning', 'critical'] as const).map(risk => (
                  <span key={risk} className="flex items-center gap-xs" style={{ color: riskColors[risk] }}>
                    <span className="status-dot" style={{ background: riskColors[risk] }} />
                    {riskCounts[risk] || 0} {risk[0].toUpperCase() + risk.slice(1)}
                  </span>
                ))}
                <span className="text-muted">{(riskCounts.SENSOR_FAULT || 0) + (riskCounts.UNCERTAIN || 0)} Fault/Uncertain</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--sp-lg)' }}>
          {sortedReadings.map(reading => (
            (() => {
              const receivedAt = new Date(reading.received_at);
              const nodeState = getNodeState(reading);
              const stale = nodeState !== 'LIVE';
              const offline = nodeState === 'OFFLINE';
              const intervalMs = getReportingInterval(reading.device);
              const intervalSeconds = intervalMs === null ? null : intervalMs / 1000;
              const limitedSensors = reading.tilt_deg === undefined && reading.accel_rms === undefined && reading.load_delta_kg === undefined && reading.moisture === undefined;
              const legacyTestNode = /^n\d+$/i.test(reading.device);
              const latencyWarning = reading.latency_ms > 100;
              const color = riskColors[riskKey(reading.risk)] || 'var(--text-muted)';
              return <div className="card" key={reading.device} style={{ opacity: stale ? 0.64 : 1, filter: stale ? 'grayscale(0.85)' : undefined, borderTop: `3px solid ${offline ? 'var(--critical)' : stale ? 'var(--warning)' : color}` }}>
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
                {intervalSeconds === null ? 'Learning reporting cadence...' : `Detected cadence: ~${intervalSeconds.toFixed(1)}s`}
              </div>
              {latencyWarning && <div className="text-xs" style={{ color: 'var(--warning)', marginTop: 10 }}><AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Inference exceeds 100 ms</div>}
            </div>;
            })()
          ))}
          </div>
        </>
      )}
    </div>
  );
}