import React, { useRef, useCallback, memo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import TVFilmCard from './TVFilmCard';

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
}

function TVFilmRowInner({
  title, subtitle, items, variant = 'poster',
  exploreRoute, hasTVPreferredFocus, onPressItem,
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
      {/* Header — Elegant, premium cinematic styling */}
      <View style={s.header}>
        <Text style={s.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>

      {/* List */}
      <FlatList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ width: TV.rowItemGap }} />}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={3}
        removeClippedSubviews
      />
    </View>
  );
}

const TVFilmRow = memo(TVFilmRowInner);
export default TVFilmRow;

const s = StyleSheet.create({
  section: {
    marginBottom: 40,
  },
  header: {
    paddingHorizontal: 56,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20, // Bold, highly readable section header sizing for TV
    fontWeight: '700', // Crisp, prominent weight
    color: '#FFFFFF', // High contrast pure white
    letterSpacing: 0.4, // Open typography breathing room
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  listContent: {
    paddingHorizontal: 56,
    paddingBottom: 16,
    paddingTop: 8, // padding for the shadow of focused items
  },
});
