// ============================================================
// MineSafe AI — Report Domain Components
// ============================================================

import { useState } from 'react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import type { ReportConfig, ReportData, NodeData, Alert } from '../../types';
import { generateReport, generateReportApi, exportCSV, exportReportCsvApi, getDefaultReportSections } from '../../services/reportService';
import { RiskBadge } from '../common';
import { format } from 'date-fns';
import './report.css';

// --- Report Builder Form ---
export function ReportBuilder({
  nodes,
  alerts,
  initialNodeId,
  onReportGenerated,
}: {
  nodes: NodeData[];
  alerts: Alert[];
  initialNodeId?: string;
  onReportGenerated: (report: ReportData) => void;
}) {
  const [mine, setMine] = useState('Prototype Mine — Jharkhand, India');
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '24H'>('7D');
  const [nodeScope, setNodeScope] = useState<string>(initialNodeId || 'ALL');
  const [region, setRegion] = useState('Central Block Pit #4');
  const [sections, setSections] = useState(getDefaultReportSections());
  const [loading, setLoading] = useState<boolean>(false);

  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    const now = new Date();
    const daysBack = dateRange === '24H' ? 1 : dateRange === '7D' ? 7 : 30;
    const start = new Date(now.getTime() - daysBack * 86400000);

    const reportConfig: ReportConfig = {
      mine,
      dateRange: { start, end: now },
      nodeScope: nodeScope === 'ALL' ? ['ALL'] : [nodeScope],
      region,
      sections,
    };

    try {
      const report = await generateReportApi(reportConfig);
      onReportGenerated(report);
    } catch (err) {
      console.warn('[Report API Fallback] Generating report locally:', err);
      const fallbackReport = generateReport(reportConfig, nodes, alerts);
      onReportGenerated(fallbackReport);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card report-builder-card">
      <div className="card-header">
        <div className="card-title flex items-center gap-xs">
          <FileText size={16} color="var(--primary)" />
          <span>Report Configuration & Builder</span>
        </div>
      </div>

      <div className="report-form-grid">
        <div className="form-group">
          <label className="form-label">Mine / Site Name</label>
          <input
            className="form-input"
            value={mine}
            onChange={e => setMine(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Geological Monitoring Region</label>
          <input
            className="form-input"
            value={region}
            onChange={e => setRegion(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Reporting Period</label>
          <select
            className="form-input"
            value={dateRange}
            onChange={e => setDateRange(e.target.value as any)}
          >
            <option value="24H">Last 24 Hours</option>
            <option value="7D">Last 7 Days (Standard)</option>
            <option value="30D">Last 30 Days (Monthly Audit)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Node Scope</label>
          <select
            className="form-input"
            value={nodeScope}
            onChange={e => setNodeScope(e.target.value)}
          >
            <option value="ALL">All Prototype Nodes (N01, N02, N03)</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>Node {n.id}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sections Checklist */}
      <div style={{ marginTop: 16 }}>
        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
          Report Content Sections
        </label>
        <div className="sections-checkbox-grid">
          {sections.map(s => (
            <label key={s.id} className="form-checkbox">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={() => toggleSection(s.id)}
              />
              <span className="text-sm">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-sm" style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
          <span>Generate Report Preview</span>
        </button>
      </div>
    </div>
  );
}

// --- Official Report Preview Document ---
export function ReportPreview({
  report,
  nodes,
  alerts,
}: {
  report: ReportData;
  nodes: NodeData[];
  alerts: Alert[];
}) {
  const [exporting, setExporting] = useState<boolean>(false);

  const isSectionEnabled = (id: string) => {
    return report.config.sections.find(s => s.id === id)?.enabled ?? true;
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await exportReportCsvApi(report.config);
    } catch (err) {
      console.warn('[CSV Export API Fallback] Downloading CSV locally:', err);
      const csv = exportCSV(nodes, alerts);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minesafe_report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-preview-container">
      {/* Top Action Bar */}
      <div className="report-action-bar no-print">
        <div className="flex items-center gap-sm">
          <span className="text-sm" style={{ fontWeight: 600 }}>Document Preview</span>
          <span className="badge badge-ai">OFFICIAL TEMPLATE</span>
        </div>
        <div className="flex items-center gap-sm">
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} disabled={exporting}>
            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            <span>Export CSV</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Printable Official Document */}
      <div className="report-document card" id="printable-report">
        {/* Document Header */}
        <div className="doc-header">
          <div className="doc-header-left">
            <div className="doc-logo-title">MineSafe AI</div>
            <div className="doc-subtitle">Real-Time Mine Subsidence Monitoring, Prediction & Early Warning System</div>
            <div className="doc-confidential">OFFICIAL SAFETY MONITORING REPORT — PROTOTYPE / DEMONSTRATION DATA</div>
          </div>
          <div className="doc-header-right">
            <div><strong>Report Ref:</strong> MS-RPT-{format(report.generatedAt, 'yyyyMMdd')}-01</div>
            <div><strong>Generated:</strong> {format(report.generatedAt, 'dd MMM yyyy, HH:mm')} IST</div>
            <div><strong>Site:</strong> {report.config.mine}</div>
          </div>
        </div>

        <div className="doc-divider" />

        {/* Executive Summary */}
        {isSectionEnabled('executive-summary') && (
          <div className="doc-section">
            <h3 className="doc-section-title">1. Executive Summary</h3>
            <p className="doc-text">
              {report.summary} The system continuously analyzed ground deformation across 5 monitored indicators
              (Tilt, Displacement, Vibration, Crack detection, and Relative movement). AI predictive models indicate
              the highest deformation tendency near the active sensor zones.
            </p>
          </div>
        )}

        {/* Risk Overview */}
        {isSectionEnabled('risk-overview') && (
          <div className="doc-section">
            <h3 className="doc-section-title">2. Risk Overview & Distribution</h3>
            <div className="doc-risk-strip">
              <div className="doc-risk-card">
                <span className="label">Overall Status</span>
                <span className="val"><RiskBadge level={report.riskOverview.overallRisk} size="lg" /></span>
              </div>
              <div className="doc-risk-card">
                <span className="label">L0 Normal</span>
                <span className="val" style={{ color: 'var(--success)' }}>{report.riskOverview.l0Percentage}%</span>
              </div>
              <div className="doc-risk-card">
                <span className="label">L1 Watch</span>
                <span className="val" style={{ color: 'var(--watch)' }}>{report.riskOverview.l1Percentage}%</span>
              </div>
              <div className="doc-risk-card">
                <span className="label">L2 Warning</span>
                <span className="val" style={{ color: 'var(--warning)' }}>{report.riskOverview.l2Percentage}%</span>
              </div>
              <div className="doc-risk-card">
                <span className="label">L3 Critical</span>
                <span className="val" style={{ color: 'var(--critical)' }}>{report.riskOverview.l3Percentage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Sensor Statistics */}
        {isSectionEnabled('sensor-statistics') && (
          <div className="doc-section">
            <h3 className="doc-section-title">3. Surface Sensor Statistics (ESP32 Multi-Sensor Array)</h3>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Node ID</th>
                  <th>Avg Tilt (°)</th>
                  <th>Max Disp (mm)</th>
                  <th>Peak Vib (%)</th>
                  <th>Crack Events</th>
                  <th>AI Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {report.nodeStatistics.map(st => (
                  <tr key={st.nodeId}>
                    <td><strong>{st.nodeId}</strong></td>
                    <td>{st.avgTilt.toFixed(2)}°</td>
                    <td>{st.maxDisplacement.toFixed(1)} mm</td>
                    <td>{st.peakVibration.toFixed(0)}%</td>
                    <td>{st.crackEvents}</td>
                    <td><strong style={{ color: 'var(--ai)' }}>{st.avgRiskScore}%</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Major Alerts */}
        {isSectionEnabled('major-alerts') && (
          <div className="doc-section">
            <h3 className="doc-section-title">4. Recorded Safety Alerts</h3>
            {report.alerts.length === 0 ? (
              <p className="doc-text text-muted">No safety threshold violations occurred during the selected period.</p>
            ) : (
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Alert ID</th>
                    <th>Level</th>
                    <th>Node</th>
                    <th>Timestamp</th>
                    <th>Trigger Event</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.alerts.map(a => (
                    <tr key={a.id}>
                      <td>{a.id}</td>
                      <td><RiskBadge level={a.severity as any} size="sm" /></td>
                      <td>{a.nodeId}</td>
                      <td>{format(a.timestamp, 'yyyy-MM-dd HH:mm')}</td>
                      <td>{a.trigger}</td>
                      <td>{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* AI Predictions */}
        {isSectionEnabled('ai-predictions') && (
          <div className="doc-section">
            <h3 className="doc-section-title">5. AI Subsidence Prediction & Confidence Metrics</h3>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Node ID</th>
                  <th>Predicted Subsidence (6h)</th>
                  <th>Confidence Metric</th>
                  <th>Model Historical Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {report.aiPredictions.map(ai => (
                  <tr key={ai.nodeId}>
                    <td><strong>{ai.nodeId}</strong></td>
                    <td><strong style={{ color: 'var(--ai)' }}>+{ai.predictedDeformation} mm</strong></td>
                    <td>{ai.avgConfidence}%</td>
                    <td>{ai.avgPredictionAccuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recommended Actions */}
        {isSectionEnabled('recommended-actions') && (
          <div className="doc-section">
            <h3 className="doc-section-title">6. Recommended Actions & Safety Advisory</h3>
            <ul className="doc-list">
              <li>Maintain regular Wi-Fi heartbeat verification across all 3 ESP32 surface monitoring nodes.</li>
              <li>Perform physical visual inspection if displacement trends exceed local node thresholds.</li>
              <li>Ensure designated refuge zones (R-01, R-02) and evacuation routes remain unobstructed.</li>
              <li>Follow Director General of Mines Safety (DGMS) regulatory protocols for underground mine subsidence response.</li>
            </ul>
          </div>
        )}

        {/* Signatures & Footer */}
        <div className="doc-signatures">
          <div className="sig-block">
            <div className="sig-line" />
            <div>Prepared By: Mine Safety Officer</div>
          </div>
          <div className="sig-block">
            <div className="sig-line" />
            <div>Reviewed By: Mine Manager / DGMS Regulator</div>
          </div>
        </div>

        <div className="doc-footer text-center text-xs text-muted">
          MineSafe AI Prototype Demonstration Document — Fictional Coordinates & Simulated Data for Testing Purposes Only
        </div>
      </div>
    </div>
  );
}
