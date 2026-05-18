import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Storage, StorageKeys } from '../lib/api-client';
import { API_ROUTES } from '../lib/api-routes';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  profiles?: any[];
  endUserAccount?: {
    id: string;
    status: string;
    type: string;
    planId?: string | null;
    endDate: string | null;
    maxDevices: number;
    plan?: {
      id: string;
      name: string;
      durationDays: number;
      bonusDays?: number;
    };
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, userData?: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = await Storage.get(StorageKeys.ACCESS_TOKEN);
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const res = await fetch(API_ROUTES.AUTH.ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        let profiles = result.data.profiles || [];
        
        // Defensive Check 1: If profiles are empty, try fetching from the profiles list
        if (profiles.length === 0) {
          try {
            const profRes = await fetch(API_ROUTES.PROFILES.LIST, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            });
            const profData = await profRes.json();
            if (profData.success && Array.isArray(profData.data)) {
              profiles = profData.data;
            }
          } catch (e) {
            console.warn('[AuthContext] Error fetching profiles fallback:', e);
          }
        }

        // Defensive Check 2: If still empty, automatically create a default profile
        if (profiles.length === 0) {
          try {
            const createRes = await fetch(API_ROUTES.PROFILES.CREATE, {
              method: 'POST',
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: result.data.name || 'Principal' }),
            });
            const createData = await createRes.json();
            if (createData.success && createData.data) {
              profiles = [createData.data];
            }
          } catch (e) {
            console.warn('[AuthContext] Error creating default profile:', e);
          }
        }

        // Secure a valid PROFILE_ID
        if (profiles.length > 0) {
          const storedProfileId = await Storage.get(StorageKeys.PROFILE_ID);
          const valid = profiles.some((p: any) => p.id === storedProfileId);
          if (!storedProfileId || !valid || storedProfileId === 'undefined' || storedProfileId === 'null') {
            await Storage.set(StorageKeys.PROFILE_ID, profiles[0].id);
          }
          // Attach resolved profiles to the user record for downstream consumption
          result.data.profiles = profiles;
        } else {
          await Storage.remove(StorageKeys.PROFILE_ID);
        }

        setUser(result.data);
      } else {
        await Storage.remove(StorageKeys.ACCESS_TOKEN);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (accessToken: string, refreshToken: string, userData?: AuthUser) => {
    await Storage.set(StorageKeys.ACCESS_TOKEN, accessToken);
    await Storage.set(StorageKeys.REFRESH_TOKEN, refreshToken);
    if (userData?.profiles?.length) {
      await Storage.set(StorageKeys.PROFILE_ID, userData.profiles[0].id);
      setUser(userData);
      setLoading(false);
    } else {
      await fetchUser();
    }
  };

  const logout = async () => {
    await Storage.multiRemove([
      StorageKeys.ACCESS_TOKEN,
      StorageKeys.REFRESH_TOKEN,
      StorageKeys.PROFILE_ID,
    ]);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
