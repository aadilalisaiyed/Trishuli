// ============================================================
// MineSafe AI — Application Configuration
// ============================================================

import type { MapProvider } from '../types';

export const config = {
  app: {
    name: 'MineSafe AI',
    tagline: 'Real-Time Mine Subsidence Intelligence & Early Warning',
    version: '1.0.0-prototype',
  },

  mine: {
    id: 'PROTO-01',
    name: 'Prototype Mine',
    location: 'Demonstration Site, Jharkhand, India',
    fullName: 'Prototype Mine — Demonstration Site, Jharkhand, India',
    // Center point near Dhanbad, Jharkhand — India's coal capital
    latitude: 23.7945,
    longitude: 86.4305,
    zoom: 17,
  },

  map: {
    provider: (import.meta.env.VITE_MAP_PROVIDER as MapProvider) || 'esri',
    apiKey: import.meta.env.VITE_MAP_API_KEY || '',
    defaultZoom: 17,
    minZoom: 10,
    maxZoom: 19,
  },

  simulation: {
    updateInterval: 3000, // ms — sensor update interval
    historyPoints: 100,   // number of historical data points
  },

  auth: {
    demoUsername: 'admin',
    demoPassword: 'minesafe2026',
    sessionKey: 'minesafe_auth',
  },

  indicators: {
    count: 5,
    label: '5 monitored indicators',
    names: ['Tilt', 'Displacement', 'Vibration', 'Crack Detection', 'Relative Movement'],
  },
} as const;

// Map tile URL configurations
export const mapTileConfigs: Record<string, { url: string; attribution: string; name: string }> = {
  esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    name: 'ESRI Satellite',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: 'OpenStreetMap',
  },
  mapbox: {
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAP_API_KEY || ''}`,
    attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
    name: 'Mapbox Satellite',
  },
};
