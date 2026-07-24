import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Dimensions,
} from 'react-native';
import { History, Play, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import TVTopNav from '../../components/tv/TVTopNav';
// react-native-reanimated imports removed for TV stability
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES, resolveImageUrl } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import { scale } from '../../lib/scale';
import TVModal from '../../components/tv/TVModal';

// ─── Modal Button Component ──────────────────────────────────────────────────
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

const { width: SW, height: SH } = Dimensions.get('window');
const COLS = 5;
const GAP = scale(20);
const SIDE = scale(80);
const CARD_W = (SW - SIDE * 2 - GAP * (COLS - 1)) / COLS;
const CARD_H = CARD_W * 1.5; // poster ratio

// ─── History Card ─────────────────────────────────────────────────────────────
function HistoryCard({
    item, index, onPlay, onRemove,
}: {
    item: any; index: number;
    onPlay: () => void;
    onRemove: () => void;
}) {
    const [playFocused, setPlayFocused] = useState(false);
    const [removeFocused, setRemoveFocused] = useState(false);
    const c = item.content || {};
    const backdrop = c.thumbnails?.find((t: any) => t.type === 'POSTER')?.url
        || c.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url
        || c.thumbnails?.find((t: any) => t.type === 'BANNER')?.url
        || c.thumbnails?.[0]?.url;
    const title = c.translations?.[0]?.title || '';
    const progress = item.progressSeconds ?? item.progress ?? 0;
    const duration = item.durationSeconds ?? item.duration ?? 0;
    const progressPct = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;

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
                {backdrop ? (
                    <Image
                        source={resolveImageUrl(backdrop)}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1c22', justifyContent: 'center', alignItems: 'center' }]}>
                        <Play size={scale(28)} color="rgba(255,255,255,0.15)" fill="rgba(255,255,255,0.15)" />
                    </View>
                )}

                <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
                    style={[StyleSheet.absoluteFill, s.cardGradient]}
                />
                <Text style={s.cardTitle} numberOfLines={1}>{title}</Text>

                {/* Progress bar */}
                {progressPct > 0 && (
                    <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
                    </View>
                )}
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

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HistoryScreen() {
    const { user } = useAuth();
    const router = useRouter();
    
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [idToRemove, setIdToRemove] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        try {
            const res = await fetchApi(`${API_ROUTES.HISTORY.LIST}?limit=15`);
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

    const handlePlay = useCallback((item: any) => {
        const c = item.content || {};
        if (item.episodeId) {
            router.push({ pathname: `/(tv)/watch/${c.id}` as any, params: { episodeId: item.episodeId } });
        } else {
            router.push(`/(tv)/watch/${c.id}` as any);
        }
    }, [router]);

    const handleRemove = useCallback((item: any) => {
        const c = item.content || {};
        setIdToRemove(c.id);
    }, []);

    const confirmRemove = useCallback(async (contentId: string) => {
        // Optimistic remove
        setData(prev => prev.filter(i => (i.content?.id || i.id) !== contentId));
        try {
            await fetchApi(`${API_ROUTES.HISTORY.BASE}/${contentId}`, { method: 'DELETE' });
        } catch (e) {
            console.error(e);
            loadData(); // restore on error
        }
    }, [loadData]);

    if (!user) {
        return (
            <View style={s.root}>
                <TVCosmicBackground />
                <TVTopNav />
                <View style={s.center}>
                    <History size={scale(64)} color="rgba(255,255,255,0.15)" />
                    <Text style={s.emptyTitle}>Inicia sesión</Text>
                    <Text style={s.emptySubtitle}>Accede para ver tu historial de reproducción.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            <TVCosmicBackground />
            <TVTopNav />

            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <History size={scale(28)} color={Colors.accent} strokeWidth={2.5} />
                    <Text style={s.title}>Continuar Viendo</Text>
                    {data.length > 0 && (
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{data.length} título{data.length !== 1 ? 's' : ''}</Text>
                        </View>
                    )}
                </View>

                {loading ? (
                    <View style={s.center}>
                        <ActivityIndicator size="large" color={Colors.accent} />
                    </View>
                ) : data.length === 0 ? (
                    <View style={s.center}>
                        <Text style={{ fontSize: scale(48) }}>🎬</Text>
                        <Text style={s.emptyTitle}>Sin historial</Text>
                        <Text style={s.emptySubtitle}>Las películas y series que veas aparecerán aquí.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={data}
                        numColumns={COLS}
                        keyExtractor={(item, i) => (item.content?.id || item.id || i.toString())}
                        contentContainerStyle={s.grid}
                        columnWrapperStyle={s.row}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item, index }) => (
                            <HistoryCard
                                item={item}
                                index={index}
                                onPlay={() => handlePlay(item)}
                                onRemove={() => handleRemove(item)}
                            />
                        )}
                    />
                )}
            </View>

            {/* TV Confirmation Modal */}
            <TVModal visible={idToRemove !== null} onClose={() => setIdToRemove(null)}>
                <View style={s.modalContainer}>
                    <Trash2 size={scale(64)} color={Colors.error} style={{ marginBottom: scale(24) }} />
                    <Text style={s.modalTitle}>¿Quitar del Historial?</Text>
                    <Text style={s.modalSubtitle}>¿Estás seguro de que deseas eliminar este título de tu historial de visualización?</Text>

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
                                    confirmRemove(idToRemove);
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
    root: { flex: 1, backgroundColor: 'transparent' },
    container: { flex: 1, paddingTop: scale(110) },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(14),
        paddingHorizontal: SIDE,
        paddingBottom: scale(20),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        marginBottom: scale(10),
    },
    title: { fontSize: scale(26), fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
    badge: {
        backgroundColor: 'rgba(0,229,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0,229,255,0.2)',
        paddingHorizontal: scale(14),
        paddingVertical: scale(5),
        borderRadius: scale(20),
    },
    badgeText: { fontSize: scale(13), fontWeight: '700', color: Colors.accent },
    grid: { paddingHorizontal: SIDE, paddingVertical: scale(30), paddingBottom: scale(60), gap: GAP },
    row: { gap: GAP },
    card: {
        borderRadius: scale(10), overflow: 'hidden', justifyContent: 'flex-end',
        borderWidth: 2, borderColor: 'transparent',
    },
    cardFocused: {
        borderColor: Colors.white,
    },
    cardGradient: { justifyContent: 'flex-end', padding: scale(10), paddingBottom: scale(18) },
    cardTitle: {
        fontSize: scale(13), fontWeight: '700', color: Colors.white,
    },
    progressBar: {
        height: scale(4), backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: scale(2), marginHorizontal: scale(10), marginBottom: scale(10),
    },
    progressFill: {
        height: '100%', backgroundColor: Colors.accent,
        borderRadius: scale(2),
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
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
    emptyTitle: { fontSize: scale(24), fontWeight: '800', color: Colors.white },
    emptySubtitle: { fontSize: scale(16), color: Colors.textSecondary, textAlign: 'center', maxWidth: scale(400) },

    // Modal Confirmation
    modalContainer: {
        backgroundColor: 'rgba(5, 8, 15, 0.95)',
        padding: scale(36),
        borderRadius: scale(24),
        alignItems: 'center',
        maxWidth: scale(450),
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
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
