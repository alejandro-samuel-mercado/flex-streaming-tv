import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, BackHandler, ToastAndroid } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import TVTopNav from '../../components/tv/TVTopNav';
import { Colors } from '../../theme/colors';

export default function TVLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const backPressCount = useRef(0);

  useEffect(() => {
    const backAction = () => {
      // Si el enrutador puede retroceder internamente (en un stack), déjalo actuar.
      if (router.canGoBack()) {
        return false;
      }

      // Si estamos en la raíz (ej: /home o /explore) y no hay historial de navegación:
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        ToastAndroid.show('Presiona Atrás nuevamente para salir de PeliPlus', ToastAndroid.SHORT);
        setTimeout(() => {
          backPressCount.current = 0;
        }, 2000);
        return true; // Interceptar el botón
      }

      // Si presionó por segunda vez en menos de 2 segundos:
      BackHandler.exitApp();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  return (
    <View style={s.root}>
      {/* Main content area — full width */}
      <View style={s.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.bg },
            animation: 'none',
          }}
        >
          <Stack.Screen name="home" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="search" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="history" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="film/[id]" />
          <Stack.Screen name="watch/[id]" options={{ animation: 'fade' }} />
        </Stack>
      </View>

      {/* Top Nav overlay */}
      <TVTopNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
  },
});
