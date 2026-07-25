import TVTopNav from "../../components/tv/TVTopNav";
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, FlatList, DeviceEventEmitter } from 'react-native';
import TVFocusable from '../../components/tv/TVFocusable';
import { Colors } from '../../theme/colors';
import TVHeroBanner from '../../components/tv/TVHeroBanner';
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';
import TVFilmRow from '../../components/tv/TVFilmRow';
import TVPlatformRow from '../../components/tv/TVPlatformRow';
import { TVHomeSkeleton } from '../../components/tv/TVSkeleton';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { scale } from '../../lib/scale';
import { useDoubleBackExit } from '../../hooks/useDoubleBackExit';
import { cachedFetch } from '../../lib/cache';

// Removed TVFocusGuide as it is unused and causes performance issues on Android TV
const SECTION_LABELS: Record<string, string> = {
    '':       'Inicio',
    'MOVIE':  'Películas',
    'SERIES': 'Series',
    'ANIME':  'Anime',
    'KIDS':   'Kids',
    'KDRAMA': 'K-Dramas',
};

const HOME_CACHE_KEY = 'home-data';

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    
    useDoubleBackExit();

    const [data, setData] = useState<any>(null);
    const [continueWatching, setContinueWatching] = useState<any[]>([]);
    // loading = true only on first visit (no cache). On repeat visits, cache
    // populates `data` synchronously before the first render so we skip the skeleton.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadHome = useCallback(async (forceRefresh = false) => {
        try {
            setError(null);

            const res = await cachedFetch(
                HOME_CACHE_KEY,
                () => fetchApi(API_ROUTES.HOMEPAGE.DATA),
                // onUpdate: called when background revalidation finishes with fresh data
                (fresh) => {
                    if (fresh?.success && fresh.data) setData(fresh.data);
                },
            );

            if (res?.success && res.data) {
                setData(res.data);
            } else if (!res?.success) {
                setError(res?.message || 'La respuesta del servidor no fue exitosa.');
            }
        } catch (e: any) {
            setError(`Error de conexión: ${e.message || e}`);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load continue watching in background (non-blocking, not cached since it's user-specific)
    useEffect(() => {
        if (!user) return;
        fetchApi(API_ROUTES.HISTORY.CONTINUE)
            .then(async (historyRes: any) => {
                if (historyRes?.success && Array.isArray(historyRes.data)) {
                    setContinueWatching(historyRes.data);
                    const detailed = await Promise.all(
                        historyRes.data.slice(0, 10).map(async (item: any) => {
                            try {
                                const detail = await fetchApi(`${API_ROUTES.CONTENT.BASE}/${item.content?.id || item.contentId}`);
                                if (detail.success && detail.data) {
                                    return { ...item, content: { ...item.content, ...detail.data } };
                                }
                            } catch { }
                            return item;
                        })
                    );
                    setContinueWatching(detailed);
                }
            })
            .catch(() => {});
    }, [user]);

    useEffect(() => { loadHome(); }, [loadHome]);



    const mapToCards = useCallback((items: any[]) => (Array.isArray(items) ? items : [])
        .filter((item: any) => !!item)
        .map((item: any) => ({
            id: item.content?.id || item.id,
            title: item.content?.translations?.[0]?.title || item.translations?.[0]?.title || '',
            posterUrl: item.content?.thumbnails?.find((t: any) => t.type === 'POSTER')?.url || item.thumbnails?.find((t: any) => t.type === 'POSTER')?.url,
            backdropUrl: item.content?.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url || item.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url,
            rating: item.content?.rating || item.rating,
            year: item.content?.releaseYear || item.releaseYear,
            type: item.content?.type || item.type,
            progress: item.progressSeconds ?? item.progress,
            duration: item.durationSeconds ?? item.duration,
            episodeId: item.episodeId,
        })) || [], []);

    const heroSlides = useMemo(() => (data?.featured || [])
        .filter((f: any) => !!f)
        .map((f: any) => {
            const item = f.content || f;
            if (!item) return null;
            const backdrop = item.thumbnails?.find((t: any) => t.type === 'BACKDROP') || item.thumbnails?.find((t: any) => t.type === 'BANNER');
            const poster = item.thumbnails?.find((t: any) => t.type === 'POSTER');
                const itemType = item.type;
                let isUpcoming = item.status ? (item.status !== 'READY' && item.status !== 'ACTIVE') : false;

                // Only perform array-length checks if the arrays are actually returned by the backend
                if (itemType === 'MOVIE' && (item.videos !== undefined || item.videoFiles !== undefined)) {
                    const videoCount = (item.videos?.length || 0) + (item.videoFiles?.length || 0);
                    if (videoCount === 0) isUpcoming = true;
                } else if ((itemType === 'SERIES' || itemType === 'ANIME') && (item.seasons !== undefined || item.episodes !== undefined)) {
                    const epCount = (item.seasons?.length || 0) + (item.episodes?.length || 0);
                    if (epCount === 0) isUpcoming = true;
                }

                return {
                    id: item.id,
                    title: item.translations?.[0]?.title || '',
                    description: item.translations?.[0]?.description || '',
                    backdropUrl: backdrop?.url,
                    posterUrl: poster?.url,
                    rating: item.rating,
                    year: item.releaseYear,
                    ageRating: item.ageRating?.code,
                    type: itemType,
                    status: item.status,
                    genres: item.genres?.map((g: any) => g.genre?.name || g.name),
                    isUpcoming,
                };
        })
        .filter((s: any) => s && !!s.backdropUrl), [data?.featured]);

    // Pre-compute card arrays so they don't recreate on every render
    const cwCards = useMemo(() => mapToCards(continueWatching), [continueWatching, mapToCards]);
    const trendingCards = useMemo(() => mapToCards(data?.trending || []), [data?.trending, mapToCards]);
    const estrenosCards = useMemo(() => mapToCards(data?.estrenos || []), [data?.estrenos, mapToCards]);
    const recentCards = useMemo(() => mapToCards(data?.recent || []), [data?.recent, mapToCards]);
    const topSeriesCards = useMemo(() => mapToCards(data?.topSeries || []), [data?.topSeries, mapToCards]);
    const topMoviesCards = useMemo(() => mapToCards(data?.topMovies || []), [data?.topMovies, mapToCards]);

    // Only show skeleton on first load when there's no data yet
    if (loading && !data) {
        return (
            <View style={s.container}>
                <TVCosmicBackground />
                <TVHomeSkeleton />
            </View>
        );
    }

    if (error) {
        return (
            <View style={s.errorContainer}>
                <TVCosmicBackground />
                <Text style={s.errorTitle}>No se pudo conectar con el servidor</Text>
                <Text style={s.errorText}>{error}</Text>
                <View style={{ marginTop: 24 }}>
                    <TVFocusable style={s.retryBtn} hasTVPreferredFocus onPress={() => loadHome(true)}>
                        <Text style={s.retryText}>REINTENTAR</Text>
                    </TVFocusable>
                </View>
            </View>
        );
    }

    if (!data) return null;

    return (
        <View style={s.container}>
            <TVCosmicBackground />
            <ScrollView 
                showsVerticalScrollIndicator={false}
            >
                <TVTopNav />
                <TVHeroBanner slides={heroSlides} sectionLabel="Inicio" />

                <View style={s.rowsContainer}>
                   
                    {trendingCards.length > 0 && (
                        <TVFilmRow title="Tendencias" items={trendingCards} exploreRoute="/(tv)/explore" variant="poster" />
                    )}

                    {estrenosCards.length > 0 && (
                        <TVFilmRow title="Estrenos" items={estrenosCards} exploreRoute="/(tv)/explore?sort=recent" variant="poster" />
                    )}

                    {recentCards.length > 0 && (
                        <TVFilmRow title="Últimos Agregados" items={recentCards} exploreRoute="/(tv)/explore?sort=recent" variant="poster" />
                    )}

                    {topSeriesCards.length > 0 && (
                        <TVFilmRow title="Vistazo de Series" items={topSeriesCards} exploreRoute="/(tv)/explore?type=SERIES" variant="poster" />
                    )}

                    {topMoviesCards.length > 0 && (
                        <TVFilmRow title="Vistazo de Películas" items={topMoviesCards} exploreRoute="/(tv)/explore?type=MOVIE" variant="poster" />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, backgroundColor: 'transparent' },
    errorTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, marginBottom: 8 },
    errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    retryBtn: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: Colors.white, borderRadius: 24 },
    retryText: { color: Colors.black, fontWeight: '800', fontSize: scale(14) },
    rowsContainer: {
        marginTop: 30,
        zIndex: 10,
    },
});
