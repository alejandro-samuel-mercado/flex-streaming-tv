import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ROUTES } from './api-routes';

export const StorageKeys = {
  ACCESS_TOKEN: 'nuba_tv_access_token',
  REFRESH_TOKEN: 'nuba_tv_refresh_token',
  PROFILE_ID: 'nuba_tv_profile_id',
} as const;

export const Storage = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
  multiRemove: (keys: string[]) => AsyncStorage.multiRemove(keys),
};

let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

async function refreshAccessToken(): Promise<string | null> {
  if (_isRefreshing) {
    return new Promise((resolve) => { _refreshQueue.push(resolve); });
  }
  _isRefreshing = true;
  try {
    const refreshToken = await Storage.get(StorageKeys.REFRESH_TOKEN);
    if (!refreshToken) return null;
    const res = await fetch(API_ROUTES.AUTH.REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (data.success && data.data?.accessToken) {
      await Storage.set(StorageKeys.ACCESS_TOKEN, data.data.accessToken);
      if (data.data.refreshToken) {
        await Storage.set(StorageKeys.REFRESH_TOKEN, data.data.refreshToken);
      }
      _refreshQueue.forEach((cb) => cb(data.data.accessToken));
      _refreshQueue = [];
      return data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  } finally {
    _isRefreshing = false;
  }
}

export async function fetchApi<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await Storage.get(StorageKeys.ACCESS_TOKEN);
  let profileId = await Storage.get(StorageKeys.PROFILE_ID);

  // Auto-Heal 1: Clean up literal 'undefined' or 'null' strings immediately
  if (profileId === 'undefined' || profileId === 'null') {
    profileId = null;
    await Storage.remove(StorageKeys.PROFILE_ID);
  }

  // Auto-Heal 2: If profileId is missing but token exists, fetch or create a valid profile first
  if (!profileId && token) {
    try {
      const meRes = await fetch(API_ROUTES.AUTH.ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success && meData.data) {
        let profiles = meData.data.profiles || [];
        if (profiles.length === 0) {
          const profRes = await fetch(API_ROUTES.PROFILES.LIST, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const profData = await profRes.json();
          if (profData.success && Array.isArray(profData.data)) {
            profiles = profData.data;
          }
        }
        if (profiles.length === 0) {
          const createRes = await fetch(API_ROUTES.PROFILES.CREATE, {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: meData.data.name || 'Principal' }),
          });
          const createData = await createRes.json();
          if (createData.success && createData.data) {
            profiles = [createData.data];
          }
        }
        if (profiles.length > 0) {
          const resolvedProfileId = profiles[0].id;
          profileId = resolvedProfileId;
          await Storage.set(StorageKeys.PROFILE_ID, resolvedProfileId);
        }
      }
    } catch (e) {
      console.warn('[fetchApi] Auto-heal profileId resolution failed:', e);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (profileId) headers['X-Profile-Id'] = profileId;

  let res = await fetch(url, { ...options, headers });

  // Self-Healing Retry: If the request returns a 500/400 (which happens on invalid/stale X-Profile-Id), heal & retry
  if ((res.status === 500 || res.status === 400) && token) {
    try {
      const meRes = await fetch(API_ROUTES.AUTH.ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success && meData.data) {
        let profiles = meData.data.profiles || [];
        if (profiles.length === 0) {
          const profRes = await fetch(API_ROUTES.PROFILES.LIST, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const profData = await profRes.json();
          if (profData.success && Array.isArray(profData.data)) {
            profiles = profData.data;
          }
        }
        if (profiles.length === 0) {
          const createRes = await fetch(API_ROUTES.PROFILES.CREATE, {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: meData.data.name || 'Principal' }),
          });
          const createData = await createRes.json();
          if (createData.success && createData.data) {
            profiles = [createData.data];
          }
        }
        if (profiles.length > 0) {
          const newProfileId = profiles[0].id;
          await Storage.set(StorageKeys.PROFILE_ID, newProfileId);
          headers['X-Profile-Id'] = newProfileId;
          // Retry request
          res = await fetch(url, { ...options, headers });
        }
      }
    } catch (e) {
      console.warn('[fetchApi] Self-healing retry failed:', e);
    }
  }

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  return res.json();
}
