import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    Dimensions, Pressable, BackHandler, TextInput
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { X, Film, Tv, Layers, ChevronDown, Check, Search } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import TVFilmCard from '../../components/tv/TVFilmCard';
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';
import TVModal from '../../components/tv/TVModal';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES } from '../../lib/api-routes';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Perfect Grid Centering Math ──────────────────────────────────────────────
const GAP = 20;
const CARD_W = TV.cardWidthPoster || 160;
// Calculate max columns allowing at least 60px padding on each side
const AVAILABLE_W = SW - 120;
const COLUMNS = Math.max(2, Math.floor((AVAILABLE_W + GAP) / (CARD_W + GAP)));
// Calculate the exact pixel width of the content
const ACTUAL_CONTENT_W = (COLUMNS * CARD_W) + ((COLUMNS - 1) * GAP);
// The exact padding needed on left and right to perfectly center the grid
const DYNAMIC_SIDE_PAD = (SW - ACTUAL_CONTENT_W) / 2;
const TOP_OFFSET = 120;

interface FilterOption { label: string; value: string; }

const SORT_OPTIONS: FilterOption[] = [
    { label: 'Últimos añadidos', value: 'recent' },
    { label: 'Más populares', value: 'popular' },
    { label: 'Mejor puntuados', value: 'rating' },
    { label: 'Estrenos', value: 'oldest' },
];

