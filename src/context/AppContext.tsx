// ============================================================
// MineSafe AI — Application Context
// ============================================================
// Central state management for auth, nodes, alerts, simulation.

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { NodeData, Alert, DemoScenario, Notification, User, SystemStatus } from '../types';
import { initializeNodes, simulateTick, getSystemStatus } from '../services/simulationEngine';
import { generateSeedAlerts, createAlert, acknowledgeAlert as ackAlert, resolveAlert as resAlert } from '../services/alertService';
import { config } from '../config';

// --- State ---
interface AppState {
  user: User | null;
  nodes: NodeData[];
  alerts: Alert[];
  notifications: Notification[];
  scenario: DemoScenario;
  systemStatus: SystemStatus;
  lastUpdate: Date;
  isLoading: boolean;
}

const initialState: AppState = {
  user: null,
  nodes: [],
  alerts: [],
  notifications: [],
  scenario: 'NORMAL',
  systemStatus: 'OPERATIONAL',
  lastUpdate: new Date(),
  isLoading: true,
};

// --- Actions ---
type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_NODES'; nodes: NodeData[] }
  | { type: 'SET_ALERTS'; alerts: Alert[] }
  | { type: 'ADD_ALERT'; alert: Alert }
  | { type: 'ACKNOWLEDGE_ALERT'; alertId: string }
  | { type: 'RESOLVE_ALERT'; alertId: string }
  | { type: 'SET_SCENARIO'; scenario: DemoScenario }
  | { type: 'ADD_NOTIFICATION'; notification: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'TICK'; nodes: NodeData[] }
  | { type: 'SET_LOADING'; loading: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.user };
    case 'LOGOUT':
      return { ...initialState, user: null, isLoading: false };
    case 'SET_NODES':
      return { ...state, nodes: action.nodes, isLoading: false };
    case 'SET_ALERTS':
      return { ...state, alerts: action.alerts };
    case 'ADD_ALERT': {
      const notifType: 'critical' | 'warning' | 'watch' =
        action.alert.severity === 'L3' ? 'critical' : action.alert.severity === 'L2' ? 'warning' : 'watch';
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        type: notifType,
        title: `${action.alert.severity} Alert — ${action.alert.nodeId}`,
        message: action.alert.trigger,
        timestamp: new Date(),
        read: false,
        nodeId: action.alert.nodeId,
        alertId: action.alert.id,
      };
      return {
        ...state,
        alerts: [action.alert, ...state.alerts],
        notifications: [newNotification, ...state.notifications].slice(0, 50),
      };
    }
    case 'ACKNOWLEDGE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(a =>
          a.id === action.alertId ? ackAlert(a) : a
        ),
      };
    case 'RESOLVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(a =>
          a.id === action.alertId ? resAlert(a) : a
        ),
      };
    case 'SET_SCENARIO':
      return { ...state, scenario: action.scenario };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.notification, ...state.notifications].slice(0, 50),
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.id ? { ...n, read: true } : n
        ),
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'TICK':
      return {
        ...state,
        nodes: action.nodes,
        systemStatus: getSystemStatus(action.nodes),
        lastUpdate: new Date(),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    default:
      return state;
  }
}

// --- Context ---
interface AppContextValue {
  state: AppState;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  setScenario: (scenario: DemoScenario) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const scenarioRef = useRef<DemoScenario>(state.scenario);
  const nodesRef = useRef<NodeData[]>(state.nodes);
  const prevRiskLevelsRef = useRef<Record<string, string>>({});

  // Keep refs in sync
  useEffect(() => {
    scenarioRef.current = state.scenario;
  }, [state.scenario]);

  useEffect(() => {
    nodesRef.current = state.nodes;
  }, [state.nodes]);

  // Check auth on mount
  useEffect(() => {
    const stored = localStorage.getItem(config.auth.sessionKey);
    if (stored) {
      try {
        const user = JSON.parse(stored);
        dispatch({ type: 'LOGIN', user });
      } catch { /* ignore */ }
    }

    // Initialize nodes and alerts
    const nodes = initializeNodes();
    dispatch({ type: 'SET_NODES', nodes });
    dispatch({ type: 'SET_ALERTS', alerts: generateSeedAlerts() });

    // Store initial risk levels
    nodes.forEach(n => {
      prevRiskLevelsRef.current[n.id] = n.riskLevel;
    });
  }, []);

  // Simulation loop
  useEffect(() => {
    if (!state.user) return;

    const interval = setInterval(() => {
      const currentNodes = nodesRef.current;
      if (currentNodes.length === 0) return;

      const updated = simulateTick(currentNodes, scenarioRef.current);
      dispatch({ type: 'TICK', nodes: updated });

      // Generate alerts on risk level changes
      updated.forEach(node => {
        const prevLevel = prevRiskLevelsRef.current[node.id];
        if (node.riskLevel !== prevLevel && node.riskLevel !== 'L0') {
          const riskOrder = { L0: 0, L1: 1, L2: 2, L3: 3 };
          if (riskOrder[node.riskLevel] > riskOrder[prevLevel as keyof typeof riskOrder]) {
            const alert = createAlert(node);
            if (alert) {
              dispatch({ type: 'ADD_ALERT', alert });
            }
          }
        }
        prevRiskLevelsRef.current[node.id] = node.riskLevel;
      });
    }, config.simulation.updateInterval);

    return () => clearInterval(interval);
  }, [state.user]);

  const login = useCallback((username: string, password: string): boolean => {
    if (username === config.auth.demoUsername && password === config.auth.demoPassword) {
      const user: User = {
        id: '1',
        username,
        role: 'Safety Officer',
        name: 'Safety Officer / Regulator',
      };
      localStorage.setItem(config.auth.sessionKey, JSON.stringify(user));
      dispatch({ type: 'LOGIN', user });

      // Re-initialize on login
      const nodes = initializeNodes();
      dispatch({ type: 'SET_NODES', nodes });
      dispatch({ type: 'SET_ALERTS', alerts: generateSeedAlerts() });
      nodes.forEach(n => { prevRiskLevelsRef.current[n.id] = n.riskLevel; });

      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(config.auth.sessionKey);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setScenario = useCallback((scenario: DemoScenario) => {
    dispatch({ type: 'SET_SCENARIO', scenario });
  }, []);

  const acknowledgeAlertFn = useCallback((alertId: string) => {
    dispatch({ type: 'ACKNOWLEDGE_ALERT', alertId });
  }, []);

  const resolveAlertFn = useCallback((alertId: string) => {
    dispatch({ type: 'RESOLVE_ALERT', alertId });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  const value: AppContextValue = {
    state,
    login,
    logout,
    setScenario,
    acknowledgeAlert: acknowledgeAlertFn,
    resolveAlert: resolveAlertFn,
    markNotificationRead,
    clearNotifications,
  };

  return React.createElement(AppContext.Provider, { value }, children);
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
