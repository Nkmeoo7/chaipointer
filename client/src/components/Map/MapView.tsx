import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shop } from '../../types';

// Fix Leaflet's broken default marker icons in Vite/Webpack bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom chai-coloured marker icon
const chaiIcon = L.divIcon({
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#e2a53a,#b86d14);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 16px rgba(226,165,58,0.55);
    border:2px solid rgba(255,255,255,0.25);
    font-size:16px;cursor:pointer;
    transition:transform 0.15s;
  ">☕</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

interface MapViewProps {
  shops: Shop[];
  onShopClick: (shop: Shop) => void;
  selectedShop: Shop | null;
  routeCoords: [number, number][] | null;
  onDrawRoute: (
    fn: (shopId: string, start: { lng?: number; lat?: number; address?: string }) => void
  ) => void;
}

/** Inner component that has access to the Leaflet map instance */
function MapController({
  selectedShop,
  routeCoords,
}: {
  selectedShop: Shop | null;
  routeCoords: [number, number][] | null;
}) {
  const map = useMap();

  // Fly to selected shop
  useEffect(() => {
    if (!selectedShop) return;
    const [lng, lat] = selectedShop.location.coordinates;
    map.flyTo([lat, lng], 14, { duration: 1 });
  }, [selectedShop, map]);

  // Fit bounds to route
  useEffect(() => {
    if (!routeCoords || routeCoords.length === 0) return;
    const bounds = L.latLngBounds(routeCoords);
    map.fitBounds(bounds, { padding: [60, 60], duration: 1 });
  }, [routeCoords, map]);

  return null;
}

export default function MapView({
  shops,
  onShopClick,
  selectedShop,
  routeCoords,
}: MapViewProps) {
  const initialCenter: [number, number] = [28.6139, 77.209]; // New Delhi

  return (
    <MapContainer
      center={initialCenter}
      zoom={11}
      className="w-full h-full"
      zoomControl={false}
    >
      {/* OpenStreetMap tiles — free, no API key */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        className="map-tiles-dark"
      />

      <MapController selectedShop={selectedShop} routeCoords={routeCoords} />

      {/* Route polyline */}
      {routeCoords && routeCoords.length > 0 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: '#e2a53a', weight: 5, opacity: 0.85 }}
        />
      )}

      {/* Shop markers */}
      {shops.map(shop => {
        const [lng, lat] = shop.location.coordinates;
        return (
          <Marker
            key={shop._id}
            position={[lat, lng]}
            icon={chaiIcon}
            eventHandlers={{ click: () => onShopClick(shop) }}
          >
            <Popup className="chai-popup">
              <div className="text-sm font-semibold">{shop.name}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{shop.address}</div>
              <div className="text-xs mt-1">
                {'★'.repeat(Math.round(shop.averageRating))}
                {'☆'.repeat(5 - Math.round(shop.averageRating))}
                <span className="ml-1 text-zinc-400">{shop.averageRating.toFixed(1)}</span>
              </div>
              <button
                onClick={() => onShopClick(shop)}
                className="mt-2 text-xs text-chai-400 font-medium hover:underline"
              >
                View details →
              </button>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export type { MapViewProps };
