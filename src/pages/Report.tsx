// ============================================================
// MineSafe AI — Safety Monitoring Reports (Screen 3)
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ReportBuilder, ReportPreview } from '../components/reports';
import { generateReportApi, getDefaultReportSections } from '../services/reportService';
import type { ReportData, ReportConfig } from '../types';

export function ReportPage() {
  const { state } = useApp();
  const [searchParams] = useSearchParams();
  const urlNode = searchParams.get('node');

  // Initial report configuration
  const defaultConfig = useMemo<ReportConfig>(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 86400000);
    const config: ReportConfig = {
      mine: 'Prototype Mine — Demonstration Site, Jharkhand, India',
      dateRange: { start, end: now },
      nodeScope: urlNode ? [urlNode] : ['ALL'],
      region: 'Central Working Pit #4',
      sections: getDefaultReportSections(),
    };
    return config;
  }, [urlNode]);

  const [activeReport, setActiveReport] = useState<ReportData | null>(null);
  const [reportError, setReportError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setReportError(false);
    generateReportApi(defaultConfig)
      .then(report => { if (mounted) setActiveReport(report); })
      .catch(error => {
        console.warn('[Initial Report API] Failed to load backend report:', error);
        if (mounted) setReportError(true);
      });
    return () => { mounted = false; };
  }, [defaultConfig]);

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
        initialNodeId={urlNode || 'ALL'}
        onReportGenerated={setActiveReport}
      />

      {reportError && <div className="card text-sm" style={{ color: 'var(--critical)' }}>Backend report data is unavailable. No simulated report is shown.</div>}

      {/* Report Preview Document */}
      {activeReport ? <ReportPreview report={activeReport} nodes={state.nodes} alerts={state.alerts} /> : !reportError && <div className="card text-sm text-muted">Loading report data from the backend...</div>}
    </div>
  );
}
