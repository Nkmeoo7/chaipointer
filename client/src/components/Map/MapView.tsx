import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
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

// Custom chai-coloured shop marker
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

const osmIcon = L.divIcon({
  html: `<div style="
    width:30px;height:30px;border-radius:50%;
    background:linear-gradient(135deg,#52525b,#3f3f46);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 12px rgba(82,82,91,0.5);
    border:2px solid rgba(255,255,255,0.2);
    font-size:14px;cursor:pointer;
    opacity:0.85;
    transition:transform 0.15s;
  ">🌍</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

export interface MapViewProps {
  shops: Shop[];
  onShopClick: (shop: Shop) => void;
  selectedShop: Shop | null;
  routeCoords: [number, number][] | null;
  userPosition: GeolocationCoordinates | null;
  mapCenter?: { lat: number; lng: number } | null;
  onMapMove?: (lat: number, lng: number, radius: number) => void;
  onDrawRoute: (
    fn: (shopId: string, start: { lng?: number; lat?: number; address?: string }) => void
  ) => void;
}

/** Child component that has access to the Leaflet map instance */
function MapController({
  selectedShop,
  routeCoords,
  userPosition,
  mapCenter,
  onMapMove,
  hasFlownToUser,
  onFlownToUser,
}: {
  selectedShop: Shop | null;
  routeCoords: [number, number][] | null;
  userPosition: GeolocationCoordinates | null;
  mapCenter?: { lat: number; lng: number } | null;
  onMapMove?: (lat: number, lng: number, radius: number) => void;
  hasFlownToUser: React.MutableRefObject<boolean>;
  onFlownToUser: () => void;
}) {
  const map = useMap();

  // On first GPS fix: fly to user's location
  useEffect(() => {
    if (!userPosition || hasFlownToUser.current) return;
    map.flyTo([userPosition.latitude, userPosition.longitude], 13, { duration: 1.5 });
    hasFlownToUser.current = true;
    onFlownToUser();
  }, [userPosition, map, hasFlownToUser, onFlownToUser]);

  // When a shop is selected: fly to it
  useEffect(() => {
    if (!selectedShop) return;
    const [lng, lat] = selectedShop.location.coordinates;
    map.flyTo([lat, lng], 15, { duration: 1 });
  }, [selectedShop, map]);

  // After directions load: fit route bounds
  useEffect(() => {
    if (!routeCoords || routeCoords.length === 0) return;
    const bounds = L.latLngBounds(routeCoords);
    map.fitBounds(bounds, { padding: [60, 60], duration: 1 });
  }, [routeCoords, map]);

  // When mapCenter (from custom search) changes, fly there
  useEffect(() => {
    if (!mapCenter) return;
    map.flyTo([mapCenter.lat, mapCenter.lng], 13, { duration: 1.5 });
  }, [mapCenter, map]);

  // Handle dynamic panning/zooming to fetch shops in the current view
  useEffect(() => {
    if (!onMapMove) return;
    
    const handleMoveEnd = () => {
      // Only fetch if zoomed in close enough (e.g. city/neighborhood level)
      // This prevents trying to download the entire country's cafes at once.
      if (map.getZoom() >= 13) {
        const center = map.getCenter();
        const bounds = map.getBounds();
        // Calculate radius in meters from center to the top-right corner
        const radius = Math.round(center.distanceTo(bounds.getNorthEast()));
        onMapMove(center.lat, center.lng, radius);
      }
    };

    // Fire immediately on mount if already zoomed in (e.g., after initial default load)
    handleMoveEnd();

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onMapMove]);

  return null;
}

export default function MapView({
  shops,
  onShopClick,
  selectedShop,
  routeCoords,
  userPosition,
  mapCenter,
  onMapMove,
}: MapViewProps) {
  const initialCenter: [number, number] = [28.6139, 77.209]; // New Delhi fallback
  // Track whether we've already flown to the user once
  const hasFlownToUser = { current: false };

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

      <MapController
        selectedShop={selectedShop}
        routeCoords={routeCoords}
        userPosition={userPosition}
        mapCenter={mapCenter}
        onMapMove={onMapMove}
        hasFlownToUser={hasFlownToUser}
        onFlownToUser={() => { hasFlownToUser.current = true; }}
      />

      {/* ── "You are here" marker ────────────────────────────────────
          Two concentric circles: solid inner dot + translucent ring.
          Styled inline because Leaflet renders these outside React.  */}
      {userPosition && (
        <>
          {/* Accuracy halo */}
          <CircleMarker
            center={[userPosition.latitude, userPosition.longitude]}
            radius={14}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.12,
              weight: 1.5,
              opacity: 0.5,
            }}
          />
          {/* Solid GPS dot */}
          <CircleMarker
            center={[userPosition.latitude, userPosition.longitude]}
            radius={7}
            pathOptions={{
              color: '#fff',
              fillColor: '#3b82f6',
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Popup className="chai-popup">
              <div className="text-sm font-semibold">📍 You are here</div>
              {userPosition.accuracy && (
                <div className="text-xs text-zinc-400 mt-0.5">
                  Accuracy ±{Math.round(userPosition.accuracy)} m
                </div>
              )}
            </Popup>
          </CircleMarker>
        </>
      )}

      {/* Route polyline */}
      {routeCoords && routeCoords.length > 0 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: '#e2a53a', weight: 5, opacity: 0.85, dashArray: undefined }}
        />
      )}

      {/* Shop markers */}
      {shops.map(shop => {
        const [lng, lat] = shop.location.coordinates;
        return (
          <Marker
            key={shop._id}
            position={[lat, lng]}
            icon={shop.isExternal ? osmIcon : chaiIcon}
            eventHandlers={{ click: () => onShopClick(shop) }}
          >
            <Popup className="chai-popup">
              <div className="text-sm font-semibold">{shop.name}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{shop.address}</div>
              
              {!shop.isExternal ? (
                <div className="text-xs mt-1">
                  {'★'.repeat(Math.round(shop.averageRating))}
                  {'☆'.repeat(5 - Math.round(shop.averageRating))}
                  <span className="ml-1 text-zinc-400">{shop.averageRating.toFixed(1)}</span>
                </div>
              ) : (
                <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-semibold">
                  Unclaimed OSM Place
                </div>
              )}
              
              <button
                onClick={() => onShopClick(shop)}
                className="mt-2 text-xs text-chai-400 font-medium hover:underline"
              >
                View details & directions →
              </button>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
