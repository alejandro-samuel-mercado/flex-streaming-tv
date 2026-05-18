import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { History, User, LogIn } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import TVFilmCard from '../../components/tv/TVFilmCard';
import TVFocusable from '../../components/tv/TVFocusable';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';

const TVFocusGuide = (require('react-native') as any).TVFocusGuideView ?? View;
const { width: SW } = Dimensions.get('window');
const COLUMNS = 6;
const GAP = 24;
const CARD_WIDTH = (SW - 144 - (GAP * (COLUMNS - 1))) / COLUMNS;

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await fetchApi(`${API_ROUTES.HISTORY.LIST}?limit=30`);
      if (res.success && res.data) {
        setData(res.data.data || res.data.items || res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const c = item.content;
    if (!c) return null;
    const backdrop = c.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url;
    const poster = c.thumbnails?.find((t: any) => t.type === 'POSTER')?.url;
    return (
      <View style={[s.cardWrapper, { width: CARD_WIDTH }]}>
        <TVFilmCard
          id={c.id}
          title={c.translations?.[0]?.title}
          backdropUrl={backdrop}
          posterUrl={poster}
          progress={item.progressSeconds}
          duration={item.durationSeconds}
          type={c.type}
          hasTVPreferredFocus={index === 0}
          width={CARD_WIDTH}
          onPress={() => {
            if (item.episodeId) {
              router.push({
                pathname: `/(tv)/watch/${c.id}` as any,
                params: { episodeId: item.episodeId }
              });
            } else {
              router.push(`/(tv)/watch/${c.id}` as any);
            }
          }}
        />
      </View>
    );
  };

  return (
    <View style={s.container}>
      <TVCosmicBackground />

      <View style={s.contentWrapper}>
        <Animated.View entering={FadeIn.duration(600)} style={s.header}>
          <History size={36} color={Colors.accent} strokeWidth={2.5} />
          <Text style={s.title}>Continuar Viendo</Text>
          {user && data.length > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{data.length} título{data.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </Animated.View>

        {!user ? (
          <View style={s.center}>
            <Animated.View entering={FadeInDown.duration(600)} style={s.emptyCard}>
              <User size={64} color="rgba(255,255,255,0.15)" style={{ marginBottom: 20 }} />
              <Text style={s.emptyTitle}>Inicia sesión</Text>
              <Text style={s.emptySubtitle}>Debes estar conectado para poder registrar tu progreso de visualización y continuar tus películas o episodios donde los dejaste.</Text>
              
              <TVFocusable 
                style={s.loginBtn} 
                hasTVPreferredFocus 
                onPress={() => router.push('/(auth)/login')}
                focusBorderRadius={16}
              >
                <LogIn size={20} color={Colors.black} strokeWidth={2.5} />
                <Text style={s.loginBtnText}>CONECTARSE</Text>
              </TVFocusable>
            </Animated.View>
          </View>
        ) : loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : data.length > 0 ? (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            key={`grid-${COLUMNS}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.grid}
            columnWrapperStyle={s.row}
          />
        ) : (
          <View style={s.center}>
            <Animated.View entering={FadeInDown.duration(600)} style={s.emptyCard}>
              <History size={64} color="rgba(255,255,255,0.15)" style={{ marginBottom: 20 }} />
              <Text style={s.emptyTitle}>Sin historial</Text>
              <Text style={s.emptySubtitle}>Tu historial de reproducción aparecerá aquí cuando comiences a ver cualquier película o serie en la plataforma.</Text>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02040A',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 140, // Consistent with header offsets
    paddingHorizontal: 72,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  countBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  grid: {
    paddingBottom: 100,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  cardWrapper: {
    marginBottom: GAP,
  },
  center: {
    flex: 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 48,
    borderRadius: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: 550,
  },
  emptyTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: 1.5,
  },
});
