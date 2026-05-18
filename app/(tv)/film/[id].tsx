import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Pressable, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Play, Plus, ThumbsUp, Check, Star, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../../theme/colors';
import { TV } from '../../../theme/tv';
import { API_ROUTES, resolveImageUrl } from '../../../lib/api-routes';
import { fetchApi } from '../../../lib/api-client';
import { useAuth } from '../../../context/AuthContext';
import TVFilmRow from '../../../components/tv/TVFilmRow';
import { isSeries } from '../../../lib/content-types';

const { width: SW, height: SH } = Dimensions.get('window');
const TVFocusGuide = (require('react-native') as any).TVFocusGuideView ?? View;

// ─── Action Button ─────────────────────────────────────────────────────────────
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
    <Pressable
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        s.actionBtn,
        primary && s.actionBtnPrimary,
        !primary && s.actionBtnSecondary,
        active && { backgroundColor: 'rgba(0,195,255,0.12)', borderColor: 'rgba(0,195,255,0.4)', borderWidth: 2 },
        focused && (primary ? s.actionBtnPrimaryFocused : s.actionBtnSecondaryFocused),
        disabled && s.actionBtnDisabled,
      ]}
    >
      <Icon
        size={22}
        fill={active ? Colors.accent : (primary ? (focused ? Colors.white : Colors.black) : 'transparent')}
        color={active ? Colors.accent : (primary ? (focused ? Colors.white : Colors.black) : (focused ? Colors.black : Colors.white))}
        strokeWidth={2.5}
      />
      <Text style={[
        s.actionBtnText,
        primary && s.actionBtnTextPrimary,
        active && { color: Colors.accent },
        focused && s.actionBtnTextFocused,
        primary && focused && { color: Colors.white },
      ]}>
        {label}
      </Text>
    </Pressable>
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

