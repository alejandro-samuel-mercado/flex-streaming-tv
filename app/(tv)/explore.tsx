import TVTopNav from "../../components/tv/TVTopNav";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    Dimensions, Pressable, TextInput, ScrollView, DeviceEventEmitter
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { X, Film, Tv, Layers, ChevronDown, Check, Search } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import TVFilmCard from '../../components/tv/TVFilmCard';
import TVFilmRow from '../../components/tv/TVFilmRow';
import { TVExploreSkeleton } from '../../components/tv/TVSkeleton';
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';
import TVHeroBanner from '../../components/tv/TVHeroBanner';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES, resolveImageUrl } from '../../lib/api-routes';
import { useDoubleBackExit } from '../../hooks/useDoubleBackExit';
import { scale } from '../../lib/scale';
import { Image } from 'expo-image';
import { setPendingExploreFilters, consumePendingExploreFilters } from '../../lib/explore-filters';
import { cachedFetch } from '../../lib/cache';

const SECTION_LABELS: Record<string, string> = {
    '': 'Inicio',
    'MOVIE': 'Películas',
    'SERIES': 'Series',
    'ANIME': 'Anime',
    'KIDS': 'Kids',
    'KDRAMA': 'K-Dramas',
};

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Perfect Grid Centering Math ──────────────────────────────────────────────
const GAP = scale(20);
const CARD_W = TV.cardWidthPoster || scale(160);
// Calculate max columns allowing at least 60px padding on each side
const AVAILABLE_W = SW - scale(120);
const COLUMNS = Math.max(2, Math.floor((AVAILABLE_W + GAP) / (CARD_W + GAP)));
// Calculate the exact pixel width of the content
const ACTUAL_CONTENT_W = (COLUMNS * CARD_W) + ((COLUMNS - 1) * GAP);
// The exact padding needed on left and right to perfectly center the grid
const DYNAMIC_SIDE_PAD = (SW - ACTUAL_CONTENT_W) / 2;

// Removed TVCollageBackground for performance
const TOP_OFFSET = scale(100);

interface FilterOption { label: string; value: string; }

const SORT_OPTIONS: FilterOption[] = [
    { label: 'Últimos añadidos', value: 'recent' },
    { label: 'Más populares', value: 'popular' },
    { label: 'Mejor puntuados', value: 'rating' },
    { label: 'Estrenos', value: 'oldest' },
];

const TYPE_OPTIONS: FilterOption[] = [
    { label: 'Todos los tipos', value: '' },
    { label: 'Películas', value: 'MOVIE' },
    { label: 'Series', value: 'SERIES' },
    { label: 'Anime', value: 'ANIME' },
    { label: 'Kids', value: 'KIDS' },
    { label: 'K-Dramas', value: 'KDRAMA' },
];

const LABEL: Record<string, string> = {
    recent: 'Últimos añadidos', popular: 'Más populares', rating: 'Mejor puntuados', oldest: 'Estrenos',
};

// ─── Component: Filter Chip ───────────────────────────────────────────────────
function FilterChip({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            focusable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.chip,
                isSelected && s.chipSelected,
                focused && s.chipFocused,
            ]}
        >
            {isSelected && <Check size={16} color={focused ? Colors.black : Colors.accent} style={{ marginRight: 6 }} />}
            <Text style={[
                s.chipText,
                isSelected && s.chipTextSelected,
                focused && s.chipTextFocused
            ]}>
                {label}
            </Text>
        </Pressable>
    );
}

// ─── Component: Filter Row ────────────────────────────────────────────────────
function FilterRow({ title, data, selectedValue, onSelect }: { title: string; data: FilterOption[]; selectedValue: string; onSelect: (val: string) => void }) {
    if (!data || data.length === 0) return null;
    return (
        <View style={s.filterRow}>
            {!!title && <Text style={s.filterRowTitle}>{title}</Text>}
            <FlatList
                horizontal
                data={data}
                keyExtractor={item => item.value}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRowList}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                renderItem={({ item }) => (
                    <FilterChip
                        label={item.label}
                        isSelected={item.value === selectedValue}
                        onPress={() => onSelect(item.value)}
                    />
                )}
            />
        </View>
    );
}

