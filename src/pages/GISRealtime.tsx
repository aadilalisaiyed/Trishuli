import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Radio, Globe } from 'lucide-react';
import { fetchMineNodesApi } from '../services/nodesService';

// Static demonstration overlay until a GIS/InSAR backend layer is available.
const insarRiskZoneGeoJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Jharia Coalfield InSAR Subsidence Risk Zone',
        riskLevel: 'HIGH_SUBSIDENCE_RISK',
        rate: '-24 mm/year',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [86.37, 23.72],
            [86.46, 23.72],
            [86.47, 23.78],
            [86.38, 23.79],
            [86.37, 23.72],
          ],
        ],
      },
    },
  ],
};

interface SensorAlertData {
  nodeId: string;
  displacement: string;
  status: string;
  timestamp?: string;
}

export function GISRealtimePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const sensorMarkersRef = useRef<Record<string, L.CircleMarker>>({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [latestAlert, setLatestAlert] = useState<SensorAlertData | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // 1. Initialize Leaflet Map centered over Dhanbad / Jharkhand mining region
    const map = L.map(mapContainerRef.current, {
      center: [23.75, 86.41],
      zoom: 12,
      zoomControl: true,
    });
    mapRef.current = map;

    // 2. Base Maps
    const satelliteView = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }
    );

    const streetMap = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    );

    // Set Satellite View as default base layer
    satelliteView.addTo(map);

    const baseMaps = {
      'Satellite View': satelliteView,
      'Street Map': streetMap,
    };

    // 3. Overlays
    // Layer 1: Jharkhand Districts GeoJSON (fetched asynchronously)
    const jharkhandLayer = L.geoJSON(null, {
      style: {
        color: '#FFFFFF',
        weight: 1.5,
        fillColor: '#FFFFFF',
        fillOpacity: 0.1,
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.district) {
          layer.bindTooltip(`District: ${feature.properties.district}`, { sticky: true });
        }
      },
    });

    fetch(
      'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/state-and-districts/jharkhand.geojson'
    )
      .then((res) => res.json())
      .then((data) => {
        jharkhandLayer.addData(data);
      })
      .catch((err) => {
        console.warn('Failed to load Jharkhand GeoJSON:', err);
      });

    // Layer 2: QGIS InSAR Risk Zones
    const insarLayer = L.geoJSON(insarRiskZoneGeoJSON, {
      style: {
        color: '#DC2626',
        weight: 2,
        fillColor: '#EF4444',
        fillOpacity: 0.4,
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px;">
            <strong style="color: #DC2626;">${props.name}</strong><br/>
            <b>Risk Level:</b> ${props.riskLevel}<br/>
            <b>Subsidence Rate:</b> ${props.rate}
          </div>
        `);
      },
    });

    // Layer 3: Live IoT Sensors, populated from the backend node records.
    const sensorsLayerGroup = L.layerGroup();

    const renderNode = (node: any) => {
      const reading = node.latest_reading;
      const risk = reading?.risk_level || 'L0';
      const isCritical = risk === 'L2' || risk === 'L3';
      const color = isCritical ? '#DC2626' : risk === 'L1' ? '#F59E0B' : '#10B981';
      const marker = sensorMarkersRef.current[node.id] || L.circleMarker([node.latitude, node.longitude], {
        radius: 9, fillColor: color, color, weight: 2, opacity: 1, fillOpacity: 0.85,
      });
      marker.setLatLng([node.latitude, node.longitude]);
      marker.setStyle({ fillColor: color, color });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; min-width: 160px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 4px;">Node ID: ${node.id}</div>
          <div><b>Status:</b> ${node.status}</div>
          <div><b>Risk:</b> ${risk}</div>
          <div><b>Displacement:</b> ${reading?.displacement ?? '—'} mm</div>
        </div>
      `);
      if (!sensorMarkersRef.current[node.id]) {
        sensorMarkersRef.current[node.id] = marker;
        sensorsLayerGroup.addLayer(marker);
      }
    };

    fetchMineNodesApi('PROTO-01').then(nodes => nodes.forEach(renderNode)).catch(err => console.warn('[GIS Nodes API]', err));

    // Add default overlays to map
    jharkhandLayer.addTo(map);
    insarLayer.addTo(map);
    sensorsLayerGroup.addTo(map);

    const overlayMaps = {
      'Jharkhand Districts': jharkhandLayer,
      'Demonstration InSAR Risk Zone': insarLayer,
      'Live IoT Sensors': sensorsLayerGroup,
    };

    // Add Layer Control menu in top right
    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);

    // 4. Native FastAPI WebSocket integration
    const wsBase = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/api/v1/ws';
    const socket = new WebSocket(`${wsBase}/mines/PROTO-01/live`);
    socket.onopen = () => {
      setSocketConnected(true);
    };
    socket.onclose = () => {
      setSocketConnected(false);
    };
    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'NODE_TICK') {
          message.payload?.nodes?.forEach(renderNode);
        }
        if (message.type === 'NEW_ALERT' && message.payload?.alert) {
          const alert = message.payload.alert;
          setLatestAlert({ nodeId: alert.node_id, displacement: `${alert.predicted_deformation ?? 0} mm`, status: alert.severity, timestamp: alert.timestamp });
        }
      } catch (err) {
        console.warn('[GIS WebSocket Message]', err);
      }
    };

    return () => {
      socket.close();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full p-4 gap-4" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
      {/* Header Banner */}
      <div
        className="flex items-center justify-between p-4 rounded-lg border shadow-sm"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-md"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            <Globe size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              GIS Realtime Intelligence Map
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Live node coordinates, demonstration InSAR overlay &amp; native FastAPI WebSocket telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: socketConnected ? '#10B981' : '#F59E0B' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {socketConnected ? 'WebSocket Live' : 'WebSocket Ready'}
            </span>
          </div>

        </div>
      </div>

      {/* Alert Notification Toast */}
      {latestAlert && (
        <div
          className="flex items-center justify-between p-3 rounded-md border text-sm animate-fade-in"
          style={{
            background: 'var(--critical-bg)',
            borderColor: 'var(--critical)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="flex items-center gap-2">
            <Radio size={16} color="var(--critical)" className="animate-pulse" />
            <span>
              <strong>Realtime Alert Received:</strong> Node <b>{latestAlert.nodeId}</b> triggered status <b>{latestAlert.status}</b> with displacement <b>{latestAlert.displacement}</b>
            </span>
          </div>
          <button
            onClick={() => setLatestAlert(null)}
            className="text-xs font-bold px-2 py-0.5 rounded border"
            style={{ borderColor: 'var(--border)' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Leaflet Map Canvas Container */}
      <div
        className="flex-1 w-full rounded-lg border shadow-sm overflow-hidden"
        style={{ minHeight: '520px', borderColor: 'var(--border)', position: 'relative', zIndex: 1 }}
      >
        <div ref={mapContainerRef} className="h-full w-full" style={{ height: '100%', minHeight: '520px' }} />
      </div>
    </div>
  );
}
