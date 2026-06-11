import React, { memo, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Pressable, findNodeHandle } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { TV } from '../../theme/tv';
import { resolveImageUrl } from '../../lib/api-routes';
import { Star } from 'lucide-react-native';
import { scale } from '../../lib/scale';

const TVPressable = Pressable as any;

interface TVFilmCardProps {
  id: string;
  title: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number | null;
  year?: number | null;
  type?: string;
  progress?: number;
  duration?: number;
  variant?: 'poster' | 'landscape';
  hasTVPreferredFocus?: boolean;
  width?: number;
  onPress?: () => void;
}

/**
 * TVFilmCard — Uses bare Pressable (same pattern as EpisodeCard in film/[id])
 * for maximum D-Pad performance on Android TV.
 */
const TVFilmCardInner = forwardRef<View, TVFilmCardProps>(function TVFilmCardInner({
  id, title, posterUrl, backdropUrl, rating, year, type, progress, duration,
  variant = 'poster', hasTVPreferredFocus, width: widthProp, onPress,
}, ref) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const pressableRef = useRef<any>(null);

  useImperativeHandle(ref, () => pressableRef.current);

  const isLandscape = variant === 'landscape';
  const cardWidth = widthProp ?? (isLandscape ? scale(320) : TV.cardWidthPoster);
  const cardHeight = isLandscape ? (cardWidth * 9 / 16) : (cardWidth * 1.5);
  const imgUrl = isLandscape ? (backdropUrl || posterUrl) : (posterUrl || backdropUrl);

  return (
    <View style={[s.wrapper, { width: cardWidth }]}>
      <TVPressable
        ref={pressableRef}
        focusable
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={onPress || (() => router.push(`/(tv)/film/${id}` as any))}
        style={[
          s.card,
          { width: cardWidth, height: cardHeight },
          focused && s.cardFocused,
        ]}
      >
        <Image
          source={resolveImageUrl(imgUrl)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />

        {!!rating && Number(rating) > 0 && (
          <View style={s.ratingBadge}>
            <Star size={11} fill="#F5C518" color="#F5C518" />
            <Text style={s.ratingBadgeText}>{Number(rating).toFixed(1)}</Text>
          </View>
        )}

        {progress != null && duration != null && Number(duration) > 0 && (
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.round(Math.max(0, Math.min((Number(progress) / Number(duration)) * 100, 100)))}%` }]} />
          </View>
        )}
      </TVPressable>

      <View style={s.metaContainer}>
        <Text style={[s.title, focused && s.titleFocused]} numberOfLines={2}>
          {title}
        </Text>
        {!!year && <Text style={s.yearText}>{year}</Text>}
      </View>
    </View>
  );
});

const TVFilmCard = memo(TVFilmCardInner);
export default TVFilmCard;

const s = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
  },
  card: {
    backgroundColor: '#1E1E24',
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: scale(2),
    borderColor: 'transparent',
    position: 'relative',
  },
  cardFocused: {
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 3,
    transform: [{ scale: TV.cardFocusedScale }],
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: scale(4),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  ratingBadge: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(9, 10, 13, 0.82)',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontSize: scale(12),
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  metaContainer: {
    marginTop: scale(8),
    paddingHorizontal: scale(2),
    width: '100%',
  },
  title: {
    fontSize: scale(16),
    fontWeight: '600',
    color: '#D1D5DB',
    letterSpacing: 0.1,
    lineHeight: scale(21),
    marginBottom: scale(2),
  },
  titleFocused: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  yearText: {
    fontSize: scale(12),
    color: '#71717A',
    fontWeight: '700',
    letterSpacing: 0.1,
    marginTop: scale(2),
  },
});
