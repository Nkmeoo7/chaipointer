import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shop } from '../../types';
import { createShop } from '../../api';
import AddressAutocomplete from '../ui/AddressAutocomplete';


interface AddShopModalProps {
  onClose: () => void;
  onAdded: (shop: Shop) => void;
}

export default function AddShopModal({ onClose, onAdded }: AddShopModalProps) {
  const [form, setForm] = useState({ name: '', address: '', description: '', photoUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) {
      setError('Name and address are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await createShop({
        name: form.name,
        address: form.address,
        description: form.description,
        photoUrl: form.photoUrl || undefined,
      });
      onAdded(res.data.shop);
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to add shop. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative glass-card w-full max-w-md p-6 z-10"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Add a Chai Shop ☕</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-xl">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Shop Name *</label>
              <input
                id="shop-name-input"
                className="input"
                placeholder="e.g. Chai Sutta Bar"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Address * <span className="text-chai-500">(we'll geocode this automatically)</span>
              </label>
              <AddressAutocomplete
                id="shop-address-input"
                value={form.address}
                onChange={val => setForm(f => ({ ...f, address: val }))}
                placeholder="e.g. Connaught Place, New Delhi, India"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
              <textarea
                id="shop-description-input"
                className="input resize-none"
                rows={3}
                placeholder="What makes this place special?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Photo URL (optional)</label>
              <input
                id="shop-photo-input"
                className="input"
                placeholder="https://..."
                value={form.photoUrl}
                onChange={e => setForm(f => ({ ...f, photoUrl: e.target.value }))}
              />
            </div>

            {error && (
              <motion.p
                className="text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            )}

            <button
              id="add-shop-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Geocoding address…</>
              ) : (
                <>✚ Add Shop</>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
