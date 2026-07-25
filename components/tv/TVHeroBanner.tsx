import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Clock, Play, Plus, Star } from 'lucide-react-native';
import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dimensions, findNodeHandle, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { resolveImageUrl } from '../../lib/api-routes';
import { scale } from '../../lib/scale';
import { Colors } from '../../theme/colors';

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
const PlayButton = React.forwardRef<View, { item: Slide; onPress: () => void; nextFocusDown?: number | null }>(({ item, onPress, nextFocusDown }, ref) => {
    const [focused, setFocused] = useState(false);
    const isUpcoming = !!item.isUpcoming;

    return (
        <Pressable
            ref={ref as any}
            focusable
            hasTVPreferredFocus
            nextFocusDown={nextFocusDown ?? undefined}
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
});

// ─── Add Button ───────────────────────────────────────────────────────────────
const AddButton = React.forwardRef<View, { onPress: () => void; nextFocusDown?: number | null }>(({ onPress, nextFocusDown }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
        <Pressable
            ref={ref as any}
            focusable
            nextFocusDown={nextFocusDown ?? undefined}
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
});

// ─── Thumbnail Card ───────────────────────────────────────────────────────────
const ThumbnailCard = React.forwardRef<View, { 
    item: Slide; 
    isActive: boolean; 
    onFocus: () => void; 
    onPress: () => void; 
}>(({ 
    item, 
    isActive, 
    onFocus, 
    onPress 
}, ref) => {
    const scaleAnim = useSharedValue(1);
    const translateYAnim = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            scaleAnim.value = withTiming(1.12, { duration: 300, easing: Easing.out(Easing.cubic) });
            translateYAnim.value = withTiming(-scale(4), { duration: 300, easing: Easing.out(Easing.cubic) });
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
            ref={ref as any}
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
});


// ─── Main Component ───────────────────────────────────────────────────────────
function TVHeroBannerInner({ slides, sectionLabel, hideThumbnails, hidePlatforms }: TVHeroBannerProps) {
    const router = useRouter();
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const isInteracting = useRef(false);
    const playBtnRef = useRef<any>(null);
    const addBtnRef = useRef<any>(null);
    const firstThumbRef = useRef<any>(null);
    const [firstThumbId, setFirstThumbId] = useState<number | null>(null);

    // Bind nextFocusDown of hero buttons to first thumbnail card
    useLayoutEffect(() => {
        if (Platform.OS === 'web') return;
        const timer = setTimeout(() => {
            if (firstThumbRef.current) {
                const id = findNodeHandle(firstThumbRef.current);
                if (id) {
                    if (id !== firstThumbId) setFirstThumbId(id);
                    if (playBtnRef.current) playBtnRef.current.setNativeProps?.({ nextFocusDown: id });
                    if (addBtnRef.current) addBtnRef.current.setNativeProps?.({ nextFocusDown: id });
                }
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [slides, hideThumbnails]);

    // Auto-advance logic (5 seconds)
    useEffect(() => {
        if (!slides || slides.length === 0) return;
        
        const interval = setInterval(() => {
            if (!isInteracting.current) {
                setFocusedIndex(prev => {
                    const next = (prev + 1) % slides.length;
                    flatListRef.current?.scrollToIndex({ index: next, animated: true, viewPosition: 0.5 });
                    setActiveIndex(next);
                    return next;
                });
            }
        }, 5000); // 5 seconds

        return () => clearInterval(interval);
    }, [slides]);

    // Debounce content change for performance
    useEffect(() => {
        if (focusedIndex !== activeIndex) {
            const timeout = setTimeout(() => setActiveIndex(focusedIndex), 300);
            return () => clearTimeout(timeout);
        }
    }, [focusedIndex, activeIndex]);

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
    const item = slides[activeIndex];

    const handlePlay = () => {
        if (item.id) router.push(`/(tv)/film/${item.id}` as any);
    };

    const handleAdd = () => {
        // Placeholder
    };

    return (
        <View style={s.rootWrapper}>
            <View style={s.container}>
                <View style={s.realignWrapper}>
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

            {/* Gradient fade to background at the bottom */}
            <LinearGradient
                colors={['transparent', '#02040A']}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: scale(250),
                }}
            />

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

                {/* Description */}
                {!!item.description && (
                    <Text style={s.description} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={s.actionsRow}>
                    <PlayButton ref={playBtnRef} item={item} onPress={handlePlay} nextFocusDown={firstThumbId} />
                    <AddButton ref={addBtnRef} onPress={handleAdd} nextFocusDown={firstThumbId} />
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
                                ref={index === 0 ? firstThumbRef : undefined}
                                item={slide}
                                isActive={index === focusedIndex}
                                onFocus={() => {
                                    isInteracting.current = true;
                                    setFocusedIndex(index);
                                    if (index === 0) {
                                        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                                        setTimeout(() => {
                                            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                                        }, 100);
                                    } else {
                                        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                                    }
                                    // Resume auto-play after interaction stops
                                    setTimeout(() => { isInteracting.current = false; }, 4000);
                                }}
                                onPress={() => {
                                    setFocusedIndex(index);
                                    setActiveIndex(index);
                                    handlePlay();
                                }}
                            />
                        )}
                    />
                </View>
            )}
                </View>
            </View>
        </View>
    );
}

const TVHeroBanner = memo(TVHeroBannerInner);
export default TVHeroBanner;

const s = StyleSheet.create({
    rootWrapper: {
        width: SW,
        height: SH,
    },
    container: {
        width: SW * 3,
        height: SH,
        position: 'absolute',
        top: 0,
        left: -SW,
        backgroundColor: '#0A1128',
        borderBottomLeftRadius: SW * 3,
        borderBottomRightRadius: SW * 3,
        overflow: 'hidden',
    },
    realignWrapper: {
        width: SW,
        height: SH,
        position: 'absolute',
        top: 0,
        left: SW,
    },
    content: {
        position: 'absolute',
        bottom: scale(275), // Adjusted to sit cleanly above the new large 150x210 thumbnail cards
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
        marginBottom: scale(16), 
        gap: scale(8),
    },
    description: {
        fontSize: scale(15),
        color: 'rgba(255,255,255,0.85)',
        lineHeight: scale(22),
        marginBottom: scale(24),
        fontWeight: '500',
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
        bottom: 0, // Sit at the very bottom of the banner
        left: 0,
        right: 0,
        height: scale(300), // Ample height (300px) so large cards and scale transforms never clip on top/bottom
        justifyContent: 'center',
    },
    thumbsListContainer: {
        paddingVertical: scale(40), // Generous vertical padding inside scroll view for scale transform
        paddingHorizontal: scale(56),
        gap: scale(14),
        alignItems: 'center',
    },
    thumbWrapper: {
        padding: scale(6),
        justifyContent: 'center',
    },
    thumbContainer: {
        width: scale(150),
        height: scale(210), // Much larger, beautiful rectangular movie poster dimensions
        borderRadius: scale(14),
        overflow: 'hidden',
        borderWidth: 2.5,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: '#000',
    },
    thumbActive: {
        borderColor: '#00E5FF',
        borderWidth: 3.5,
    },
    thumbOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
});
