import { useState, useEffect, useCallback, useRef } from 'react';
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
  const mapDrawRef = useRef<((shopId: string, start: { lng?: number; lat?: number; address?: string }) => void) | null>(null);

  const fetchShops = useCallback(async (name?: string, rating?: number) => {
    try {
      const res = await getShops({
        ...(name ? { name } : {}),
        ...(rating && rating > 0 ? { minRating: rating } : {}),
      });
      setShops(res.data.shops);
    } catch {
      // silent
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

  const handleDirections = useCallback(async (
    shopId: string,
    start: { lng?: number; lat?: number; address?: string }
  ) => {
    if (mapDrawRef.current) {
      mapDrawRef.current(shopId, start);
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950">
      <Navbar
        onAddShop={() => setShowAddShop(true)}
        onSearch={handleSearch}
        onMinRatingChange={handleMinRating}
      />

      {/* Full-screen map */}
      <MapView
        shops={shops}
        onShopClick={setSelectedShop}
        selectedShop={selectedShop}
        onDrawRoute={(fn) => { mapDrawRef.current = fn; }}
      />

      {/* Shop count badge */}
      <div className="absolute bottom-4 left-4 glass-card px-3 py-1.5 text-xs text-zinc-400 z-10">
        {shops.length} shop{shops.length !== 1 ? 's' : ''} on map
      </div>

      {/* Shop detail panel */}
      <div className="absolute top-0 right-0 h-full w-full max-w-sm pointer-events-none z-20">
        <AnimatePresence>
          {selectedShop && (
            <div className="pointer-events-auto h-full">
              <ShopDetail
                shop={selectedShop}
                onClose={() => setSelectedShop(null)}
                onDirections={handleDirections}
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
