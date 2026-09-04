// ============================================================
// MineSafe AI — Chart Components (Recharts)
// ============================================================

import React from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import type { TimeSeriesPoint } from '../../types';

// --- Chart Card Wrapper ---
interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
}

export function ChartCard({ title, subtitle, action, children, height = 260 }: ChartCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div style={{ width: '100%', height }}>
        {children}
      </div>
    </div>
  );
}

// Custom Tooltip Formatter
function CustomTooltip({ active, payload, label, unit }: any) {
  if (active && payload && payload.length) {
    const dateStr = label instanceof Date
      ? format(label, 'dd MMM, HH:mm:ss')
      : typeof label === 'string' || typeof label === 'number'
      ? label
      : '';

    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.96)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-md)',
        fontSize: '0.75rem',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
          {dateStr}
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: entry.color }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
            <span style={{ fontWeight: 700 }}>{entry.value} {unit || ''}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// --- Time Series Line Chart ---
interface TimeSeriesLineChartProps {
  data: TimeSeriesPoint[];
  color?: string;
  name?: string;
  unit?: string;
  threshold?: number;
  height?: number;
}

export function TimeSeriesLineChart({
  data,
  color = 'var(--primary)',
  name = 'Value',
  unit = '',
  threshold,
}: TimeSeriesLineChartProps) {
  const formattedData = React.useMemo(() => {
    return data.map(d => ({
      timestamp: d.timestamp,
      timeLabel: format(new Date(d.timestamp), 'HH:mm'),
      value: d.value,
      threshold,
    }));
  }, [data, threshold]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="timeLabel"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} />
        {threshold !== undefined && (
          <Line
            type="monotone"
            dataKey="threshold"
            name="Threshold"
            stroke="#DC2626"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={1.5}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

// --- Predicted vs Actual Deformation Chart ---
// Actual = Solid Blue Line, Predicted = Dashed Purple Line
interface PredictionChartProps {
  actualData: TimeSeriesPoint[];
  predictedData: TimeSeriesPoint[];
  height?: number;
}

export function PredictionChart({ actualData, predictedData }: PredictionChartProps) {
  const combinedData = React.useMemo(() => {
    return actualData.map((act, i) => {
      const pred = predictedData[i] || act;
      return {
        timestamp: act.timestamp,
        timeLabel: format(new Date(act.timestamp), 'HH:mm'),
        actual: act.value,
        predicted: pred.value,
      };
    });
  }, [actualData, predictedData]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={combinedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="timeLabel"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
          unit=" mm"
        />
        <Tooltip content={<CustomTooltip unit="mm" />} />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, paddingBottom: 6 }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual Deformation"
          stroke="#2563EB"
          strokeWidth={2.2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="predicted"
          name="AI Predicted Deformation"
          stroke="#7C3AED"
          strokeWidth={2.2}
          strokeDasharray="5 5"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

// --- Risk Score Area Chart ---
export function RiskScoreAreaChart({ data }: { data: TimeSeriesPoint[] }) {
  const formattedData = React.useMemo(() => {
    return data.map(d => ({
      timestamp: d.timestamp,
      timeLabel: format(new Date(d.timestamp), 'HH:mm'),
      score: d.value,
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsAreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="timeLabel"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
          domain={[0, 100]}
          unit="%"
        />
        <Tooltip content={<CustomTooltip unit="%" />} />
        <Area
          type="monotone"
          dataKey="score"
          name="AI Risk Score"
          stroke="#7C3AED"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#riskGradient)"
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

// --- Risk Distribution Bar Chart ---
export function RiskDistributionBarChart({ data }: { data: { level: string; percentage: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="level"
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip unit="%" />} />
        <Bar dataKey="percentage" name="Share" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
