import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

/**
 * TVCosmicBackground
 * Highly optimized animated cosmic background for Android TV.
 * Uses native driven animations to slowly pulse and pan deep rich gradients.
 */
export default function TVCosmicBackground() {
  const wave1TranslateX = useSharedValue(0);
  const wave2TranslateX = useSharedValue(-SW * 0.5);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    // Very slow, infinite translation to simulate a deep space/wave drift
    wave1TranslateX.value = withRepeat(
      withTiming(-SW * 0.5, { duration: 45000, easing: Easing.linear }),
      -1,
      true
    );
    
    wave2TranslateX.value = withRepeat(
      withTiming(0, { duration: 55000, easing: Easing.linear }),
      -1,
      true
    );

    // Subtle pulsing for the cosmic glow/sparkle effect
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const wave1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: wave1TranslateX.value }],
  }));

  const wave2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: wave2TranslateX.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={s.container}>
      {/* Base Deep Space Color (NO GREYS) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#02040A' }]} />

      {/* Animated Wave 1: Deep Blue/Cyan drift */}
      <Animated.View style={[s.layer, wave1Style]}>
        <LinearGradient
          colors={['rgba(0, 195, 255, 0.08)', 'transparent', 'rgba(0, 195, 255, 0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Animated Wave 2: Cosmic Purple/Magenta drift */}
      <Animated.View style={[s.layer, wave2Style]}>
        <LinearGradient
          colors={['transparent', 'rgba(138, 43, 226, 0.12)', 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Cosmic Glow / Sparkle Layer */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.03)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.4 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Top Gradient to ensure text readability */}
      <LinearGradient
        colors={['rgba(2, 4, 10, 0.8)', 'transparent', 'rgba(2, 4, 10, 0.95)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#02040A', // Fallback
    zIndex: -1, // Keep it strictly behind everything
  },
  layer: {
    position: 'absolute',
    top: -SH * 0.5,
    left: 0,
    width: SW * 2,
    height: SH * 2,
  },
});
