// ============================================================
// MineSafe AI — Main Dashboard / Live Map (Screen 1)
// ============================================================

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Crosshair,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MetricCard, RiskBadge } from '../components/common';
import { MineMap } from '../components/map';
import { NodeCard } from '../components/nodes';
import { AlertFeed } from '../components/alerts';
import { AIInsightCard } from '../components/ai';
import { config } from '../config';

export function DashboardPage() {
  const { state, acknowledgeAlert } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlNodeId = searchParams.get('node');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(urlNodeId || 'N03');
  const [focusCoord, setFocusCoord] = useState<[number, number] | undefined>(undefined);

  const highestRiskNode = [...state.nodes].sort((a, b) => b.riskScore - a.riskScore)[0] || state.nodes[0];
  const activeAlerts = state.alerts.filter(a => a.status === 'ACTIVE');

  // Overall Risk Level calculation
  const overallRisk = state.nodes.reduce((worst, n) => {
    const order = { L0: 0, L1: 1, L2: 2, L3: 3 };
    return order[n.riskLevel] > order[worst] ? n.riskLevel : worst;
  }, 'L0' as 'L0' | 'L1' | 'L2' | 'L3');

  const handleSelectNode = (id: string) => {
    setSelectedNodeId(id);
    const target = state.nodes.find(n => n.id === id);
    if (target) {
      setFocusCoord([target.latitude, target.longitude]);
    }
  };

  return (
    <div style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      {/* Top Notification Banner if L3 Critical */}
      {overallRisk === 'L3' && (
        <div className="animate-fade-in" style={{
          background: 'var(--critical)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: 'var(--r-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
        }}>
          <div className="flex items-center gap-sm">
            <AlertTriangle size={20} className="pulse-critical" />
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
              CRITICAL SUBSIDENCE ALERT: Node {highestRiskNode.id} has reached L3 severity (All 5 monitored indicators abnormal).
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--critical)', fontWeight: 700 }}
            onClick={() => navigate(`/detail/${highestRiskNode.id}`)}
          >
            Review Emergency Protocol
          </button>
        </div>
      )}

      {/* Main KPI Strip (Spec §18) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 'var(--sp-md)',
      }}>
        <div className="card" style={{ padding: '12px 16px', borderLeft: `4px solid ${overallRisk === 'L3' ? 'var(--critical)' : overallRisk === 'L2' ? 'var(--warning)' : overallRisk === 'L1' ? 'var(--watch)' : 'var(--success)'}` }}>
          <div className="metric-label">Overall Risk</div>
          <div style={{ marginTop: 6 }}>
            <RiskBadge level={overallRisk} size="lg" />
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>Site aggregate status</div>
        </div>

        <MetricCard
          label="Active Alerts"
          value={activeAlerts.length}
          color={activeAlerts.length > 0 ? 'var(--warning)' : 'var(--success)'}
          trend={activeAlerts.length > 0 ? 'Action required' : 'All clear'}
          onClick={() => navigate('/alerts')}
        />

        <MetricCard
          label="Sensor Nodes"
          value={`${state.nodes.filter(n => n.status === 'Online').length} / ${state.nodes.length}`}
          unit="online"
          color="var(--primary)"
          trend="Wi-Fi Active (100%)"
        />

        <MetricCard
          label="Highest Risk Node"
          value={highestRiskNode ? `Node ${highestRiskNode.id}` : 'None'}
          color={highestRiskNode?.riskLevel === 'L3' ? 'var(--critical)' : 'var(--text-primary)'}
          trend={`Level: ${highestRiskNode?.riskLevel || 'L0'}`}
          onClick={() => highestRiskNode && handleSelectNode(highestRiskNode.id)}
        />

        <MetricCard
          label="AI Risk Score"
          value={highestRiskNode ? `${highestRiskNode.riskScore}%` : '0%'}
          color="var(--ai)"
          trend="Subsidence probability"
        />

        <MetricCard
          label="Predicted Deformation"
          value={highestRiskNode ? `+${highestRiskNode.predictedDeformation}` : '0.0'}
          unit="mm"
          color="var(--ai)"
          trend={`Horizon: ${highestRiskNode?.predictionHorizon || 6}h`}
        />

        <MetricCard
          label="AI Confidence"
          value={highestRiskNode ? `${highestRiskNode.aiConfidence}%` : '95%'}
          color="var(--info)"
          trend="Model confidence"
        />
      </div>

      {/* Main Map + Intelligence Side Panel Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 'var(--sp-lg)',
        minHeight: '560px',
      }}>
        {/* Map Container (Largest Area) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)', position: 'relative' }}>
          <div className="flex items-center justify-between" style={{ padding: '0 4px' }}>
            <div className="flex items-center gap-sm">
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Geographical Surface Surveillance</span>
              <span className="badge badge-ai">Dual Intelligence Heatmaps Active</span>
            </div>
            <div className="flex items-center gap-xs">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setFocusCoord([config.mine.latitude, config.mine.longitude])}
                title="Fit All Nodes"
              >
                <Crosshair size={14} /> Recenter Mine
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '520px' }}>
            <MineMap
              nodes={state.nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              focusCoord={focusCoord}
            />
          </div>
        </div>

        {/* Intelligence Side Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
          {/* Node Risk Overview List */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Surface Sensor Nodes (3)</div>
              <span className="text-xs text-muted">Select to focus</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {state.nodes.map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={node.id === selectedNodeId}
                  onClick={() => handleSelectNode(node.id)}
                />
              ))}
            </div>
          </div>

          {/* AI Subsidence Prediction Summary Card */}
          <AIInsightCard node={highestRiskNode} />

          {/* Recent Alerts Feed */}
          <AlertFeed
            alerts={state.alerts}
            onAcknowledge={acknowledgeAlert}
          />
        </div>
      </div>
    </div>
  );
}
