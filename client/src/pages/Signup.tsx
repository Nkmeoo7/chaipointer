import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      await signup(email, password);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Signup failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-chai-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-chai-900/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="glass-card w-full max-w-sm p-8 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">☕</div>
          <h1 className="text-2xl font-black text-white tracking-tight">Join ChaiSpot</h1>
          <p className="text-sm text-zinc-500 mt-1">Discover shops, leave reviews, earn rewards</p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { icon: '📍', text: 'Find shops' },
            { icon: '⭐', text: 'Leave reviews' },
            { icon: '🎁', text: 'Earn rewards' },
          ].map((f, i) => (
            <motion.div
              key={f.text}
              className="glass-card-light p-2 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-lg">{f.icon}</div>
              <p className="text-xs text-zinc-500 mt-0.5">{f.text}</p>
            </motion.div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
            <input
              id="signup-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password <span className="text-zinc-600">(min. 6 characters)</span></label>
            <input
              id="signup-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <motion.p
              className="text-sm text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          <button
            id="signup-submit"
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : 'Create Account'
            }
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-chai-400 font-medium hover:text-chai-300 transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
