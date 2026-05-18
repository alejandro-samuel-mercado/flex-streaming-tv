import React, { useRef, useCallback, memo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { resolveImageUrl } from '../../lib/api-routes';

interface Platform {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
}

interface TVPlatformRowProps {
  title: string;
  items: Platform[];
}

function TVPlatformRowInner({ title, items }: TVPlatformRowProps) {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);

  // Filter out duplicates safely, ensuring items and slug exist
  const uniqueItems = (items || []).filter(
    (item, index, self) => 
      item && 
      self.findIndex((t) => t && t.slug === item.slug) === index
  );

  const renderItem = useCallback(({ item }: { item: Platform }) => (
    <PlatformCircle item={item} onPress={() => router.push(`/(tv)/explore?platform=${item.slug}` as any)} />
  ), [router]);

  if (uniqueItems.length === 0) return null;

  return (
    <View style={s.section}>
      <View style={s.header}>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <FlatList
        ref={listRef}
        data={uniqueItems}
        renderItem={renderItem}
        keyExtractor={(item) => item?.id || Math.random().toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
      />
    </View>
  );
}

// Highly stable, fast Icons8 CDN for premium pre-rendered app store icons
const getOfficialPlatformIcon = (slug: any = '', name: any = '') => {
  const s = (slug || '').toString().toLowerCase();
  const n = (name || '').toString().toLowerCase();

  if (s.includes('netflix') || n.includes('netflix')) {
    return 'https://img.icons8.com/color/512/netflix-new.png';
  }
  if (s.includes('disney') || n.includes('disney')) {
    return 'https://img.icons8.com/fluency/512/disney-plus.png';
  }
  if (s.includes('prime') || n.includes('prime') || s.includes('amazon') || n.includes('amazon')) {
    return 'https://img.icons8.com/color/512/amazon-prime-video.png';
  }
  if (s.includes('hbo') || n.includes('hbo') || s.includes('max') || n.includes('max')) {
    return 'https://img.icons8.com/color/512/hbo-max.png';
  }
  if (s.includes('apple') || n.includes('apple')) {
    return 'https://img.icons8.com/color/512/apple-tv.png';
  }
  if (s.includes('paramount') || n.includes('paramount')) {
    return 'https://img.icons8.com/color/512/paramount-plus.png';
  }
  if (s.includes('star') || n.includes('star')) {
    return 'https://img.icons8.com/color/512/star-plus.png';
  }
  if (s.includes('crunchy') || n.includes('crunchy')) {
    return 'https://img.icons8.com/color/512/crunchyroll.png';
  }
  
  return null;
};

// Custom brand fallback background colors
const getPlatformColor = (slug: any = '', name: any = '') => {
  const s = (slug || '').toString().toLowerCase();
  const n = (name || '').toString().toLowerCase();

  if (s.includes('netflix') || n.includes('netflix')) return '#E50914';
  if (s.includes('disney') || n.includes('disney')) return '#00D4FF';
  if (s.includes('prime') || n.includes('prime') || s.includes('amazon') || n.includes('amazon')) return '#00A8E8';
  if (s.includes('hbo') || n.includes('hbo') || s.includes('max') || n.includes('max')) return '#7E00B3';
  if (s.includes('apple') || n.includes('apple')) return '#2A2A30';
  if (s.includes('paramount') || n.includes('paramount')) return '#0057B8';
  if (s.includes('star') || n.includes('star')) return '#1C2951';
  if (s.includes('crunchy') || n.includes('crunchy')) return '#FF6400';
  
  let hash = 0;
  const str = n || s || 'PL';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#4F46E5', '#0D9488', '#059669', '#D97706', '#DC2626', '#DB2777', '#7C3AED', '#2563EB'];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

function PlatformCircle({ item, onPress }: { item: Platform, onPress: () => void }) {
  const [focused, setFocused] = React.useState(false);
  const scale = useSharedValue(1);
  const [hasError, setHasError] = React.useState(false);
  
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!item) return null;

  const officialIcon = getOfficialPlatformIcon(item.slug, item.name);
  
  // Decide whether to use fallback: 
  // If there's an official icon mapped, we use it (even if the DB has an SVG).
  // If no official icon is mapped, we check if the DB image is a valid PNG/JPG or fallback to dynamic brand colors.
  const isSvg = item.logoUrl && item.logoUrl.toLowerCase().endsWith('.svg');
  const imgUri = officialIcon || (isSvg ? null : item.logoUrl);
  const useFallback = hasError || !imgUri;

  const displayName = (item.name || 'PL').toString();
  const initials = displayName.substring(0, 2).toUpperCase();
  const brandColor = getPlatformColor(item.slug, item.name);

  // If we are using an official icon from Icons8, we scale it slightly to crop out the transparent outer padding
  const isOfficialIcon = !!officialIcon;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        focusable
        onFocus={() => { setFocused(true); scale.value = withTiming(1.15, { duration: 150 }); }}
        onBlur={() => { setFocused(false); scale.value = withTiming(1, { duration: 150 }); }}
        onPress={onPress}
        style={[s.circle, focused && s.circleFocused]}
      >
        {useFallback ? (
          <View style={[s.fallbackContainer, { backgroundColor: brandColor }]}>
            <Text style={s.fallbackText}>{initials}</Text>
          </View>
        ) : (
          <Image
            source={resolveImageUrl(imgUri)}
            style={[s.logo, isOfficialIcon && s.logoOfficial]}
            contentFit="cover"
            onError={() => {
              console.warn('Failed to load platform logo:', imgUri);
              setHasError(true);
            }}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  section: {
    marginBottom: 36,
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
  listContent: {
    paddingHorizontal: 56,
    paddingBottom: 24, // extra padding for shadow/scale
  },
  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: '#1E1E24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleFocused: {
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoOfficial: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.35 }], // Crops out the transparent outer padding perfectly to fill the circle!
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

const TVPlatformRow = memo(TVPlatformRowInner);
export default TVPlatformRow;
