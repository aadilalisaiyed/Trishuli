// ============================================================
// MineSafe AI — AI Intelligence & Explainability Components
// ============================================================

import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { AIRiskAssessment, NodeData } from '../../types';

// --- Compact AI Subsidence Prediction Summary Card (Dashboard) ---
export function AIInsightCard({ node }: { node?: NodeData }) {
  const navigate = useNavigate();

  if (!node) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title flex items-center gap-xs">
            <Sparkles size={14} color="var(--ai)" />
            <span>AI Subsidence Prediction</span>
          </div>
        </div>
        <div className="text-xs text-muted text-center" style={{ padding: 20 }}>
          No elevated risk detected across nodes.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderTop: '3px solid var(--ai)' }}>
      <div className="card-header">
        <div className="card-title flex items-center gap-xs">
          <Sparkles size={14} color="var(--ai)" />
          <span>AI Subsidence Prediction</span>
        </div>
        <span className="badge badge-ai">PROTOTYPE AI</span>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div>
          <div className="text-xs text-muted">Highest Risk Node</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Node {node.id}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-xs text-muted">Risk Probability</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ai)' }}>{node.riskScore}%</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        background: 'var(--bg)',
        padding: '10px',
        borderRadius: 'var(--r-md)',
        marginBottom: 12,
      }}>
        <div>
          <div className="text-xs text-muted">Predicted Deformation</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ai)' }}>
            +{node.predictedDeformation} mm
          </div>
        </div>
        <div>
          <div className="text-xs text-muted">Prediction Horizon</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Next {node.predictionHorizon} Hours</div>
        </div>
        <div>
          <div className="text-xs text-muted">AI Confidence</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{node.aiConfidence}%</div>
        </div>
        <div>
          <div className="text-xs text-muted">Deformation Trend</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: node.trend === 'Rapidly Increasing' ? 'var(--critical)' : 'var(--text-primary)' }}>
            {node.trend}
          </div>
        </div>
      </div>

      <button
        className="btn btn-ai btn-sm w-full flex items-center justify-center gap-xs"
        onClick={() => navigate(`/detail/${node.id}`)}
      >
        View Deep AI Analysis <ChevronRight size={14} />
      </button>
    </div>
  );
}

// --- Full AI Explainability Component ---
export function AIExplanation({ assessment }: { assessment: AIRiskAssessment }) {
  return (
    <div className="card" style={{ borderLeft: '4px solid var(--ai)' }}>
      <div className="card-header">
        <div className="card-title flex items-center gap-xs">
          <Sparkles size={14} color="var(--ai)" />
          <span>AI Risk Assessment & Explainability</span>
        </div>
        <div className="flex items-center gap-sm">
          <span className="text-xs text-muted">Confidence: <strong>{assessment.confidence}%</strong></span>
          <span className="badge badge-ai">Model: Subsidence-ML v1</span>
        </div>
      </div>

      {/* Primary Explanation Box */}
      <div style={{
        background: 'var(--ai-light)',
        border: '1px solid #DDD6FE',
        borderRadius: 'var(--r-md)',
        padding: '12px 14px',
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ai-dark)', marginBottom: 4 }}>
          Diagnostic Summary
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#4C1D95', lineHeight: 1.5 }}>
          {assessment.explanation}
        </div>
      </div>

      {/* Contributing Factors Table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Evaluated Contributing Indicators
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {assessment.contributingFactors.map((factor, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--r-sm)',
                background: factor.status === 'abnormal' ? 'var(--critical-bg)' : 'var(--bg)',
                border: `1px solid ${factor.status === 'abnormal' ? 'var(--critical-light)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-sm">
                {factor.status === 'abnormal' ? (
                  <AlertOctagon size={16} color="var(--critical)" />
                ) : (
                  <CheckCircle2 size={16} color="var(--success)" />
                )}
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{factor.indicator}:</span>{' '}
                  <span style={{ fontSize: '0.8125rem', color: factor.status === 'abnormal' ? 'var(--critical)' : 'var(--text-secondary)' }}>
                    {factor.description}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                Value: <strong>{factor.value}</strong> (Threshold: {factor.threshold})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Predictive Outlook */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8,
        background: 'var(--bg)',
        padding: '10px 12px',
        borderRadius: 'var(--r-md)',
      }}>
        <div>
          <div className="text-xs text-muted">Predicted Subsidence</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ai)' }}>
            +{assessment.predictedDeformation} mm
          </div>
        </div>
        <div>
          <div className="text-xs text-muted">Expected Horizon</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Next {assessment.predictionHorizon} Hours</div>
        </div>
        <div>
          <div className="text-xs text-muted">Surface Trend</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{assessment.trend}</div>
        </div>
      </div>
    </div>
  );
}

// --- Actionable Safety Recommendation Card ---
export function RecommendationCard({
  actions,
  nodeId,
  onViewRiskZone,
  onViewSafeZone,
  onAcknowledge,
}: {
  actions: string[];
  nodeId: string;
  onViewRiskZone?: () => void;
  onViewSafeZone?: () => void;
  onAcknowledge?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
      <div className="card-header">
        <div className="card-title flex items-center gap-xs">
          <AlertTriangle size={14} color="var(--warning)" />
          <span>Recommended Safety Actions</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {actions.map((act, idx) => (
          <div key={idx} className="flex items-start gap-sm" style={{ fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
            <span>{act}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-sm flex-wrap" style={{ marginBottom: 12 }}>
        {onViewRiskZone && (
          <button className="btn btn-secondary btn-sm" onClick={onViewRiskZone}>
            View Risk Zone
          </button>
        )}
        {onViewSafeZone && (
          <button className="btn btn-secondary btn-sm" onClick={onViewSafeZone}>
            View Safe Zone (R-02)
          </button>
        )}
        {onAcknowledge && (
          <button className="btn btn-secondary btn-sm" onClick={onAcknowledge}>
            Acknowledge Alert
          </button>
        )}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/report?node=${nodeId}`)}
        >
          Generate Report
        </button>
      </div>

      {/* Mandatory Disclaimer per Spec §28 */}
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-sm)',
        padding: '6px 10px',
        fontSize: '0.6875rem',
        color: 'var(--text-muted)',
      }}>
        <strong>Disclaimer:</strong> Prototype recommendation. Follow mine-approved emergency procedures and safety protocols.
      </div>
    </div>
  );
}
