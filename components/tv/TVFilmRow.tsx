import React, { useRef, useCallback, memo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import TVFilmCard from './TVFilmCard';
import { scale } from '../../lib/scale';

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

// ─── View More Card ────────────────────────────────────────────────────────────
function ViewMoreCard({ onPress, variant }: { onPress: () => void; variant: 'poster' | 'landscape' }) {
  const [focused, setFocused] = useState(false);
  const isPoster = variant === 'poster';
  return (
    <Pressable
      focusable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        s.viewMoreCard,
        isPoster ? s.viewMoreCardPoster : s.viewMoreCardLandscape,
        focused && s.viewMoreCardFocused,
      ]}
    >
      <View style={[s.viewMoreIcon, focused && s.viewMoreIconFocused]}>
        <ChevronRight size={scale(28)} color={focused ? Colors.black : Colors.accent} strokeWidth={2.5} />
      </View>
      <Text style={[s.viewMoreText, focused && s.viewMoreTextFocused]}>Ver más</Text>
    </Pressable>
  );
}

function TVFilmRowInner({
  title, subtitle, items, variant = 'poster',
  exploreRoute, hasTVPreferredFocus, onPressItem, onPressViewMore,
}: TVFilmRowProps) {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);

  const renderItem = useCallback(({ item, index }: { item: FilmItem; index: number }) => (
    <TVFilmCard
      key={item.id}
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
      hasTVPreferredFocus={hasTVPreferredFocus && index === 0}
      onPress={onPressItem ? () => onPressItem(item) : undefined}
    />
  ), [variant, hasTVPreferredFocus, onPressItem]);

  if (!items || items.length === 0) return null;

  return (
    <View style={s.section}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>

      {/* List */}
      <FlatList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ width: TV.rowItemGap }} />}
        ListFooterComponent={
          onPressViewMore ? (
            <View style={{ marginLeft: TV.rowItemGap }}>
              <ViewMoreCard onPress={onPressViewMore} variant={variant} />
            </View>
          ) : null
        }
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={3}
      />
    </View>
  );
}

const TVFilmRow = memo(TVFilmRowInner);
export default TVFilmRow;

const s = StyleSheet.create({
  section: {
    marginBottom: scale(40),
  },
  header: {
    paddingHorizontal: scale(56),
    marginBottom: scale(14),
  },
  sectionTitle: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: scale(14),
    color: '#9CA3AF',
    marginTop: scale(4),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  listContent: {
    paddingHorizontal: scale(56),
    paddingBottom: scale(16),
    paddingTop: scale(8),
  },
  viewMoreCard: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(10),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: scale(12),
  },
  viewMoreCardPoster: {
    width: scale(140),
    height: scale(210),
  },
  viewMoreCardLandscape: {
    width: scale(260),
    height: scale(150),
  },
  viewMoreCardFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  viewMoreIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(0,229,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreIconFocused: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  viewMoreText: {
    fontSize: scale(14),
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  viewMoreTextFocused: {
    color: Colors.black,
  },
});
