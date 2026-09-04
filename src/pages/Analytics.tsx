// ============================================================
// MineSafe AI — Analytics & Historical AI Performance (Screen 2)
// ============================================================

import { useState, useMemo } from 'react';
import {
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MetricCard, TimeRangeSelector, NodeSelector } from '../components/common';
import {
  ChartCard,
  TimeSeriesLineChart,
  PredictionChart,
  RiskScoreAreaChart,
  RiskDistributionBarChart,
} from '../components/charts';
import { generateAllNodeHistory } from '../data/historicalData';

export function AnalyticsPage() {
  const { state } = useApp();

  const [timeRange, setTimeRange] = useState<string>('24H');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('ALL');
  const [selectedMetric, setSelectedMetric] = useState<string>('ALL');

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

  // Generate historical data for all nodes
  const allHistory = useMemo(() => {
    return generateAllNodeHistory(hoursBack, 60, state.scenario.toLowerCase() as any);
  }, [hoursBack, state.scenario]);

  // Aggregate or single node data
  const targetHistory = useMemo(() => {
    if (selectedNodeId !== 'ALL' && allHistory[selectedNodeId]) {
      return allHistory[selectedNodeId];
    }
    // Default to N03 if all, or combine
    return allHistory.N03;
  }, [selectedNodeId, allHistory]);

  // Calculate Summary KPI stats from current state
  const avgTilt = (state.nodes.reduce((acc, n) => acc + n.readings.tilt, 0) / state.nodes.length || 0).toFixed(2);
  const maxDisplacement = Math.max(...state.nodes.map(n => n.readings.displacement), 0).toFixed(1);
  const peakVibration = Math.max(...state.nodes.map(n => n.readings.vibration), 0).toFixed(0);
  const crackEventsTotal = state.nodes.filter(n => n.readings.crackDetected).length;
  const avgRiskScore = Math.round(state.nodes.reduce((acc, n) => acc + n.riskScore, 0) / state.nodes.length || 0);

  // Risk distribution data
  const riskDistributionData = [
    { level: 'L0 Normal', percentage: state.scenario === 'NORMAL' ? 100 : state.scenario === 'WARNING' ? 66 : 33, color: '#16A34A' },
    { level: 'L1 Watch', percentage: state.scenario === 'WARNING' ? 0 : state.scenario === 'CRITICAL' ? 33 : 0, color: '#EAB308' },
    { level: 'L2 Warning', percentage: state.scenario === 'WARNING' ? 34 : 0, color: '#F97316' },
    { level: 'L3 Critical', percentage: state.scenario === 'CRITICAL' ? 34 : 0, color: '#DC2626' },
  ];

  return (
    <div style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Geotechnical Analytics & AI Models</h1>
          <p className="text-xs text-muted">
            Historical surface deformation telemetry and AI prediction accuracy validation
          </p>
        </div>

        {/* Global Multi-Filter Bar (Spec §30) */}
        <div className="flex items-center gap-sm flex-wrap">
          <NodeSelector
            selected={selectedNodeId}
            onChange={setSelectedNodeId}
            nodes={state.nodes}
          />
          <select
            className="form-input"
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
          >
            <option value="ALL">All Metrics</option>
            <option value="TILT">Tilt Only</option>
            <option value="DISP">Displacement Only</option>
            <option value="VIB">Vibration Only</option>
            <option value="PRED">Predicted vs Actual</option>
            <option value="RISK">Risk Score</option>
          </select>
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 'var(--sp-md)',
      }}>
        <MetricCard
          label="Average Surface Tilt"
          value={`${avgTilt}°`}
          trend="MPU6050 Mean"
          color="#2563EB"
        />
        <MetricCard
          label="Max Displacement"
          value={`${maxDisplacement} mm`}
          trend="Peak ToF Measurement"
          color="#0891B2"
        />
        <MetricCard
          label="Peak Ground Vibration"
          value={`${peakVibration}%`}
          trend="Seismic Peak"
          color="#F97316"
        />
        <MetricCard
          label="Active Crack Events"
          value={crackEventsTotal}
          trend={crackEventsTotal > 0 ? 'Fractures Detected' : 'Zero Surface Fractures'}
          color={crackEventsTotal > 0 ? 'var(--critical)' : 'var(--success)'}
        />
        <MetricCard
          label="Mean AI Risk Score"
          value={`${avgRiskScore}%`}
          trend="Aggregate Mine Score"
          color="var(--ai)"
        />
        <MetricCard
          label="AI Model Accuracy"
          value="91.2%"
          trend="Prototype ML Benchmark"
          color="var(--success)"
        />
      </div>

      {/* Core Analytical Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--sp-lg)' }}>
        {/* Predicted vs Actual Deformation */}
        {(selectedMetric === 'ALL' || selectedMetric === 'PRED') && (
          <ChartCard
            title="Predicted vs Actual Ground Deformation"
            subtitle={`Node: ${selectedNodeId} | Actual (Solid Blue) vs AI Prediction Model (Dashed Purple)`}
            action={<span className="badge badge-ai">Horizon: 6h</span>}
          >
            <PredictionChart
              actualData={targetHistory.actualDeformation}
              predictedData={targetHistory.predictedDeformation}
            />
          </ChartCard>
        )}

        {/* Surface Tilt */}
        {(selectedMetric === 'ALL' || selectedMetric === 'TILT') && (
          <ChartCard
            title="Surface Tilt vs Time (°)"
            subtitle={`Node: ${selectedNodeId} | Ground Angular Deviation History`}
          >
            <TimeSeriesLineChart
              data={targetHistory.tilt}
              color="#2563EB"
              name="Tilt (°)"
              unit="°"
              threshold={0.50}
            />
          </ChartCard>
        )}

        {/* Displacement */}
        {(selectedMetric === 'ALL' || selectedMetric === 'DISP') && (
          <ChartCard
            title="Vertical Ground Displacement vs Time (mm)"
            subtitle={`Node: ${selectedNodeId} | ToF / Ultrasonic Distance Measurements`}
          >
            <TimeSeriesLineChart
              data={targetHistory.displacement}
              color="#0891B2"
              name="Displacement (mm)"
              unit=" mm"
              threshold={10.0}
            />
          </ChartCard>
        )}

        {/* Vibration */}
        {(selectedMetric === 'ALL' || selectedMetric === 'VIB') && (
          <ChartCard
            title="Ground Micro-Seismic Vibration (%)"
            subtitle={`Node: ${selectedNodeId} | Vibration Frequency & Intensity Spectrum`}
          >
            <TimeSeriesLineChart
              data={targetHistory.vibration}
              color="#F97316"
              name="Vibration (%)"
              unit="%"
              threshold={52.0}
            />
          </ChartCard>
        )}

        {/* AI Risk Score Evolution */}
        {(selectedMetric === 'ALL' || selectedMetric === 'RISK') && (
          <ChartCard
            title="Multi-Indicator AI Risk Probability Score (0-100%)"
            subtitle={`Node: ${selectedNodeId} | Trend: ${state.nodes.find(n => n.id === selectedNodeId)?.trend || 'Stable'}`}
          >
            <RiskScoreAreaChart data={targetHistory.riskScore} />
          </ChartCard>
        )}

        {/* Relative Movement */}
        {selectedMetric === 'ALL' && (
          <ChartCard
            title="Relative Spatial Movement between Nodes (mm)"
            subtitle="Derived differential spatial displacement across the 3-node baseline"
          >
            <TimeSeriesLineChart
              data={targetHistory.relativeMovement}
              color="#16A34A"
              name="Relative Movement"
              unit=" mm"
              threshold={8.0}
            />
          </ChartCard>
        )}
      </div>

      {/* Risk Distribution & AI Model Performance Metrics (Spec §31, 32) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--sp-lg)' }}>
        {/* Risk Distribution Chart */}
        <ChartCard
          title="Mine Risk Level Distribution"
          subtitle="Percentage share of monitoring nodes across L0-L3 severity states"
        >
          <RiskDistributionBarChart data={riskDistributionData} />
        </ChartCard>

        {/* AI Performance Evaluation Card (Spec §32) */}
        <div className="card" style={{ borderTop: '3px solid var(--ai)' }}>
          <div className="card-header">
            <div className="card-title flex items-center gap-xs">
              <Sparkles size={16} color="var(--ai)" />
              <span>AI Subsidence Model Validation Metrics</span>
            </div>
            <span className="badge badge-ai">PROTOTYPE AI METRICS</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: 'var(--r-md)' }}>
              <div className="text-xs text-muted">Prediction Accuracy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>91.2%</div>
              <div className="text-xs text-muted">vs Ground Truth</div>
            </div>

            <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: 'var(--r-md)' }}>
              <div className="text-xs text-muted">Mean AI Confidence</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ai)' }}>88.6%</div>
              <div className="text-xs text-muted">Model certainty score</div>
            </div>

            <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: 'var(--r-md)' }}>
              <div className="text-xs text-muted">Anomaly Detection Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>94.0%</div>
              <div className="text-xs text-muted">Sensitivity benchmark</div>
            </div>

            <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: 'var(--r-md)' }}>
              <div className="text-xs text-muted">False Alert Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>5.8%</div>
              <div className="text-xs text-muted">Below 8% threshold</div>
            </div>
          </div>

          <div className="text-xs text-muted" style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            padding: '8px 10px',
          }}>
            <strong>Notice:</strong> Demonstration validation values calculated over synthetic benchmark test sets.
            All AI inferences are simulated in the browser prototype.
          </div>
        </div>
      </div>
    </div>
  );
}
