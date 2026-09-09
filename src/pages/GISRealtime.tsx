import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
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

// --- Custom Leaflet Popup & Control Styles Injection ---
const injectMapStyles = () => {
  if (document.getElementById('gis-dark-map-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'gis-dark-map-styles';
  styleEl.innerHTML = `
    .leaflet-popup-content-wrapper, .leaflet-popup-tip {
      background: #0A0A0A !important;
      color: #FFFFFF !important;
      border: 1px solid #262626 !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.8) !important;
      border-radius: 12px !important;
    }
    .leaflet-popup-content {
      margin: 12px 14px !important;
      font-family: inherit !important;
    }
    .leaflet-container {
      background: #000000 !important;
      font-family: inherit !important;
    }
    .leaflet-control-zoom a {
      background-color: #0A0A0A !important;
      color: #FFFFFF !important;
      border: 1px solid #262626 !important;
      border-radius: 6px !important;
    }
    .leaflet-control-zoom a:hover {
      background-color: #171717 !important;
      color: #34D399 !important;
    }
    .leaflet-control-attribution {
      background: rgba(10, 10, 10, 0.8) !important;
      color: #A3A3A3 !important;
      font-size: 10px !important;
      backdrop-filter: blur(4px);
    }
    .leaflet-control-attribution a {
      color: #34D399 !important;
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
        <div style="position: relative; width: 20px; height: 20px; border-radius: 50%; background-color: ${color}; display: flex; align-items: center; justify-content: center; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">
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

// --- Vector Layer Shapes for Map 3 ---
const JHARIA_MINE_PERIMETER: [number, number][] = [
  [23.762, 86.405],
  [23.768, 86.432],
  [23.752, 86.445],
  [23.738, 86.425],
  [23.742, 86.398],
];

const DISTRICT_BOUNDARIES: [number, number][] = [
  [23.785, 86.375],
  [23.792, 86.455],
  [23.715, 86.468],
  [23.710, 86.370],
  [23.785, 86.375],
];

const FAULT_LINES_1: [number, number][] = [
  [23.735, 86.395],
  [23.752, 86.422],
  [23.768, 86.445],
];

const FAULT_LINES_2: [number, number][] = [
  [23.762, 86.388],
  [23.745, 86.415],
  [23.732, 86.438],
];

// InSAR Gradient Heatmap Polygon for Map 1
const INSAR_SUBSIDENCE_ZONE: [number, number][] = [
  [23.758, 86.412],
  [23.764, 86.428],
  [23.748, 86.436],
  [23.742, 86.418],
];

// DEM Contour Polylines for Map 2
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

export function GISRealtimePage() {
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

  // Interactive Layer Toggles for Map 3 (Infrastructure)
  const [showDistrictBoundaries, setShowDistrictBoundaries] = useState<boolean>(true);
  const [showFaultLines, setShowFaultLines] = useState<boolean>(true);
  const [showMinePerimeters, setShowMinePerimeters] = useState<boolean>(true);

  useEffect(() => {
    injectMapStyles();
  }, []);

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
  const soilPenetration = (1.4 * mult).toFixed(1);
  const vvSignal = Math.round(48 / mult);
  const vhSignal = Math.round(62 / mult);

  // InSAR trend chart data
  const sparklineData = [
    { movement: -50, vel: 0 },
    { movement: -40, vel: Number((-5 * mult).toFixed(1)) },
    { movement: -30, vel: Number((-10 * mult).toFixed(1)) },
    { movement: -20, vel: Number((-16 * mult).toFixed(1)) },
    { movement: -10, vel: Number((-20 * mult).toFixed(1)) },
    { movement: 0, vel: Number((-24.8 * mult).toFixed(1)) },
  ];

  // SAR bar chart data
  const sarData = [
    { name: 'VV', db: vvSignal, fill: '#10B981' },
    { name: 'VH', db: vhSignal, fill: '#34D399' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#000000] p-6 text-white space-y-6 overflow-y-auto">
      {/* 🗺️ TOP SECTION: MAIN INTERACTIVE GIS MAP & FLOATING CONTROLLER */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Main Header Strip */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/20">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
                MINESAFE AI — REALTIME GIS & REMOTE SENSING DASHBOARD
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 font-mono font-semibold">
                  LIVE STREAM
                </span>
              </h1>
              <p className="text-xs text-[#A3A3A3]">
                Jharia Coalfield Open-Cast Mining Complex • Satellite Telemetry & Multi-Spectral Radar Analysis
              </p>
            </div>
          </div>

          {/* Quick System Telemetry Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-[#121212] border border-[#262626] flex items-center gap-2 text-xs">
              <Radio className="w-3.5 h-3.5 text-[#34D399] animate-pulse" />
              <span className="text-[#A3A3A3]">Sentinel-1 InSAR:</span>
              <span className="font-mono text-[#34D399] font-bold">ONLINE</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#121212] border border-[#262626] flex items-center gap-2 text-xs">
              <Cpu className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-[#A3A3A3]">Active Mesh Pins:</span>
              <span className="font-mono text-[#F59E0B] font-bold">10 DEPLOYED</span>
            </div>
          </div>
        </div>

        {/* Leaflet Main Viewport Canvas */}
        <div className="w-full h-[520px] rounded-2xl border border-[#262626] overflow-hidden relative shadow-2xl">
          {/* Top-Left Location Indicator Overlay */}
          <div className="absolute top-4 left-4 z-[1000] bg-[#0A0A0A]/90 backdrop-blur-md border border-[#262626] px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold">
            <MapPin className="w-4 h-4 text-[#34D399]" />
            <span className="text-white tracking-wide">Jharia Coalfield, Dhanbad, Jharkhand</span>
            <span className="text-[#A3A3A3] font-mono text-[11px] ml-2">
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
                  <div className="space-y-2 text-xs font-sans text-white p-1">
                    <div className="flex items-center justify-between border-b border-[#262626] pb-1.5">
                      <span className="font-bold text-sm text-[#34D399] tracking-wide">{node.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          node.status === 'L3'
                            ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                            : node.status === 'L1' || node.status === 'L2'
                            ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                            : 'bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40'
                        }`}
                      >
                        {node.statusText}
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between gap-4 text-[#A3A3A3]">
                        <span>Node Pmo:</span>
                        <span className="text-white font-bold">{node.pmo}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-[#A3A3A3]">
                        <span>Displacement Vel:</span>
                        <span className="text-[#34D399] font-bold">{node.vel}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-[#A3A3A3]">
                        <span>Displacement:</span>
                        <span className="text-[#F59E0B] font-bold">{node.disp}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-[#A3A3A3]">
                        <span>Range:</span>
                        <span className="text-[#A3A3A3] text-[10px]">{node.range}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Floating Top-Right Overlay Controller */}
          <div className="absolute top-4 right-4 z-[1000] w-88 bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] p-4 rounded-xl shadow-2xl space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-wider text-[#A3A3A3] uppercase">
                COORDINATE CONTROLLER & TIME SELECTOR
              </h2>
              <Sliders className="w-3.5 h-3.5 text-[#34D399]" />
            </div>

            {/* Active Coordinates Badge */}
            <div className="bg-[#121212] border border-[#262626] rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[#A3A3A3] block text-[10px]">ACTIVE POSITION</span>
                <span className="text-[#34D399] font-bold">
                  {activeLat.toFixed(4)}°N, {activeLng.toFixed(4)}°E
                </span>
              </div>
              <div className="text-right border-l border-[#262626] pl-3">
                <span className="text-[#A3A3A3] block text-[10px]">ELEVATION</span>
                <span className="text-white font-bold">Elev: 218.4m</span>
              </div>
            </div>

            {/* Coordinate Search Input */}
            <form onSubmit={handleJumpToPoint} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#A3A3A3] block mb-1 font-semibold">LATITUDE</label>
                  <input
                    type="text"
                    value={inputLat}
                    onChange={(e) => setInputLat(e.target.value)}
                    className="w-full bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#34D399]"
                    placeholder="23.7500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#A3A3A3] block mb-1 font-semibold">LONGITUDE</label>
                  <input
                    type="text"
                    value={inputLng}
                    onChange={(e) => setInputLng(e.target.value)}
                    className="w-full bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#34D399]"
                    placeholder="86.4167"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#10B981] hover:bg-[#059669] text-black font-bold text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                JUMP TO POINT
              </button>
            </form>

            {/* Historical Time-Range Select */}
            <div>
              <label className="text-[10px] text-[#A3A3A3] block mb-1.5 font-semibold uppercase tracking-wider">
                HISTORICAL TIME RANGE
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full bg-[#121212] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#34D399] cursor-pointer"
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
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header Title */}
        <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
          <h2 className="text-sm font-bold tracking-wider text-[#D4D4D4] uppercase flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#34D399]" />
            GEOSPATIAL & REMOTE SENSING MATRIX
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#A3A3A3] font-mono">
            <span>SYNCHRONIZED VIEWPORT</span>
            <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
          </div>
        </div>

        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[720px]">
          {/* MAP DIV 1 (Top-Left): InSAR Surface Subsidence Map */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 shadow-inner relative overflow-hidden flex flex-col h-[350px]">
            {/* Header Badge */}
            <div className="absolute top-6 left-6 z-[1000] bg-[#0A0A0A]/90 backdrop-blur-md border border-[#262626] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
              <span className="text-xs font-bold text-white tracking-wide">Sentinel-1 InSAR Deformation Layer</span>
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
            <div className="absolute left-6 top-18 z-[1000] bg-[#0A0A0A]/90 backdrop-blur-md border border-[#262626] p-2 rounded-lg flex flex-col items-center gap-1 shadow-lg text-[10px] font-mono">
              <span className="text-[#34D399] font-bold">+5mm</span>
              <div className="w-3 h-20 rounded bg-gradient-to-b from-[#34D399] via-[#F59E0B] to-[#EF4444] border border-white/20"></div>
              <span className="text-[#EF4444] font-bold">-20mm</span>
            </div>

            {/* Center-Bottom Telemetry Pill */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] px-3 py-2 rounded-xl shadow-xl font-mono text-xs flex items-center gap-3">
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">MAX SUBSIDENCE</span>
                <span className="text-[#EF4444] font-bold">{maxSubsidence} mm/year</span>
              </div>
              <div className="w-px h-6 bg-[#262626]"></div>
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">COHERENCE</span>
                <span className="text-[#34D399] font-bold">{coherenceVal}</span>
              </div>
            </div>

            {/* Right Overlay: Mini Recharts Sparkline Graph */}
            <div className="absolute bottom-6 right-6 z-[1000] w-52 h-28 bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] p-2 rounded-xl shadow-xl flex flex-col justify-between">
              <div className="text-[10px] text-[#A3A3A3] font-mono flex items-center justify-between">
                <span>VERTICAL DISPLACEMENT</span>
                <TrendingDown className="w-3 h-3 text-[#EF4444]" />
              </div>
              <div className="w-full h-20">
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
                        backgroundColor: '#0A0A0A',
                        borderColor: '#262626',
                        fontSize: '10px',
                        color: '#FFF',
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* MAP DIV 2 (Top-Right): DEM with Satellite Imagery Map */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 shadow-inner relative overflow-hidden flex flex-col h-[350px]">
            {/* Header Badge */}
            <div className="absolute top-6 left-6 z-[1000] bg-[#0A0A0A]/90 backdrop-blur-md border border-[#262626] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
              <Compass className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="text-xs font-bold text-white tracking-wide">Copernicus COP30 3D Hillshade DEM</span>
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
            <div className="absolute bottom-6 left-6 z-[1000] bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] px-3 py-2 rounded-xl shadow-xl font-mono text-xs flex items-center gap-3">
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">ELEVATION</span>
                <span className="text-white font-bold">218.4m</span>
              </div>
              <div className="w-px h-6 bg-[#262626]"></div>
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">SLOPE</span>
                <span className="text-[#F59E0B] font-bold">14.2°</span>
              </div>
              <div className="w-px h-6 bg-[#262626]"></div>
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">PIT MIN</span>
                <span className="text-[#34D399] font-bold">182.0m</span>
              </div>
            </div>

            {/* Bottom-Right Interactive Toggle Switches */}
            <div className="absolute bottom-6 right-6 z-[1000] bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] p-2.5 rounded-xl shadow-xl flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={show3DHillshade}
                  onChange={(e) => setShow3DHillshade(e.target.checked)}
                  className="accent-[#10B981] rounded cursor-pointer"
                />
                <span className="text-white font-medium text-[11px]">3D Hillshade</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showContour}
                  onChange={(e) => setShowContour(e.target.checked)}
                  className="accent-[#10B981] rounded cursor-pointer"
                />
                <span className="text-white font-medium text-[11px]">Contour (5m)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSlopeHeatmap}
                  onChange={(e) => setShowSlopeHeatmap(e.target.checked)}
                  className="accent-[#10B981] rounded cursor-pointer"
                />
                <span className="text-white font-medium text-[11px]">Slope Heatmap</span>
              </label>
            </div>
          </div>

          {/* MAP DIV 3 (Bottom-Left): Geospatial Infrastructure Map */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 shadow-inner relative overflow-hidden flex flex-col h-[350px]">
            {/* Header Badge */}
            <div className="absolute top-6 left-6 z-[1000] bg-[#0A0A0A]/90 backdrop-blur-md border border-[#262626] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
              <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-xs font-bold text-white tracking-wide">Jharkhand Vector GeoJSON Layers</span>
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
                {/* CartoDB Dark Matter Base */}
                <TileLayer
                  attribution="CartoDB Dark Matter"
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {showDistrictBoundaries && (
                  <Polyline positions={DISTRICT_BOUNDARIES} pathOptions={{ color: '#38BDF8', weight: 2 }} />
                )}
                {showMinePerimeters && (
                  <Polygon positions={JHARIA_MINE_PERIMETER} pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.2, weight: 2 }} />
                )}
                {showFaultLines && (
                  <>
                    <Polyline positions={FAULT_LINES_1} pathOptions={{ color: '#EF4444', weight: 2, dashArray: '6,6' }} />
                    <Polyline positions={FAULT_LINES_2} pathOptions={{ color: '#EF4444', weight: 2, dashArray: '6,6' }} />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Layer Switches Box (Top-Right) */}
            <div className="absolute top-6 right-6 z-[1000] bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] p-2.5 rounded-xl shadow-xl flex flex-col gap-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDistrictBoundaries}
                  onChange={(e) => setShowDistrictBoundaries(e.target.checked)}
                  className="accent-[#38BDF8] rounded cursor-pointer"
                />
                <span className="text-[#A3A3A3] text-[11px]">District Boundaries</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFaultLines}
                  onChange={(e) => setShowFaultLines(e.target.checked)}
                  className="accent-[#EF4444] rounded cursor-pointer"
                />
                <span className="text-[#A3A3A3] text-[11px]">Fault Lines</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMinePerimeters}
                  onChange={(e) => setShowMinePerimeters(e.target.checked)}
                  className="accent-[#F59E0B] rounded cursor-pointer"
                />
                <span className="text-[#A3A3A3] text-[11px]">Mine Perimeters</span>
              </label>
            </div>

            {/* Bottom Telemetry Row */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] px-3 py-2 rounded-xl shadow-xl font-mono text-xs flex items-center gap-4">
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">INDUSTRIAL FAC</span>
                <span className="text-white font-bold">12 tagged</span>
              </div>
              <div className="w-px h-6 bg-[#262626]"></div>
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">EVACUATION RTS</span>
                <span className="text-[#34D399] font-bold">3 active</span>
              </div>
              <div className="w-px h-6 bg-[#262626]"></div>
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">REFUGE CHAMBERS</span>
                <span className="text-[#F59E0B] font-bold">2 deployed</span>
              </div>
            </div>
          </div>

          {/* MAP DIV 4 (Bottom-Right): Radar Remote Sensing (SAR) Map */}
          <div className="bg-[#121212] border border-[#262626] rounded-xl p-4 shadow-inner relative overflow-hidden flex flex-col h-[350px]">
            {/* Header Badge */}
            <div className="absolute top-6 left-6 z-[1000] bg-[#0A0A0A]/90 backdrop-blur-md border border-[#262626] px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg">
              <Radio className="w-3.5 h-3.5 text-[#34D399]" />
              <span className="text-xs font-bold text-white tracking-wide">Sentinel-1 SAR C-Band (VV/VH)</span>
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
                {/* Monochrome Dark Radar Tile */}
                <TileLayer
                  attribution="CartoDB Dark Matter SAR"
                  url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                />
              </MapContainer>
            </div>

            {/* Bottom-Left Pill */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] px-3 py-2 rounded-xl shadow-xl font-mono text-xs flex items-center gap-3">
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">SOIL PENETRATION</span>
                <span className="text-[#34D399] font-bold">{soilPenetration}m</span>
              </div>
              <div className="w-px h-6 bg-[#262626]"></div>
              <div>
                <span className="text-[#A3A3A3] text-[10px] block">SPECKLE FILTER</span>
                <span className="text-white font-bold">Lee Filter Active</span>
              </div>
            </div>

            {/* Bottom-Right Radar Recharts BarChart Widget */}
            <div className="absolute bottom-6 right-6 z-[1000] w-48 h-28 bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] p-2.5 rounded-xl shadow-xl flex flex-col justify-between">
              <div className="text-[10px] text-[#A3A3A3] font-mono flex items-center justify-between">
                <span>SIGNAL STRENGTH</span>
                <span className="text-[#34D399] font-bold">dB</span>
              </div>
              <div className="w-full h-18">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sarData} barCategoryGap="20%">
                    <XAxis dataKey="name" stroke="#A3A3A3" fontSize={10} tickLine={false} />
                    <YAxis stroke="#A3A3A3" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0A0A0A',
                        borderColor: '#262626',
                        fontSize: '10px',
                        color: '#FFF',
                      }}
                    />
                    <Bar dataKey="db" radius={[4, 4, 0, 0]} />
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
