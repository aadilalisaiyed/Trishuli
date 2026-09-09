import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io, Socket } from 'socket.io-client';
import { ShieldAlert, Radio, Globe } from 'lucide-react';

// Mock QGIS InSAR Risk Zone GeoJSON Polygon (Jharia / Dhanbad Coalfield Subsidence Zone)
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
  const sensorMarkerRef = useRef<L.CircleMarker | null>(null);
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

    // Layer 3: Live IoT Sensors
    const sensorsLayerGroup = L.layerGroup();
    const sensorMarker = L.circleMarker([23.75, 86.41], {
      radius: 10,
      fillColor: '#10B981', // Green for Normal
      color: '#047857',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    });

    const initialPopupContent = `
      <div style="font-family: sans-serif; font-size: 13px; min-width: 140px;">
        <div style="font-weight: 700; color: #111827; margin-bottom: 4px;">Node ID: MESH-01</div>
        <div><b>Status:</b> <span style="color: #10B981; font-weight: 600;">Normal</span></div>
        <div><b>Displacement:</b> 0.0 mm</div>
      </div>
    `;
    sensorMarker.bindPopup(initialPopupContent);
    sensorsLayerGroup.addLayer(sensorMarker);
    sensorMarkerRef.current = sensorMarker;

    // Add default overlays to map
    jharkhandLayer.addTo(map);
    insarLayer.addTo(map);
    sensorsLayerGroup.addTo(map);

    const overlayMaps = {
      'Jharkhand Districts': jharkhandLayer,
      'QGIS InSAR Risk Zones': insarLayer,
      'Live IoT Sensors': sensorsLayerGroup,
    };

    // Add Layer Control menu in top right
    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);

    // 4. WebSocket Integration
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8000';
    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('sensor_alert', (data: SensorAlertData) => {
      handleSensorAlert(data);
    });

    return () => {
      socket.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const handleSensorAlert = (data: SensorAlertData) => {
    setLatestAlert(data);
    const marker = sensorMarkerRef.current;
    if (marker) {
      const isCritical = data.status.toUpperCase() !== 'NORMAL';
      const color = isCritical ? '#EF4444' : '#10B981';
      const borderColor = isCritical ? '#991B1B' : '#047857';

      marker.setStyle({
        fillColor: color,
        color: borderColor,
      });

      const updatedPopupContent = `
        <div style="font-family: sans-serif; font-size: 13px; min-width: 150px;">
          <div style="font-weight: 700; color: #111827; margin-bottom: 4px;">Node ID: ${data.nodeId || 'MESH-01'}</div>
          <div><b>Status:</b> <span style="color: ${color}; font-weight: 700;">${data.status}</span></div>
          <div><b>Displacement:</b> <span style="font-weight: 600;">${data.displacement}</span></div>
          ${data.timestamp ? `<div style="font-size: 11px; color: #6B7280; margin-top: 4px;">${data.timestamp}</div>` : ''}
        </div>
      `;
      marker.setPopupContent(updatedPopupContent);
      marker.openPopup();
    }
  };

  // Helper trigger for testing real-time alert UI
  const triggerTestAlert = () => {
    const mockData: SensorAlertData = {
      nodeId: 'MESH-01',
      displacement: '18.4 mm',
      status: 'CRITICAL',
      timestamp: new Date().toLocaleTimeString(),
    };
    handleSensorAlert(mockData);
  };

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
              Live Spatial Layers, Jharkhand District Boundaries, QGIS InSAR Risk Zones &amp; Realtime IoT Websocket Telemetry
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

          <button
            onClick={triggerTestAlert}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--critical)' }}
          >
            <ShieldAlert size={14} />
            Simulate Alert
          </button>
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
