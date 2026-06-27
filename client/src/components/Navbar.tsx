import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import RedeemModal from './Points/RedeemModal';
import AddressAutocomplete, { NominatimResult } from './ui/AddressAutocomplete';

interface NavbarProps {
  onAddShop: () => void;
  onSearch: (query: string) => void;
  onLocationSearch: (lat: number, lng: number, displayName: string) => void;
  searchLocationName: string;
  onClearLocationSearch: () => void;
  onMinRatingChange: (r: number) => void;
  onNearMe: () => void;
  onShowAll: () => void;
  nearbyMode: boolean;
  hasLocation: boolean;
}

export default function Navbar({
  onAddShop,
  onSearch,
  onLocationSearch,
  searchLocationName,
  onClearLocationSearch,
  onMinRatingChange,
  onNearMe,
  onShowAll,
  nearbyMode,
  hasLocation
}: NavbarProps) {
  const { user, logout } = useAuth();
  const [showRedeem, setShowRedeem] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const handleRating = (r: number) => {
    setMinRating(r);
    onMinRatingChange(r);
  };

  const handleLocationSelect = (result: NominatimResult) => {
    onLocationSearch(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
  };

  return (
    <>
      <motion.nav
        className="relative flex items-center gap-3 px-4 py-3"
        style={{ background: 'linear-gradient(to bottom, rgba(12,10,9,0.95) 0%, transparent 100%)' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl">☕</span>
          <span className="font-black text-white tracking-tight text-lg">ChaiSpot</span>
        </div>

        {/* Shop Name Search */}
        <input
          id="search-shops-input"
          className="input flex-1 max-w-[160px] text-sm"
          placeholder="Shop name…"
          onChange={e => onSearch(e.target.value)}
        />

        {/* Location Search */}
        <div className="flex-1 max-w-[240px]">
          <AddressAutocomplete
            id="search-location-input"
            value={searchLocationName}
            onChange={(val) => {
              if (val === '') onClearLocationSearch();
            }}
            onSelect={handleLocationSelect}
            placeholder="Search location…"
            compact
          />
        </div>

        {/* Near Me / Show All */}
        {nearbyMode ? (
          <button
            onClick={onShowAll}
            className="text-xs px-3 py-1.5 rounded-full bg-chai-600/20 border border-chai-500/30 text-chai-300 flex-shrink-0 hover:bg-chai-600/30 transition-all"
          >
            ✕ Near Me
          </button>
        ) : (
          <button
            id="near-me-btn"
            onClick={onNearMe}
            disabled={!hasLocation}
            title={hasLocation ? 'Show chai shops within 5 km' : 'Waiting for GPS…'}
            className={`text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-all flex items-center gap-1.5 ${
              hasLocation
                ? 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 hover:border-chai-500/40 hover:text-chai-300'
                : 'opacity-40 cursor-not-allowed bg-zinc-800/40 border border-zinc-700/30 text-zinc-500'
            }`}
          >
            <span className={hasLocation ? 'animate-pulse' : ''}>📍</span>
            Near Me
          </button>
        )}

        {/* Min rating filter */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {[0, 3, 4, 5].map(r => (
            <button
              key={r}
              onClick={() => handleRating(r)}
              className={`text-xs px-2 py-1 rounded-full transition-all ${
                minRating === r
                  ? 'bg-chai-600 text-white'
                  : 'btn-ghost'
              }`}
            >
              {r === 0 ? 'All' : `${r}★+`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Points badge */}
          <button
            id="points-badge-btn"
            onClick={() => setShowRedeem(true)}
            className="glass-card-light px-3 py-1.5 flex items-center gap-1.5 hover:border-chai-600/30 transition-colors cursor-pointer"
          >
            <span className="text-chai-400 font-bold text-sm">{user?.points ?? 0}</span>
            <span className="text-xs text-zinc-400">pts</span>
          </button>

          {/* Add shop */}
          <button id="add-shop-btn" onClick={onAddShop} className="btn-primary text-sm">
            + Add Shop
          </button>

          {/* Logout */}
          <button id="logout-btn" onClick={logout} className="btn-ghost text-sm">
            Sign out
          </button>
        </div>
      </motion.nav>

      {/* RedeemModal renders as fixed so it's always above everything */}
      <AnimatePresence>
        {showRedeem && <RedeemModal onClose={() => setShowRedeem(false)} />}
      </AnimatePresence>
    </>
  );
}
