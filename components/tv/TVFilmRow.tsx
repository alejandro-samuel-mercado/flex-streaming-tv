import React, { useRef, memo, useState, useLayoutEffect, forwardRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, findNodeHandle, Platform } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import TVFilmCard from './TVFilmCard';
import { scale } from '../../lib/scale';

const TVPressable = Pressable as any;

interface FilmItem {
  id: string;
  title: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number | null;
  year?: number | null;
  type?: string;
  progress?: number;
  duration?: number;
  episodeId?: string | null;
}

interface TVFilmRowProps {
  title: string;
  subtitle?: string;
  items: FilmItem[];
  variant?: 'poster' | 'landscape';
  exploreRoute?: string;
  hasTVPreferredFocus?: boolean;
  onPressItem?: (item: FilmItem) => void;
  onPressViewMore?: () => void;
}

// ─── "Ver más" card ────────────────────────────────────────────────────────────
const ViewMoreCard = forwardRef<any, { onPress: () => void; variant: 'poster' | 'landscape' }>(
  function ViewMoreCard({ onPress, variant }, ref) {
    const [focused, setFocused] = useState(false);
    const isLandscape = variant === 'landscape';
    const cardWidth = isLandscape ? scale(320) : TV.cardWidthPoster;
    const cardHeight = isLandscape ? (cardWidth * 9 / 16) : (cardWidth * 1.5);
    return (
      <TVPressable
        ref={ref}
        focusable
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={onPress}
        style={[s.viewMoreCard, { width: cardWidth, height: cardHeight }, focused && s.viewMoreFocused]}
      >
        <ChevronRight size={scale(32)} color={focused ? '#000' : Colors.white} />
        <Text style={[s.viewMoreText, focused && s.viewMoreTextFocused]}>Ver más</Text>
      </TVPressable>
    );
  }
);

function TVFilmRowInner({
  title, subtitle, items, variant = 'poster',
  exploreRoute, hasTVPreferredFocus, onPressItem, onPressViewMore,
}: TVFilmRowProps) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const firstRef = useRef<any>(null);
  const lastRef = useRef<any>(null);   // last card OR viewMore card

  const hasViewMore = !!(onPressViewMore || (exploreRoute && items.length > 8));

  // Imperatively set self-loop after every render — no state, no re-renders
  useLayoutEffect(() => {
    if (Platform.OS === 'web') return; // findNodeHandle / setNativeProps not available on web
    const timer = setTimeout(() => {
      if (firstRef.current) {
        const id = findNodeHandle(firstRef.current);
        if (id) firstRef.current.setNativeProps?.({ nextFocusLeft: id });
      }
      if (lastRef.current) {
        const id = findNodeHandle(lastRef.current);
        if (id) lastRef.current.setNativeProps?.({ nextFocusRight: id });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [items, hasViewMore]);

  if (!items || items.length === 0) return null;

  const totalCards = Math.min(items.length, 8);

  return (
    <View style={s.section}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>

      {/* List */}
      <ScrollView
        ref={scrollRef as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.listContent, { gap: TV.rowItemGap }]}
      >
        {items.slice(0, 8).map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === totalCards - 1 && !hasViewMore;
          return (
            <TVFilmCard
              key={item.id}
              ref={isFirst ? firstRef : isLast ? lastRef : undefined}
              id={item.id}
              title={item.title}
              posterUrl={item.posterUrl}
              backdropUrl={item.backdropUrl}
              rating={item.rating}
              year={item.year}
              type={item.type}
              progress={item.progress}
              duration={item.duration}
              variant={variant}
              hasTVPreferredFocus={hasTVPreferredFocus && isFirst}
              onFocus={isFirst ? () => {
                scrollRef.current?.scrollTo({ x: 0, animated: true });
                setTimeout(() => {
                  scrollRef.current?.scrollTo({ x: 0, animated: true });
                }, 100);
                setTimeout(() => {
                  scrollRef.current?.scrollTo({ x: 0, animated: false });
                }, 250);
              } : undefined}
              onPress={onPressItem ? () => onPressItem(item) : undefined}
            />
          );
        })}
        {hasViewMore && (
          <ViewMoreCard
            ref={lastRef}
            onPress={() => {
              if (onPressViewMore) onPressViewMore();
              else if (exploreRoute) router.push(exploreRoute as any);
            }}
            variant={variant}
          />
        )}
      </ScrollView>
    </View>
  );
}

const TVFilmRow = memo(TVFilmRowInner);
export default TVFilmRow;

const s = StyleSheet.create({
  section: {
    marginBottom: scale(36),
  },
  header: {
    paddingHorizontal: scale(56),
    marginBottom: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  sectionTitle: {
    fontSize: scale(20),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: scale(14),
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: scale(56),
    paddingTop: scale(10),
    paddingBottom: scale(20),
  },
  viewMoreCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  viewMoreFocused: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  viewMoreText: {
    color: Colors.white,
    fontSize: scale(14),
    fontWeight: '700',
  },
  viewMoreTextFocused: {
    color: '#000',
  },
});
