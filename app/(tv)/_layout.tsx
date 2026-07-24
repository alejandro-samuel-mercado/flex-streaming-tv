import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

export default function TVLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

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
          <Stack.Screen
            name="favorites"
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen name="my-nuba" />
          <Stack.Screen name="history" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="film/[id]" />
          <Stack.Screen name="watch/[id]" options={{ animation: 'fade' }} />
        </Stack>
      </View>

      {/* Top Nav overlay */}
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
