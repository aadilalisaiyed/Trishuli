// ============================================================
// MineSafe AI — Node Detail Page (Screen 6)
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Wifi,
  Clock,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RiskBadge, StatusBadge, SensorCard, TimeRangeSelector } from '../components/common';
import { SensorStatusGrid } from '../components/nodes';
import {
  ChartCard,
  TimeSeriesLineChart,
  PredictionChart,
  RiskScoreAreaChart,
} from '../components/charts';
import { AIExplanation, RecommendationCard } from '../components/ai';
import { fetchNodeHistoryApi, fetchNodeAIAssessmentApi } from '../services/nodesService';
import type { NodeHistory, AIRiskAssessment } from '../types';
import { generateNodeHistory } from '../data/historicalData';
import { getRiskPrediction, getRecommendedActions } from '../services/aiService';
import { formatDistanceToNowStrict } from 'date-fns';

export function NodeDetailPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const { state } = useApp();

  const [timeRange, setTimeRange] = useState<string>('24H');
  const [realHistory, setRealHistory] = useState<NodeHistory | null>(null);
  const [realAiAssessment, setRealAiAssessment] = useState<AIRiskAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Find target node from state
  const node = state.nodes.find(n => n.id === nodeId) || state.nodes[0];

  const hoursBack = useMemo(() => {
    switch (timeRange) {
      case '1H': return 1;
      case '6H': return 6;
      case '24H': return 24;
      case '7D': return 168;
      case '30D': return 720;
      default: return 24;
    }
  }, [timeRange]);

  // Fetch real node history & AI assessment on mount / node / timerange change
  useEffect(() => {
    if (!node?.id) return;
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [hist, ai] = await Promise.all([
          fetchNodeHistoryApi(node.id, 'all', 100),
          fetchNodeAIAssessmentApi(node.id),
        ]);
        if (isMounted) {
          setRealHistory(hist);
          setRealAiAssessment(ai);
        }
      } catch (err) {
        console.warn('[Node Detail API Fallback] Using client-side simulation:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [node?.id, timeRange]);

  // Fallback local history if API data is empty or loading
  const fallbackHistory = useMemo(() => {
    return generateNodeHistory(
      node?.id || 'N03',
      hoursBack,
      60,
      state.scenario.toLowerCase() as any
    );
  }, [node?.id, hoursBack, state.scenario]);

  const activeHistory = realHistory || fallbackHistory;
  const aiAssessment = realAiAssessment || getRiskPrediction(node);
  const recommendedActions = realAiAssessment?.recommendedActions || getRecommendedActions(node);

  if (!node) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h2>Node not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: 16 }}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={14} /> Back to Live Map
          </button>
          <span className="text-muted">/</span>
          <span className="text-sm font-semibold">Node {node.id} Deep Diagnostics</span>
          {loading && <RefreshCw size={14} className="animate-spin text-muted" />}
        </div>

        {/* Global Time Range Filter */}
        <div className="flex items-center gap-sm">
          <span className="text-xs text-muted">Analysis Horizon:</span>
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Node Header Banner */}
      <div className="card" style={{
        borderLeft: `5px solid ${node.riskLevel === 'L3' ? 'var(--critical)' : node.riskLevel === 'L2' ? 'var(--warning)' : node.riskLevel === 'L1' ? 'var(--watch)' : 'var(--success)'}`,
      }}>
        <div className="flex items-start justify-between flex-wrap gap-md">
          <div>
            <div className="flex items-center gap-sm" style={{ marginBottom: 6 }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Node {node.id}</h1>
              <RiskBadge level={node.riskLevel} size="lg" />
              <StatusBadge status={node.status} variant={node.status === 'Online' ? 'success' : 'critical'} />
            </div>
            <div className="flex items-center gap-md text-xs text-muted flex-wrap">
              <span className="flex items-center gap-xs">
                <MapPin size={13} color="var(--primary)" />
                Lat: <strong>{node.latitude.toFixed(6)}°N</strong>, Long: <strong>{node.longitude.toFixed(6)}°E</strong> (Prototype Site)
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-xs">
                <Clock size={13} />
                Heartbeat: {formatDistanceToNowStrict(node.lastHeartbeat, { addSuffix: true })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-lg">
            <div style={{ textAlign: 'right' }}>
              <div className="text-xs text-muted">AI Risk Probability</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ai)' }}>{node.riskScore}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-xs text-muted">Predicted Deformation</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ai)' }}>+{node.predictedDeformation} mm</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="text-xs text-muted">AI Confidence</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--info)' }}>{node.aiConfidence}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Individual Sensor Indicator Cards */}
      <div>
        <div className="card-title" style={{ marginBottom: 8 }}>
          5 Monitored Deformation & Risk Indicators
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--sp-md)',
        }}>
          <SensorCard
            name="1. Tilt (MPU6050)"
            value={`${node.readings.tilt.toFixed(2)}`}
            unit="°"
            threshold={`${node.thresholds.tilt.toFixed(2)}`}
            isAbnormal={node.sensorStatus.tilt}
            change={node.sensorStatus.tilt ? '+24% vs threshold' : 'Within threshold'}
          />
          <SensorCard
            name="2. Displacement (ToF)"
            value={`${node.readings.displacement.toFixed(1)}`}
            unit="mm"
            threshold={`${node.thresholds.displacement.toFixed(1)}`}
            isAbnormal={node.sensorStatus.displacement}
            change={node.sensorStatus.displacement ? '+48% vs baseline' : 'Normal range'}
          />
          <SensorCard
            name="3. Vibration Sensor"
            value={`${node.readings.vibration.toFixed(0)}`}
            unit="%"
            threshold={`${node.thresholds.vibration.toFixed(0)}`}
            isAbnormal={node.sensorStatus.vibration}
            change={node.sensorStatus.vibration ? 'Elevated micro-seismic' : 'Ambient noise'}
          />
          <SensorCard
            name="4. Crack Sensor"
            value={node.readings.crackDetected ? 'DETECTED' : 'None'}
            unit=""
            threshold="Detection"
            isAbnormal={node.sensorStatus.crack}
            change={node.sensorStatus.crack ? 'Surface fracture present' : 'No fracture'}
          />
          <SensorCard
            name="5. Relative Movement"
            value={`${node.readings.relativeMovement.toFixed(1)}`}
            unit="mm"
            threshold={`${node.thresholds.relativeMovement.toFixed(1)}`}
            isAbnormal={node.sensorStatus.relativeMovement}
            change={node.sensorStatus.relativeMovement ? 'Spatial shear detected' : 'Uniform position'}
          />
        </div>
      </div>

      {/* 5-Indicator Status Grid */}
      <SensorStatusGrid
        readings={node.readings}
        thresholds={node.thresholds}
        status={node.sensorStatus}
      />

      {/* Time-Series Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--sp-lg)' }}>
        {/* Predicted vs Actual Deformation */}
        <ChartCard
          title="Predicted vs Actual Ground Deformation"
          subtitle="Actual (Solid Blue) vs AI Prediction Model (Dashed Purple) in mm"
          action={<span className="badge badge-ai">Horizon: {node.predictionHorizon}h</span>}
        >
          <PredictionChart
            actualData={activeHistory.actualDeformation}
            predictedData={activeHistory.predictedDeformation}
          />
        </ChartCard>

        {/* Tilt vs Time */}
        <ChartCard
          title="Tilt vs Time (MPU6050)"
          subtitle={`Current: ${node.readings.tilt.toFixed(2)}° | Local Threshold: ${node.thresholds.tilt}°`}
        >
          <TimeSeriesLineChart
            data={activeHistory.tilt}
            color="#2563EB"
            name="Tilt (°)"
            unit="°"
            threshold={node.thresholds.tilt}
          />
        </ChartCard>

        {/* Displacement vs Time */}
        <ChartCard
          title="Displacement vs Time (ToF / Ultrasonic)"
          subtitle={`Current: ${node.readings.displacement.toFixed(1)} mm | Local Threshold: ${node.thresholds.displacement} mm`}
        >
          <TimeSeriesLineChart
            data={activeHistory.displacement}
            color="#0891B2"
            name="Displacement (mm)"
            unit=" mm"
            threshold={node.thresholds.displacement}
          />
        </ChartCard>

        {/* Vibration vs Time */}
        <ChartCard
          title="Ground Vibration vs Time"
          subtitle={`Current: ${node.readings.vibration.toFixed(0)}% | Threshold: ${node.thresholds.vibration}%`}
        >
          <TimeSeriesLineChart
            data={activeHistory.vibration}
            color="#F97316"
            name="Vibration (%)"
            unit="%"
            threshold={node.thresholds.vibration}
          />
        </ChartCard>

        {/* Risk Score Area Chart */}
        <ChartCard
          title="AI Risk Probability Evolution"
          subtitle="Multi-parameter AI risk score (0-100%)"
        >
          <RiskScoreAreaChart data={activeHistory.riskScore} />
        </ChartCard>

        {/* Relative Movement vs Time */}
        <ChartCard
          title="Relative Spatial Movement vs Time"
          subtitle={`Spatial relationship derived with neighboring nodes | Threshold: ${node.thresholds.relativeMovement} mm`}
        >
          <TimeSeriesLineChart
            data={activeHistory.relativeMovement}
            color="#16A34A"
            name="Relative Movement"
            unit=" mm"
            threshold={node.thresholds.relativeMovement}
          />
        </ChartCard>
      </div>

      {/* AI Explainability & Recommended Safety Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--sp-lg)' }}>
        <AIExplanation assessment={aiAssessment} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
          <RecommendationCard
            actions={recommendedActions}
            nodeId={node.id}
            onViewRiskZone={() => navigate(`/dashboard?node=${node.id}`)}
            onViewSafeZone={() => navigate(`/dashboard?node=${node.id}`)}
          />

          {/* Wi-Fi Network & Hardware Health Section */}
          <div className="card">
            <div className="card-header">
              <div className="card-title flex items-center gap-xs">
                <Wifi size={14} color="var(--primary)" />
                <span>ESP32 Hardware & Wireless Network Health</span>
              </div>
              <span className="badge badge-online">Wi-Fi Direct</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
              <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 'var(--r-sm)' }}>
                <div className="text-xs text-muted">Signal Strength</div>
                <div className="metric-value-sm">{node.wifiSignal} dBm</div>
                <div className="text-xs text-muted">Good Wi-Fi Link</div>
              </div>

              <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 'var(--r-sm)' }}>
                <div className="text-xs text-muted">Packet Reception</div>
                <div className="metric-value-sm" style={{ color: 'var(--success)' }}>{node.packetReception}%</div>
                <div className="text-xs text-muted">Low Latency</div>
              </div>

              <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 'var(--r-sm)' }}>
                <div className="text-xs text-muted">Battery Backup</div>
                <div className="metric-value-sm">{node.battery.toFixed(0)}%</div>
                <div className="text-xs text-muted">Solar + LiPo</div>
              </div>

              <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 'var(--r-sm)' }}>
                <div className="text-xs text-muted">Architecture</div>
                <div className="metric-value-sm" style={{ fontSize: '0.875rem' }}>Direct Wi-Fi</div>
                <div className="text-xs text-muted">Mesh-Ready Model</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
