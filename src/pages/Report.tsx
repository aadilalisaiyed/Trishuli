// ============================================================
// MineSafe AI — Safety Monitoring Reports (Screen 3)
// ============================================================

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ReportBuilder, ReportPreview } from '../components/reports';
import { generateReport, getDefaultReportSections } from '../services/reportService';
import type { ReportData, ReportConfig } from '../types';

export function ReportPage() {
  const { state } = useApp();
  const [searchParams] = useSearchParams();
  const urlNode = searchParams.get('node');

  // Initial report configuration
  const defaultReport = useMemo<ReportData>(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 86400000);
    const config: ReportConfig = {
      mine: 'Prototype Mine — Demonstration Site, Jharkhand, India',
      dateRange: { start, end: now },
      nodeScope: urlNode ? [urlNode] : ['ALL'],
      region: 'Central Working Pit #4',
      sections: getDefaultReportSections(),
    };
    return generateReport(config, state.nodes, state.alerts);
  }, [state.nodes, state.alerts, urlNode]);

  const [activeReport, setActiveReport] = useState<ReportData>(defaultReport);

  return (
    <div style={{ padding: 'var(--sp-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Regulatory Compliance & Safety Reports</h1>
          <p className="text-xs text-muted">
            Formal technical reporting for Mine Management, Geotechnical Authorities, and DGMS Regulators
          </p>
        </div>
      </div>

      {/* Report Builder Form Section */}
      <ReportBuilder
        nodes={state.nodes}
        alerts={state.alerts}
        initialNodeId={urlNode || 'ALL'}
        onReportGenerated={setActiveReport}
      />

      {/* Report Preview Document */}
      <ReportPreview
        report={activeReport}
        nodes={state.nodes}
        alerts={state.alerts}
      />
    </div>
  );
}
