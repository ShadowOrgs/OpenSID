import { clearToken, getToken, setToken } from './tokenStorage';
import { getSelectedVillage, setSelectedVillage, clearSelectedVillage, type Village } from './villageStorage';
import { setApiUrl } from '@/api/client';
import { me } from '@/api/auth';
import type { AuthResponse, MandiriUser } from '@/types/mandiri';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextValue = {
  user: MandiriUser | null;
  isLoading: boolean;
  selectedVillage: Village | null;
  signIn: (payload: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  selectVillage: (village: Village) => Promise<void>;
  changeVillage: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<MandiriUser | null>(null);
  const [selectedVillage, setSelectedVillageState] = useState<Village | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const village = await getSelectedVillage();
        if (village) {
          if (mounted) setSelectedVillageState(village);
          setApiUrl(village.api_url);
        }

        const token = await getToken();
        if (!token) return;

        if (village) {
          const response = await me();
          if (mounted) setUser(response.data.user);
        }
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
    selectedVillage,
    signIn: async (payload) => {
      await setToken(payload.access_token);
      setUser(payload.user);
    },
    signOut: async () => {
      await clearToken();
      setUser(null);
    },
    refreshUser: async () => {
      const response = await me();
      setUser(response.data.user);
    },
    selectVillage: async (village) => {
      await setSelectedVillage(village);
      setApiUrl(village.api_url);
      setSelectedVillageState(village);
    },
    changeVillage: async () => {
      await clearToken();
      await clearSelectedVillage();
      setUser(null);
      setSelectedVillageState(null);
    },
  }), [isLoading, user, selectedVillage]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
