import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Layers,
  Activity,
  MapPin,
  ShieldAlert,
  Radio,
  Sliders,
  Maximize2,
  TrendingDown,
  Compass,
  Cpu,
  RefreshCw,
  Globe,
  Flame,
  Droplets,
  BarChart3,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

// --- Custom Theme-Adaptive Leaflet Popup & Control Styles Injection ---
const injectMapStyles = () => {
  if (document.getElementById('gis-theme-map-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'gis-theme-map-styles';
  styleEl.innerHTML = `
    .leaflet-popup-content-wrapper, .leaflet-popup-tip {
      background: var(--card, #FFFFFF) !important;
      color: var(--text-primary, #111827) !important;
      border: 1px solid var(--border, #E2E8F0) !important;
      box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.15)) !important;
      border-radius: 8px !important;
    }
    .leaflet-popup-content {
      margin: 14px 16px !important;
      font-family: inherit !important;
    }
    .leaflet-container {
      background: var(--bg, #F8FAFC) !important;
      font-family: inherit !important;
    }
    .leaflet-control-zoom a {
      background-color: var(--card, #FFFFFF) !important;
      color: var(--text-primary, #111827) !important;
      border: 1px solid var(--border, #CBD5E1) !important;
      border-radius: 6px !important;
    }
    .leaflet-control-zoom a:hover {
      background-color: var(--card-hover, #F1F5F9) !important;
      color: var(--primary, #2563EB) !important;
    }
    .leaflet-control-attribution {
      background: var(--card, rgba(255, 255, 255, 0.9)) !important;
      color: var(--text-muted, #475569) !important;
      font-size: 10px !important;
      backdrop-filter: blur(4px);
      padding: 3px 8px !important;
      border-radius: 4px !important;
    }
    .leaflet-control-attribution a {
      color: var(--primary, #2563EB) !important;
    }
    @keyframes pulseRing {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.4); opacity: 0.2; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .pulse-ring {
      animation: pulseRing 2s infinite ease-in-out;
    }
  `;
  document.head.appendChild(styleEl);
};

// --- Custom Leaflet Sensor Icon Builder ---
const createCustomSensorIcon = (level: 'L0' | 'L1' | 'L2' | 'L3') => {
  const color =
    level === 'L3'
      ? '#EF4444'
      : level === 'L1' || level === 'L2'
      ? '#F59E0B'
      : '#10B981';

  return L.divIcon({
    className: 'custom-sensor-icon',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
        <span class="${level === 'L3' ? 'pulse-ring' : ''}" style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background-color: ${color}; opacity: 0.4;"></span>
        <div style="position: relative; width: 20px; height: 20px; border-radius: 50%; background-color: ${color}; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
          <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #FFFFFF;"></div>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// --- Map View Controller for Synchronization ---
function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true, duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

// --- Map Click Listener for Main Viewport ---
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// --- Mock Hardware Sensor Pins Data ---
const SENSOR_NODES = [
  {
    id: 'MESH-01',
    pmo: 'MESH-01',
    lat: 23.754,
    lng: 86.418,
    status: 'L3',
    statusText: 'L3 CRITICAL',
    vel: '284.6 mm/year',
    disp: '29.05 mm/year',
    range: '13127 - 24.57 mm/year',
  },
  {
    id: 'MESH-02',
    pmo: 'MESH-02',
    lat: 23.748,
    lng: 86.425,
    status: 'L1',
    statusText: 'L1 WARNING',
    vel: '84.2 mm/year',
    disp: '12.10 mm/year',
    range: '8420 - 12.10 mm/year',
  },
  {
    id: 'MESH-03',
    pmo: 'MESH-03',
    lat: 23.756,
    lng: 86.408,
    status: 'L0',
    statusText: 'L0 NORMAL',
    vel: '14.5 mm/year',
    disp: '3.20 mm/year',
    range: '1450 - 3.20 mm/year',
  },
  {
    id: 'MESH-04',
    pmo: 'MESH-04',
    lat: 23.742,
    lng: 86.411,
    status: 'L2',
    statusText: 'L2 WATCH',
    vel: '142.8 mm/year',
    disp: '18.60 mm/year',
    range: '14280 - 18.60 mm/year',
  },
  {
    id: 'MESH-05',
    pmo: 'MESH-05',
    lat: 23.761,
    lng: 86.431,
    status: 'L0',
    statusText: 'L0 NORMAL',
    vel: '9.1 mm/year',
    disp: '1.80 mm/year',
    range: '910 - 1.80 mm/year',
  },
  {
    id: 'MESH-06',
    pmo: 'MESH-06',
    lat: 23.738,
    lng: 86.435,
    status: 'L3',
    statusText: 'L3 CRITICAL',
    vel: '312.0 mm/year',
    disp: '34.10 mm/year',
    range: '15200 - 34.10 mm/year',
  },
  {
    id: 'MESH-07',
    pmo: 'MESH-07',
    lat: 23.751,
    lng: 86.398,
    status: 'L0',
    statusText: 'L0 NORMAL',
    vel: '11.4 mm/year',
    disp: '2.40 mm/year',
    range: '1140 - 2.40 mm/year',
  },
  {
    id: 'MESH-08',
    pmo: 'MESH-08',
    lat: 23.765,
    lng: 86.419,
    status: 'L1',
    statusText: 'L1 WARNING',
    vel: '78.3 mm/year',
    disp: '9.90 mm/year',
    range: '7830 - 9.90 mm/year',
  },
  {
    id: 'MESH-09',
    pmo: 'MESH-09',
    lat: 23.746,
    lng: 86.442,
    status: 'L0',
    statusText: 'L0 NORMAL',
    vel: '8.7 mm/year',
    disp: '1.50 mm/year',
    range: '870 - 1.50 mm/year',
  },
  {
    id: 'MESH-10',
    pmo: 'MESH-10',
    lat: 23.759,
    lng: 86.402,
    status: 'L2',
    statusText: 'L2 WATCH',
    vel: '118.5 mm/year',
    disp: '14.80 mm/year',
    range: '11850 - 14.80 mm/year',
  },
];

// --- Vector Layer Shapes ---
const JHARIA_MINE_PERIMETER: [number, number][] = [
  [23.762, 86.405],
  [23.768, 86.432],
  [23.752, 86.445],
  [23.738, 86.425],
  [23.742, 86.398],
];

// InSAR Gradient Heatmap Polygon
const INSAR_SUBSIDENCE_ZONE: [number, number][] = [
  [23.758, 86.412],
  [23.764, 86.428],
  [23.748, 86.436],
  [23.742, 86.418],
];

// DEM Contour Polylines
const CONTOUR_LINE_1: [number, number][] = [
  [23.758, 86.402],
  [23.762, 86.422],
  [23.755, 86.438],
];
const CONTOUR_LINE_2: [number, number][] = [
  [23.748, 86.408],
  [23.752, 86.428],
  [23.745, 86.442],
];

// NASA FIRMS Thermal Hotspot Data
const THERMAL_HOTSPOTS = [
  { id: 'TH-01', lat: 23.749, lng: 86.414, frp: 6.8, temp: 412, confidence: 'HIGH' },
  { id: 'TH-02', lat: 23.755, lng: 86.427, frp: 4.2, temp: 387, confidence: 'NOMINAL' },
  { id: 'TH-03', lat: 23.742, lng: 86.421, frp: 3.9, temp: 365, confidence: 'NOMINAL' },
  { id: 'TH-04', lat: 23.761, lng: 86.409, frp: 3.3, temp: 348, confidence: 'LOW' },
];

// Pore Pressure Hotspot Data
const PORE_PRESSURE_HOTSPOTS = [
  { id: 'PP-01', lat: 23.753, lng: 86.415, pressure: 142.5, depth: 15, saturation: 88, status: 'HIGH' },
  { id: 'PP-02', lat: 23.747, lng: 86.423, pressure: 98.2, depth: 10, saturation: 72, status: 'MODERATE' },
  { id: 'PP-03', lat: 23.759, lng: 86.411, pressure: 115.8, depth: 25, saturation: 81, status: 'MODERATE' },
];

export function GISRealtimePage() {
  const navigate = useNavigate();

  // Global Viewport & Filter State
  const [activeLat, setActiveLat] = useState<number>(23.7500);
  const [activeLng, setActiveLng] = useState<number>(86.4167);
  const [inputLat, setInputLat] = useState<string>('23.7500');
  const [inputLng, setInputLng] = useState<string>('86.4167');
  const [timeRange, setTimeRange] = useState<string>('live');

  // Interactive Layer Toggles for Map 2 (DEM)
  const [show3DHillshade, setShow3DHillshade] = useState<boolean>(true);
  const [showContour, setShowContour] = useState<boolean>(true);
  const [showSlopeHeatmap, setShowSlopeHeatmap] = useState<boolean>(true);

  // Interactive Layer Toggles for Map 3 (NASA FIRMS Thermal)
  const [showCoalFireHotspots, setShowCoalFireHotspots] = useState<boolean>(true);
  const [showThermalGradient, setShowThermalGradient] = useState<boolean>(true);
  const [showCriticalRiskZones, setShowCriticalRiskZones] = useState<boolean>(true);

  // Interactive Layer Toggles for Map 4 (Open-Meteo Soil Moisture)
  const [showMoistureHeatmap, setShowMoistureHeatmap] = useState<boolean>(true);
  const [showPorePressureRisk, setShowPorePressureRisk] = useState<boolean>(true);
  const [showHydroStratification, setShowHydroStratification] = useState<boolean>(true);

  // Open-Meteo Soil Moisture Data
  const [soilMoistureData, setSoilMoistureData] = useState<{
    sm_0_10: number;
    sm_10_40: number;
    sm_40_100: number;
  }>({ sm_0_10: 0.38, sm_10_40: 0.31, sm_40_100: 0.24 });
  const [soilMoistureLoading, setSoilMoistureLoading] = useState<boolean>(false);

  useEffect(() => {
    injectMapStyles();
  }, []);

  // Fetch Open-Meteo Soil Moisture on mount and when coordinates change
  useEffect(() => {
    const fetchSoilMoisture = async () => {
      setSoilMoistureLoading(true);
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${activeLat}&longitude=${activeLng}&hourly=soil_moisture_0_to_10cm,soil_moisture_10_to_40cm,soil_moisture_40_to_100cm&forecast_days=1`
        );
        const data = await res.json();
        if (data?.hourly) {
          const h = data.hourly;
          const latestIdx = Math.min(h.soil_moisture_0_to_10cm?.length - 1 || 0, 12);
          setSoilMoistureData({
            sm_0_10: h.soil_moisture_0_to_10cm?.[latestIdx] ?? 0.38,
            sm_10_40: h.soil_moisture_10_to_40cm?.[latestIdx] ?? 0.31,
            sm_40_100: h.soil_moisture_40_to_100cm?.[latestIdx] ?? 0.24,
          });
        }
      } catch {
        setSoilMoistureData({ sm_0_10: 0.38, sm_10_40: 0.31, sm_40_100: 0.24 });
      } finally {
        setSoilMoistureLoading(false);
      }
    };
    fetchSoilMoisture();
  }, [activeLat, activeLng]);

  // Update input text when active coordinates change
  const handleLocationSelect = (lat: number, lng: number) => {
    const formattedLat = parseFloat(lat.toFixed(4));
    const formattedLng = parseFloat(lng.toFixed(4));
    setActiveLat(formattedLat);
    setActiveLng(formattedLng);
    setInputLat(formattedLat.toString());
    setInputLng(formattedLng.toString());
  };

  // Jump to point button handler
  const handleJumpToPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setActiveLat(lat);
      setActiveLng(lng);
    }
  };

  // Telemetry Calculations based on timeRange
  const getTimeMultiplier = () => {
    switch (timeRange) {
      case '1yr':
        return 1.25;
      case '2yr':
        return 1.84;
      case '3yr':
        return 2.34;
      default:
        return 1.0;
    }
  };

  const mult = getTimeMultiplier();
  const maxSubsidence = (-24.8 * mult).toFixed(1);
  const coherenceVal = (Math.max(0.65, 0.87 - (mult - 1) * 0.08)).toFixed(2);

  // InSAR trend chart data
  const sparklineData = [
    { movement: -50, vel: 0 },
    { movement: -40, vel: Number((-5 * mult).toFixed(1)) },
    { movement: -30, vel: Number((-10 * mult).toFixed(1)) },
    { movement: -20, vel: Number((-16 * mult).toFixed(1)) },
    { movement: -10, vel: Number((-20 * mult).toFixed(1)) },
    { movement: 0, vel: Number((-24.8 * mult).toFixed(1)) },
  ];

  // Thermal telemetry (time-range adjusted)
  const thermalHotspotCount = THERMAL_HOTSPOTS.length;
  const totalFRP = THERMAL_HOTSPOTS.reduce((acc, h) => acc + h.frp, 0);
  const radiativePower = (totalFRP * mult).toFixed(1);
  const maxTemp = Math.round(THERMAL_HOTSPOTS[0].temp * (0.9 + mult * 0.1));

  // Soil moisture chart data
  const soilMoistureChartData = [
    { depth: '0–10cm', moisture: soilMoistureData.sm_0_10, fill: '#10B981' },
    { depth: '10–40cm', moisture: soilMoistureData.sm_10_40, fill: '#059669' },
    { depth: '40–100cm', moisture: soilMoistureData.sm_40_100, fill: '#047857' },
  ];

  // Derived soil metrics
  const surfaceSaturation = soilMoistureData.sm_0_10.toFixed(2);
  const porePressureRisk = soilMoistureData.sm_0_10 > 0.35 ? 'Medium' : soilMoistureData.sm_0_10 > 0.25 ? 'Low' : 'Minimal';
  const slopeFailureIndex = Math.min(99, Math.round(soilMoistureData.sm_0_10 * 30 + soilMoistureData.sm_10_40 * 10)).toString();

  return (
    <div
      className="min-h-screen w-full p-4 md:p-6 space-y-6 overflow-y-auto transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* 🗺️ TOP SECTION: MAIN INTERACTIVE GIS MAP & FLOATING CONTROLLER */}
      <div
        className="rounded-xl p-6 md:p-8 shadow-xl space-y-5 border transition-colors duration-200"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        {/* Main Header Strip */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Action Buttons with Reduced Radius & Spacious Padding */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/analytics')}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs md:text-sm px-5 py-3 rounded-lg transition-all flex items-center gap-2.5 shadow-md cursor-pointer border border-emerald-500/30 min-h-[40px]"
                style={{ backgroundColor: '#059669', color: '#FFFFFF' }}
              >
                <BarChart3 className="w-4 h-4 text-white" />
                <span className="text-white font-bold tracking-wide">Analyse</span>
              </button>
              <button
                onClick={() => navigate('/report')}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs md:text-sm px-5 py-3 rounded-lg transition-all flex items-center gap-2.5 shadow-md cursor-pointer border border-slate-700 min-h-[40px]"
                style={{ backgroundColor: '#1E293B', color: '#FFFFFF' }}
              >
                <FileText className="w-4 h-4 text-white" />
                <span className="text-white font-bold tracking-wide">Generate Report</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-[#34D399] border border-emerald-500/20">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold tracking-wide flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-primary)' }}>
                MINESAFE AI — REALTIME GIS & REMOTE SENSING DASHBOARD
                <span className="text-xs px-3.5 py-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-[#34D399] border border-emerald-500/30 font-mono font-semibold tracking-wider">
                  LIVE STREAM
                </span>
              </h1>
              <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Jharia Coalfield Open-Cast Mining Complex • Satellite Telemetry & Multi-Spectral Radar Analysis
              </p>
            </div>
          </div>

          {/* Quick System Telemetry Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-4 py-2.5 rounded-lg border flex items-center gap-2.5 text-xs font-medium" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span style={{ color: 'var(--text-muted)' }}>Sentinel-1 InSAR:</span>
              <span className="font-mono text-emerald-600 dark:text-[#34D399] font-bold">ONLINE</span>
            </div>
            <div className="px-4 py-2.5 rounded-lg border flex items-center gap-2.5 text-xs font-medium" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
              <Cpu className="w-4 h-4 text-amber-500" />
              <span style={{ color: 'var(--text-muted)' }}>Active Mesh Pins:</span>
              <span className="font-mono text-amber-600 dark:text-[#F59E0B] font-bold">10 DEPLOYED</span>
            </div>
          </div>
        </div>

        {/* Leaflet Main Viewport Canvas */}
        <div className="w-full h-[540px] rounded-xl border overflow-hidden relative shadow-lg" style={{ borderColor: 'var(--border)' }}>
          {/* Top-Left Location Indicator Overlay (z-[1000] sits ON TOP of map tiles) */}
          <div className="absolute top-5 left-5 z-[1000] px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 text-xs font-semibold backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="tracking-wide">Jharia Coalfield, Dhanbad, Jharkhand</span>
            <span className="font-mono text-[11px] ml-2" style={{ color: 'var(--text-muted)' }}>
              [{activeLat.toFixed(4)}°N, {activeLng.toFixed(4)}°E]
            </span>
          </div>

          <MapContainer
            center={[activeLat, activeLng]}
            zoom={13}
            zoomControl={true}
            style={{ width: '100%', height: '100%' }}
          >
            <MapController center={[activeLat, activeLng]} />
            <MapClickHandler onLocationSelect={handleLocationSelect} />

            {/* Base Tile Layer: Esri World Imagery */}
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />

            {/* Node Hardware Pins */}
            {SENSOR_NODES.map((node) => (
              <Marker
                key={node.id}
                position={[node.lat, node.lng]}
                icon={createCustomSensorIcon(node.status as any)}
              >
                <Popup>
                  <div className="space-y-2 text-xs font-sans p-2">
                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-bold text-sm text-emerald-600 dark:text-[#34D399] tracking-wide">{node.id}</span>
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          node.status === 'L3'
                            ? 'bg-red-500/20 text-red-600 dark:text-[#EF4444] border border-red-500/40'
                            : node.status === 'L1' || node.status === 'L2'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-[#F59E0B] border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-600 dark:text-[#34D399] border border-emerald-500/40'
                        }`}
                      >
                        {node.statusText}
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between gap-4" style={{ color: 'var(--text-muted)' }}>
                        <span>Node Pmo:</span>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{node.pmo}</span>
                      </div>
                      <div className="flex justify-between gap-4" style={{ color: 'var(--text-muted)' }}>
                        <span>Displacement Vel:</span>
                        <span className="text-emerald-600 dark:text-[#34D399] font-bold">{node.vel}</span>
                      </div>
                      <div className="flex justify-between gap-4" style={{ color: 'var(--text-muted)' }}>
                        <span>Displacement:</span>
                        <span className="text-amber-600 dark:text-[#F59E0B] font-bold">{node.disp}</span>
                      </div>
                      <div className="flex justify-between gap-4" style={{ color: 'var(--text-muted)' }}>
                        <span>Range:</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{node.range}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Floating Top-Right Overlay Controller (z-[1000] sits ON TOP of map tiles) */}
          <div className="absolute top-5 right-5 z-[1000] w-96 p-6 rounded-xl shadow-2xl space-y-4 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
                COORDINATE CONTROLLER & TIME SELECTOR
              </h2>
              <Sliders className="w-4 h-4 text-emerald-500" />
            </div>

            {/* Active Coordinates Badge */}
            <div className="p-4 rounded-lg border flex items-center justify-between text-xs font-mono" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
              <div>
                <span className="block text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>ACTIVE POSITION</span>
                <span className="text-emerald-600 dark:text-[#34D399] font-bold">
                  {activeLat.toFixed(4)}°N, {activeLng.toFixed(4)}°E
                </span>
              </div>
              <div className="text-right border-l pl-4" style={{ borderColor: 'var(--border)' }}>
                <span className="block text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>ELEVATION</span>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Elev: 218.4m</span>
              </div>
            </div>

            {/* Coordinate Search Input Form */}
            <form onSubmit={handleJumpToPoint} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border flex flex-col gap-1.5" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                  <label className="text-[10px] block font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>LATITUDE</label>
                  <input
                    type="text"
                    value={inputLat}
                    onChange={(e) => setInputLat(e.target.value)}
                    className="w-full border rounded-md px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    placeholder="23.7500"
                  />
                </div>
                <div className="p-3.5 rounded-lg border flex flex-col gap-1.5" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                  <label className="text-[10px] block font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>LONGITUDE</label>
                  <input
                    type="text"
                    value={inputLng}
                    onChange={(e) => setInputLng(e.target.value)}
                    className="w-full border rounded-md px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    placeholder="86.4167"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs py-3 px-5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer min-h-[40px]"
                style={{ backgroundColor: '#059669', color: '#FFFFFF' }}
              >
                <Search className="w-4 h-4 text-white" />
                <span className="text-white font-bold tracking-wide">JUMP TO POINT</span>
              </button>
            </form>

            {/* Historical Time-Range Select */}
            <div className="p-3.5 rounded-lg border flex flex-col gap-1.5" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
              <label className="text-[10px] block font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                HISTORICAL TIME RANGE
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full border rounded-md px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-medium"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="live">Live Stream</option>
                <option value="1yr">1 Year Back</option>
                <option value="2yr">2 Years Back</option>
                <option value="3yr">3 Years Back</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 🧱 BOTTOM SECTION: 2x2 GEOSPATIAL & REMOTE SENSING MATRIX */}
      <div className="rounded-xl p-6 md:p-8 shadow-xl space-y-5 border transition-colors duration-200" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        {/* Header Title */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm md:text-base font-bold tracking-wider uppercase flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Layers className="w-5 h-5 text-emerald-600 dark:text-[#34D399]" />
            GEOSPATIAL & REMOTE SENSING MATRIX
          </h2>
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <span>SYNCED</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>

        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[720px]">
          {/* MAP DIV 1 (Top-Left): InSAR Surface Subsidence Map */}
          <div className="rounded-xl p-5 border shadow-inner relative overflow-hidden flex flex-col h-[360px]" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            {/* Header Badge */}
            <div className="absolute top-5 left-5 z-[1000] px-4 py-2 rounded-md shadow-md flex items-center gap-2.5 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold tracking-wide">Sentinel-1 InSAR Deformation Layer</span>
            </div>

            {/* Leaflet Instance */}
            <div className="w-full h-full rounded-lg overflow-hidden relative">
              <MapContainer
                center={[activeLat, activeLng]}
                zoom={13}
                zoomControl={false}
                style={{ width: '100%', height: '100%' }}
              >
                <MapController center={[activeLat, activeLng]} />
                <TileLayer
                  attribution="Esri World Imagery"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                {/* Simulated InSAR Subsidence Heatmap Polygon */}
                <Polygon
                  positions={INSAR_SUBSIDENCE_ZONE}
                  pathOptions={{
                    fillColor: '#EF4444',
                    fillOpacity: 0.5,
                    color: '#F59E0B',
                    weight: 2,
                  }}
                />
              </MapContainer>
            </div>

            {/* Left Vertical Deformation Color Legend */}
            <div className="absolute left-5 top-20 z-[1000] p-3 rounded-md shadow-md flex flex-col items-center gap-1.5 font-mono text-xs backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <span className="text-emerald-600 dark:text-[#34D399] font-bold">+5mm</span>
              <div className="w-3.5 h-20 rounded bg-gradient-to-b from-[#34D399] via-[#F59E0B] to-[#EF4444] border" style={{ borderColor: 'var(--border)' }}></div>
              <span className="text-red-600 dark:text-[#EF4444] font-bold">-20mm</span>
            </div>

            {/* Center-Bottom Telemetry Pill */}
            <div className="absolute bottom-5 left-5 z-[1000] px-5 py-3 rounded-lg shadow-lg font-mono text-xs flex items-center gap-4 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>MAX SUBSIDENCE</span>
                <span className="text-red-600 dark:text-[#EF4444] font-bold">{maxSubsidence} mm/year</span>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }}></div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>COHERENCE</span>
                <span className="text-emerald-600 dark:text-[#34D399] font-bold">{coherenceVal}</span>
              </div>
            </div>

            {/* Right Overlay: Mini Recharts Sparkline Graph */}
            <div className="absolute bottom-5 right-5 z-[1000] w-60 h-36 p-4 rounded-lg shadow-lg flex flex-col justify-between backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>VERTICAL DISPLACEMENT</span>
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="w-full h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line
                      type="monotone"
                      dataKey="vel"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card, #FFFFFF)',
                        borderColor: 'var(--border, #E2E8F0)',
                        fontSize: '10px',
                        color: 'var(--text-primary, #111827)',
                        borderRadius: '8px',
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* MAP DIV 2 (Top-Right): DEM with Satellite Imagery Map */}
          <div className="rounded-xl p-5 border shadow-inner relative overflow-hidden flex flex-col h-[360px]" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            {/* Header Badge */}
            <div className="absolute top-5 left-5 z-[1000] px-4 py-2 rounded-md shadow-md flex items-center gap-2.5 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <Compass className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-bold tracking-wide">Copernicus COP30 3D Hillshade DEM</span>
            </div>

            {/* Leaflet Instance */}
            <div className="w-full h-full rounded-lg overflow-hidden relative">
              <MapContainer
                center={[activeLat, activeLng]}
                zoom={13}
                zoomControl={false}
                style={{ width: '100%', height: '100%' }}
              >
                <MapController center={[activeLat, activeLng]} />
                <TileLayer
                  attribution="Esri World Imagery"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                {show3DHillshade && (
                  <TileLayer
                    opacity={0.6}
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}"
                  />
                )}
                {showContour && (
                  <>
                    <Polyline positions={CONTOUR_LINE_1} pathOptions={{ color: '#38BDF8', weight: 1.5, dashArray: '4,4' }} />
                    <Polyline positions={CONTOUR_LINE_2} pathOptions={{ color: '#38BDF8', weight: 1.5, dashArray: '4,4' }} />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Bottom-Left Telemetry Pill */}
            <div className="absolute bottom-5 left-5 z-[1000] px-5 py-3 rounded-lg shadow-lg font-mono text-xs flex items-center gap-4 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>ELEVATION</span>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>218.4m</span>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }}></div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>SLOPE</span>
                <span className="text-amber-600 font-bold">14.2°</span>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }}></div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>PIT MIN</span>
                <span className="text-emerald-600 dark:text-[#34D399] font-bold">182.0m</span>
              </div>
            </div>

            {/* Bottom-Right Interactive Toggle Switches */}
            <div className="absolute bottom-5 right-5 z-[1000] p-4 rounded-lg shadow-lg flex items-center gap-3.5 text-xs backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={show3DHillshade}
                  onChange={(e) => setShow3DHillshade(e.target.checked)}
                  className="accent-emerald-600 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>3D Hillshade</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={showContour}
                  onChange={(e) => setShowContour(e.target.checked)}
                  className="accent-emerald-600 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Contour (5m)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={showSlopeHeatmap}
                  onChange={(e) => setShowSlopeHeatmap(e.target.checked)}
                  className="accent-emerald-600 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>Slope Heatmap</span>
              </label>
            </div>
          </div>

          {/* MAP DIV 3 (Bottom-Left): NASA FIRMS Thermal Anomaly & Subsurface Fire */}
          <div className="rounded-xl p-5 border shadow-inner relative overflow-hidden flex flex-col h-[360px]" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            {/* Header Badge */}
            <div className="absolute top-5 left-5 z-[1000] px-4 py-2 rounded-md shadow-md flex items-center gap-2.5 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <Flame className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-xs font-bold tracking-wide">NASA FIRMS Subsurface Thermal Monitor</span>
            </div>

            {/* Leaflet Instance */}
            <div className="w-full h-full rounded-lg overflow-hidden relative">
              <MapContainer
                center={[activeLat, activeLng]}
                zoom={13}
                zoomControl={false}
                style={{ width: '100%', height: '100%' }}
              >
                <MapController center={[activeLat, activeLng]} />
                <TileLayer
                  attribution="Esri Dark Gray Canvas"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                />
                {/* Animated Thermal Hotspot Vector Circles */}
                {showCoalFireHotspots && THERMAL_HOTSPOTS.map((hotspot) => (
                  <CircleMarker
                    key={hotspot.id}
                    center={[hotspot.lat, hotspot.lng]}
                    radius={hotspot.confidence === 'HIGH' ? 18 : hotspot.confidence === 'NOMINAL' ? 14 : 10}
                    pathOptions={{
                      color: '#EF4444',
                      fillColor: hotspot.confidence === 'HIGH' ? '#EF4444' : '#F59E0B',
                      fillOpacity: 0.55,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-xs font-mono p-1">
                        <div className="font-bold text-red-500">{hotspot.id} — Thermal Anomaly</div>
                        <div>FRP: <span className="text-amber-500 font-bold">{hotspot.frp} MW</span></div>
                        <div>Temp: <span className="text-red-500 font-bold">{hotspot.temp} K</span></div>
                        <div>Confidence: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{hotspot.confidence}</span></div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
                {/* Thermal Gradient Overlay Zone */}
                {showThermalGradient && (
                  <Polygon
                    positions={INSAR_SUBSIDENCE_ZONE}
                    pathOptions={{
                      fillColor: '#EF4444',
                      fillOpacity: 0.2,
                      color: '#F59E0B',
                      weight: 1,
                      dashArray: '4,4',
                    }}
                  />
                )}
                {/* Critical Risk Zones */}
                {showCriticalRiskZones && (
                  <Polygon
                    positions={JHARIA_MINE_PERIMETER}
                    pathOptions={{
                      fillColor: '#EF4444',
                      fillOpacity: 0.1,
                      color: '#EF4444',
                      weight: 2,
                      dashArray: '8,4',
                    }}
                  />
                )}
              </MapContainer>
            </div>

            {/* Layer Switches Box (Top-Right) */}
            <div className="absolute top-5 right-5 z-[1000] p-4 rounded-lg shadow-lg flex flex-col gap-2 text-xs backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={showCoalFireHotspots}
                  onChange={(e) => setShowCoalFireHotspots(e.target.checked)}
                  className="accent-red-500 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>Coal Fire Hotspots</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={showThermalGradient}
                  onChange={(e) => setShowThermalGradient(e.target.checked)}
                  className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>Thermal Gradient Heatmap</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={showCriticalRiskZones}
                  onChange={(e) => setShowCriticalRiskZones(e.target.checked)}
                  className="accent-red-500 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>Critical Risk Zones</span>
              </label>
            </div>

            {/* Bottom Telemetry Row */}
            <div className="absolute bottom-5 left-5 right-5 z-[1000] px-5 py-3 rounded-lg shadow-lg font-mono text-xs flex items-center gap-4 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>THERMAL HOTSPOTS</span>
                <span className="text-red-500 font-bold">{thermalHotspotCount} Detected</span>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }}></div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>RADIATIVE POWER</span>
                <span className="text-amber-500 font-bold">{radiativePower} MW</span>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }}></div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>MAX TEMP</span>
                <span className="text-red-500 font-bold">{maxTemp} K</span>
              </div>
            </div>
          </div>

          {/* MAP DIV 4 (Bottom-Right): Open-Meteo Volumetric Soil Moisture & Hydro-Geology */}
          <div className="rounded-xl p-5 border shadow-inner relative overflow-hidden flex flex-col h-[360px]" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            {/* Header Badge */}
            <div className="absolute top-5 left-5 z-[1000] px-4 py-2 rounded-md shadow-md flex items-center gap-2.5 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <Droplets className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-bold tracking-wide">Open-Meteo Hydro-Geological Moisture Monitor</span>
              {soilMoistureLoading && (
                <span className="ml-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </div>

            {/* Leaflet Instance */}
            <div className="w-full h-full rounded-lg overflow-hidden relative">
              <MapContainer
                center={[activeLat, activeLng]}
                zoom={13}
                zoomControl={false}
                style={{ width: '100%', height: '100%' }}
              >
                <MapController center={[activeLat, activeLng]} />
                <TileLayer
                  attribution="Esri Dark Gray Canvas"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                />

                {/* Moisture Heatmap Polygon Overlay */}
                {showMoistureHeatmap && (
                  <Polygon
                    positions={INSAR_SUBSIDENCE_ZONE}
                    pathOptions={{
                      fillColor: soilMoistureData.sm_0_10 > 0.40 ? '#0284C7' : '#0EA5E9',
                      fillOpacity: 0.35,
                      color: soilMoistureData.sm_0_10 > 0.40 ? '#0284C7' : '#38BDF8',
                      weight: 2,
                    }}
                  />
                )}

                {/* Hydro Stratification Boundary Overlay */}
                {showHydroStratification && (
                  <Polygon
                    positions={JHARIA_MINE_PERIMETER}
                    pathOptions={{
                      fillColor: '#0284C7',
                      fillOpacity: 0.12,
                      color: '#0EA5E9',
                      weight: 1.5,
                      dashArray: '6,6',
                    }}
                  />
                )}

                {/* Pore Pressure Hotspot Markers */}
                {showPorePressureRisk && PORE_PRESSURE_HOTSPOTS.map((spot) => (
                  <CircleMarker
                    key={spot.id}
                    center={[spot.lat, spot.lng]}
                    radius={spot.status === 'HIGH' ? 16 : 12}
                    pathOptions={{
                      color: spot.status === 'HIGH' ? '#EF4444' : '#0EA5E9',
                      fillColor: spot.status === 'HIGH' ? '#EF4444' : '#38BDF8',
                      fillOpacity: 0.6,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-xs font-mono p-1">
                        <div className="font-bold text-sky-500">{spot.id} — Pore Pressure Hotspot</div>
                        <div>Pore Pressure: <span className="text-amber-500 font-bold">{spot.pressure} kPa</span></div>
                        <div>Sensor Depth: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{spot.depth} m</span></div>
                        <div>Saturation: <span className="text-emerald-500 font-bold">{spot.saturation}%</span></div>
                        <div>Risk Status: <span className={spot.status === 'HIGH' ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>{spot.status}</span></div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            {/* Interactive Layer Toggles Control Box (Top-Right Overlay) */}
            <div className="absolute top-5 right-5 z-[1000] p-4 rounded-lg shadow-lg flex flex-col gap-2 text-xs backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={showMoistureHeatmap}
                  onChange={(e) => setShowMoistureHeatmap(e.target.checked)}
                  className="accent-sky-500 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>Moisture Heatmap</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={showPorePressureRisk}
                  onChange={(e) => setShowPorePressureRisk(e.target.checked)}
                  className="accent-red-500 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>Pore-Pressure Risk Zones</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-slate-500/10 rounded-md transition-colors">
                <input
                  type="checkbox"
                  checked={showHydroStratification}
                  onChange={(e) => setShowHydroStratification(e.target.checked)}
                  className="accent-sky-500 rounded cursor-pointer w-4 h-4"
                />
                <span className="font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>Hydro Stratification (0-100cm)</span>
              </label>
            </div>

            {/* Bottom-Left Telemetry Pill */}
            <div className="absolute bottom-5 left-5 z-[1000] px-5 py-3 rounded-lg shadow-lg font-mono text-xs flex items-center gap-4 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>SURFACE SATURATION</span>
                <span className="text-emerald-600 dark:text-[#34D399] font-bold">{surfaceSaturation} m³/m³</span>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }}></div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>PORE PRESSURE RISK</span>
                <span className={`font-bold ${
                  porePressureRisk === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                }`}>{porePressureRisk}</span>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }}></div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>SLOPE FAILURE IDX</span>
                <span className="text-amber-500 font-bold">{slopeFailureIndex}%</span>
              </div>
            </div>

            {/* Bottom-Right Recharts BarChart — Depth-Stratified Moisture */}
            <div className="absolute bottom-5 right-5 z-[1000] w-64 p-4 rounded-lg shadow-lg flex flex-col gap-2 backdrop-blur-md border" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-mono flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>SOIL MOISTURE BY DEPTH</span>
                <span className="text-emerald-600 dark:text-[#34D399] font-bold">m³/m³</span>
              </div>
              <div className="w-full" style={{ height: 100 }}>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={soilMoistureChartData} barCategoryGap="20%">
                    <XAxis dataKey="depth" stroke="#94A3B8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} domain={[0, 0.5]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card, #FFFFFF)',
                        borderColor: 'var(--border, #E2E8F0)',
                        fontSize: '10px',
                        color: 'var(--text-primary, #111827)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value.toFixed(3)} m³/m³`, 'Moisture']}
                    />
                    <Bar dataKey="moisture" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
