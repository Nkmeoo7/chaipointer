import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { login as apiLogin, logout as apiLogout, signup as apiSignup } from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePoints: (points: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from cookie on mount
  useEffect(() => {
    import('../api').then(({ default: api }) => {
      api.get('/auth/me').then(res => {
        setUser(res.data.user);
      }).catch(() => {
        setUser(null);
      }).finally(() => setLoading(false));
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setUser(res.data.user);
  };

  const signup = async (email: string, password: string) => {
    const res = await apiSignup(email, password);
    setUser(res.data.user);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const updatePoints = (points: number) => {
    setUser(prev => prev ? { ...prev, points } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updatePoints }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