const LABEL: Record<string, string> = {
    recent: 'Últimos añadidos', popular: 'Más populares', rating: 'Mejor puntuados', oldest: 'Estrenos',
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ExploreScreen() {
    const params = useLocalSearchParams();
    const urlType = (params.type as string) || '';
    const urlSlug = (params.platform as string) || '';

    // Filters State
    const [sort, setSort] = useState('recent');
    const [genreId, setGenreId] = useState('');
    const [platformId, setPlatformId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    // Metadata
    const [genres, setGenres] = useState<FilterOption[]>([]);
    const [platforms, setPlatforms] = useState<FilterOption[]>([]);
    const [metaReady, setMetaReady] = useState(false);

    // Content
    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const busyRef = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Overlay Modal State
    const [activeModal, setActiveModal] = useState<'sort' | 'genre' | 'platform' | null>(null);

    // ── Auto-Search while typing (Debounced) ──────────────────────────────────
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            // Only trigger if it's actually different to avoid unnecessary re-renders
            setAppliedSearch(searchQuery);
        }, 800);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchQuery]);

    // ── Handle Hardware Back Button to close modal ────────────────────────────
    useEffect(() => {
        const backAction = () => {
            if (activeModal) {
                setActiveModal(null);
                return true; // Prevent default back behavior (exiting screen)
            }
            return false; // Let default behavior happen
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [activeModal]);

    // ── Fetch metadata ────────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            fetchApi(API_ROUTES.CATEGORIES.GENRES),
            fetchApi(API_ROUTES.PLATFORMS.LIST),
        ]).then(([gRes, pRes]: any[]) => {
            const g: FilterOption[] = [{ label: 'Todos los géneros', value: '' }];
            if (Array.isArray(gRes.data))
                gRes.data.forEach((x: any) => g.push({ label: x.name, value: x.id }));
            setGenres(g);

            const raw = Array.isArray(pRes.data) ? pRes.data : [];
            const p: FilterOption[] = [{ label: 'Todas las plataformas', value: '' }];
            raw.forEach((x: any) => p.push({ label: x.name, value: x.id }));
            setPlatforms(p);

            if (urlSlug) {
                const found = raw.find((x: any) => x.slug === urlSlug);
                if (found) setPlatformId(found.id);
            }
        }).finally(() => setMetaReady(true));
    }, [urlSlug]);

    // ── Build URL ─────────────────────────────────────────────────────────────
    const buildUrl = useCallback((p: number) => {
        const q = new URLSearchParams({ page: `${p}`, limit: '28', sort });
        if (urlType) q.append('type', urlType);
        if (genreId) q.append('genreId', genreId);
        if (platformId) q.append('platformId', platformId);
        if (appliedSearch) q.append('search', appliedSearch);
        return `${API_ROUTES.CONTENT.LIST}?${q}`;
    }, [urlType, sort, genreId, platformId, appliedSearch]);

    // ── Auto-Focus Search Bar ──────────────────────────────────────────────────
    const searchInputRef = useRef<TextInput>(null);
    const focusSearchParam = params.focusSearch as string;

    useEffect(() => {
        if (focusSearchParam && searchInputRef.current) {
            // Small delay to ensure the screen transition is complete
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [focusSearchParam]);

    // ── Load page ─────────────────────────────────────────────────────────────
    const loadPage = useCallback((pg: number, reset: boolean) => {
        if (pg === 1) setLoading(true);
        fetchApi(buildUrl(pg)).then((res: any) => {
            const data = Array.isArray(res.data) ? res.data : [];
            setItems(prev => reset ? data : [...prev, ...data]);
            setPage(pg);
            if (res.meta) {
                setTotal(res.meta.total);
                setHasMore(pg < res.meta.totalPages);
            } else {
                setHasMore(false);
            }
        }).catch(() => { }).finally(() => {
            setLoading(false);
            busyRef.current = false;
        });
    }, [buildUrl]);

    useEffect(() => {
        if (!metaReady) return;
        setItems([]); setPage(1); setHasMore(true); setTotal(null);
        loadPage(1, true);
    }, [buildUrl, metaReady]);

    const loadMore = useCallback(() => {
        if (!hasMore || busyRef.current || loading) return;
        busyRef.current = true;
        loadPage(page + 1, false);
    }, [hasMore, loading, page, loadPage]);

    // ── Render card ───────────────────────────────────────────────────────────
    const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
        const poster = item.thumbnails?.find((t: any) => t.type === 'POSTER')?.url || item.thumbnails?.[0]?.url;
        const backdrop = item.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url;
        const title = item.translations?.find((t: any) => t.language === 'es')?.title
            || item.translations?.[0]?.title || item.slug || '';
        return (
            <View style={s.cardWrap}>
                <TVFilmCard
                    id={item.id} title={title} posterUrl={poster} backdropUrl={backdrop}
                    rating={item.rating} year={item.releaseYear} type={item.type}
                    variant="poster" hasTVPreferredFocus={index === 0 && !activeModal}
                />
            </View>
        );
    }, [activeModal]);

    // ── Derive title & labels ──────────────────────────────────────────────────
    const pageTitle = urlType === 'MOVIE' ? 'Películas' : urlType === 'SERIES' ? 'Series' : 'Explorar';
    const TypeIcon = urlType === 'MOVIE' ? Film : urlType === 'SERIES' ? Tv : Layers;

    const genreLabel = genreId ? genres.find(g => g.value === genreId)?.label : 'Géneros';
    const platformLabel = platformId ? platforms.find(p => p.value === platformId)?.label : 'Plataformas';
    const sortLabel = LABEL[sort] || 'Ordenar';

    // ── Modal Options Data ──────────────────────────────────────────────────────
    let modalTitle = '';
    let modalOptions: FilterOption[] = [];
    let modalSelectedValue = '';
    let onModalSelect = (val: string) => { };

    if (activeModal === 'sort') { modalTitle = 'Ordenar por'; modalOptions = SORT_OPTIONS; modalSelectedValue = sort; onModalSelect = setSort; }
    else if (activeModal === 'genre') { modalTitle = 'Seleccionar Género'; modalOptions = genres; modalSelectedValue = genreId; onModalSelect = setGenreId; }
    else if (activeModal === 'platform') { modalTitle = 'Seleccionar Plataforma'; modalOptions = platforms; modalSelectedValue = platformId; onModalSelect = setPlatformId; }

    return (
        <View style={s.root}>
            <TVCosmicBackground />
            {/* ═══ HEADER BAR (Title & Filters) ══════════════════════════════════ */}
            <View style={[s.header, { paddingHorizontal: DYNAMIC_SIDE_PAD }]}>
                <View style={s.titleRow}>
                    <TypeIcon size={26} color={Colors.white} />
                    <Text style={s.contentTitle}>{pageTitle}</Text>
                    {total !== null && <Text style={s.totalBadge}>{total} títulos</Text>}
                    <View style={{ flex: 1 }} />
                </View>

                <View style={s.tabRow}>
                    {/* Native TV Search Input */}
                    <View style={s.searchContainer}>
                        <Search size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
                        <TextInput
                            ref={searchInputRef}
                            placeholder="Buscar..."
                            placeholderTextColor={Colors.textMuted}
                            style={s.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={() => setAppliedSearch(searchQuery)}
                            returnKeyType="search"
                        />
                    </View>

                    <FilterTabButton label={sortLabel} isActive={sort !== 'recent'} onPress={() => setActiveModal(activeModal === 'sort' ? null : 'sort')} />
                    <FilterTabButton label={genreLabel!} isActive={genreId !== ''} onPress={() => setActiveModal(activeModal === 'genre' ? null : 'genre')} />
                    <FilterTabButton label={platformLabel!} isActive={platformId !== ''} onPress={() => setActiveModal(activeModal === 'platform' ? null : 'platform')} />

                    {(sort !== 'recent' || genreId !== '' || platformId !== '' || appliedSearch !== '') && (
                        <Pressable
                            focusable
                            onPress={() => { setSort('recent'); setGenreId(''); setPlatformId(''); setAppliedSearch(''); setSearchQuery(''); }}
                            style={({ focused }: any) => [s.clearBtn, focused && s.clearBtnFocused]}
                        >
                            <X size={16} color="#EF4444" />
                            <Text style={s.clearBtnText}>Borrar</Text>
                        </Pressable>
                    )}
                </View>

            </View>

            {/* ═══ PERFECTLY CENTERED GRID ═══════════════════════════════════════ */}
            <View style={[s.content, { paddingHorizontal: DYNAMIC_SIDE_PAD }]}>
                {loading ? (
                    <View style={s.center}>
                        <ActivityIndicator size="large" color={Colors.accent} />
                    </View>
                ) : items.length === 0 ? (
                    <Animated.View entering={FadeIn.duration(400)} style={s.center}>
                        <Text style={{ fontSize: 64 }}>🎬</Text>
                        <Text style={s.emptyTitle}>Sin resultados</Text>
                        <Text style={s.emptySubtitle}>No hay títulos que coincidan con estos filtros.</Text>
                    </Animated.View>
                ) : (
                    <FlatList
                        data={items}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        numColumns={COLUMNS}
                        key={`grid-${COLUMNS}`}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.grid}
                        columnWrapperStyle={s.row}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.6}
                        ListFooterComponent={hasMore ? <View style={s.footer}><ActivityIndicator size="large" color={Colors.accent} /></View> : null}
                        initialNumToRender={COLUMNS * 3}
                        maxToRenderPerBatch={COLUMNS * 2}
                        windowSize={5}
                        removeClippedSubviews
                    />
                )}
            </View>

            {/* ═══ PREMIUM TV CENTER MODAL FOR FILTERS ══════════════════════════ */}
            <TVModal visible={activeModal !== null} onClose={() => setActiveModal(null)}>
                <View style={s.modalCard}>
                    <Text style={s.modalTitle}>{modalTitle}</Text>
                    <FlatList
                        data={modalOptions}
                        keyExtractor={item => item.value}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={s.modalList}
                        renderItem={({ item, index }) => {
                            const isSelected = item.value === modalSelectedValue;
                            return (
                                <Pressable
                                    focusable
                                    hasTVPreferredFocus={index === 0}
                                    onPress={() => { onModalSelect(item.value); setActiveModal(null); }}
                                    style={({ focused }: any) => [
                                        s.modalOptionBtn,
                                        isSelected && s.modalOptionSelected,
                                        focused && s.modalOptionFocused
                                    ]}
                                >
                                    {({ focused }: any) => (
                                        <>
                                            <Text style={[
                                                s.modalOptionText,
                                                isSelected && s.modalOptionTextSelected,
                                                focused && s.modalOptionTextFocused
                                            ]}>
                                                {item.label}
                                            </Text>
                                            {isSelected && (
                                                <Check size={18} color={focused ? Colors.black : Colors.accent} />
                                            )}
                                        </>
                                    )}
                                </Pressable>
                            );
                        }}
                    />
                </View>
            </TVModal>
        </View>
    )
}

