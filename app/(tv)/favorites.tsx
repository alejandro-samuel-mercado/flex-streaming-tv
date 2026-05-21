import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    Pressable, Dimensions,
} from 'react-native';
import { Heart, X, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES, resolveImageUrl } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import { scale } from '../../lib/scale';
import TVModal from '../../components/tv/TVModal';

const { width: SW, height: SH } = Dimensions.get('window');
const MW = SW * 0.92;

function ModalButton({ onPress, title, isDestructive = false, hasTVPreferredFocus = false }: any) {
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            focusable
            hasTVPreferredFocus={hasTVPreferredFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                isDestructive ? s.modalBtnDestructive : s.modalBtn,
                focused && (isDestructive ? s.modalBtnDestructiveFocused : s.modalBtnFocused)
            ]}
        >
            <Text style={[
                isDestructive ? s.modalBtnDestructiveText : s.modalBtnText,
                focused && (isDestructive ? s.modalBtnDestructiveTextFocused : s.modalBtnTextFocused)
            ]}>
                {title}
            </Text>
        </Pressable>
    );
}
const COLS = 6;
const GAP = scale(16);
const SIDE = scale(40);
const CARD_W = (MW - SIDE * 2 - GAP * (COLS - 1)) / COLS;
const CARD_H = CARD_W * 1.5;

// ─── Single card with hover overlay ──────────────────────────────────────────
function FavCard({
    item, index, onPlay, onRemove,
}: {
    item: any; index: number;
    onPlay: () => void;
    onRemove: () => void;
}) {
    const [playFocused, setPlayFocused] = useState(false);
    const [removeFocused, setRemoveFocused] = useState(false);
    const c = item.content || item;
    const poster = c.thumbnails?.find((t: any) => t.type === 'POSTER')?.url;
    const title = c.translations?.[0]?.title || '';

    return (
        <View style={{ width: CARD_W, gap: scale(8) }}>
            <Pressable
                focusable
                hasTVPreferredFocus={index === 0}
                onFocus={() => setPlayFocused(true)}
                onBlur={() => setPlayFocused(false)}
                onPress={onPlay}
                style={[s.card, { width: CARD_W, height: CARD_H }, playFocused && s.cardFocused]}
            >
                {poster ? (
                    <Image
                        source={resolveImageUrl(poster)}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1c22' }]} />
                )}

                {/* Always-visible gradient + title */}
                <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
                    style={[StyleSheet.absoluteFill, s.cardGradient]}
                />
                <Text style={s.cardTitle} numberOfLines={2}>{title}</Text>
            </Pressable>

            <Pressable
                focusable
                onFocus={() => setRemoveFocused(true)}
                onBlur={() => setRemoveFocused(false)}
                onPress={onRemove}
                style={[s.removeBtn, removeFocused && s.removeBtnFocused]}
            >
                <Trash2 size={scale(14)} color={removeFocused ? '#FFF' : '#EF4444'} />
                <Text style={[s.removeBtnText, removeFocused && s.removeBtnTextFocused]}>Quitar</Text>
            </Pressable>
        </View>
    );
}

