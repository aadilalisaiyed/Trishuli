// ============================================================
// MineSafe AI — Design Tokens / Theme
// ============================================================

export const theme = {
  colors: {
    // Base
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardHover: '#F1F5F9',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',

    // Text
    textPrimary: '#111827',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',

    // Brand
    primary: '#2563EB',
    primaryLight: '#DBEAFE',
    primaryDark: '#1D4ED8',

    // AI identity
    ai: '#7C3AED',
    aiLight: '#EDE9FE',
    aiDark: '#6D28D9',

    // Semantic — risk
    success: '#16A34A',
    successLight: '#DCFCE7',
    successBg: '#F0FDF4',
    watch: '#EAB308',
    watchLight: '#FEF9C3',
    watchBg: '#FEFCE8',
    warning: '#F97316',
    warningLight: '#FED7AA',
    warningBg: '#FFF7ED',
    critical: '#DC2626',
    criticalLight: '#FECACA',
    criticalBg: '#FEF2F2',
    criticalDark: '#991B1B',

    // Info
    info: '#0891B2',
    infoLight: '#CFFAFE',
    infoBg: '#ECFEFF',
  },

  riskColors: {
    L0: '#16A34A',
    L1: '#EAB308',
    L2: '#F97316',
    L3: '#DC2626',
  } as Record<string, string>,

  riskBgColors: {
    L0: '#F0FDF4',
    L1: '#FEFCE8',
    L2: '#FFF7ED',
    L3: '#FEF2F2',
  } as Record<string, string>,

  riskLabels: {
    L0: 'NORMAL',
    L1: 'WATCH',
    L2: 'WARNING',
    L3: 'CRITICAL',
  } as Record<string, string>,

  riskIcons: {
    L0: '🟢',
    L1: '🟡',
    L2: '🟠',
    L3: '🔴',
  } as Record<string, string>,

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
  },

  radius: {
    sm: '2px',
    md: '4px',
    lg: '6px',
  },

  fonts: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  },

  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.04)',
    md: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    lg: '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
  },
} as const;
