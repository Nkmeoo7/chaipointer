import { motion } from 'framer-motion';
import { Review } from '../../types';

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export default function ReviewList({ reviews, currentUserId }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-3xl mb-2">☕</p>
        <p className="text-sm text-zinc-500">No reviews yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review, i) => (
        <motion.div
          key={review._id}
          className="glass-card-light p-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-chai-500 to-chai-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {review.user.email[0].toUpperCase()}
                </div>
                <span className="text-xs text-zinc-400 truncate">
                  {review.user.email}
                  {currentUserId === review.user._id && (
                    <span className="ml-1 text-chai-500 font-medium">(you)</span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={`text-xs ${s <= review.rating ? 'text-chai-400' : 'text-zinc-700'}`}>★</span>
              ))}
            </div>
          </div>
          <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{review.text}</p>
          <p className="text-xs text-zinc-600 mt-1.5">{timeAgo(review.createdAt)}</p>
        </motion.div>
      ))}
    </div>
  );
}
