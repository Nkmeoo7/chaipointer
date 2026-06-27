import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Shop } from '../types';
import { getShops, getDirections } from '../api';
import MapView from '../components/Map/MapView';
import ShopDetail from '../components/Shops/ShopDetail';
import AddShopModal from '../components/Shops/AddShopModal';
import Navbar from '../components/Navbar';

export default function Home() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [showAddShop, setShowAddShop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  // Route is stored as [lat, lng][] for Leaflet's Polyline
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const fetchShops = useCallback(async (name?: string, rating?: number) => {
    try {
      const res = await getShops({
        ...(name ? { name } : {}),
        ...(rating && rating > 0 ? { minRating: rating } : {}),
      });
      setShops(res.data.shops);
    } catch {
      // silent — shops just won't update
    }
  }, []);

  useEffect(() => { fetchShops(); }, [fetchShops]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    fetchShops(q, minRating);
  }, [fetchShops, minRating]);

  const handleMinRating = useCallback((r: number) => {
    setMinRating(r);
    fetchShops(searchQuery, r);
  }, [fetchShops, searchQuery]);

  const handleShopAdded = (shop: Shop) => {
    setShops(prev => [shop, ...prev]);
  };

  // Called from ShopDetail when the user clicks "Get Directions"
  const handleDirections = useCallback(async (
    shopId: string,
    start: { lng?: number; lat?: number; address?: string }
  ) => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteCoords(null);
    try {
      const res = await getDirections(shopId, start);
      // OSRM returns GeoJSON geometry: coordinates are [lng, lat]
      // Leaflet's Polyline needs [lat, lng]
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

  // Clear route when shop is deselected
  const handleShopClose = () => {
    setSelectedShop(null);
    setRouteCoords(null);
    setRouteError(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">

      {/* ── Base layer: full-screen map ──────────────────────────────
          Positioned absolutely at z-0 so Leaflet's internal pane
          z-indices (200–1000) don't escape this stacking context.     */}
      <div className="absolute inset-0 z-0">
        <MapView
          shops={shops}
          onShopClick={setSelectedShop}
          selectedShop={selectedShop}
          routeCoords={routeCoords}
          onDrawRoute={() => {}}
        />
      </div>

      {/* ── UI layers (must be z-[1001]+ to clear Leaflet controls) ── */}

      {/* Navbar */}
      <div className="absolute inset-x-0 top-0 z-[1001]">
        <Navbar
          onAddShop={() => setShowAddShop(true)}
          onSearch={handleSearch}
          onMinRatingChange={handleMinRating}
        />
      </div>

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

      {/* Shop count badge */}
      <div className="absolute bottom-4 left-4 glass-card px-3 py-1.5 text-xs text-zinc-400 z-[1001]">
        {shops.length} shop{shops.length !== 1 ? 's' : ''} on map
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
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add shop modal — fixed overlay, highest layer */}
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
