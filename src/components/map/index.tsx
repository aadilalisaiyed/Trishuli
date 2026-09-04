// ============================================================
// MineSafe AI — Map Components
// ============================================================

import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { NodeData, MapLayerConfig, SafeZone } from '../../types';
import { getMapTileConfig, getLabelsLayerConfig, getMineCenter } from '../../services/mapService';
import { mineData, safeZones, evacuationRoutes } from '../../data/nodes';
import { RiskBadge } from '../common';
import './map.css';

// Fix standard leaflet icon issue in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to pan/zoom map programmatically
function MapController({ focusCoord, zoom }: { focusCoord?: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (focusCoord) {
      map.flyTo(focusCoord, zoom || 17, { duration: 1.2 });
    }
  }, [focusCoord, zoom, map]);
  return null;
}

// Custom Node Icon Builder
function createNodeIcon(node: NodeData, isSelected: boolean) {
  const isL3 = node.riskLevel === 'L3';
  const colorMap = {
    L0: '#16A34A',
    L1: '#EAB308',
    L2: '#F97316',
    L3: '#DC2626',
  };
  const color = colorMap[node.riskLevel];

  const html = `
    <div class="custom-node-marker ${isL3 ? 'pulse-critical' : ''} ${isSelected ? 'selected' : ''}" style="--node-color: ${color}">
      <div class="marker-badge" style="background: ${color};">
        <span class="marker-id">${node.id}</span>
        <span class="marker-level">${node.riskLevel}</span>
      </div>
      <div class="marker-stem" style="border-top-color: ${color};"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 42],
    popupAnchor: [0, -40],
  });
}

// Safe Zone Icon Builder
function createSafeZoneIcon(zone: SafeZone) {
  const html = `
    <div class="safe-zone-marker">
      <div class="safe-zone-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <span class="safe-zone-label">${zone.id}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-safezone-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 32],
    popupAnchor: [0, -30],
  });
}

