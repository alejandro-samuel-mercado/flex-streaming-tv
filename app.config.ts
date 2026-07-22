import { ExpoConfig, ConfigContext } from 'expo/config';
import versionInfo from './version.json';

/**
 * Dynamic Expo config for TV — reads versionCode from version.json.
 * 
 * This means you NEVER manually edit versionCode.
 * Instead, run: ./release.sh tv
 * The script auto-increments version.json and compiles the APK.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Nuba TV',
    slug: 'nuba-tv',
    version: versionInfo.versionName,
    orientation: 'landscape',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#030612'
    },
    ios: {
        supportsTablet: false,
        bundleIdentifier: 'com.nuba.tv'
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/images/adaptive-icon.png',
            backgroundColor: '#030612'
        },
        package: 'com.nuba.tv',
        intentFilters: [
            {
                action: 'MAIN',
                category: ['LEANBACK_LAUNCHER', 'LAUNCHER']
            }
        ],
        // ← Taken from version.json automatically
        versionCode: versionInfo.versionCode,
        permissions: [
            "android.permission.REQUEST_INSTALL_PACKAGES"
        ]
    },
    plugins: [
        'expo-router',
        'expo-font',
        ['expo-screen-orientation', { initialOrientation: 'LANDSCAPE' }],
        'react-native-video',
        ['expo-build-properties', { android: { usesCleartextTraffic: true } }]
    ],
    experiments: { typedRoutes: true },
    scheme: 'nubatv',
    extra: {
        // Expose versionCode to the runtime
        versionCode: versionInfo.versionCode,
        versionName: versionInfo.versionName,
        router: {},
        eas: { projectId: '0e3c8617-e1db-466e-ad9c-02bce8c6ae7e' }
    }
});