// ─── Episode Card ──────────────────────────────────────────────────────────────
function EpisodeCard({ ep, index, contentId, contentBackdrop, contentPoster, onPress }: {
  ep: any;
  index: number;
  contentId: string;
  contentBackdrop?: string | null;
  contentPoster?: string | null;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  let thumb = ep.thumbnails?.find((t: any) => t.type === 'THUMBNAIL')?.url
    || ep.thumbnails?.[0]?.url;

  if (thumb && (thumb === contentBackdrop || thumb === contentPoster)) {
    thumb = undefined;
  }

  return (
    <Pressable
      focusable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
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
            <Play size={28} fill="rgba(255,255,255,0.15)" color="rgba(255,255,255,0.15)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.epNumBadge}>
          <Text style={s.epNumBadgeText}>{ep.number}</Text>
        </View>
        {focused && (
          <View style={s.epPlayOverlay}>
            <Play size={32} fill={Colors.white} color={Colors.white} />
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
    </Pressable>
  );
}

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
    if (!user || !id) return;
    const checkFavLike = async () => {
      try {
        const favJson = await fetchApi(`${API_ROUTES.FAVORITES.BASE}/check/${id}`);
        if (favJson && favJson.success) {
          setIsFavorited(favJson.data.isFavorited);
        }
      } catch (e) {
        console.warn('[checkFavLike] Failed to check favorite status:', e);
      }
      
      try {
        const likeJson = await fetchApi(API_ROUTES.LIKES.CHECK(id));
        if (likeJson && likeJson.success) {
          setIsLiked(likeJson.data.isLiked);
        }
      } catch (e) {
        console.warn('[checkFavLike] Failed to check like status:', e);
      }
    };
    checkFavLike();
  }, [id, user]);

  const toggleFav = async () => {
    if (!user) { router.push('/(auth)/login'); return; }
    const old = isFavorited;
    setIsFavorited(!old);
    try {
      const json = await fetchApi(API_ROUTES.FAVORITES.TOGGLE, { method: 'POST', body: JSON.stringify({ contentId: id }) });
      if (json.success) setIsFavorited(json.data.favorited);
      else setIsFavorited(old);
    } catch { setIsFavorited(old); }
  };

  const toggleLike = async () => {
    if (!user) { router.push('/(auth)/login'); return; }
    const old = isLiked;
    setIsLiked(!old);
    try {
      const json = await fetchApi(API_ROUTES.LIKES.TOGGLE, { method: 'POST', body: JSON.stringify({ contentId: id }) });
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
        <ActivityIndicator size="large" color={Colors.accent} />
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
    || content.thumbnails?.find((t: any) => t.type === 'POSTER')?.url;
  const canPlay = content.status === 'READY' || content.status === 'ACTIVE';
  const series = isSeries(content.type);
  const currentSeason = content.seasons?.find((s: any) => s.number === selectedSeason) || content.seasons?.[0];

  const genres = content.genres?.map((g: any) => g.genre?.name || g.name).filter(Boolean).join(' · ') || '';
  const ratingDisplay = content.rating ? parseFloat(content.rating).toFixed(1) : null;

  return (
    <View style={s.container}>
      {/* ── FULL-SCREEN BACKDROP ─────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(600)} style={StyleSheet.absoluteFill}>
        <Image
          source={resolveImageUrl(backdrop)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={500}
        />
        {/* Multi-layer gradients for cinematic depth */}
        <LinearGradient
          colors={['transparent', 'rgba(2,4,10,0.5)', 'rgba(2,4,10,0.98)']}
          locations={[0.3, 0.65, 1.0]}
          style={StyleSheet.absoluteFill}
        />
        {/* Left vignette so text is always readable */}
        <LinearGradient
          colors={['rgba(2,4,10,0.85)', 'rgba(2,4,10,0.4)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0.6, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── SCROLLABLE CONTENT ────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO SECTION ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.heroSection}>
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
                <Star size={14} fill="#F59E0B" color="#F59E0B" />
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
          <Text style={s.description} numberOfLines={4}>{tr.description}</Text>

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
              label={isFavorited ? 'EN MI LISTA' : 'MI LISTA'}
              icon={isFavorited ? Check : Plus}
              onPress={toggleFav}
              active={isFavorited}
            />
            <ActionButton
              label={isLiked ? 'TE GUSTA' : 'ME GUSTA'}
              icon={ThumbsUp}
              onPress={toggleLike}
              active={isLiked}
            />
          </View>
        </Animated.View>

        {/* ── SEASONS & EPISODES ───────────────────────────────────────── */}
        {series && content.seasons?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={s.section}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingBottom: 8 }}>
              {(() => {
                const contentBackdrop = content.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url;
                const contentPoster = content.thumbnails?.find((t: any) => t.type === 'POSTER')?.url;
                return (currentSeason?.episodes || []).map((ep: any, index: number) => (
                  <EpisodeCard
                    key={ep.id}
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
                ));
              })()}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── CAST ──────────────────────────────────────────────────────── */}
        {content.actors?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.section}>
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
          </Animated.View>
        )}

        {/* ── RELATED CONTENT ───────────────────────────────────────────── */}
        {related.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[s.section, { marginLeft: -72 }]}>
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
          </Animated.View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const HERO_PADDING_TOP = 120; // below TVTopNav
const SIDE_PADDING = 72;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02040A' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#02040A' },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: HERO_PADDING_TOP },

  // ── Hero ──
  heroSection: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 40,
    paddingBottom: 48,
    maxWidth: SW * 0.58, // Keep text on the left half so backdrop shows on the right
  },

  genrePillRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  genrePill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(0, 195, 255, 0.12)',
    borderWidth: 1, borderColor: 'rgba(0, 195, 255, 0.25)',
  },
  genrePillText: { fontSize: 13, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },

  heroTitle: {
    fontSize: 60, fontWeight: '900', color: Colors.white,
    lineHeight: 66, marginBottom: 20, letterSpacing: -1,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  metaText: { fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  ageBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  ageBadgeText: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  ratingText: { fontSize: 17, fontWeight: '800', color: '#F59E0B' },

  description: {
    fontSize: 18, color: 'rgba(255,255,255,0.72)',
    lineHeight: 30, marginBottom: 36,
    fontWeight: '400',
  },

  // ── Action Buttons ──
  actionRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 16, paddingHorizontal: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  actionBtnPrimary: {
    backgroundColor: Colors.white,
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  actionBtnPrimaryFocused: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    shadowColor: Colors.accent, shadowOpacity: 0.6,
    transform: [{ scale: 1.06 }],
  },
  actionBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  actionBtnSecondaryFocused: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
    transform: [{ scale: 1.06 }],
  },
  actionBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.05)', opacity: 0.4 },
  actionBtnText: { fontSize: 17, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  actionBtnTextPrimary: { color: Colors.black },
  actionBtnTextFocused: { color: Colors.black },

  // ── Sections ──
  section: { paddingHorizontal: SIDE_PADDING, marginBottom: 40 },
  sectionLabel: {
    fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2, marginBottom: 20,
  },

  // ── Season Tabs ──
  seasonRow: { marginBottom: 24 },
  seasonTab: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2, borderColor: 'transparent',
  },
  seasonTabActive: { backgroundColor: 'rgba(0,195,255,0.22)', borderColor: 'rgba(0,195,255,0.5)' },
  seasonTabFocused: { backgroundColor: Colors.white, borderColor: Colors.white },
  seasonTabText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
  seasonTabTextActive: { color: Colors.accent, fontWeight: '800' },
  seasonTabTextFocused: { color: Colors.black },

  // ── Episode Cards ──
  epCard: {
    width: 320, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2, borderColor: 'transparent',
    overflow: 'hidden',
  },
  epCardFocused: {
    borderColor: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ scale: 1.04 }],
    shadowColor: Colors.white, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  epThumbWrap: { width: '100%', height: 170, position: 'relative' },
  epThumb: { width: '100%', height: 170 },
  epThumbFallback: { backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  epNumBadge: {
    position: 'absolute', top: 12, left: 12,
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  epNumBadgeText: { fontSize: 15, fontWeight: '900', color: Colors.white },
  epPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  epInfo: { padding: 16 },
  epTitle: { fontSize: 16, fontWeight: '800', color: Colors.white, marginBottom: 6 },
  epDesc: { fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 19 },
  epDuration: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 8 },

  // ── Cast ──
  actorCard: { alignItems: 'center', width: 90 },
  actorImg: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)',
  },
  actorName: { fontSize: 13, fontWeight: '700', color: Colors.white, textAlign: 'center', lineHeight: 18 },
  actorRole: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 3 },
});
