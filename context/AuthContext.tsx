import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

/**
 * Silently attempts to rotate the accessToken using the stored refreshToken.
 * Returns the new accessToken on success, or null if the refresh token is
 * missing / expired / revoked.
 */
async function silentRefresh(): Promise<string | null> {
  const storedRefresh = await Storage.get(StorageKeys.REFRESH_TOKEN);
  if (!storedRefresh) return null;

  try {
    const res = await fetch(API_ROUTES.AUTH.REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    });

    // Non-OK responses are treated as transient errors — don't clear tokens.
    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && data.data?.accessToken) {
      const newAccess: string = data.data.accessToken;
      await Storage.set(StorageKeys.ACCESS_TOKEN, newAccess);
      if (data.data.refreshToken) {
        await Storage.set(StorageKeys.REFRESH_TOKEN, data.data.refreshToken);
      }
      return newAccess;
    }
    return null;
  } catch {
    // Network error — keep session alive, retry next time.
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchUser = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const token = await Storage.get(StorageKeys.ACCESS_TOKEN);
    if (!token) {
      setUser(null);
      setLoading(false);
      fetchingRef.current = false;
      return;
    }

    try {
      const res = await fetch(API_ROUTES.AUTH.ME, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ── 401: access token expired — try silent refresh ──────────────────────
      if (res.status === 401) {
        const newToken = await silentRefresh();
        if (newToken) {
          const retryRes = await fetch(API_ROUTES.AUTH.ME, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          const retryResult = await retryRes.json();
          if (retryResult.success && retryResult.data) {
            await _resolveAndSetUser(retryResult.data, newToken);
          } else {
            await _clearAll();
            setUser(null);
          }
        } else {
          // Refresh token expired/revoked — must log in again
          await _clearAll();
          setUser(null);
        }
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      // ── Non-401 server/network error — keep session alive ───────────────────
      if (!res.ok) {
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      // ── 200 OK ───────────────────────────────────────────────────────────────
      const result = await res.json();
      if (result.success && result.data) {
        await _resolveAndSetUser(result.data, token);
      } else {
        await _clearAll();
        setUser(null);
      }
    } catch {
      // Pure network error — do NOT change user state to avoid UI flicker.
    } finally {
      setLoading(false);
      fetchingRef.current = false;
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
    await _clearAll();
    setUser(null);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function _resolveAndSetUser(data: AuthUser, token: string) {
    let profiles = data.profiles || [];

    // Defensive: fetch profiles if not included
    if (profiles.length === 0) {
      try {
        const profRes = await fetch(API_ROUTES.PROFILES.LIST, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
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

    // Defensive: create default profile if still empty
    if (profiles.length === 0) {
      try {
        const createRes = await fetch(API_ROUTES.PROFILES.CREATE, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: data.name || 'Principal' }),
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
      data.profiles = profiles;
    } else {
      await Storage.remove(StorageKeys.PROFILE_ID);
    }

    setUser(data);
  }

  async function _clearAll() {
    await Storage.multiRemove([
      StorageKeys.ACCESS_TOKEN,
      StorageKeys.REFRESH_TOKEN,
      StorageKeys.PROFILE_ID,
    ]);
  }

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