// ─── Component: Filter Tab Button ─────────────────────────────────────────────
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

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ExploreScreen() {
    const catScrollRef = useRef<ScrollView>(null);
    const gridScrollRef = useRef<FlatList>(null);
    const isScrolledRef = useRef(false);

    useDoubleBackExit(useCallback(() => {
        if (isScrolledRef.current) {
            if (catScrollRef.current) {
                catScrollRef.current.scrollTo({ y: 0, animated: true });
                isScrolledRef.current = false;
                return true;
            }
            if (gridScrollRef.current) {
                gridScrollRef.current.scrollToOffset({ offset: 0, animated: true });
                isScrolledRef.current = false;
                return true;
            }
        }
        return false;
    }, []));

    const router = useRouter();
    const params = useLocalSearchParams();
    const urlTypeParam = (params.type as string) || '';
    const urlSlug = (params.platform as string) || '';

    const [currentType, setCurrentType] = useState(urlTypeParam);

    useEffect(() => {
        setCurrentType((params.type as string) || '');
    }, [params.type]);

    const handleTypeChange = (val: string) => {
        setCurrentType(val);
        setActiveTab(null);
        setForceFilterGrid(true);
        router.setParams({ type: val });
    };
    const [sort, setSort] = useState('recent');
    const [genreId, setGenreId] = useState('');
    const [platformId, setPlatformId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

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

    // Active Tab for Inline Filters
    const [activeTab, setActiveTab] = useState<'sort' | 'genre' | 'platform' | 'type' | null>(null);

    // ── Category View State (when accessed with ?type=) ───────────────────────
    const [catHeroSlides, setCatHeroSlides] = useState<any[]>([]);
    const [catAllItems, setCatAllItems] = useState<any[]>([]);
    const [catGenres, setCatGenres] = useState<any[]>([]);
    const [catPlatforms, setCatPlatforms] = useState<any[]>([]);
    const [catGenreRows, setCatGenreRows] = useState<Record<string, any[]>>({});
    const [catPlatformRows, setCatPlatformRows] = useState<Record<string, any[]>>({});
    const [catLoading, setCatLoading] = useState(false);

    // Force-grid flag: toggled by "Ver más" so even defaults-only state shows the filter grid
    const [forceFilterGrid, setForceFilterGrid] = useState(false);

    // Background collage state (random movies & series poster collage)
    const [collageImages, setCollageImages] = useState<string[]>([]);

    useEffect(() => {
        // Collage removed for performance
    }, []);

    // Whether user has applied filters (switching to filter-grid view)
    const hasActiveFilters = genreId !== '' || platformId !== '' || sort !== 'recent' || appliedSearch !== '';
    // Show category view when there's a type and no active filters (except for KIDS/KDRAMA which map to genres)
    const showCategoryView = !!currentType && currentType !== 'KIDS' && currentType !== 'KDRAMA' && !hasActiveFilters && !forceFilterGrid;

    // ── Auto-Search while typing (Debounced) ──────────────────────────────────
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setAppliedSearch(searchQuery);
        }, 800);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchQuery]);

    // ── Consume pending filters from explore-filters singleton (set by "Ver más") ──
    useEffect(() => {
        const pending = consumePendingExploreFilters();
        if (pending) {
            const newParams: Record<string, string> = {};
            if (pending.type !== undefined) { setCurrentType(pending.type); newParams.type = pending.type; }
            if (pending.genreId !== undefined) { setGenreId(pending.genreId); newParams.genreId = pending.genreId; }
            if (pending.platformId !== undefined) { setPlatformId(pending.platformId); newParams.platformId = pending.platformId; }
            if (pending.sort !== undefined) { setSort(pending.sort); newParams.sort = pending.sort; }

            // Force the grid view
            setForceFilterGrid(true);
            
            if (Object.keys(newParams).length > 0) {
                router.setParams(newParams);
            }
        }
    }, []);

    // ── Fetch category view data when ?type= present and no filters ──────────
    const mapToCards = useCallback((items: any[]) =>
        (items || []).map((item: any) => ({
            id: item.id,
            title: item.translations?.find((t: any) => t.language === 'es')?.title || item.translations?.[0]?.title || item.slug || '',
            posterUrl: item.thumbnails?.find((t: any) => t.type === 'POSTER')?.url,
            backdropUrl: item.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url || item.thumbnails?.find((t: any) => t.type === 'BANNER')?.url,
            rating: item.rating,
            year: item.releaseYear,
            type: item.type,
        })), []);

    // ── Fetch category view data — cached per type ──────────────────────────
    useEffect(() => {
        if (!currentType || forceFilterGrid) return;
        const CAT_KEY = `explore-category-${currentType}`;

        setCatLoading(true);

        cachedFetch(
            CAT_KEY,
            () => Promise.all([
                fetchApi(API_ROUTES.HOMEPAGE.DATA),
                fetchApi(`${API_ROUTES.CONTENT.LIST}?type=${currentType}&sort=popular&limit=30`),
                fetchApi(`${API_ROUTES.CONTENT.LIST}?type=${currentType}&sort=recent&limit=10`),
                fetchApi(API_ROUTES.CATEGORIES.GENRES),
                fetchApi(API_ROUTES.PLATFORMS.LIST),
            ]).then(async ([featRes, popRes, allRes, genresRes, platformsRes]: any[]) => {
                return { featRes, popRes, allRes, genresRes, platformsRes };
            }),
            // onUpdate: apply fresh data in background silently
            (fresh: any) => applyCategoryData(fresh),
        ).then((result: any) => {
            applyCategoryData(result);
        }).catch(console.error).finally(() => setCatLoading(false));

        async function applyCategoryData({ featRes, popRes, allRes, genresRes, platformsRes }: any) {
            // Hero
            let validSlides: any[] = [];
            const extractSlides = (items: any[]) => {
                return items.map((f: any) => {
                    const item = f.content || f;
                    const backdrop = item.thumbnails?.find((t: any) => t.type === 'BACKDROP') || item.thumbnails?.find((t: any) => t.type === 'BANNER');
                    const poster = item.thumbnails?.find((t: any) => t.type === 'POSTER');
                    return {
                        id: item.id,
                        title: item.translations?.find((t: any) => t.language === 'es')?.title || item.translations?.[0]?.title || '',
                        description: item.translations?.find((t: any) => t.language === 'es')?.description || item.translations?.[0]?.description || '',
                        backdropUrl: backdrop?.url,
                        posterUrl: poster?.url,
                        rating: item.rating, year: item.releaseYear, ageRating: item.ageRating?.code, type: item.type,
                        genres: item.genres?.map((g: any) => g.genre?.name || g.name),
                    };
                }).filter((s: any) => !!s.backdropUrl);
            };

            if (featRes?.success && featRes.data) {
                let sourceArray = [];
                if (currentType === 'MOVIE') {
                    sourceArray = featRes.data.topMovies || featRes.data.trending || featRes.data.featured || [];
                } else if (currentType === 'SERIES') {
                    sourceArray = featRes.data.topSeries || featRes.data.trending || featRes.data.featured || [];
                } else {
                    sourceArray = featRes.data.trending || featRes.data.featured || [];
                }

                if (Array.isArray(sourceArray)) {
                    const filteredItems = sourceArray.filter((f: any) => {
                        const item = f.content || f;
                        return item.type === currentType;
                    });
                    validSlides = extractSlides(filteredItems).slice(0, 5);
                }
            }

            if (validSlides.length === 0 && popRes?.success && Array.isArray(popRes.data)) {
                const topPopular = popRes.data.slice(0, 5);
                const detailedPopular = await Promise.all(
                    topPopular.map(async (item: any) => {
                        try {
                            const detailRes = await fetchApi(`${API_ROUTES.CONTENT.BASE}/${item.id}`);
                            if (detailRes?.success && detailRes.data) return detailRes.data;
                        } catch (e) { }
                        return item;
                    })
                );
                validSlides = extractSlides(detailedPopular).slice(0, 5);
            }

            if (validSlides.length === 0 && featRes?.success && featRes.data) {
                const anyTrending = featRes.data.trending || featRes.data.featured || [];
                if (Array.isArray(anyTrending)) validSlides = extractSlides(anyTrending).slice(0, 5);
            }

            setCatHeroSlides(validSlides);
            if (allRes?.success && Array.isArray(allRes.data)) setCatAllItems(mapToCards(allRes.data));
            const genreList = genresRes?.success && Array.isArray(genresRes.data) ? genresRes.data : [];
            setCatGenres(genreList);
            const platformList = platformsRes?.success && Array.isArray(platformsRes.data) ? platformsRes.data : [];
            setCatPlatforms(platformList);

            const genreDataArr = await Promise.all(
                genreList.slice(0, 8).map((g: any) =>
                    fetchApi(`${API_ROUTES.CONTENT.LIST}?type=${currentType}&genreId=${g.id}&sort=popular&limit=10`)
                        .then((r: any) => ({ id: g.id, name: g.name, data: r?.success && Array.isArray(r.data) ? r.data : [] }))
                        .catch(() => ({ id: g.id, name: g.name, data: [] }))
                )
            );
            const gMap: Record<string, any[]> = {};
            genreDataArr.forEach(({ id, data }) => { if (data.length > 0) gMap[id] = mapToCards(data); });
            setCatGenreRows(gMap);
        }
    }, [currentType, mapToCards, forceFilterGrid]);

    // ── Fetch metadata (genres & platforms) — cached globally ────────────────
    useEffect(() => {
        const METADATA_KEY = 'explore-metadata';
        cachedFetch(
            METADATA_KEY,
            () => Promise.all([
                fetchApi(API_ROUTES.CATEGORIES.GENRES),
                fetchApi(API_ROUTES.PLATFORMS.LIST),
            ]).then(([gRes, pRes]) => ({ gRes, pRes })),
            // onUpdate with fresh data
            ({ gRes, pRes }: any) => applyMetadata(gRes, pRes),
        ).then(({ gRes, pRes }: any) => {
            applyMetadata(gRes, pRes);
        }).finally(() => setMetaReady(true));

        function applyMetadata(gRes: any, pRes: any) {
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
        }
    }, [urlSlug]);

    // ── Build URL ─────────────────────────────────────────────────────────────
    const buildUrl = useCallback((p: number) => {
        const q = new URLSearchParams({ page: `${p}`, limit: '28', sort });
        let effectiveType = currentType;
        let effectiveGenreId = genreId;

        // Fallbacks for types that don't exist directly in the database but have related genres
        if (currentType === 'KIDS') {
            effectiveType = '';
            if (!effectiveGenreId) {
                const familiaGenre = genres.find(g => g.label.toLowerCase() === 'familia');
                if (familiaGenre) effectiveGenreId = familiaGenre.value;
            }
        } else if (currentType === 'KDRAMA') {
            effectiveType = '';
            if (!effectiveGenreId) {
                const dramaGenre = genres.find(g => g.label.toLowerCase() === 'drama');
                if (dramaGenre) effectiveGenreId = dramaGenre.value;
            }
        }

        if (effectiveType) q.append('type', effectiveType);
        if (effectiveGenreId) q.append('genreId', effectiveGenreId);
        if (platformId) q.append('platformId', platformId);
        if (appliedSearch) q.append('search', appliedSearch);
        return `${API_ROUTES.CONTENT.LIST}?${q}`;
    }, [currentType, sort, genreId, platformId, appliedSearch, genres]);

    // ── Auto-Focus Search Bar ──────────────────────────────────────────────────
    const searchInputRef = useRef<TextInput>(null);

    useEffect(() => {
        // Always focus the search input when entering the Explore screen
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 200);
        return () => clearTimeout(timer);
    }, []);

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
                    variant="poster"
                />
            </View>
        );
    }, []);

    // ── Derive title & labels ──────────────────────────────────────────────────
    const pageTitle = SECTION_LABELS[currentType] || 'Explorar';
    const TypeIcon = currentType === 'MOVIE' ? Film : currentType === 'SERIES' ? Tv : Layers;

    const typeLabel = currentType ? TYPE_OPTIONS.find(t => t.value === currentType)?.label : 'Tipos';
    const genreLabel = genreId ? genres.find(g => g.value === genreId)?.label : 'Géneros';
    const platformLabel = platformId ? platforms.find(p => p.value === platformId)?.label : 'Plataformas';
    const sortLabel = LABEL[sort] || 'Ordenar';

    const renderHeader = useCallback(() => (
        <View style={s.headerContainer}>
            <TVTopNav />

            {/* Search & Tabs */}
            <View style={s.searchRow}>
                <Pressable
                    focusable
                    onPress={() => searchInputRef.current?.focus()}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    style={[
                        s.searchContainer,
                        searchFocused && s.searchContainerFocused
                    ]}
                >
                    <Search size={18} color={searchFocused ? Colors.black : Colors.textSecondary} style={{ marginRight: 14 }} />
                    <TextInput
                        ref={searchInputRef}
                        focusable={false}
                        placeholder="Buscar películas, series..."
                        placeholderTextColor={searchFocused ? Colors.textSecondary : Colors.textMuted}
                        style={[s.searchInput, searchFocused && { color: Colors.black }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => setAppliedSearch(searchQuery)}
                        returnKeyType="search"
                    />
                </Pressable>

                <FilterTabButton label={typeLabel!} isActive={activeTab === 'type' || currentType !== ''} onPress={() => setActiveTab(activeTab === 'type' ? null : 'type')} />
                <FilterTabButton label={sortLabel} isActive={activeTab === 'sort' || sort !== 'recent'} onPress={() => setActiveTab(activeTab === 'sort' ? null : 'sort')} />
                <FilterTabButton label={genreLabel!} isActive={activeTab === 'genre' || genreId !== ''} onPress={() => setActiveTab(activeTab === 'genre' ? null : 'genre')} />
                <FilterTabButton label={platformLabel!} isActive={activeTab === 'platform' || platformId !== ''} onPress={() => setActiveTab(activeTab === 'platform' ? null : 'platform')} />
            </View>

            {/* Expandable Inline Filter Rows with Reserved Space */}
            <View style={s.filterArea}>
                {activeTab === 'type' && (
                    <View>
                        <FilterRow title="" data={TYPE_OPTIONS} selectedValue={currentType} onSelect={handleTypeChange} />
                    </View>
                )}
                {activeTab === 'sort' && (
                    <View>
                        <FilterRow title="" data={SORT_OPTIONS} selectedValue={sort} onSelect={(val) => { setSort(val); setActiveTab(null); }} />
                    </View>
                )}
                {activeTab === 'genre' && (
                    <View>
                        <FilterRow title="" data={genres} selectedValue={genreId} onSelect={(val) => { setGenreId(val); setActiveTab(null); }} />
                    </View>
                )}
                {activeTab === 'platform' && (
                    <View>
                        <FilterRow title="" data={platforms} selectedValue={platformId} onSelect={(val) => { setPlatformId(val); setActiveTab(null); }} />
                    </View>
                )}
            </View>
        </View>
    ), [TypeIcon, pageTitle, total, sort, genreId, platformId, appliedSearch, searchQuery, genres, platforms, activeTab, sortLabel, genreLabel, platformLabel, typeLabel, currentType]);

    const sectionLabel = SECTION_LABELS[currentType] || '';

    // ════════════════════════════════════════════════════════════════════════════
    // CATEGORY VIEW — Banner + rows by genre/platform
    // ════════════════════════════════════════════════════════════════════════════
    if (showCategoryView) {
        // Only show full-screen loading on cold start (no cached data)
        if (catLoading && catAllItems.length === 0) {
            return (
                <View style={s.root}>
                    <TVCosmicBackground />
                    <TVExploreSkeleton />
                </View>
            );
        }
        return (
            <View style={s.root}>
                <TVCosmicBackground />
                <ScrollView 
                    ref={catScrollRef}
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={{ paddingBottom: scale(100) }}
                    onScroll={(e) => {
                        isScrolledRef.current = (e.nativeEvent.contentOffset.y > 60);
                    }}
                    scrollEventThrottle={16}
                >
                    <TVTopNav />
                    {catHeroSlides.length > 0 && (
                        <TVHeroBanner slides={catHeroSlides} sectionLabel={sectionLabel} hideThumbnails={true} hidePlatforms={true} />
                    )}
                    <View style={{ marginTop: catHeroSlides.length > 0 ? -scale(230) : scale(32), zIndex: 10, paddingBottom: scale(60) }}>
                        {/* "Todos" row */}
                        {catAllItems.length > 0 && (
                            <TVFilmRow
                                title="Todos"
                                items={catAllItems}
                                variant="poster"
                                hasTVPreferredFocus={catHeroSlides.length === 0}
                                onPressViewMore={() => {
                                    setPendingExploreFilters({ type: currentType, sort: 'recent' });
                                    router.push('/(tv)/explore' as any);
                                }}
                            />
                        )}
                        {/* Genre rows */}
                        {catGenres.filter(g => catGenreRows[g.id]?.length > 0).map((genre: any) => (
                            <TVFilmRow
                                key={`genre-${genre.id}`}
                                title={genre.name}
                                items={catGenreRows[genre.id] || []}
                                variant="poster"
                                onPressViewMore={() => {
                                    setPendingExploreFilters({ type: currentType, genreId: genre.id, sort: 'popular' });
                                    router.push('/(tv)/explore' as any);
                                }}
                            />
                        ))}
                    </View>
                </ScrollView>
            </View>
        );
    }

    // ════════════════════════════════════════════════════════════════════════════
    // FILTER-GRID VIEW — regular explore with search/filters (NO banner)
    // ════════════════════════════════════════════════════════════════════════════
    return (
        <View style={s.root}>
            <TVCosmicBackground />

            {/* ═══ MAIN CONTENT (no banner here) ══════════════════════ */}
            <View style={s.content}>
                <FlatList
                    ref={gridScrollRef}
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => String(item?.id || Math.random())}
                    numColumns={COLUMNS}
                    key={`grid-${COLUMNS}`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[s.grid, { paddingHorizontal: DYNAMIC_SIDE_PAD }]}
                    columnWrapperStyle={s.row}
                    onScroll={(e) => {
                        isScrolledRef.current = (e.nativeEvent.contentOffset.y > 60);
                    }}
                    scrollEventThrottle={16}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.6}
                    ListHeaderComponent={renderHeader()}
                    ListFooterComponent={
                        hasMore && items.length > 0 ? (
                            <View style={s.footer}><ActivityIndicator size="large" color={Colors.accent} /></View>
                        ) : null
                    }
                    ListEmptyComponent={
                        loading ? (
                            <TVExploreSkeleton />
                        ) : (
                            <View style={s.emptyCenter}>
                                <Text style={{ fontSize: 64 }}>🎬</Text>
                                <Text style={s.emptyTitle}>Sin resultados</Text>
                                <Text style={s.emptySubtitle}>No hay títulos que coincidan con estos filtros.</Text>
                            </View>
                        )
                    }
                />
            </View>
        </View>
    )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1 },
    contentWithBanner: { marginTop: scale(-120) },

    headerContainer: {
        paddingTop: TOP_OFFSET,
        paddingBottom: scale(40),
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(14), marginBottom: scale(30) },
    contentTitle: { fontSize: scale(32), fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
    totalBadge: {
        fontSize: scale(15), color: Colors.textSecondary, fontWeight: '700',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: scale(14), paddingVertical: scale(6), borderRadius: scale(12),
    },

    searchRow: { flexDirection: 'row', alignItems: 'center', gap: scale(16), marginBottom: scale(3) },
    searchContainer: {
        width: scale(380), // Fixed width, better proportion for TV
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: scale(24), paddingVertical: scale(4),
        borderRadius: scale(16), borderWidth: 2, borderColor: 'transparent',
    },
    searchContainerFocused: {
        backgroundColor: Colors.white,
        borderColor: Colors.white,
        transform: [{ scale: 1.05 }],
    },
    searchInput: {
        flex: 1, fontSize: scale(18), fontWeight: '600', color: Colors.white,
        padding: 0, margin: 0,
    },

    tabBtn: {
        flexDirection: 'row', alignItems: 'center', gap: scale(10),
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: scale(22), paddingVertical: scale(6),
        borderRadius: scale(16), borderWidth: 2, borderColor: 'transparent',
        maxWidth: scale(250),
    },
    tabBtnActive: { backgroundColor: 'rgba(0, 229, 255, 0.1)', borderColor: 'rgba(0, 229, 255, 0.3)' },
    tabBtnFocused: { borderColor: Colors.white, backgroundColor: Colors.white },
    tabBtnText: { fontSize: scale(16), fontWeight: '700', color: Colors.textSecondary },
    tabBtnTextActive: { color: Colors.accent },
    tabBtnTextFocused: { color: Colors.black },

    filterArea: {
        height: scale(60),
        justifyContent: 'center',
        marginTop: scale(18),
        marginBottom: scale(2),
    },
    filterRow: {
        // Removed default bottom margin as it's handled by filterArea
    },
    filterRowTitle: {
        fontSize: scale(14),
        fontWeight: '800',
        color: Colors.textMuted,
        marginBottom: scale(12),
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    filterRowList: {
        paddingBottom: scale(1),
        paddingHorizontal: scale(4),
    },

    chip: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: scale(4), paddingHorizontal: scale(24),
        borderRadius: scale(30),
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 2, borderColor: 'transparent',
    },
    chipSelected: { backgroundColor: 'rgba(0, 229, 255, 0.1)', borderColor: 'rgba(0, 229, 255, 0.3)' },
    chipFocused: { backgroundColor: Colors.white, borderColor: Colors.white },
    chipText: { fontSize: scale(15), fontWeight: '600', color: Colors.textSecondary },
    chipTextSelected: { color: Colors.accent, fontWeight: '800' },
    chipTextFocused: { color: Colors.black },

    clearBtn: {
        flexDirection: 'row', alignItems: 'center', gap: scale(6),
        paddingVertical: scale(12), paddingHorizontal: scale(18),
        borderRadius: scale(30), backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 2, borderColor: 'transparent',
    },
    clearBtnFocused: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.2)' },
    clearBtnText: { color: '#EF4444', fontSize: scale(15), fontWeight: '800' },

    content: { flex: 1 },
    grid: { paddingBottom: scale(100) },
    row: { gap: GAP, marginBottom: GAP, marginTop: scale(-30) },
    cardWrap: { marginBottom: GAP },

    emptyCenter: { marginTop: scale(80), alignItems: 'center', justifyContent: 'center', gap: scale(16) },
    emptyTitle: { fontSize: scale(28), fontWeight: '800', color: Colors.white },
    emptySubtitle: { fontSize: scale(18), color: Colors.textSecondary },
    footer: { paddingVertical: scale(40), alignItems: 'center' },

    collageContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        backgroundColor: '#090A0D', // Solid background matching Colors.bg to completely block purple/blue tones from TVCosmicBackground
        overflow: 'hidden',
    },
    collageGrid: {
        width: SW,
        height: SH,
        opacity: 0.14, // Lower opacity to naturally desaturate the colored backdrops on the dark background
    },
    collageItem: {
        width: SW / 4,
        height: (SW / 4) * (9 / 16),
        borderWidth: scale(1),
        borderColor: 'rgba(255, 255, 255, 0.02)',
    },
    collageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(9, 10, 13, 0.65)', // Dark gray overlay to dim the grayscale banners
    },
});
