import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Play, Plus, Star, Clock } from 'lucide-react-native';
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
    status?: string;
    genres?: string[];
    isUpcoming?: boolean;
}

interface TVHeroBannerProps {
    slides: Slide[];
    hasTVPreferredFocus?: boolean;
    sectionLabel?: string; // e.g. "PELÍCULAS", "ANIME"
}

// ─── Play Button ──────────────────────────────────────────────────────────────
function PlayButton({ item, onPress }: { item: Slide; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isUpcoming = !!item.isUpcoming;

    return (
        <Pressable
            focusable
            hasTVPreferredFocus
            onFocus={() => {
                setFocused(true);
                Animated.timing(scaleAnim, { toValue: 1.07, duration: 150, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
            }}
            onBlur={() => {
                setFocused(false);
                Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
            }}
            onPress={isUpcoming ? undefined : onPress}
            style={[
                s.playBtn, 
                focused && s.playBtnFocused
            ]}
        >
            <Animated.View style={[{ transform: [{ scale: scaleAnim }], flexDirection: 'row', alignItems: 'center', gap: scale(10) }]}>
                {isUpcoming ? (
                    <Clock size={scale(18)} color={focused ? Colors.white : Colors.black} />
                ) : (
                    <Play size={scale(18)} color={focused ? Colors.white : Colors.black} fill={focused ? Colors.white : Colors.black} />
                )}
                <Text style={[s.playBtnText, focused && s.playBtnTextFocused]}>
                    {isUpcoming ? 'Próximamente' : 'Reproducir'}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

// ─── Add Button ───────────────────────────────────────────────────────────────
function AddButton({ onPress }: { onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    return (
        <Pressable
            focusable
            onFocus={() => {
                setFocused(true);
                Animated.timing(scaleAnim, { toValue: 1.12, duration: 150, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
            }}
            onBlur={() => {
                setFocused(false);
                Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
            }}
            onPress={onPress}
            style={[
                s.addBtn, 
                focused && s.addBtnFocused
            ]}
        >
            <Animated.View style={[{ transform: [{ scale: scaleAnim }], justifyContent: 'center', alignItems: 'center' }]}>
                <Plus size={scale(22)} color={focused ? Colors.black : Colors.white} strokeWidth={2.5} />
            </Animated.View>
        </Pressable>
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
        if (item.id) router.push(`/(tv)/film/${item.id}` as any);
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

            {/* Fast translucent overlay to replace heavy LinearGradients */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 17, 40, 0.65)' }]} />

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
        backgroundColor: '#0097A7', // Celeste oscuro
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
