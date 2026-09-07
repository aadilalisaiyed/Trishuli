import type { AlertSeverity, RiskLevel } from '../types';

export type DisplayRisk = 'normal' | 'watch' | 'warning' | 'critical';

export function displayRisk(level: RiskLevel | AlertSeverity): DisplayRisk {
  const map: Record<string, DisplayRisk> = {
    L0: 'normal',
    L1: 'watch',
    L2: 'warning',
    L3: 'critical',
  };
  return map[level] || 'normal';
}

export function displayRiskLabel(level: RiskLevel | AlertSeverity): string {
  const labels: Record<DisplayRisk, string> = {
    normal: 'Normal',
    watch: 'Watch',
    warning: 'Warning',
    critical: 'Critical',
  };
  return labels[displayRisk(level)];
}
