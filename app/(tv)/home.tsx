import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import TVFocusable from '../../components/tv/TVFocusable';
import { Colors } from '../../theme/colors';
import TVHeroBanner from '../../components/tv/TVHeroBanner';
import TVFilmRow from '../../components/tv/TVFilmRow';
import TVPlatformRow from '../../components/tv/TVPlatformRow';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';


// TVFocusGuideView — prevents focus from getting lost when scrolling vertically
const TVFocusGuide = (require('react-native') as any).TVFocusGuideView ?? View;

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [continueWatching, setContinueWatching] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadHome = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const [res, historyRes] = await Promise.all([
                fetchApi(API_ROUTES.HOMEPAGE.DATA),
                user ? fetchApi(API_ROUTES.HISTORY.CONTINUE) : Promise.resolve(null),
            ]);

            if (res && res.success && res.data) {
                setData(res.data);
            } else {
                setError(res?.message || 'La respuesta del servidor no fue exitosa.');
            }

            if (historyRes && historyRes.success && Array.isArray(historyRes.data)) {
                // Fetch full content details for each history item to retrieve backdrops in parallel
                const detailedHistory = await Promise.all(
                    historyRes.data.map(async (item: any) => {
                        try {
                            const detail = await fetchApi(`${API_ROUTES.CONTENT.BASE}/${item.content?.id || item.contentId}`);
                            if (detail.success && detail.data) {
                                return {
                                    ...item,
                                    content: {
                                        ...item.content,
                                        ...detail.data,
                                    }
                                };
                            }
                        } catch (e) {
                            console.warn('[Home] Failed to load backdrop for item:', item.contentId);
                        }
                        return item;
                    })
                );
                setContinueWatching(detailedHistory);
            }
        } catch (e: any) {
            console.error('Home load error', e);
            setError(`Error de conexión: ${e.message || e}\nURL: ${API_ROUTES.HOMEPAGE.DATA}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHome();
    }, []);

    if (loading) {
        return (
            <View style={s.loader}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={s.errorContainer}>
                <ActivityIndicator size="small" color="#EF4444" style={{ marginBottom: 12 }} />
                <Text style={s.errorTitle}>No se pudo conectar con el servidor</Text>
                <Text style={s.errorText}>{error}</Text>
                <Text style={s.errorHint}>
                    TIP: Si acabas de editar el archivo .env, Expo no lo leerá hasta que detengas el servidor (Ctrl+C) y lo inicies con "npx expo start -c" para borrar la caché.
                </Text>
                <View style={{ marginTop: 24 }}>
                    <TVFocusable
                        style={s.retryBtn}
                        hasTVPreferredFocus
                        onPress={loadHome}
                    >
                        <Text style={s.retryText}>REINTENTAR</Text>
                    </TVFocusable>
                </View>
            </View>
        );
    }

    if (!data) return null;

    const heroSlides = (data.featured || []).map((f: any) => ({
        id: f.id,
        title: f.translations?.[0]?.title || '',
        description: f.translations?.[0]?.description || '',
        backdropUrl: f.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url,
        rating: f.rating,
        year: f.releaseYear,
        ageRating: f.ageRating?.code,
        type: f.type,
        genres: f.genres?.map((g: any) => g.genre.name),
    }));

    const mapToCards = (items: any[]) => items?.map((item: any) => ({
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
    })) || [];

    return (
        <TVFocusGuide destinations={[]} style={s.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <TVHeroBanner slides={heroSlides} />

                <View style={s.rowsContainer}>
                    {user && continueWatching.length > 0 && (
                        <TVFilmRow
                            title="Continuar Viendo"
                            items={mapToCards(continueWatching)}
                            variant="landscape"
                            hasTVPreferredFocus
                            onPressItem={(item) => {
                                if (item.episodeId) {
                                    router.push({
                                        pathname: `/(tv)/watch/${item.id}` as any,
                                        params: { episodeId: item.episodeId }
                                    });
                                } else {
                                    router.push(`/(tv)/watch/${item.id}` as any);
                                }
                            }}
                        />
                    )}

                    {data.platforms?.length > 0 && (
                        <TVPlatformRow
                            title="Plataformas"
                            items={data.platforms}
                        />
                    )}

                    {data.trending?.length > 0 && (
                        <TVFilmRow
                            title="Tendencias"
                            items={mapToCards(data.trending)}
                            exploreRoute="/(tv)/explore"
                            variant="landscape"
                            hasTVPreferredFocus={!user}
                        />
                    )}

                    {data.estrenos?.length > 0 && (
                        <TVFilmRow
                            title="Estrenos"
                            items={mapToCards(data.estrenos)}
                            exploreRoute="/(tv)/explore?sort=recent"
                            variant="landscape"
                        />
                    )}

                    {data.recent?.length > 0 && (
                        <TVFilmRow
                            title="Últimos Agregados"
                            items={mapToCards(data.recent)}
                            exploreRoute="/(tv)/explore?sort=recent"
                            variant="landscape"
                        />
                    )}

                    {data.topSeries?.length > 0 && (
                        <TVFilmRow
                            title="Vistazo de Series"
                            items={mapToCards(data.topSeries)}
                            exploreRoute="/(tv)/explore?type=SERIES"
                            variant="landscape"
                        />
                    )}

                    {data.topMovies?.length > 0 && (
                        <TVFilmRow
                            title="Vistazo de Películas"
                            items={mapToCards(data.topMovies)}
                            exploreRoute="/(tv)/explore?type=MOVIE"
                            variant="landscape"
                        />
                    )}
                </View>
            </ScrollView>
        </TVFocusGuide>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 40,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    errorHint: {
        fontSize: 12,
        color: '#71717A',
        textAlign: 'center',
        maxWidth: 500,
        lineHeight: 18,
    },
    retryBtn: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
    },
    retryText: {
        color: '#000000',
        fontWeight: '800',
        fontSize: 14,
    },
    rowsContainer: {
        marginTop: -380,
        zIndex: 10,
    },
});
