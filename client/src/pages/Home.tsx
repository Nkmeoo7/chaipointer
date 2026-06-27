import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Shop } from '../types';
import { getShops, getDirections, fetchOSMShops, createShop } from '../api';
import { useGeolocation } from '../hooks/useGeolocation';
import MapView from '../components/Map/MapView';
import ShopDetail from '../components/Shops/ShopDetail';
import AddShopModal from '../components/Shops/AddShopModal';
import Navbar from '../components/Navbar';

export default function Home() {
  const { position: userPosition, error: geoError } = useGeolocation();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showAddShop, setShowAddShop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [searchLocationName, setSearchLocationName] = useState('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // ── Shop fetching ────────────────────────────────────────────────────────
  const fetchShops = useCallback(async (opts?: {
    name?: string;
    rating?: number;
    nearby?: boolean;
    position?: GeolocationCoordinates | null;
    customLat?: number;
    customLng?: number;
  }) => {
    const { name, rating, nearby, position, customLat, customLng } = opts ?? {};
    try {
      const params: Record<string, string | number> = {};
      if (name) params.name = name;
      if (rating && rating > 0) params.minRating = rating;
      
      let fetchLat: number | undefined;
      let fetchLng: number | undefined;
      
      if (nearby && position) {
        params.lat = position.latitude;
        params.lng = position.longitude;
        params.radius = 5000; // 5 km
        fetchLat = position.latitude;
        fetchLng = position.longitude;
      } else if (customLat && customLng) {
        params.lat = customLat;
        params.lng = customLng;
        params.radius = 10000; // 10 km for custom searches
        fetchLat = customLat;
        fetchLng = customLng;
      }
      
      const res = await getShops(params);
      let dbShops = res.data.shops as Shop[];

      // Fetch external shops if we have coordinates
      if (fetchLat && fetchLng) {
        const osmShops = await fetchOSMShops(fetchLat, fetchLng, params.radius as number);
        // Deduplicate: naive check by exact lat/lng or name
        // (In a real app you'd do geospatial bounding box deduplication)
        const filteredOsm = osmShops.filter(osm => 
          !dbShops.some(db => 
            db.name.toLowerCase() === osm.name.toLowerCase() || 
            (db.location.coordinates[0] === osm.location.coordinates[0] && db.location.coordinates[1] === osm.location.coordinates[1])
          )
        );
        dbShops = [...dbShops, ...filteredOsm];
      }

      setShops(dbShops);
    } catch {
      // silent
    }
  }, []);

  // Initial load: all shops
  useEffect(() => { fetchShops(); }, [fetchShops]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleLocationSearch = useCallback((lat: number, lng: number, displayName: string) => {
    setNearbyMode(false);
    setSearchLocationName(displayName);
    setMapCenter({ lat, lng });
    fetchShops({ rating: minRating, customLat: lat, customLng: lng });
  }, [fetchShops, minRating]);

  const handleClearLocationSearch = useCallback(() => {
    setSearchLocationName('');
    setMapCenter(null);
    fetchShops({ name: searchQuery, rating: minRating });
  }, [fetchShops, searchQuery, minRating]);

  const handleMinRating = useCallback((r: number) => {
    setMinRating(r);
    if (mapCenter) {
      fetchShops({ rating: r, customLat: mapCenter.lat, customLng: mapCenter.lng });
    } else {
      fetchShops({ name: searchQuery, rating: r, nearby: nearbyMode, position: userPosition });
    }
  }, [fetchShops, searchQuery, nearbyMode, userPosition, mapCenter]);

  const handleNearMe = useCallback(() => {
    if (!userPosition) return;
    setNearbyMode(true);
    setSearchQuery('');
    setSearchLocationName('');
    setMapCenter(null);
    fetchShops({ rating: minRating, nearby: true, position: userPosition });
  }, [userPosition, minRating, fetchShops]);

  const handleShowAll = useCallback(() => {
    setNearbyMode(false);
    setSearchLocationName('');
    setMapCenter(null);
    fetchShops({ name: searchQuery, rating: minRating });
  }, [fetchShops, searchQuery, minRating]);

  const handleShopAdded = (shop: Shop) => {
    setShops(prev => [shop, ...prev]);
  };

  const handleShopClaimed = useCallback(async (osmShop: Shop) => {
    try {
      const res = await createShop({
        name: osmShop.name,
        address: osmShop.address,
        description: osmShop.description,
      });
      const dbShop = res.data.shop;
      setShops(prev => prev.map(s => s._id === osmShop._id ? dbShop : s));
      setSelectedShop(dbShop);
    } catch (err) {
      alert('Failed to claim shop. Please try again.');
    }
  }, []);

  // ── Directions ───────────────────────────────────────────────────────────
  const handleDirections = useCallback(async (
    shopId: string,
    start: { lng?: number; lat?: number; address?: string }
  ) => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteCoords(null);
    try {
      const res = await getDirections(shopId, start);
      // OSRM GeoJSON: [lng, lat] → Leaflet Polyline: [lat, lng]
      const geoCoords: [number, number][] = res.data.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      );
      setRouteCoords(geoCoords);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setRouteError(error.response?.data?.message || 'Could not get directions.');
    } finally {
      setRouteLoading(false);
    }
  }, []);

  const handleShopClose = () => {
    setSelectedShop(null);
    setRouteCoords(null);
    setRouteError(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">

      {/* Base: full-screen map at z-0 (Leaflet's internal z-indices stay contained) */}
      <div className="absolute inset-0 z-0">
        <MapView
          shops={shops}
          onShopClick={setSelectedShop}
          selectedShop={selectedShop}
          routeCoords={routeCoords}
          userPosition={userPosition}
          mapCenter={mapCenter}
          onDrawRoute={() => {}}
        />
      </div>

      {/* UI layers at z-[1001]+ to clear Leaflet's control pane (1000) */}

      {/* Navbar */}
      <div className="absolute inset-x-0 top-0 z-[1001]">
        <Navbar
          onAddShop={() => setShowAddShop(true)}
          onSearch={handleSearch}
          onLocationSearch={handleLocationSearch}
          searchLocationName={searchLocationName}
          onSearchLocationNameChange={setSearchLocationName}
          onClearLocationSearch={handleClearLocationSearch}
          onMinRatingChange={handleMinRating}
          onNearMe={handleNearMe}
          onShowAll={handleShowAll}
          nearbyMode={nearbyMode}
          hasLocation={!!userPosition}
        />
      </div>

      {/* Geolocation error pill */}
      {geoError && (
        <div className="absolute top-16 left-4 glass-card px-3 py-1.5 text-xs text-amber-400 max-w-xs z-[1001]">
          📍 {geoError}
        </div>
      )}

      {/* Route loading / error toast */}
      {routeLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-sm text-chai-300 flex items-center gap-2 z-[1002]">
          <div className="w-4 h-4 border-2 border-chai-400 border-t-transparent rounded-full animate-spin" />
          Getting directions…
        </div>
      )}
      {routeError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-sm text-red-400 max-w-xs text-center z-[1002]">
          {routeError}
          <button onClick={() => setRouteError(null)} className="ml-2 text-zinc-500 hover:text-white">×</button>
        </div>
      )}

      {/* Shop count / nearby badge */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-[1001]">
        <div className="glass-card px-3 py-1.5 text-xs text-zinc-400">
          {shops.length} shop{shops.length !== 1 ? 's' : ''}
          {nearbyMode ? ' nearby' : ' on map'}
        </div>
        {nearbyMode && (
          <button
            onClick={handleShowAll}
            className="glass-card px-3 py-1.5 text-xs text-chai-400 hover:text-chai-300 transition-colors"
          >
            Show all
          </button>
        )}
      </div>

      {/* Shop detail panel */}
      <div className="absolute top-0 right-0 h-full w-full max-w-sm pointer-events-none z-[1001]">
        <AnimatePresence>
          {selectedShop && (
            <div className="pointer-events-auto h-full">
              <ShopDetail
                shop={selectedShop}
                onClose={handleShopClose}
                onDirections={handleDirections}
                userPosition={userPosition}
                onClaimShop={handleShopClaimed}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add shop modal */}
      <AnimatePresence>
        {showAddShop && (
          <AddShopModal
            onClose={() => setShowAddShop(false)}
            onAdded={handleShopAdded}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
