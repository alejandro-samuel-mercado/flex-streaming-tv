import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { Colors } from '../theme/colors';

export default function RootLayout() {
  useEffect(() => {
    // Safely lock to landscape — wrapped fully to never crash on TV boxes
    // which may not have a rotation sensor or may reject orientation lock calls
    try {
      const SO = require('expo-screen-orientation');
      if (SO && SO.lockAsync && SO.OrientationLock) {
        SO.lockAsync(SO.OrientationLock.LANDSCAPE).catch(() => {});
      }
    } catch (_) {}
    // NOTE: expo-navigation-bar has been intentionally removed.
    // Its native lifecycle listener (NavigationBarReactActivityLifecycleListener)
    // runs BEFORE JavaScript starts and crashes Android TV boxes
    // because they have no system navigation bar.
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar hidden />
          <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tv)" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
});
