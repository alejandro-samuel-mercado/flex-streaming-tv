import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
} from 'react-native-reanimated';
import { Play, Plus, Star } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import { resolveImageUrl } from '../../lib/api-routes';
import { scale } from '../../lib/scale';
import { useRouter } from 'expo-router';

const { width: SW, height: SH } = Dimensions.get('window');
const BANNER_HEIGHT = SH * 0.72;

interface Slide {
    id: string;
    title: string;
    description?: string;
    backdropUrl?: string;
    rating?: number;
    year?: number;
    ageRating?: string;
    type?: string;
    genres?: string[];
}

interface TVHeroBannerProps {
    slides: Slide[];
    hasTVPreferredFocus?: boolean;
    sectionLabel?: string; // e.g. "PELÍCULAS", "ANIME"
}

// ─── Play Button ──────────────────────────────────────────────────────────────
function PlayButton({ item, onPress }: { item: Slide; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(scaleAnim.value, { duration: 130 }) }],
    }));

    return (
        <Animated.View style={animStyle}>
            <Pressable
                focusable
                onFocus={() => { setFocused(true); scaleAnim.value = 1.07; }}
                onBlur={() => { setFocused(false); scaleAnim.value = 1; }}
                onPress={onPress}
                style={[s.playBtn, focused && s.playBtnFocused]}
            >
                <Play size={scale(18)} color={focused ? Colors.white : Colors.black} fill={focused ? Colors.white : Colors.black} />
                <Text style={[s.playBtnText, focused && s.playBtnTextFocused]}>Reproducir</Text>
            </Pressable>
        </Animated.View>
    );
}

// ─── Add Button ───────────────────────────────────────────────────────────────
function AddButton({ onPress }: { onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(scaleAnim.value, { duration: 130 }) }],
    }));

    return (
        <Animated.View style={animStyle}>
            <Pressable
                focusable
                onFocus={() => { setFocused(true); scaleAnim.value = 1.12; }}
                onBlur={() => { setFocused(false); scaleAnim.value = 1; }}
                onPress={onPress}
                style={[s.addBtn, focused && s.addBtnFocused]}
            >
                <Plus size={scale(22)} color={focused ? Colors.black : Colors.white} strokeWidth={2.5} />
            </Pressable>
        </Animated.View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TVHeroBanner({ slides, sectionLabel }: TVHeroBannerProps) {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startAutoRotate = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (slides.length <= 1) return;
        timerRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 9000);
    }, [slides.length]);

    useEffect(() => {
        setCurrentIndex(0);
        startAutoRotate();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [startAutoRotate, slides]);

    if (!slides.length) return null;
    const item = slides[currentIndex];

    const handlePlay = () => {
        if (item.id) router.push(`/(tv)/watch/${item.id}` as any);
    };

    const handleAdd = () => {
        // Placeholder – add to favorites
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

            {/* Cinematic gradients blending into the homogeneous dark slate-blue background */}
            <LinearGradient
                colors={['rgba(10, 17, 40, 0.0)', 'rgba(10, 17, 40, 0.95)', '#050814']}
                locations={[0.4, 0.85, 1]}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={['rgba(5, 8, 20, 0.9)', 'rgba(10, 17, 40, 0.4)', 'rgba(0,0,0,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0.5, y: 0.5 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Content: bottom-left aligned */}
            <View style={s.content}>



                <Text style={s.title} numberOfLines={2}>{item.title}</Text>

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
                    <Text style={s.descText} numberOfLines={3}>{item.description}</Text>
                )}

                {/* Action Buttons */}
                <View style={s.actionsRow}>
                    <PlayButton item={item} onPress={handlePlay} />
                    <AddButton onPress={handleAdd} />
                </View>

                {/* Dot pagination */}
                {slides.length > 1 && (
                    <View style={s.dotsRow}>
                        {slides.map((_, i) => (
                            <View key={i} style={[s.dot, i === currentIndex && s.dotActive]} />
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        width: SW,
        height: SH,
        position: 'relative',
        backgroundColor: '#0A1128',
    },
    content: {
        position: 'absolute',
        bottom: scale(180),
        left: scale(56),
        right: '38%',
    },
    sectionLabel: {
        fontSize: scale(12),
        fontWeight: '800',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2.5,
        marginBottom: scale(12),
        textTransform: 'uppercase',
    },
    title: {
        fontSize: scale(44),
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        lineHeight: scale(66),
        marginBottom: scale(14),
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(14),
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
    descText: {
        fontSize: scale(16),
        fontWeight: '400',
        color: 'rgba(255,255,255,0.80)',
        lineHeight: scale(24),
        marginBottom: scale(28),
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
        paddingHorizontal: scale(28),
        paddingVertical: scale(14),
        borderRadius: scale(10),
    },
    playBtnFocused: {
        backgroundColor: Colors.accent,
    },
    playBtnText: {
        fontSize: scale(17),
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

    // Pagination dots
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    dot: {
        width: scale(6),
        height: scale(6),
        borderRadius: scale(3),
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    dotActive: {
        width: scale(22),
        height: scale(6),
        borderRadius: scale(3),
        backgroundColor: '#FFFFFF',
    },
});
