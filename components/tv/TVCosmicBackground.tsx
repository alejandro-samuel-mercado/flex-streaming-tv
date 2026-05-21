import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * TVCosmicBackground
 * High performance homogeneous dark cosmic background for Android TV.
 * Uses a uniform dark gradient base with a subtle light ambient degradation.
 */
export default function TVCosmicBackground() {
  return (
    <View style={s.container} />
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050814',
    zIndex: -1,
  },
});
