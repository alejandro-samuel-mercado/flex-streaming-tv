import TVTopNav from "../../components/tv/TVTopNav";
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Dimensions, ScrollView, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';
import { Colors } from '../../theme/colors';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES, resolveImageUrl } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import { scale } from '../../lib/scale';

const { width: SW } = Dimensions.get('window');

const CARD_HEIGHT = scale(220);
const CARD_WIDTH_POSTER = CARD_HEIGHT * (2 / 3);
const CARD_WIDTH_BANNER = CARD_HEIGHT * (16 / 9);

export default function MyNubaScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [history, setHistory] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [loadingFavs, setLoadingFavs] = useState(true);

    const loadHistory = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetchApi(`${API_ROUTES.HISTORY.LIST}?limit=15`);
            if (res.success && res.data) {
                setHistory(res.data.data || res.data.items || res.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingHistory(false);
        }
    }, [user]);

    const loadFavorites = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetchApi(API_ROUTES.FAVORITES.LIST);
            if (res.success && res.data) {
                setFavorites(res.data.data || res.data.items || res.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingFavs(false);
        }
    }, [user]);

    useEffect(() => {
        loadHistory();
        loadFavorites();
    }, [loadHistory, loadFavorites]);

    // Handle scroll to hide/show TopNav
    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        if (offsetY > 50) {
            DeviceEventEmitter.emit('setNavVisible', false);
        } else {
            DeviceEventEmitter.emit('setNavVisible', true);
        }
    };

    const handlePlay = (item: any) => {
        const c = item.content || item;
        if (item.episodeId) {
            router.push({ pathname: `/(tv)/watch/${c.id}` as any, params: { episodeId: item.episodeId } });
        } else {
            router.push(`/(tv)/watch/${c.id}` as any);
        }
    };

    if (!user) {
        return (
            <View style={s.root}>
                <TVCosmicBackground />
                <View style={s.center}>
                    <Text style={s.emptyTitle}>Inicia sesión</Text>
                    <Text style={s.emptySubtitle}>Accede para ver tu contenido en Mi Nuba.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={s.root}>
            <TVCosmicBackground />
            
            <ScrollView 
                style={s.scrollView}
                contentContainerStyle={s.scrollContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                <TVTopNav />
                {/* ─── Continuar Viendo ─── */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Continuar Viendo</Text>
                    {loadingHistory ? (
                        <ActivityIndicator size="large" color={Colors.accent} style={s.loader} />
                    ) : history.length === 0 ? (
                        <Text style={s.emptyText}>No tienes contenido reciente.</Text>
                    ) : (
                        <FlatList
                            data={history}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.listContent}
                            keyExtractor={(it, i) => it.content?.id || it.id || i.toString()}
                            renderItem={({ item, index }) => (
                                <HistoryCard 
                                    item={item} 
                                    isFirst={index === 0} 
                                    onPress={() => handlePlay(item)} 
                                />
                            )}
                        />
                    )}
                </View>

                {/* ─── Mi Lista (Favoritos) ─── */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Mi lista</Text>
                    {loadingFavs ? (
                        <ActivityIndicator size="large" color={Colors.accent} style={s.loader} />
                    ) : favorites.length === 0 ? (
                        <Text style={s.emptyText}>No has agregado títulos a tu lista.</Text>
                    ) : (
                        <FlatList
                            data={favorites}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.listContent}
                            keyExtractor={(it, i) => it.content?.id || it.id || i.toString()}
                            renderItem={({ item }) => (
                                <PosterCard 
                                    item={item} 
                                    onPress={() => handlePlay(item)} 
                                />
                            )}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Cards ──────────────────────────────────────────────────────────────────

function HistoryCard({ item, isFirst, onPress }: { item: any; isFirst: boolean; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    const c = item.content || {};
    
    // For first item (banner format)
    const banner = c.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url
        || c.thumbnails?.find((t: any) => t.type === 'BANNER')?.url
        || c.thumbnails?.[0]?.url;
        
    // For other items (poster format)
    const poster = c.thumbnails?.find((t: any) => t.type === 'POSTER')?.url
        || c.thumbnails?.[0]?.url;

    const imgUrl = isFirst ? banner : poster;
    const width = isFirst ? CARD_WIDTH_BANNER : CARD_WIDTH_POSTER;

    const progress = item.progressSeconds ?? item.progress ?? 0;
    const duration = item.durationSeconds ?? item.duration ?? 0;
    const progressPct = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;

    return (
        <Pressable
            focusable
            hasTVPreferredFocus={isFirst}
            onFocus={() => {
                setFocused(true);
                DeviceEventEmitter.emit('setNavVisible', false); // Hide nav when focusing cards
            }}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.card,
                { width, height: CARD_HEIGHT },
                focused && s.cardFocused
            ]}
        >
            <View style={[focused ? { transform: [{ scale: 1.05 }] } : undefined, { flex: 1, width: '100%', borderRadius: scale(12), overflow: 'hidden' }]}>
                {imgUrl ? (
                    <Image source={resolveImageUrl(imgUrl)} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1c22', justifyContent: 'center', alignItems: 'center' }]}>
                        <Play size={scale(28)} color="rgba(255,255,255,0.15)" fill="rgba(255,255,255,0.15)" />
                    </View>
                )}

                {/* Overlays */}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={[StyleSheet.absoluteFill, s.cardGradient]} />
               

                {/* Progress bar */}
                {progressPct > 0 && (
                    <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
                    </View>
                )}
            </View>
        </Pressable>
    );
}

function PosterCard({ item, onPress }: { item: any; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    const c = item.content || item;
    
    const poster = c.thumbnails?.find((t: any) => t.type === 'POSTER')?.url || c.thumbnails?.[0]?.url;

    return (
        <Pressable
            focusable
            onFocus={() => {
                setFocused(true);
                DeviceEventEmitter.emit('setNavVisible', false);
            }}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.card,
                { width: CARD_WIDTH_POSTER, height: CARD_HEIGHT },
                focused && s.cardFocused
            ]}
        >
            <View style={[focused ? { transform: [{ scale: 1.05 }] } : undefined, { flex: 1, width: '100%', borderRadius: scale(12), overflow: 'hidden' }]}>
                {poster ? (
                    <Image source={resolveImageUrl(poster)} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1c22', justifyContent: 'center', alignItems: 'center' }]} />
                )}
            </View>
        </Pressable>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: scale(150),
        paddingBottom: scale(100),
    },
    section: {
        marginBottom: scale(50),
    },
    sectionTitle: {
        fontSize: scale(28),
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: scale(20),
        paddingHorizontal: scale(56),
    },
    listContent: {
        paddingHorizontal: scale(56),
        gap: scale(20),
        alignItems: 'center',
    },
    card: {
        borderRadius: scale(12),
        borderWidth: 3,
        borderColor: 'transparent',
        justifyContent: 'flex-end',
    },
    cardFocused: {
        borderColor: '#00E5FF',
        shadowColor: '#00E5FF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 10,
    },
    cardGradient: {
        justifyContent: 'flex-end',
        padding: scale(12),
    },
    cardTitle: {
        fontSize: scale(15),
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: scale(6),
    },
    progressBar: {
        height: scale(5),
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: scale(3),
        marginHorizontal: scale(8),
        marginBottom: scale(8),
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#00E5FF',
        borderRadius: scale(3),
    },
    loader: {
        alignSelf: 'flex-start',
        marginLeft: scale(56),
    },
    emptyText: {
        fontSize: scale(16),
        color: '#9CA3AF',
        paddingHorizontal: scale(56),
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: scale(12),
    },
    emptyTitle: {
        fontSize: scale(24),
        fontWeight: '800',
        color: '#FFFFFF',
    },
    emptySubtitle: {
        fontSize: scale(16),
        color: '#9CA3AF',
    },
});
