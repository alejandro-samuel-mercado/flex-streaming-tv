import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import { resolveImageUrl } from '../../lib/api-routes';
import TVFocusable from './TVFocusable';
import { Star } from 'lucide-react-native';

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

function TVFilmCardInner({
  id, title, posterUrl, backdropUrl, rating, year, type, progress, duration,
  variant = 'poster', hasTVPreferredFocus, width: widthProp, onPress,
}: TVFilmCardProps) {
  const router = useRouter();

  const isLandscape = variant === 'landscape';
  const cardWidth = widthProp ?? (isLandscape ? 320 : TV.cardWidthPoster);
  const cardHeight = isLandscape ? (cardWidth * 9 / 16) : (cardWidth * 1.5);
  const imgUrl = isLandscape ? (backdropUrl || posterUrl) : (posterUrl || backdropUrl);

  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={[s.wrapper, { width: cardWidth }]}>
      <TVFocusable
        style={[{ width: cardWidth, height: cardHeight }, s.card]}
        focusBorderRadius={16}
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocusChange={setIsFocused}
        onPress={onPress || (() => router.push(`/(tv)/film/${id}` as any))}
      >
        <Image
          source={resolveImageUrl(imgUrl)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />

        {/* Premium Translucent Rating Badge (Top-Right Corner)
            Gives a luxurious cinematic card feel and stays tightly integrated with the card art. */}
        {!!rating && rating > 0 && (
          <View style={s.ratingBadge}>
            <Star size={11} fill="#F5C518" color="#F5C518" />
            <Text style={s.ratingBadgeText}>{rating.toFixed(1)}</Text>
          </View>
        )}

        {/* Progress bar overlay if provided */}
        {progress != null && duration != null && duration > 0 && (
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.min((progress / duration) * 100, 100)}%` }]} />
          </View>
        )}
      </TVFocusable>

      {/* Elegant, compact text container directly below the card poster.
          NO large empty gaps or floating items. Everything sits tightly and beautifully. */}
      <View style={s.metaContainer}>
        <Text style={[s.title, isFocused && s.titleFocused]} numberOfLines={2}>
          {title}
        </Text>
        {!!year && <Text style={s.yearText}>{year}</Text>}
      </View>
    </View>
  );
}

const TVFilmCard = memo(TVFilmCardInner);
export default TVFilmCard;

const s = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
  },
  card: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative', // Necessary for absolute positioning of rating badge
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(9, 10, 13, 0.82)', // Elegant dark glassmorphic badge
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  metaContainer: {
    marginTop: 8,
    paddingHorizontal: 2,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB', // Bright neutral color
    letterSpacing: 0.1,
    lineHeight: 21,
    marginBottom: 2, // Minimal tight margin
  },
  titleFocused: {
    color: '#FFFFFF', // High-contrast glowing white on focus
    fontWeight: '700',
  },
  yearText: {
    fontSize: 12,
    color: '#71717A', // Muted clean gray
    fontWeight: '700',
    letterSpacing: 0.1,
    marginTop: 2, // Sits directly and closely below the title
  },
});