// --- Node Popup Component ---
export function NodePopup({ node }: { node: NodeData }) {
  const navigate = useNavigate();

  return (
    <div className="node-popup-content">
      <div className="popup-header">
        <div className="popup-title">
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Node {node.id}</span>
          <span className="text-xs text-muted">({node.latitude.toFixed(4)}, {node.longitude.toFixed(4)})</span>
        </div>
        <RiskBadge level={node.riskLevel} size="sm" />
      </div>

      <div className="popup-ai-strip">
        <div className="flex items-center gap-xs">
          <Sparkles size={13} color="var(--ai)" />
          <span className="text-xs" style={{ fontWeight: 600, color: 'var(--ai)' }}>AI Risk: {node.riskScore}%</span>
        </div>
        <span className="text-xs text-muted">Pred: {node.predictedDeformation > 0 ? `+${node.predictedDeformation}` : node.predictedDeformation} mm</span>
      </div>

      <div className="popup-grid">
        <div className="popup-metric">
          <span className="label">Tilt</span>
          <span className={`value ${node.sensorStatus.tilt ? 'abnormal' : ''}`}>{node.readings.tilt.toFixed(2)}°</span>
        </div>
        <div className="popup-metric">
          <span className="label">Displacement</span>
          <span className={`value ${node.sensorStatus.displacement ? 'abnormal' : ''}`}>{node.readings.displacement.toFixed(1)} mm</span>
        </div>
        <div className="popup-metric">
          <span className="label">Vibration</span>
          <span className={`value ${node.sensorStatus.vibration ? 'abnormal' : ''}`}>{node.readings.vibration.toFixed(0)}%</span>
        </div>
        <div className="popup-metric">
          <span className="label">Crack</span>
          <span className={`value ${node.sensorStatus.crack ? 'abnormal' : ''}`}>{node.readings.crackDetected ? 'DETECTED' : 'None'}</span>
        </div>
        <div className="popup-metric" style={{ gridColumn: 'span 2' }}>
          <span className="label">Relative Movement</span>
          <span className={`value ${node.sensorStatus.relativeMovement ? 'abnormal' : ''}`}>{node.readings.relativeMovement.toFixed(1)} mm</span>
        </div>
      </div>

      <div className="popup-actions">
        <button
          className="btn btn-primary btn-sm w-full"
          onClick={() => navigate(`/detail/${node.id}`)}
        >
          View Details <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// --- Map Layer Controls ---
export function MapLayerControl({
  layers,
  onChange,
}: {
  layers: MapLayerConfig;
  onChange: (key: keyof MapLayerConfig, val: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="map-layer-control">
      <button
        className="map-layer-toggle-btn"
        onClick={() => setOpen(!open)}
        title="Toggle Map Layers"
      >
        <Layers size={16} />
        <span>Map Layers</span>
      </button>

      {open && (
        <div className="map-layer-panel animate-fade-in">
          <div className="layer-panel-title">Map Layers</div>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={layers.satellite}
              onChange={e => onChange('satellite', e.target.checked)}
            />
            <span>Satellite / GIS Context</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={layers.sensorNodes}
              onChange={e => onChange('sensorNodes', e.target.checked)}
            />
            <span>Sensor Nodes (3)</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={layers.sensorRiskHeatmap}
              onChange={e => onChange('sensorRiskHeatmap', e.target.checked)}
            />
            <span>Observed Sensor Risk Heatmap</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={layers.aiPredictionHeatmap}
              onChange={e => onChange('aiPredictionHeatmap', e.target.checked)}
            />
            <span>AI Prediction Heatmap (Risk Intensity)</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={layers.mineBoundary}
              onChange={e => onChange('mineBoundary', e.target.checked)}
            />
            <span>Mine Boundary</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={layers.safeZones}
              onChange={e => onChange('safeZones', e.target.checked)}
            />
            <span>Safe Zones / Refuge (R-01, R-02)</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={layers.evacuationRoute}
              onChange={e => onChange('evacuationRoute', e.target.checked)}
            />
            <span>Evacuation Route</span>
          </label>
        </div>
      )}
    </div>
  );
}

// --- Map Legend ---
export function MapLegend() {
  return (
    <div className="map-legend-card">
      <div className="legend-section">
        <div className="legend-title">Risk Levels (5 Indicators)</div>
        <div className="legend-items">
          <div className="legend-item"><span className="legend-dot" style={{ background: '#16A34A' }} /> L0 Normal</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#EAB308' }} /> L1 Watch (1-2)</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#F97316' }} /> L2 Warning (3-4)</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: '#DC2626' }} /> L3 Critical (All 5)</div>
        </div>
      </div>
      <div className="legend-divider" />
      <div className="legend-section">
        <div className="legend-title">Intelligence Heatmaps</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-box" style={{ background: 'linear-gradient(90deg, rgba(22,163,74,0.4), rgba(220,38,38,0.7))' }} />
            <span>Observed Sensor Risk</span>
          </div>
          <div className="legend-item">
            <span className="legend-box" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.3), rgba(109,40,217,0.75))' }} />
            <span>AI Predicted Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Observed Sensor Risk Heatmap Layer ---
function ObservedSensorRiskHeatmap({ nodes }: { nodes: NodeData[] }) {
  const riskColorScale = {
    L0: { color: '#16A34A', opacity: 0.25, radius: 45 },
    L1: { color: '#EAB308', opacity: 0.35, radius: 65 },
    L2: { color: '#F97316', opacity: 0.45, radius: 85 },
    L3: { color: '#DC2626', opacity: 0.60, radius: 110 },
  };

  return (
    <>
      {nodes.map(node => {
        const style = riskColorScale[node.riskLevel];
        return (
          <React.Fragment key={`sensor-heat-${node.id}`}>
            {/* Outer halo */}
            <Circle
              center={[node.latitude, node.longitude]}
              radius={style.radius}
              pathOptions={{
                color: style.color,
                fillColor: style.color,
                fillOpacity: style.opacity * 0.4,
                weight: 0,
              }}
            />
            {/* Core heat */}
            <Circle
              center={[node.latitude, node.longitude]}
              radius={style.radius * 0.5}
              pathOptions={{
                color: style.color,
                fillColor: style.color,
                fillOpacity: style.opacity,
                weight: 1,
              }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

// --- AI Prediction Heatmap Layer ---
function AIPredictionHeatmap({ nodes }: { nodes: NodeData[] }) {
  return (
    <>
      {nodes.map(node => {
        if (node.riskScore < 20) return null;
        const normalized = Math.min(Math.max(node.riskScore / 100, 0.2), 1);
        const radius = 60 + normalized * 80;
        const opacity = 0.2 + normalized * 0.4;
        const fillColor = node.riskScore > 70 ? '#7C3AED' : '#6366F1';

        return (
          <React.Fragment key={`ai-heat-${node.id}`}>
            <Circle
              center={[node.latitude, node.longitude]}
              radius={radius}
              pathOptions={{
                color: '#7C3AED',
                fillColor,
                fillOpacity: opacity * 0.5,
                weight: 1.5,
                dashArray: '4, 4',
              }}
            />
            <Circle
              center={[node.latitude, node.longitude]}
              radius={radius * 0.4}
              pathOptions={{
                color: '#6D28D9',
                fillColor: '#6D28D9',
                fillOpacity: opacity,
                weight: 0,
              }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

// --- Main MineMap Container Component ---
export interface MineMapProps {
  nodes: NodeData[];
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
  height?: string | number;
  showLayersControl?: boolean;
  showLegend?: boolean;
  initialLayers?: Partial<MapLayerConfig>;
  focusCoord?: [number, number];
  focusZoom?: number;
}

export function MineMap({
  nodes,
  selectedNodeId,
  onSelectNode,
  height = '100%',
  showLayersControl = true,
  showLegend = true,
  initialLayers,
  focusCoord,
  focusZoom,
}: MineMapProps) {
  const [layers, setLayers] = React.useState<MapLayerConfig>({
    satellite: true,
    sensorNodes: true,
    sensorRiskHeatmap: true,
    aiPredictionHeatmap: true,
    mineBoundary: true,
    safeZones: true,
    evacuationRoute: false,
    ...initialLayers,
  });

  const tileConfig = useMemo(() => getMapTileConfig(), []);
  const labelsConfig = useMemo(() => getLabelsLayerConfig(), []);
  const center = useMemo(() => getMineCenter(), []);

  const handleLayerToggle = (key: keyof MapLayerConfig, val: boolean) => {
    setLayers(prev => ({ ...prev, [key]: val }));
  };

  // Determine if critical evacuation route should automatically suggest/show
  const hasL3 = nodes.some(n => n.riskLevel === 'L3');

  return (
    <div className="mine-map-wrapper" style={{ height }}>
      {showLayersControl && (
        <MapLayerControl layers={layers} onChange={handleLayerToggle} />
      )}

      {showLegend && <MapLegend />}

      <MapContainer
        center={center}
        zoom={17}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '380px', background: '#1E293B' }}
      >
        <MapController focusCoord={focusCoord} zoom={focusZoom} />

        {/* Layer 1: Satellite Tile Layer */}
        {layers.satellite && (
          <>
            <TileLayer
              attribution={tileConfig.attribution}
              url={tileConfig.url}
              maxZoom={19}
            />
            <TileLayer
              attribution={labelsConfig.attribution}
              url={labelsConfig.url}
              maxZoom={19}
            />
          </>
        )}

        {/* Mine Boundary Layer */}
        {layers.mineBoundary && (
          <Polygon
            positions={mineData.boundary}
            pathOptions={{
              color: '#38BDF8',
              weight: 2,
              dashArray: '6, 6',
              fillColor: '#0284C7',
              fillOpacity: 0.05,
            }}
          />
        )}

        {/* Layer 2A: Observed Sensor Risk Heatmap */}
        {layers.sensorRiskHeatmap && (
          <ObservedSensorRiskHeatmap nodes={nodes} />
        )}

        {/* Layer 2B: AI Prediction Heatmap */}
        {layers.aiPredictionHeatmap && (
          <AIPredictionHeatmap nodes={nodes} />
        )}

        {/* Safe Zones / Refuge Areas */}
        {layers.safeZones &&
          safeZones.map(zone => (
            <Marker
              key={zone.id}
              position={[zone.latitude, zone.longitude]}
              icon={createSafeZoneIcon(zone)}
            >
              <Popup>
                <div className="safezone-popup">
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{zone.name}</div>
                  <div className="text-xs text-muted" style={{ margin: '4px 0' }}>Type: {zone.type.toUpperCase()} CHAMBER</div>
                  <div className="text-xs">Capacity: <strong>{zone.capacity} personnel</strong></div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Simulated Evacuation Route */}
        {(layers.evacuationRoute || hasL3) &&
          evacuationRoutes.map(route => (
            <Polyline
              key={route.id}
              positions={route.points}
              pathOptions={{
                color: '#10B981',
                weight: 4,
                dashArray: '8, 8',
                opacity: 0.9,
              }}
            >
              <Popup>
                <div style={{ padding: '6px 10px', fontSize: '0.8125rem' }}>
                  <strong>Evacuation Route to {route.toSafeZoneId}</strong>
                  <div>Distance: ~{route.distance} meters</div>
                  <div className="text-xs text-muted">Simulated refuge route</div>
                </div>
              </Popup>
            </Polyline>
          ))}

        {/* Sensor Nodes (N01, N02, N03) */}
        {layers.sensorNodes &&
          nodes.map(node => (
            <Marker
              key={node.id}
              position={[node.latitude, node.longitude]}
              icon={createNodeIcon(node, node.id === selectedNodeId)}
              eventHandlers={{
                click: () => onSelectNode && onSelectNode(node.id),
              }}
            >
              <Popup>
                <NodePopup node={node} />
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