// ─── Modal Component ──────────────────────────────────────────────────────────
export default function FavoritesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [idToRemove, setIdToRemove] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        try {
            const res = await fetchApi(`${API_ROUTES.FAVORITES.LIST}?limit=50`);
            if (res.success && res.data) {
                setData(res.data.data || res.data.items || res.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleRemove = useCallback(async (contentId: string) => {
        try {
            await fetchApi(API_ROUTES.FAVORITES.TOGGLE, {
                method: 'POST',
                body: JSON.stringify({ contentId }),
            });
            setData(prev => prev.filter(item => {
                const c = item.content || item;
                return c.id !== contentId;
            }));
        } catch (e) {
            console.error(e);
        }
    }, []);

    const handlePlay = useCallback((contentId: string) => {
        router.push(`/(tv)/film/${contentId}` as any);
    }, [router]);

    if (!user) {
        return (
            <View style={s.root}>
                <View style={s.center}>
                    <Heart size={scale(64)} color="rgba(255,255,255,0.15)" />
                    <Text style={s.emptyTitle}>Inicia sesión</Text>
                    <Text style={s.emptySubtitle}>Accede para ver tu lista de favoritos.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            {/* Replaced blurry backdrop with opaque dark tint for performance */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 8, 15, 0.85)' }]} />
            <View style={s.bg} />

            <Animated.View style={s.modal}>
                {/* Replaced frosted glass with static tint */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 15, 0.95)' }]} />

                {/* Header */}
                <View style={s.header}>
                    <Heart size={scale(28)} color="#38BDF8" fill="rgba(56, 189, 248, 0.1)" strokeWidth={2.5} />
                    <Text style={s.title}>Mi Lista</Text>
                    {data.length > 0 && (
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{data.length} título{data.length !== 1 ? 's' : ''}</Text>
                        </View>
                    )}
                    <View style={{ flex: 1 }} />

                </View>

                {/* Content */}
                {loading ? (
                    <View style={s.center}>
                        <ActivityIndicator size="large" color="#0369A1" />
                    </View>
                ) : data.length === 0 ? (
                    <View style={s.center}>
                        <Text style={{ fontSize: scale(48) }}>❤️</Text>
                        <Text style={s.emptyTitle}>Sin favoritos aún</Text>
                        <Text style={s.emptySubtitle}>Agrega películas o series a tu lista para encontrarlas aquí.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={data}
                        numColumns={COLS}
                        keyExtractor={(item, i) => (item.content?.id || item.id || i.toString())}
                        contentContainerStyle={s.grid}
                        columnWrapperStyle={s.row}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item, index }) => {
                            const c = item.content || item;
                            return (
                                <FavCard
                                    item={item}
                                    index={index}
                                    onPlay={() => handlePlay(c.id)}
                                    onRemove={() => setIdToRemove(c.id)}
                                />
                            );
                        }}
                    />
                )}
            </Animated.View>

            {/* TV Confirmation Modal */}
            <TVModal visible={idToRemove !== null} onClose={() => setIdToRemove(null)}>
                <View style={s.modalContainer}>
                    <Trash2 size={scale(64)} color={Colors.error} style={{ marginBottom: scale(24) }} />
                    <Text style={s.modalTitle}>¿Quitar de Favoritos?</Text>
                    <Text style={s.modalSubtitle}>¿Estás seguro de que deseas eliminar este título de tus favoritos?</Text>

                    <View style={s.modalActions}>
                        <ModalButton
                            title="CANCELAR"
                            hasTVPreferredFocus
                            onPress={() => setIdToRemove(null)}
                        />
                        <ModalButton
                            title="SÍ, ELIMINAR"
                            isDestructive
                            onPress={() => {
                                if (idToRemove) {
                                    handleRemove(idToRemove);
                                    setIdToRemove(null);
                                }
                            }}
                        />
                    </View>
                </View>
            </TVModal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.07)', justifyContent: 'flex-end', alignItems: 'center' },
    bg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 6, 18, 0.1)' },
    modal: {
        width: SW * 0.92,
        height: SH - scale(140),
        marginBottom: scale(30),
        backgroundColor: 'rgba(255, 255, 255, 0.45)', // Semi-transparent dark base for BlurView
        borderRadius: scale(24),
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(14),
        paddingHorizontal: scale(36),
        paddingVertical: scale(24),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    title: { fontSize: scale(26), fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    badge: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)',
        paddingHorizontal: scale(14),
        paddingVertical: scale(5),
        borderRadius: scale(20),
    },
    badgeText: { fontSize: scale(13), fontWeight: '700', color: '#38BDF8' },
    closeBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(22),
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnFocused: { backgroundColor: 'rgba(0,0,0,0.15)', borderColor: '#0F172A' },
    grid: {
        paddingHorizontal: SIDE,
        paddingVertical: scale(30),
        gap: GAP,
    },
    row: { gap: GAP },
    card: {
        borderRadius: scale(12),
        overflow: 'hidden',
        justifyContent: 'flex-end',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    cardFocused: {
        borderColor: '#FFFFFF',
    },
    cardGradient: { justifyContent: 'flex-end', padding: scale(10) },
    cardTitle: {
        fontSize: scale(13),
        fontWeight: '700',
        color: Colors.white,
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.25)',
        paddingVertical: scale(6),
        borderRadius: scale(8),
    },
    removeBtnFocused: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    removeBtnText: {
        fontSize: scale(12),
        fontWeight: '700',
        color: '#EF4444',
    },
    removeBtnTextFocused: {
        color: '#FFFFFF',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: scale(16) },
    emptyTitle: { fontSize: scale(24), fontWeight: '800', color: '#FFFFFF' },
    emptySubtitle: { fontSize: scale(16), color: '#9CA3AF', textAlign: 'center', maxWidth: scale(400) },

    // Modal Confirmation (Translucent frosted glass)
    modalContainer: {
        backgroundColor: 'rgba(5, 8, 15, 0.95)', // Highly opaque dark base to replace BlurView
        padding: scale(36),
        borderRadius: scale(24),
        alignItems: 'center',
        maxWidth: scale(450),
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden', // Required for rounded BlurView corners
    },
    modalTitle: {
        fontSize: scale(24),
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: scale(10),
    },
    modalSubtitle: {
        fontSize: scale(14),
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: scale(24),
        lineHeight: scale(20),
    },
    modalActions: {
        flexDirection: 'row',
        gap: scale(14),
    },
    modalBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: scale(24),
        paddingVertical: scale(10),
        borderRadius: scale(10),
        borderWidth: 3,
        borderColor: 'transparent',
    },
    modalBtnFocused: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
        borderWidth: 3,
        transform: [{ scale: 1.08 }],
        elevation: 10,
    },
    modalBtnText: {
        fontSize: scale(14),
        fontWeight: '800',
        color: '#D1D5DB',
    },
    modalBtnTextFocused: {
        color: '#000000',
    },
    modalBtnDestructive: {
        backgroundColor: 'rgba(239,68,68,0.08)',
        paddingHorizontal: scale(24),
        paddingVertical: scale(10),
        borderRadius: scale(10),
        borderWidth: 3,
        borderColor: 'transparent',
    },
    modalBtnDestructiveFocused: {
        backgroundColor: '#EF4444',
        borderColor: '#FFFFFF',
        borderWidth: 3,
        transform: [{ scale: 1.08 }],
        elevation: 10,
    },
    modalBtnDestructiveText: {
        fontSize: scale(14),
        fontWeight: '800',
        color: '#EF4444',
    },
    modalBtnDestructiveTextFocused: {
        color: '#FFFFFF',
    },
});
