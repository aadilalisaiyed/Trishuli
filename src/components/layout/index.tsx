// ============================================================
// Khanraksh — Layout Components
// ============================================================

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Map, BarChart3, FileText, Server, AlertTriangle,
  Bell, LogOut, Menu, X, Activity, Radio, Sun, Moon, Globe
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { config } from '../../config';
import { formatDistanceToNowStrict } from 'date-fns';
import './layout.css';

// --- Role display name mapping ---
const roleDisplayNames: Record<string, string> = {
  'Safety Officer': 'Safety Officer',
  'Geotechnical Engineer': 'Geotech Engineer',
  'Mine Manager': 'Mine Manager',
  'GIS Analyst': 'GIS Analyst',
  'DGMS Inspector': 'DGMS Inspector',
  'admin': 'Administrator',
};

function getUserDisplayName(user: { name: string; role: string; username: string } | null): string {
  if (!user) return 'Guest';
  if (user.name && user.name !== 'demo' && user.name.toLowerCase() !== 'demo demo') return user.name;
  return roleDisplayNames[user.role] || user.role || user.username;
}

// --- Dark Mode Hook ---
function useDarkMode(): [boolean, () => void] {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('khanraksh_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('khanraksh_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);
  return [isDark, toggle];
}

// --- Header ---
export function Header() {
  const { state, logout, clearNotifications, markNotificationRead } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [isDark, toggleDark] = useDarkMode();
  const navigate = useNavigate();

  const unreadCount = state.notifications.filter(n => !n.read).length;
  const activeAlerts = state.alerts.filter(a => a.status === 'ACTIVE').length;
  const timeSinceUpdate = formatDistanceToNowStrict(state.lastUpdate, { addSuffix: false });

  const statusColor = state.systemStatus === 'CRITICAL' ? 'var(--critical)' :
    state.systemStatus === 'WARNING' ? 'var(--warning)' : 'var(--success)';

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <button className="btn-icon mobile-menu-btn" onClick={() => setShowMobileNav(!showMobileNav)}>
            {showMobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="header-brand">
            <img src="/logo.png" alt="MINESAFE AI" className="brand-logo" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            <span className="header-title">{config.app.name}</span>
          </div>
        </div>

        <div className="header-right">
          <div className="header-status-item">
            <span className="status-dot" style={{ background: statusColor }} />
            <span className="text-xs" style={{ color: statusColor, fontWeight: 600 }}>{state.systemStatus}</span>
          </div>
          <div className="header-divider" />
          <div className="header-status-item">
            <Activity size={14} color="var(--text-muted)" />
            <span className="text-xs text-muted">{timeSinceUpdate} ago</span>
          </div>
          <div className="header-divider" />
          <div className="header-status-item">
            <AlertTriangle size={14} color={activeAlerts > 0 ? 'var(--warning)' : 'var(--text-muted)'} />
            <span className="text-xs" style={{ color: activeAlerts > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
              {activeAlerts} alert{activeAlerts !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="header-divider" />

          {/* Dark Mode Toggle */}
          <button
            className="btn-icon theme-toggle"
            onClick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} color="var(--text-secondary)" /> : <Moon size={18} color="var(--text-secondary)" />}
          </button>
          <div className="header-divider" />

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button className="btn-icon" onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications" style={{ position: 'relative' }}>
              <Bell size={18} color="var(--text-secondary)" />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <NotificationPanel
                notifications={state.notifications}
                onClose={() => setShowNotifications(false)}
                onMarkRead={markNotificationRead}
                onClearAll={clearNotifications}
                onNavigate={(path) => { navigate(path); setShowNotifications(false); }}
              />
            )}
          </div>

          <div className="header-divider" />
          <div className="header-user">
            <span className="text-xs text-secondary">{getUserDisplayName(state.user)}</span>
            <button className="btn-icon" onClick={logout} aria-label="Log out" title="Log out">
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      {showMobileNav && (
        <div className="mobile-nav-overlay" onClick={() => setShowMobileNav(false)}>
          <nav className="mobile-nav" onClick={e => e.stopPropagation()}>
            <NavigationLinks onClick={() => setShowMobileNav(false)} />
          </nav>
        </div>
      )}
    </>
  );
}

// --- Notification Panel ---
function NotificationPanel({ notifications, onClose, onMarkRead, onClearAll, onNavigate }: {
  notifications: { id: string; type: string; title: string; message: string; timestamp: Date; read: boolean; nodeId?: string; alertId?: string }[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onNavigate: (path: string) => void;
}) {
  const typeColors: Record<string, string> = {
    critical: 'var(--critical)',
    warning: 'var(--warning)',
    watch: 'var(--watch)',
    system: 'var(--info)',
  };

  return (
    <div className="notification-panel animate-fade-in">
      <div className="notification-panel-header">
        <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>Notifications</span>
        <div className="flex items-center gap-sm">
          <button className="text-xs" style={{ color: 'var(--primary)' }} onClick={onClearAll}>Mark all read</button>
          <button onClick={onClose} style={{ fontSize: 18, color: 'var(--text-muted)' }}>×</button>
        </div>
      </div>
      <div className="notification-panel-body">
        {notifications.length === 0 ? (
          <div className="text-sm text-muted" style={{ padding: 24, textAlign: 'center' }}>No notifications</div>
        ) : (
          notifications.slice(0, 15).map(n => (
            <div
              key={n.id}
              className={`notification-item ${n.read ? '' : 'unread'}`}
              onClick={() => {
                onMarkRead(n.id);
                if (n.nodeId) onNavigate(`/detail/${n.nodeId}`);
                else onNavigate('/alerts');
              }}
            >
              <span className="status-dot" style={{ background: typeColors[n.type] || 'var(--info)', marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-sm" style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                <div className="text-xs text-muted truncate">{n.message}</div>
                <div className="text-xs text-muted">{formatDistanceToNowStrict(n.timestamp, { addSuffix: true })}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- Sidebar ---
export function Sidebar() {
  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        <NavigationLinks />
      </nav>
    </aside>
  );
}

// --- Navigation Links ---
function NavigationLinks({ onClick }: { onClick?: () => void }) {
  const navItems = [
    { to: '/dashboard', icon: <Map size={18} />, label: 'Node Live Map' },
    { to: '/gis-realtime', icon: <Globe size={18} />, label: 'GIS Realtime' },
    { to: '/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
    { to: '/report', icon: <FileText size={18} />, label: 'Report' },
    { to: '/server', icon: <Server size={18} />, label: 'Server Status' },
    { to: '/alerts', icon: <AlertTriangle size={18} />, label: 'Alerts' },
    { to: '/esp8266', icon: <Radio size={18} />, label: 'Nodes' },
  ];

  return (
    <>
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={onClick}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  );
}

// --- App Shell ---
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
