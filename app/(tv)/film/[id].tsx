import TVTopNav from "../../../components/tv/TVTopNav";
import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet,
    Pressable, Dimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Play, Plus, ThumbsUp, Check, Star, ChevronRight } from 'lucide-react-native';
// react-native-reanimated layout imports removed for TV stability
import { Colors } from '../../../theme/colors';
import { TV } from '../../../theme/tv';
import { TVFilmDetailSkeleton } from '../../../components/tv/TVSkeleton';
import { API_ROUTES, resolveImageUrl } from '../../../lib/api-routes';
import { fetchApi } from '../../../lib/api-client';
import { useAuth } from '../../../context/AuthContext';
import TVFilmRow from '../../../components/tv/TVFilmRow';
import { isSeries } from '../../../lib/content-types';
import { scale } from '../../../lib/scale';

const { width: SW, height: SH } = Dimensions.get('window');
const TVFocusGuide = (require('react-native') as any).TVFocusGuideView ?? View;

// Safe wrapper to prevent web crashes
const safeFindNodeHandle = (componentOrHandle: any) => {
    if (Platform.OS === 'web') return null;
    try {
        const find = (require('react-native') as any).findNodeHandle;
        return find ? find(componentOrHandle) : null;
    } catch {
        return null;
    }
};

function ActionButton({
    label, icon: Icon, onPress, primary, active, disabled, hasTVPreferredFocus,
}: {
    label: string;
    icon: any;
    onPress: () => void;
    primary?: boolean;
    active?: boolean;
    disabled?: boolean;
    hasTVPreferredFocus?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <TVPressable
            focusable
            hasTVPreferredFocus={hasTVPreferredFocus}
            disabled={disabled}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.actionBtn,
                primary ? s.actionBtnPrimary : s.actionBtnSecondary,
                active && { backgroundColor: 'rgba(0,195,255,0.12)', borderColor: 'rgba(0,195,255,0.4)', borderWidth: 2 },
                focused && (primary ? s.actionBtnPrimaryFocused : s.actionBtnSecondaryFocused),
                disabled && s.actionBtnDisabled,
            ]}
        >
            <Icon
                size={primary ? scale(20) : scale(20)}
                fill={active ? Colors.accent : (primary ? (focused ? Colors.white : Colors.black) : 'transparent')}
                color={active ? Colors.accent : (primary ? (focused ? Colors.white : Colors.black) : (focused ? Colors.black : Colors.white))}
                strokeWidth={2.5}
            />
            {!!label && (
                <Text style={[
                    s.actionBtnText,
                    primary ? s.actionBtnTextPrimary : s.actionBtnTextSecondary,
                    active && { color: Colors.accent },
                    focused && s.actionBtnTextFocused,
                    primary && focused && { color: Colors.white },
                ]}>
                    {label}
                </Text>
            )}
        </TVPressable>
    );
}

// ─── Expandable Description ────────────────────────────────────────────────────
function ExpandableDescription({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false);
    const [focused, setFocused] = useState(false);
    
    if (!text) return null;
    
    const needsExpand = text.length > 180;

    return (
        <View style={{ marginBottom: scale(36) }}>
            <Text style={s.description} numberOfLines={expanded ? undefined : 3}>
                {text}
            </Text>
            {needsExpand && (
                <TVPressable
                    focusable
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onPress={() => setExpanded(!expanded)}
                    style={[s.expandBtn, focused && s.expandBtnFocused]}
                >
                    <Text style={[s.expandBtnText, focused && s.expandBtnTextFocused]}>
                        {expanded ? 'Ocultar' : 'Seguir leyendo'}
                    </Text>
                </TVPressable>
            )}
        </View>
    );
}

// ─── Season Tab ────────────────────────────────────────────────────────────────
function SeasonTab({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            focusable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[s.seasonTab, isActive && s.seasonTabActive, focused && s.seasonTabFocused]}
        >
            <Text style={[s.seasonTabText, isActive && s.seasonTabTextActive, focused && s.seasonTabTextFocused]}>
                {label}
            </Text>
        </Pressable>
    );
}

