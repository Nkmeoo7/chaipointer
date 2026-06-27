import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shop, Review } from '../../types';
import { getReviews } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import ReviewForm from '../Reviews/ReviewForm';
import ReviewList from '../Reviews/ReviewList';
import AddressAutocomplete from '../ui/AddressAutocomplete';


interface ShopDetailProps {
  shop: Shop;
  onClose: () => void;
  onDirections: (shopId: string, start: { lng?: number; lat?: number; address?: string }) => void;
  userPosition: GeolocationCoordinates | null;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`text-sm ${i <= Math.round(rating) ? 'text-chai-400' : 'text-zinc-700'}`}>★</span>
      ))}
      <span className="text-xs text-zinc-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function ShopDetail({ shop, onClose, onDirections, userPosition }: ShopDetailProps) {
  const { user, updatePoints } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [startAddress, setStartAddress] = useState('');
  const [gettingDirections, setGettingDirections] = useState(false);
  const [directionMode, setDirectionMode] = useState<'geo' | 'manual'>('geo');

  const fetchReviews = useCallback(async () => {
    try {
      const res = await getReviews(shop._id);
      setReviews(res.data.reviews);
    } catch {
      // silent
    } finally {
      setLoadingReviews(false);
    }
  }, [shop._id]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const userReview = reviews.find(r => r.user._id === user?.id);

  const handleGetDirections = async () => {
    setGettingDirections(true);
    try {
      if (directionMode === 'geo') {
        if (userPosition) {
          // Use already-watched live position — no extra permission prompt
          onDirections(shop._id, { lng: userPosition.longitude, lat: userPosition.latitude });
        } else {
          // GPS not available from hook — fall back to one-shot browser request
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
          );
          onDirections(shop._id, { lng: pos.coords.longitude, lat: pos.coords.latitude });
        }
      } else {
        if (!startAddress.trim()) return;
        onDirections(shop._id, { address: startAddress });
      }
    } catch {
      setDirectionMode('manual');
    } finally {
      setGettingDirections(false);
    }
  };

  const handleReviewSubmitted = (pts: number) => {
    fetchReviews();
    updatePoints((user?.points ?? 0) + pts);
    setShowReviewForm(false);
  };

  return (
    <motion.div
      className="absolute right-0 top-0 h-full w-full max-w-sm glass-card rounded-none rounded-l-2xl flex flex-col z-20 overflow-hidden"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{shop.name}</h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{shop.address}</p>
            <div className="mt-2">
              <StarDisplay rating={shop.averageRating} />
              <p className="text-xs text-zinc-500 mt-0.5">{shop.reviewCount} review{shop.reviewCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            id="shop-detail-close"
            onClick={onClose}
            className="ml-3 text-zinc-500 hover:text-white text-xl flex-shrink-0 mt-0.5 transition-colors"
          >×</button>
        </div>

        {shop.photoUrl && (
          <img
            src={shop.photoUrl}
            alt={shop.name}
            className="mt-3 w-full h-32 object-cover rounded-lg border border-white/5"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        {shop.description && (
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{shop.description}</p>
        )}
      </div>

      {/* Directions */}
      <div className="p-4 border-b border-white/5 flex-shrink-0">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setDirectionMode('geo')}
            className={`text-xs px-3 py-1 rounded-full transition-all ${directionMode === 'geo' ? 'bg-chai-600 text-white' : 'btn-ghost'}`}
          >📍 My Location</button>
          <button
            onClick={() => setDirectionMode('manual')}
            className={`text-xs px-3 py-1 rounded-full transition-all ${directionMode === 'manual' ? 'bg-chai-600 text-white' : 'btn-ghost'}`}
          >✏️ Enter Address</button>
        </div>

        {/* Live GPS indicator */}
        {directionMode === 'geo' && userPosition && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-emerald-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Using your live location
          </div>
        )}
        {directionMode === 'geo' && !userPosition && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-amber-400">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Waiting for GPS… (or switch to address)
          </div>
        )}

        {directionMode === 'manual' && (
          <AddressAutocomplete
            id="directions-start-address"
            value={startAddress}
            onChange={setStartAddress}
            placeholder="Enter your starting address…"
            compact
          />
        )}

        <button
          id="get-directions-btn"
          onClick={handleGetDirections}
          disabled={gettingDirections || (directionMode === 'manual' && !startAddress.trim())}
          className="btn-primary w-full text-sm"
        >
          {gettingDirections
            ? <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Getting route…</>
            : '🗺 Get Directions'
          }
        </button>
      </div>

      {/* Reviews */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Reviews</h3>
          {user && !showReviewForm && (
            <button
              id="write-review-btn"
              onClick={() => setShowReviewForm(true)}
              className="text-xs btn-ghost"
            >
              {userReview ? '✏️ Edit Review' : '+ Write Review'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showReviewForm && (
            <ReviewForm
              shopId={shop._id}
              existingReview={userReview}
              onSubmitted={handleReviewSubmitted}
              onCancel={() => setShowReviewForm(false)}
            />
          )}
        </AnimatePresence>

        {loadingReviews ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 rounded-lg shimmer" />)}
          </div>
        ) : (
          <ReviewList reviews={reviews} currentUserId={user?.id} />
        )}
      </div>
    </motion.div>
  );
}
