import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Clock, Play, Plus, Star } from 'lucide-react-native';
import React, { memo, useEffect, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { resolveImageUrl } from '../../lib/api-routes';
import { scale } from '../../lib/scale';
import { Colors } from '../../theme/colors';
import TVPlatformRow from './TVPlatformRow';
import { useRef } from 'react';

const { width: SW, height: SH } = Dimensions.get('window');

interface Slide {
    id: string;
    title: string;
    description?: string;
    backdropUrl?: string;
    posterUrl?: string;
    rating?: number;
    year?: number;
    ageRating?: string;
    type?: string;
    status?: string;
    genres?: string[];
    isUpcoming?: boolean;
}

interface TVHeroBannerProps {
    slides: Slide[];
    hasTVPreferredFocus?: boolean;
    sectionLabel?: string;
    hideThumbnails?: boolean;
    hidePlatforms?: boolean;
}

// ─── Play Button ──────────────────────────────────────────────────────────────
function PlayButton({ item, onPress }: { item: Slide; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    const isUpcoming = !!item.isUpcoming;

    return (
        <Pressable
            focusable
            hasTVPreferredFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={isUpcoming ? undefined : onPress}
            style={[
                s.playBtn, 
                focused && s.playBtnFocused
            ]}
        >
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }, focused && { transform: [{ scale: 1.05 }] }]}>
                {isUpcoming ? (
                    <Clock size={scale(17)} color={focused ? Colors.white : Colors.black} />
                ) : (
                    <Play size={scale(17)} color={focused ? Colors.white : Colors.black} fill={focused ? Colors.white : Colors.black} />
                )}
                <Text style={[s.playBtnText, focused && s.playBtnTextFocused]}>
                    {isUpcoming ? 'Próximamente' : 'Reproducir'}
                </Text>
            </View>
        </Pressable>
    );
}

// ─── Add Button ───────────────────────────────────────────────────────────────
function AddButton({ onPress }: { onPress: () => void }) {
    const [focused, setFocused] = useState(false);

    return (
        <Pressable
            focusable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.addBtn, 
                focused && s.addBtnFocused
            ]}
        >
            <View style={[{ justifyContent: 'center', alignItems: 'center' }, focused && { transform: [{ scale: 1.1 }] }]}>
                <Plus size={scale(22)} color={focused ? Colors.black : Colors.white} strokeWidth={2.5} />
            </View>
        </Pressable>
    );
}

// ─── Thumbnail Card ───────────────────────────────────────────────────────────
function ThumbnailCard({ 
    item, 
    isActive, 
    onFocus, 
    onPress 
}: { 
    item: Slide; 
    isActive: boolean; 
    onFocus: () => void; 
    onPress: () => void; 
}) {
    const scaleAnim = useSharedValue(1);
    const translateYAnim = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            scaleAnim.value = withTiming(1.15, { duration: 300, easing: Easing.out(Easing.cubic) });
            translateYAnim.value = withTiming(scale(10), { duration: 300, easing: Easing.out(Easing.cubic) });
        } else {
            scaleAnim.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
            translateYAnim.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
        }
    }, [isActive]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scaleAnim.value },
            { translateY: translateYAnim.value }
        ]
    }));

    return (
        <Pressable
            focusable
            onFocus={onFocus}
            onPress={onPress}
            style={s.thumbWrapper}
        >
            <Animated.View style={[s.thumbContainer, animStyle, isActive && s.thumbActive]}>
                <Image
                    source={resolveImageUrl(item.posterUrl || item.backdropUrl)}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                />
                {!isActive && <View style={s.thumbOverlay} />}
            </Animated.View>
        </Pressable>
    );
}