const TVPressable = Pressable as any;

// ─── Episode Card ──────────────────────────────────────────────────────────────
const EpisodeCard = React.forwardRef<any, {
    ep: any;
    index: number;
    contentId: string;
    contentBackdrop?: string | null;
    contentPoster?: string | null;
    onPress: () => void;
    nextFocusLeft?: number | null;
    nextFocusRight?: number | null;
}>(function EpisodeCard({ ep, index, contentId, contentBackdrop, contentPoster, onPress, nextFocusLeft, nextFocusRight }, ref) {
    const [focused, setFocused] = useState(false);
    const thumb = ep.thumbnails?.find((t: any) => t.type === 'STILL' || t.type === 'THUMBNAIL')?.url
        || ep.thumbnails?.[0]?.url
        || contentBackdrop
        || contentPoster;

    return (
        <TVPressable
            ref={ref}
            focusable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            nextFocusLeft={nextFocusLeft ?? undefined}
            nextFocusRight={nextFocusRight ?? undefined}
            style={[s.epCard, focused && s.epCardFocused]}
        >
            <View style={s.epThumbWrap}>
                {thumb ? (
                    <Image source={resolveImageUrl(thumb)} style={s.epThumb} contentFit="cover" />
                ) : (
                    <LinearGradient
                        colors={['#1F232D', '#0F1115']}
                        style={[s.epThumb, { justifyContent: 'center', alignItems: 'center' }]}
                    >
                        <Play size={scale(28)} fill="rgba(255,255,255,0.15)" color="rgba(255,255,255,0.15)" />
                    </LinearGradient>
                )}
                <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={s.epNumBadge}>
                    <Text style={s.epNumBadgeText}>{ep.number}</Text>
                </View>
                {focused && (
                    <View style={s.epPlayOverlay}>
                        <Play size={scale(32)} fill={Colors.white} color={Colors.white} />
                    </View>
                )}
            </View>
            <View style={s.epInfo}>
                <Text style={[s.epTitle, focused && { color: Colors.accent }]} numberOfLines={1}>
                    {ep.translations?.[0]?.title || `Episodio ${ep.number}`}
                </Text>
                {ep.translations?.[0]?.description && (
                    <Text style={s.epDesc} numberOfLines={2}>{ep.translations[0].description}</Text>
                )}
                {ep.duration && (
                    <Text style={s.epDuration}>{Math.floor(ep.duration / 60)} min</Text>
                )}
            </View>
        </TVPressable>
    );
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function FilmDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const [content, setContent] = useState<any>(null);
    const [related, setRelated] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFavorited, setIsFavorited] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);

    // Episode boundary self-loop locking and chaining — imperative, no state, no re-renders
    const epRefs = useRef<any[]>([]);

    const currentSeason = content?.seasons?.find((s: any) => s.number === selectedSeason);
    const episodes = currentSeason?.episodes || [];

    useEffect(() => {
        if (Platform.OS === 'web') return;
        
        const t = setTimeout(() => {
            const epsCount = episodes.length;
            epRefs.current = epRefs.current.slice(0, epsCount);

            epRefs.current.forEach((refItem, index) => {
                if (!refItem) return;
                const currentId = safeFindNodeHandle(refItem);
                if (!currentId) return;

                const prevRef = epRefs.current[index - 1];
                const nextRef = epRefs.current[index + 1];

                const prevId = prevRef ? safeFindNodeHandle(prevRef) : currentId; // Loop to self if first
                const nextId = nextRef ? safeFindNodeHandle(nextRef) : currentId; // Loop to self if last

                refItem.setNativeProps?.({
                    nextFocusLeft: prevId,
                    nextFocusRight: nextId,
                });
            });
        }, 250);
        return () => clearTimeout(t);
    }, [episodes.length, selectedSeason]);

    useEffect(() => {
        const load = async () => {
            try {
                const json = await fetchApi(`${API_ROUTES.CONTENT.BASE}/${id}`);
                if (json.success && json.data) {
                    setContent(json.data);
                    if (json.data.seasons?.length > 0) setSelectedSeason(json.data.seasons[0].number);
                }
                const relJson = await fetchApi(`${API_ROUTES.CONTENT.BASE}/${id}/related`);
                if (relJson.success && relJson.data) setRelated(relJson.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    useEffect(() => {
        if (!user || !content?.id) return;
        const checkFavLike = async () => {
            try {
                const favJson = await fetchApi(`${API_ROUTES.FAVORITES.BASE}/check/${content.id}`);
                if (favJson && favJson.success) {
                    setIsFavorited(favJson.data.isFavorited);
                }
            } catch (e) {
                console.warn('[checkFavLike] Failed to check favorite status:', e);
            }

            try {
                const likeJson = await fetchApi(API_ROUTES.LIKES.CHECK(content.id));
                if (likeJson && likeJson.success) {
                    setIsLiked(likeJson.data.isLiked);
                }
            } catch (e) {
                console.warn('[checkFavLike] Failed to check like status:', e);
            }
        };
        checkFavLike();
    }, [content?.id, user]);

    const toggleFav = async () => {
        if (!user) { router.push('/(auth)/login'); return; }
        if (!content?.id) return;
        const old = isFavorited;
        setIsFavorited(!old);
        try {
            const json = await fetchApi(API_ROUTES.FAVORITES.TOGGLE, { method: 'POST', body: JSON.stringify({ contentId: content.id }) });
            if (json.success) setIsFavorited(json.data.favorited);
            else setIsFavorited(old);
        } catch { setIsFavorited(old); }
    };

    const toggleLike = async () => {
        if (!user) { router.push('/(auth)/login'); return; }
        if (!content?.id) return;
        const old = isLiked;
        setIsLiked(!old);
        try {
            const json = await fetchApi(API_ROUTES.LIKES.TOGGLE, { method: 'POST', body: JSON.stringify({ contentId: content.id }) });
            if (json.success) setIsLiked(json.data.liked);
            else setIsLiked(old);
        } catch { setIsLiked(old); }
    };

    const handlePlay = () => {
        if (!user) { router.push('/(auth)/login'); return; }
        router.push(`/(tv)/watch/${id}` as any);
    };

    if (loading) {
        return (
            <View style={s.loader}>
                <TVFilmDetailSkeleton />
            </View>
        );
    }

    if (!content) {
        return (
            <View style={s.loader}>
                <Text style={{ color: Colors.textSecondary, fontSize: 20 }}>Contenido no encontrado</Text>
            </View>
        );
    }

    const tr = content.translations?.[0] || { title: 'Sin título', description: '' };
    const backdrop = content.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url
        || content.thumbnails?.find((t: any) => t.type === 'BANNER')?.url
        || content.thumbnails?.find((t: any) => t.type === 'THUMBNAIL')?.url;
    const canPlay = content.status === 'READY' || content.status === 'ACTIVE';
    const series = isSeries(content.type);


    const genres = content.genres?.map((g: any) => g.genre?.name || g.name).filter(Boolean).join(' · ') || '';
    const ratingDisplay = content.rating ? Number(content.rating).toFixed(1) : null;

    return (
        <View style={s.container}>
            {/* ── FULL-SCREEN BACKDROP ─────────────────────────────────────────── */}
            <View style={StyleSheet.absoluteFill}>
                <Image
                    source={resolveImageUrl(backdrop)}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                />
                {/* Multi-layer gradients for cinematic depth */}
                <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(2,4,10,0.5)', 'rgba(2,4,10,0.98)']}
                    locations={[0.3, 0.65, 1.0]}
                    style={StyleSheet.absoluteFill}
                />
                {/* Left vignette so text is always readable */}
                <LinearGradient
                    colors={['rgba(2,4,10,0.85)', 'rgba(2,4,10,0.4)', 'rgba(0,0,0,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 0.6, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            {/* ── SCROLLABLE CONTENT ────────────────────────────────────────────── */}
            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <TVTopNav />
                {/* ── HERO SECTION ─────────────────────────────────────────────── */}
                <View style={s.heroSection}>
                    {/* Genres / Type tag */}
                    {genres !== '' && (
                        <View style={s.genrePillRow}>
                            {content.genres?.slice(0, 3).map((g: any, i: number) => (
                                <View key={i} style={s.genrePill}>
                                    <Text style={s.genrePillText}>{g.genre?.name || g.name}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Main Title */}
                    <Text style={s.heroTitle} numberOfLines={2}>{tr.title}</Text>

                    {/* Meta Row: Year · Rating · Duration */}
                    <View style={s.metaRow}>
                        {content.releaseYear && <Text style={s.metaText}>{content.releaseYear}</Text>}
                        {content.ageRating?.code && (
                            <>
                                <View style={s.metaDot} />
                                <View style={s.ageBadge}>
                                    <Text style={s.ageBadgeText}>{content.ageRating.code}</Text>
                                </View>
                            </>
                        )}
                        {ratingDisplay && (
                            <>
                                <View style={s.metaDot} />
                                <Star size={scale(14)} fill="#F59E0B" color="#F59E0B" />
                                <Text style={s.ratingText}>{ratingDisplay}</Text>
                            </>
                        )}
                        {series && content.seasons?.length > 0 && (
                            <>
                                <View style={s.metaDot} />
                                <Text style={s.metaText}>{content.seasons.length} Temporada{content.seasons.length > 1 ? 's' : ''}</Text>
                            </>
                        )}
                    </View>

                    {/* Description */}
                    <ExpandableDescription text={tr.description} />

                    {/* ── ACTION BUTTONS ─────────────────────────────────────────── */}
                    <View style={s.actionRow}>
                        <ActionButton
                            label={canPlay ? 'REPRODUCIR' : 'PRÓXIMAMENTE'}
                            icon={Play}
                            onPress={handlePlay}
                            primary
                            disabled={!canPlay}
                            hasTVPreferredFocus
                        />
                        <ActionButton
                            label=""
                            icon={isFavorited ? Check : Plus}
                            onPress={toggleFav}
                            active={isFavorited}
                        />
                        <ActionButton
                            label=""
                            icon={ThumbsUp}
                            onPress={toggleLike}
                            active={isLiked}
                        />
                    </View>
                </View>

                {/* ── SEASONS & EPISODES ───────────────────────────────────────── */}
                {series && content.seasons?.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>EPISODIOS</Text>

                        {/* Season Tabs */}
                        {content.seasons.length > 1 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.seasonRow} contentContainerStyle={{ gap: 12 }}>
                                {content.seasons.map((se: any) => (
                                    <SeasonTab
                                        key={se.id}
                                        label={`Temporada ${se.number}`}
                                        isActive={selectedSeason === se.number}
                                        onPress={() => setSelectedSeason(se.number)}
                                    />
                                ))}
                            </ScrollView>
                        )}

                        {/* Episodes Horizontal Scroll */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 20, paddingTop: scale(16), paddingBottom: scale(16) }}
                        >
                            {(() => {
                                const contentBackdrop = content.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url;
                                const contentPoster = content.thumbnails?.find((t: any) => t.type === 'POSTER')?.url;
                                return episodes.map((ep: any, index: number) => {
                                    return (
                                        <EpisodeCard
                                            key={ep.id}
                                            ref={(el) => { epRefs.current[index] = el; }}
                                            ep={ep}
                                            index={index}
                                            contentId={id!}
                                            contentBackdrop={contentBackdrop}
                                            contentPoster={contentPoster}
                                            onPress={() => {
                                                if (!user) { router.push('/(auth)/login'); return; }
                                                router.push(`/(tv)/watch/${id}?episodeId=${ep.id}` as any);
                                            }}
                                        />
                                    );
                                });
                            })()}
                        </ScrollView>
                    </View>
                )}

                {/* ── CAST ──────────────────────────────────────────────────────── */}
                {content.actors?.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>REPARTO</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingBottom: 8 }}>
                            {content.actors.slice(0, 12).map((a: any, i: number) => (
                                <View key={i} style={s.actorCard}>
                                    <Image
                                        source={resolveImageUrl(a.actor?.photoUrl)}
                                        style={s.actorImg}
                                        contentFit="cover"
                                    />
                                    <Text style={s.actorName} numberOfLines={2}>{a.actor?.name}</Text>
                                    {a.role && <Text style={s.actorRole} numberOfLines={1}>{a.role}</Text>}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* ── RELATED CONTENT ───────────────────────────────────────────── */}
                {related.length > 0 && (
                    <View style={[s.section, { marginLeft: scale(-72) }]}>
                        <TVFilmRow
                            title="TAMBIÉN TE PODRÍA GUSTAR"
                            items={related.map(item => ({
                                id: item.id,
                                title: item.translations?.[0]?.title || item.slug,
                                posterUrl: item.thumbnails?.find((t: any) => t.type === 'POSTER')?.url,
                                backdropUrl: item.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url,
                                rating: item.rating,
                                year: item.releaseYear,
                                type: item.type,
                            }))}
                        />
                    </View>
                )}

                <View style={{ height: scale(80) }} />
            </ScrollView>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const HERO_PADDING_TOP = scale(120); // below TVTopNav
const SIDE_PADDING = scale(72);

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#02040A' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#02040A' },

    scroll: { flex: 1 },
    scrollContent: { paddingBottom: scale(80) },

    // ── Hero ──
    heroSection: {
        paddingHorizontal: SIDE_PADDING,
        paddingTop: HERO_PADDING_TOP + scale(40),
        paddingBottom: scale(48),
        maxWidth: SW * 0.58, // Keep text on the left half so backdrop shows on the right
    },

    genrePillRow: { flexDirection: 'row', gap: scale(10), marginBottom: scale(20) },
    genrePill: {
        paddingHorizontal: scale(14), paddingVertical: scale(6), borderRadius: scale(20),
        backgroundColor: 'rgba(0, 195, 255, 0.12)',
        borderWidth: 1, borderColor: 'rgba(0, 195, 255, 0.25)',
    },
    genrePillText: { fontSize: scale(13), fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },

    heroTitle: {
        fontSize: scale(60), fontWeight: '900', color: Colors.white,
        lineHeight: scale(66), marginBottom: scale(20), letterSpacing: -1,
    },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: scale(24) },
    metaText: { fontSize: scale(17), fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
    metaDot: { width: scale(4), height: scale(4), borderRadius: scale(2), backgroundColor: 'rgba(255,255,255,0.3)' },
    ageBadge: {
        paddingHorizontal: scale(10), paddingVertical: scale(3), borderRadius: scale(6),
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    },
    ageBadgeText: { fontSize: scale(13), fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
    ratingText: { fontSize: scale(17), fontWeight: '800', color: '#F59E0B' },

    description: {
        fontSize: scale(18), color: 'rgba(255,255,255,0.72)',
        lineHeight: scale(26),
        fontWeight: '400',
    },
    expandBtn: { alignSelf: 'flex-start', marginTop: scale(8), paddingVertical: scale(4), paddingHorizontal: scale(12), borderRadius: scale(8), borderWidth: 2, borderColor: 'transparent' },
    expandBtnFocused: { backgroundColor: Colors.white, transform: [{ scale: 1.05 }] },
    expandBtnText: { fontSize: scale(14), fontWeight: '700', color: Colors.accent },
    expandBtnTextFocused: { color: Colors.black },

    // ── Action Buttons ──
    actionRow: { flexDirection: 'row', gap: scale(16), alignItems: 'center' },

    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: scale(8),
        borderRadius: scale(12), borderWidth: 2, borderColor: 'transparent',
    },
    actionBtnPrimary: {
        backgroundColor: Colors.white,
        paddingVertical: scale(15), paddingHorizontal: scale(26),
    },
    actionBtnPrimaryFocused: {
        backgroundColor: '#0097A7',
        borderColor: '#0097A7',
        transform: [{ scale: 1.06 }],
    },
    actionBtnSecondary: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(255,255,255,0.15)',
        padding: scale(14),
        borderRadius: scale(30),
    },
    actionBtnSecondaryFocused: {
        backgroundColor: Colors.white,
        borderColor: Colors.white,
        transform: [{ scale: 1.1 }],
    },
    actionBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', opacity: 0.4 },
    actionBtnText: { fontWeight: '800', letterSpacing: 1 },
    actionBtnTextPrimary: { color: Colors.black, fontSize: scale(16) },
    actionBtnTextSecondary: { color: Colors.white, fontSize: scale(13) },
    actionBtnTextFocused: { color: Colors.black },

    // ── Sections ──
    section: { paddingHorizontal: SIDE_PADDING, marginBottom: scale(40) },
    sectionLabel: {
        fontSize: scale(13), fontWeight: '800', color: 'rgba(255,255,255,0.45)',
        letterSpacing: 2, marginBottom: scale(20),
    },

    // ── Season Tabs ──
    seasonRow: { marginBottom: scale(24) },
    seasonTab: {
        paddingHorizontal: scale(24), paddingVertical: scale(12), borderRadius: scale(30),
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 2, borderColor: 'transparent',
    },
    seasonTabActive: { backgroundColor: 'rgba(0,195,255,0.22)', borderColor: 'rgba(0,195,255,0.5)' },
    seasonTabFocused: { backgroundColor: Colors.white, borderColor: Colors.white },
    seasonTabText: { fontSize: scale(16), fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
    seasonTabTextActive: { color: Colors.accent, fontWeight: '800' },
    seasonTabTextFocused: { color: Colors.black },

    // ── Episode Cards ──
    epCard: {
        width: scale(320), borderRadius: scale(16),
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 2, borderColor: 'transparent',
        overflow: 'hidden',
    },
    epCardFocused: {
        borderColor: Colors.white,
        backgroundColor: 'rgba(255,255,255,0.16)',
        transform: [{ scale: 1.04 }],
    },
    epThumbWrap: { width: '100%', height: scale(170), position: 'relative' },
    epThumb: { width: '100%', height: scale(170) },
    epThumbFallback: { backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
    epNumBadge: {
        position: 'absolute', top: scale(12), left: scale(12),
        width: scale(32), height: scale(32), borderRadius: scale(8),
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center', alignItems: 'center',
    },
    epNumBadgeText: { fontSize: scale(15), fontWeight: '900', color: Colors.white },
    epPlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    epInfo: { padding: scale(16) },
    epTitle: { fontSize: scale(16), fontWeight: '800', color: Colors.white, marginBottom: scale(6) },
    epDesc: { fontSize: scale(13), color: 'rgba(255,255,255,0.72)', lineHeight: scale(19) },
    epDuration: { fontSize: scale(13), fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: scale(8) },

    // ── Cast ──
    actorCard: { alignItems: 'center', width: scale(90) },
    actorImg: {
        width: scale(80), height: scale(80), borderRadius: scale(40), marginBottom: scale(10),
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)',
    },
    actorName: { fontSize: scale(13), fontWeight: '700', color: Colors.white, textAlign: 'center', lineHeight: scale(18) },
    actorRole: { fontSize: scale(12), color: Colors.textMuted, textAlign: 'center', marginTop: scale(3) },
});
