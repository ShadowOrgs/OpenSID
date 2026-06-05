import { clearToken, getToken, setToken } from './tokenStorage';
import { me } from '@/api/auth';
import type { AuthResponse, MandiriUser } from '@/types/mandiri';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  user: MandiriUser | null;
  isLoading: boolean;
  signIn: (payload: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<MandiriUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const token = await getToken();
        if (!token) return;
        const response = await me();
        if (mounted) setUser(response.data.user);
      } catch {
        await clearToken();
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    signIn: async (payload) => {
      await setToken(payload.access_token);
      setUser(payload.user);
    },
    signOut: async () => {
      await clearToken();
      setUser(null);
    },
  }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
