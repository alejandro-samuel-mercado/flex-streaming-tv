import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import { resolveImageUrl } from '../../lib/api-routes';
import TVFocusable from './TVFocusable';

const { width: SW, height: SH } = Dimensions.get('window');

interface TVHeroBannerProps {
  slides: any[];
  hasTVPreferredFocus?: boolean;
}

export default function TVHeroBanner({ slides }: TVHeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoRotate = useCallback(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 8000); // 8 seconds per slide
  }, [slides.length]);

  useEffect(() => {
    startAutoRotate();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startAutoRotate]);

  if (!slides.length) return null;
  const item = slides[currentIndex];

  return (
    <View style={s.container}>
      {/* Absolute Background Image taking full screen height */}
      <Image
        key={item.id} // Forces re-render for transition
        source={resolveImageUrl(item.backdropUrl)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={1000}
      />

      {/* Bottom fade - pushed lower so more image is visible */}
      <LinearGradient
        colors={['transparent', 'rgba(9,10,13,0.6)', '#090A0D', '#090A0D']}
        locations={[0.6, 0.8, 0.95, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Left fade - heavily reduced opacity for a brighter image */}
      <LinearGradient
        colors={['rgba(9,10,13,0.8)', 'rgba(9,10,13,0.2)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.5, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top fade - reduced opacity */}
      <LinearGradient
        colors={['rgba(9,10,13,0.7)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.2 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Content - Left Aligned, Bottom-heavy */}
      <Animated.View key={`content-${item.id}`} entering={FadeIn.duration(800)} style={s.content}>

        {/* Massive Title */}
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>

        {/* Tags / Metadata */}
        <View style={s.tagsRow}>
          <Text style={s.trendingText}>TENDENCIA</Text>
          <Text style={s.tagSeparator}>|</Text>
          {!!item.year && <Text style={s.metaText}>{item.year}</Text>}
          {!!item.ageRating && (
            <>
              <Text style={s.metaDot}>•</Text>
              <View style={s.ageBadge}><Text style={s.ageText}>{item.ageRating}</Text></View>
            </>
          )}
          {!!item.rating && item.rating > 0 && (
            <>
              <Text style={s.metaDot}>•</Text>
              <Star size={14} color="#F5C518" fill="#F5C518" />
              <Text style={[s.metaText, { marginLeft: 6 }]}>{item.rating.toFixed(1)}</Text>
            </>
          )}
        </View>

        {/* Description (Stacked below) */}
        <Text style={s.descText} numberOfLines={3}>{item.description}</Text>

        {/* Small Dot Pagination (Google TV style on the right side of text) */}
        <View style={s.dotsRow}>
           {slides.map((_, i) => (
             <View key={i} style={[s.dot, i === currentIndex && s.dotActive]} />
           ))}
        </View>

      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    width: SW,
    height: SH, // Takes full screen height to allow deep overlapping of rows
    position: 'relative',
    backgroundColor: '#090A0D',
  },
  content: {
    position: 'absolute',
    bottom: '48%', // Shifted much further up (almost to center) to fully clear the -380px rows
    left: 56,
    right: '35%',
  },
  title: {
    fontSize: 64, // Sleek, modern, highly legible title sizing
    fontWeight: '900', // Cinematic heavy font weight
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 72,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  tagSeparator: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  metaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E5E7EB',
    letterSpacing: 0.2,
  },
  metaDot: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 10,
  },
  ageBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ageText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 18, // Extremely clear text size for TV screens
    fontWeight: '400',
    color: '#D1D5DB', // Brighter grey for high contrast
    lineHeight: 26,
    marginBottom: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
});
