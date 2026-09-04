// ============================================================
// MineSafe AI — Map Service
// ============================================================
// Abstracts map tile provider configuration.
// Switch providers via VITE_MAP_PROVIDER environment variable.

import { config, mapTileConfigs } from '../config';
import type { MapProvider } from '../types';

export interface MapTileConfig {
  url: string;
  attribution: string;
  name: string;
}

/**
 * Get tile configuration for the current map provider.
 * Falls back to ESRI satellite (free, no API key) if unavailable.
 */
export function getMapTileConfig(): MapTileConfig {
  const provider = config.map.provider as MapProvider;
  const tileConfig = mapTileConfigs[provider];

  if (!tileConfig) {
    // Fallback to ESRI
    return mapTileConfigs.esri;
  }

  // If mapbox selected but no API key, fall back to ESRI
  if (provider === 'mapbox' && !config.map.apiKey) {
    console.warn('Mapbox selected but no API key configured. Falling back to ESRI satellite tiles.');
    return mapTileConfigs.esri;
  }

  return tileConfig;
}

/**
 * Get the center coordinates for the mine.
 */
export function getMineCenter(): [number, number] {
  return [config.mine.latitude, config.mine.longitude];
}

/**
 * Get default zoom level.
 */
export function getDefaultZoom(): number {
  return config.map.defaultZoom;
}

/**
 * Get an OSM labels layer for use as an overlay on satellite imagery.
 */
export function getLabelsLayerConfig(): MapTileConfig {
  return {
    url: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    name: 'Labels',
  };
}
