import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBalance, redeemPoints } from '../../api';
import { Transaction } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface RedeemModalProps {
  onClose: () => void;
}

export default function RedeemModal({ onClose }: RedeemModalProps) {
  const { user, updatePoints } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [canRedeem, setCanRedeem] = useState(false);
  const [threshold, setThreshold] = useState(50);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getBalance().then(res => {
      setTransactions(res.data.transactions);
      setCanRedeem(res.data.canRedeem);
      setThreshold(res.data.redemptionThreshold);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRedeem = async () => {
    setRedeeming(true);
    setError('');
    try {
      const res = await redeemPoints();
      setCoupon(res.data.couponCode);
      updatePoints(res.data.remainingPoints);
      setCanRedeem(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Redemption failed.');
    } finally {
      setRedeeming(false);
    }
  };

  const points = user?.points ?? 0;
  const progress = Math.min((points / threshold) * 100, 100);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative glass-card w-full max-w-md p-6 z-10"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Your ChaiPoints 🏆</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl transition-colors">×</button>
          </div>

          {/* Points display */}
          <div className="glass-card-light p-4 mb-4 text-center">
            <motion.p
              className="text-5xl font-black text-chai-400 tracking-tighter"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {points}
            </motion.p>
            <p className="text-xs text-zinc-500 mt-1">ChaiPoints balance</p>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>0</span>
                <span>{threshold} pts to redeem</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #b86d14, #e2a53a)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* Coupon success */}
          <AnimatePresence>
            {coupon && (
              <motion.div
                className="glass-card-light p-4 mb-4 text-center border border-chai-600/30"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <p className="text-xs text-chai-500 mb-1 font-medium">Your coupon code 🎉</p>
                <p className="text-2xl font-mono font-black text-white tracking-widest pulse-glow rounded-lg py-1">
                  {coupon}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Use at participating chai shops</p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="text-sm text-red-400 mb-3 text-center">{error}</p>}

          {!coupon && (
            <button
              id="redeem-points-btn"
              onClick={handleRedeem}
              disabled={!canRedeem || redeeming}
              className="btn-primary w-full mb-4"
            >
              {redeeming
                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : canRedeem
                  ? `Redeem ${threshold} pts for a Coupon`
                  : `Need ${threshold - points} more points`
              }
            </button>
          )}

          {/* Transaction history */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 mb-2">Recent Activity</h3>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg shimmer" />)}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">
                Review a chai shop to start earning points!
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {transactions.map((tx, i) => (
                  <motion.div
                    key={tx._id}
                    className="flex items-center justify-between glass-card-light px-3 py-2"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <p className="text-xs text-zinc-400 truncate flex-1">{tx.reason}</p>
                    <span className={`text-xs font-bold ml-2 flex-shrink-0 ${tx.type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'earn' ? '+' : '-'}{tx.points}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
