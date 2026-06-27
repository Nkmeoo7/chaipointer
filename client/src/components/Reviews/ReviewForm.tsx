import { useState } from 'react';
import { motion } from 'framer-motion';
import { Review } from '../../types';
import { createReview, updateReview } from '../../api';

interface ReviewFormProps {
  shopId: string;
  existingReview?: Review;
  onSubmitted: (pointsEarned: number) => void;
  onCancel: () => void;
}

export default function ReviewForm({ shopId, existingReview, onSubmitted, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState(existingReview?.text ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (!text.trim()) { setError('Please write something about your experience.'); return; }

    setLoading(true);
    setError('');
    try {
      if (existingReview) {
        await updateReview(existingReview._id, { rating, text });
        onSubmitted(0); // no new points for edits
      } else {
        const res = await createReview({ shopId, rating, text });
        onSubmitted(res.data.pointsEarned);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="glass-card-light p-4 mb-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Star Rating */}
        <div>
          <label className="block text-xs text-zinc-400 mb-2">Your Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                id={`star-${star}`}
                className="star text-2xl transition-all"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
              >
                <span className={(hovered || rating) >= star ? 'text-chai-400' : 'text-zinc-700'}>★</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Your Experience</label>
          <textarea
            id="review-text-input"
            className="input resize-none text-sm"
            rows={3}
            placeholder="Share your honest thoughts about this chai shop…"
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-zinc-600 mt-1 text-right">{text.length}/500</p>
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            id="submit-review-btn"
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 text-sm"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : existingReview ? 'Save Changes' : 'Submit Review'
            }
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
        </div>

        {!existingReview && (
          <p className="text-xs text-zinc-500 text-center">
            ✨ You'll earn <span className="text-chai-400 font-semibold">10–15 points</span> for this review
          </p>
        )}
      </form>
    </motion.div>
  );
}
