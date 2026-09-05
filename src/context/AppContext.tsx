// ============================================================
// MineSafe AI — Application Context & Real-Time Engine
// ============================================================
// Central state management powered by REST APIs & WebSockets.

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { NodeData, Alert, DemoScenario, Notification, User, SystemStatus } from '../types';
import { config } from '../config';
import { loginApi, logoutApi, getCurrentUserApi, registerApi, type RegisterData } from '../services/authService';
import { fetchMineNodesApi } from '../services/nodesService';
import { fetchAlertsApi, acknowledgeAlertApi, resolveAlertApi } from '../services/alertService';
import { mapBackendNodeToFrontend, mapBackendAlertToFrontend } from '../services/transformers';

// --- State Interface ---
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

// --- Action Types ---
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

function getSystemStatusFromNodes(nodes: NodeData[]): SystemStatus {
  if (nodes.some(n => n.riskLevel === 'L3')) return 'CRITICAL';
  if (nodes.some(n => n.riskLevel === 'L2')) return 'WARNING';
  if (nodes.some(n => n.status === 'Offline')) return 'DEGRADED';
  return 'OPERATIONAL';
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.user };
    case 'LOGOUT':
      return { ...initialState, user: null, isLoading: false };
    case 'SET_NODES':
      return {
        ...state,
        nodes: action.nodes,
        systemStatus: getSystemStatusFromNodes(action.nodes),
        isLoading: false,
        lastUpdate: new Date(),
      };
    case 'SET_ALERTS':
      return { ...state, alerts: action.alerts };
    case 'ADD_ALERT': {
      const notifType: 'critical' | 'warning' | 'watch' =
        action.alert.severity === 'L3' ? 'critical' : action.alert.severity === 'L2' ? 'warning' : 'watch';
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        type: notifType,
        title: `${action.alert.severity} Alert — Node ${action.alert.nodeId}`,
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
          a.id === action.alertId
            ? { ...a, status: 'ACKNOWLEDGED', acknowledgedAt: new Date() }
            : a
        ),
      };
    case 'RESOLVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(a =>
          a.id === action.alertId
            ? { ...a, status: 'RESOLVED', resolvedAt: new Date() }
            : a
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
        systemStatus: getSystemStatusFromNodes(action.nodes),
        lastUpdate: new Date(),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    default:
      return state;
  }
}

// --- Context Definition ---
interface AppContextValue {
  state: AppState;
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  setScenario: (scenario: DemoScenario) => void;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  reloadMineData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Helper to load current nodes and alerts from REST backend
  const reloadMineData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      const [nodes, alerts] = await Promise.all([
        fetchMineNodesApi(config.mine.id),
        fetchAlertsApi(),
      ]);
      dispatch({ type: 'SET_NODES', nodes });
      dispatch({ type: 'SET_ALERTS', alerts });
    } catch (err) {
      console.error('[REST Error] Failed to fetch mine data:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, []);

  // 1. Check user auth & initial load on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('minesafe_access_token');
      if (token) {
        try {
          const user = await getCurrentUserApi();
          dispatch({ type: 'LOGIN', user });
          await reloadMineData();
        } catch {
          localStorage.removeItem('minesafe_access_token');
          localStorage.removeItem(config.auth.sessionKey);
          dispatch({ type: 'SET_LOADING', loading: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    };

    initAuth();
  }, [reloadMineData]);

  // 2. Real-Time WebSocket Telemetry Broadcast Engine
  useEffect(() => {
    if (!state.user) return;

    const wsBase = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/api/v1/ws';
    const wsUrl = `${wsBase}/mines/${config.mine.id}/live`;
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connect = () => {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[WebSocket Connected] Real-time stream active:', wsUrl);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NODE_TICK' && Array.isArray(data.payload?.nodes)) {
            const updatedNodes = data.payload.nodes.map(mapBackendNodeToFrontend);
            dispatch({ type: 'TICK', nodes: updatedNodes });
          } else if (data.type === 'NEW_ALERT' && data.payload?.alert) {
            const newAlert = mapBackendAlertToFrontend(data.payload.alert);
            dispatch({ type: 'ADD_ALERT', alert: newAlert });
          }
        } catch (err) {
          console.error('[WebSocket Message Error]', err);
        }
      };

      socket.onerror = (err) => {
        console.warn('[WebSocket Stream Warning]', err);
      };

      socket.onclose = () => {
        console.warn('[WebSocket Disconnected] Reconnecting in 3 seconds...');
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [state.user]);

  // Auth actions
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      const user = await loginApi(username, password);
      dispatch({ type: 'LOGIN', user });
      await reloadMineData();
      return true;
    } catch (err) {
      console.error('[Login Error]', err);
      dispatch({ type: 'SET_LOADING', loading: false });
      return false;
    }
  }, [reloadMineData]);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      const user = await registerApi(data);
      dispatch({ type: 'LOGIN', user });
      await reloadMineData();
      return true;
    } catch (err) {
      console.error('[Register Error]', err);
      dispatch({ type: 'SET_LOADING', loading: false });
      throw err;
    }
  }, [reloadMineData]);

  const logout = useCallback(async () => {
    await logoutApi();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setScenario = useCallback((scenario: DemoScenario) => {
    dispatch({ type: 'SET_SCENARIO', scenario });
  }, []);

  const acknowledgeAlertFn = useCallback(async (alertId: string) => {
    try {
      await acknowledgeAlertApi(alertId);
      dispatch({ type: 'ACKNOWLEDGE_ALERT', alertId });
    } catch (err) {
      console.error('[Acknowledge Alert Error]', err);
    }
  }, []);

  const resolveAlertFn = useCallback(async (alertId: string) => {
    try {
      await resolveAlertApi(alertId);
      dispatch({ type: 'RESOLVE_ALERT', alertId });
    } catch (err) {
      console.error('[Resolve Alert Error]', err);
    }
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
    register,
    logout,
    setScenario,
    acknowledgeAlert: acknowledgeAlertFn,
    resolveAlert: resolveAlertFn,
    markNotificationRead,
    clearNotifications,
    reloadMineData,
  };

  return React.createElement(AppContext.Provider, { value }, children);
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