// ─── Component: Main Filter Tab Button ─────────────────────────────────────────
function FilterTabButton({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            focusable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.tabBtn,
                isActive && s.tabBtnActive,
                focused && s.tabBtnFocused,
            ]}
        >
            <Text style={[s.tabBtnText, isActive && s.tabBtnTextActive, focused && s.tabBtnTextFocused]} numberOfLines={1}>
                {label}
            </Text>
            <ChevronDown
                size={16}
                color={focused ? Colors.black : isActive ? Colors.accent : Colors.textSecondary}
            />
        </Pressable>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1 },

    header: {
        paddingTop: TOP_OFFSET,
        paddingBottom: 24,
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
    contentTitle: { fontSize: 32, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
    totalBadge: {
        fontSize: 15, color: Colors.textSecondary, fontWeight: '700',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
    },

    tabRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },

    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 30, borderWidth: 2, borderColor: 'transparent',
        width: 400,
    },
    searchInput: {
        flex: 1, fontSize: 18, fontWeight: '600', color: Colors.white,
        padding: 0, margin: 0,
    },

    tabBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 22, paddingVertical: 12,
        borderRadius: 30, borderWidth: 2, borderColor: 'transparent',
        maxWidth: 280,
    },
    tabBtnActive: { backgroundColor: 'rgba(0, 229, 255, 0.1)', borderColor: 'rgba(0, 229, 255, 0.3)' },
    tabBtnFocused: { borderColor: Colors.white, backgroundColor: Colors.white },
    tabBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
    tabBtnTextActive: { color: Colors.accent },
    tabBtnTextFocused: { color: Colors.black },

    clearBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 12, paddingHorizontal: 18,
        borderRadius: 30, backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 2, borderColor: 'transparent',
        marginLeft: 10,
    },
    clearBtnFocused: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.2)' },
    clearBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '800' },

    content: { flex: 1 },
    grid: { paddingTop: 24, paddingBottom: 100 },
    row: { gap: GAP, marginBottom: GAP },
    cardWrap: { marginBottom: GAP },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    emptyTitle: { fontSize: 28, fontWeight: '800', color: Colors.white },
    emptySubtitle: { fontSize: 18, color: Colors.textSecondary },
    footer: { paddingVertical: 40, alignItems: 'center' },

    // ── Premium TV Center Modal Styles ──
    modalCard: {
        width: 500,
        maxHeight: '75%',
        backgroundColor: '#111318',
        borderRadius: 24,
        padding: 32,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.white,
        marginBottom: 20,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    modalList: {
        gap: 10,
    },
    modalOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    modalOptionSelected: {
        backgroundColor: 'rgba(0, 229, 255, 0.08)',
        borderColor: 'rgba(0, 229, 255, 0.2)',
    },
    modalOptionFocused: {
        backgroundColor: Colors.white,
        borderColor: Colors.white,
    },
    modalOptionText: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    modalOptionTextSelected: {
        color: Colors.accent,
    },
    modalOptionTextFocused: {
        color: Colors.black,
    },
});
