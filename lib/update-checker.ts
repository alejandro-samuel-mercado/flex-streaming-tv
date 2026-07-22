/**
 * Update checker — checks the server for a newer APK version.
 * Only runs on Android (no-op on iOS/web).
 * Platform is 'android' by default; TV builds should pass 'tv'.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL } from './api-routes';

export type AppPlatform = 'android' | 'tv';

export interface UpdateInfo {
    hasUpdate: boolean;
    currentVersionCode: number;
    serverVersionCode: number;
    serverVersionName: string;
    changelog: string;
    downloadUrl: string;
    filename: string;
}

/**
 * Returns the current app's versionCode.
 * Priority:
 *   1. Constants.expoConfig.extra.versionCode  ← set by app.config.ts (most reliable)
 *   2. Constants.expoConfig.android.versionCode ← standard Expo Android field
 *   3. Fallback to 1 if nothing is found
 *
 * This value is BAKED INTO THE APK at compile time from version.json.
 * You never need to change it manually — run ./release.sh to build a new version.
 */
function getCurrentVersionCode(): number {
    const extra = Constants.expoConfig?.extra as any;
    const fromExtra = extra?.versionCode;
    const fromAndroid = (Constants.expoConfig?.android as any)?.versionCode;

    const code = fromExtra ?? fromAndroid ?? 1;
    return Number(code);
}


/**
 * Check the server for the latest APK version.
 * Returns UpdateInfo if a new version is available, null otherwise.
 */
export async function checkForUpdate(platform: AppPlatform = 'android'): Promise<UpdateInfo | null> {
    // Only relevant on Android
    if (Platform.OS !== 'android') return null;

    try {
        const currentCode = getCurrentVersionCode();
        const url = `${API_BASE_URL}/app/version?platform=${platform}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

        if (!res.ok) return null;
        const json = await res.json();
        if (!json.success || !json.data) return null;

        const server = json.data;
        const serverCode = Number(server.versionCode ?? 0);

        if (serverCode > currentCode) {
            return {
                hasUpdate: true,
                currentVersionCode: currentCode,
                serverVersionCode: serverCode,
                serverVersionName: server.versionName,
                changelog: server.changelog || '',
                downloadUrl: server.downloadUrl,
                filename: server.filename,
            };
        }
        return null;
    } catch (err) {
        // Silently fail — update checks must never break the app
        return null;
    }
}