// ─── Main Component ───────────────────────────────────────────────────────────
function TVHeroBannerInner({ slides, sectionLabel, hideThumbnails, hidePlatforms }: TVHeroBannerProps) {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const isInteracting = useRef(false);

    // Auto-advance logic
    useEffect(() => {
        if (!slides || slides.length === 0) return;
        
        const interval = setInterval(() => {
            if (!isInteracting.current) {
                setCurrentIndex(prev => {
                    const next = (prev + 1) % slides.length;
                    flatListRef.current?.scrollToIndex({ index: next, animated: true, viewPosition: 0.5 });
                    return next;
                });
            }
        }, 15000); // 15 seconds

        return () => clearInterval(interval);
    }, [slides]);

    // Heuristic to perfectly balance long titles into two even lines
    const getBalancedTitle = (title: string) => {
        if (!title || title.length < 24) return title;
        const mid = Math.floor(title.length / 2);
        const before = title.lastIndexOf(' ', mid);
        const after = title.indexOf(' ', mid + 1);
        
        if (before === -1 && after === -1) return title;
        
        const splitIndex = (before === -1 || (after !== -1 && (after - mid) < (mid - before))) ? after : before;
        return title.substring(0, splitIndex) + '\n' + title.substring(splitIndex + 1);
    };

    if (!slides.length) return null;
    const item = slides[currentIndex];

    const handlePlay = () => {
        if (item.id) router.push(`/(tv)/film/${item.id}` as any);
    };

    const handleAdd = () => {
        // Placeholder
    };

    return (
        <View style={s.container}>
            {/* Full-screen backdrop */}
            <View
                key={`bg-${item.id}`}
                style={StyleSheet.absoluteFill}
            >
                <Image
                    source={resolveImageUrl(item.backdropUrl)}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    contentPosition="top center"
                    priority="high"
                />
            </View>

            {/* Fast translucent overlay */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 17, 40, 0.65)' }]} />

            {/* Main Content */}
            <View style={s.content}>
                <Text style={s.title} numberOfLines={2}>
                    {getBalancedTitle(item.title)}
                </Text>

                {/* Metadata row */}
                <View style={s.metaRow}>
                    {!!item.year && <Text style={s.metaText}>{item.year}</Text>}
                    {!!item.ageRating && (
                        <>
                            <View style={s.metaDot} />
                            <View style={s.ageBadge}><Text style={s.ageText}>{item.ageRating}</Text></View>
                        </>
                    )}
                    {!!item.rating && Number(item.rating) > 0 && (
                        <>
                            <View style={s.metaDot} />
                            <Star size={scale(13)} color="#F5C518" fill="#F5C518" />
                            <Text style={[s.metaText, { marginLeft: scale(4) }]}>{Number(item.rating).toFixed(1)}</Text>
                        </>
                    )}
                    {!!item.genres?.length && (
                        <>
                            <View style={s.metaDot} />
                            <Text style={s.metaText}>{item.genres.slice(0, 3).join(' · ')}</Text>
                        </>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={s.actionsRow}>
                    <PlayButton item={item} onPress={handlePlay} />
                    <AddButton onPress={handleAdd} />
                </View>
            </View>

            {/* Thumbnail Navigation Row */}
            {!hideThumbnails && (
                <View style={s.thumbsSection} onTouchStart={() => isInteracting.current = true} onTouchEnd={() => isInteracting.current = false}>
                    <FlatList
                        ref={flatListRef}
                        data={slides}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(it) => it.id}
                        contentContainerStyle={s.thumbsListContainer}
                        onScrollToIndexFailed={(info) => {
                            setTimeout(() => {
                                flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                            }, 500);
                        }}
                        renderItem={({ item: slide, index }) => (
                            <ThumbnailCard
                                item={slide}
                                isActive={index === currentIndex}
                                onFocus={() => {
                                    isInteracting.current = true;
                                    setCurrentIndex(index);
                                    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                                    // Resume auto-play after interaction stops
                                    setTimeout(() => { isInteracting.current = false; }, 4000);
                                }}
                                onPress={() => {
                                    setCurrentIndex(index);
                                    handlePlay();
                                }}
                            />
                        )}
                    />
                </View>
            )}

            {/* Platforms Row */}
            {!hidePlatforms && (
                <View style={s.platformsSection}>
                    <TVPlatformRow title="Plataformas" />
                </View>
            )}
        </View>
    );
}

const TVHeroBanner = memo(TVHeroBannerInner);
export default TVHeroBanner;

const s = StyleSheet.create({
    container: {
        width: SW,
        height: SH,
        position: 'relative',
        backgroundColor: '#0A1128',
    },
    content: {
        position: 'absolute',
        bottom: scale(240), // Adjusted to have more separation from the top edge
        left: scale(56),
        right: '38%',
        maxWidth: scale(700), // Doesn't take so much width
    },
    title: {
        fontSize: scale(40),
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        lineHeight: scale(66),
        marginBottom: scale(14),
        textTransform: 'uppercase',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(28), // Replaced desc padding
        gap: scale(8),
    },
    metaText: {
        fontSize: scale(14),
        fontWeight: '600',
        color: 'rgba(255,255,255,0.80)',
    },
    metaDot: {
        width: scale(4),
        height: scale(4),
        borderRadius: scale(2),
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    ageBadge: {
        paddingHorizontal: scale(7),
        paddingVertical: scale(2),
        borderRadius: scale(5),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    ageText: {
        fontSize: scale(11),
        fontWeight: '800',
        color: '#FFFFFF',
    },
    
    // Action buttons
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(16),
        marginBottom: scale(24),
    },
    playBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        backgroundColor: '#FFFFFF',
        paddingHorizontal: scale(26),
        paddingVertical: scale(13),
        borderRadius: scale(10),
    },
    playBtnFocused: {
        backgroundColor: '#0097A7', // Celeste oscuro
    },
    playBtnText: {
        fontSize: scale(16),
        fontWeight: '800',
        color: '#000000',
    },
    playBtnTextFocused: {
        color: '#FFFFFF',
    },
    addBtn: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    addBtnFocused: {
        backgroundColor: Colors.white,
        borderColor: Colors.white,
    },

    // Thumbnails
    thumbsSection: {
        position: 'absolute',
        bottom: scale(110), // Moved up to make room for platforms
        left: 0,
        right: 0,
  
        height: scale(100), // enough for 75 + scaled size
    },
    thumbsListContainer: {
            paddingVertical:50,
        paddingHorizontal: scale(56),
        gap: 0,
        alignItems: 'flex-end',
    },
    thumbWrapper: {
        padding: scale(8),
        justifyContent: 'flex-end',
    },
    thumbContainer: {
        width: scale(70),
        height: scale(70), // Square aspect ratio, smaller
        borderRadius: scale(12),
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#000',
    },
    thumbActive: {
        borderColor: '#00E5FF',
        shadowColor: '#00E5FF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 10,
    },
    thumbOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    platformsSection: {
        position: 'absolute',
      
        
        bottom: 0,
        left: 0,
        right: 0,
        height: scale(110),
    },
});
