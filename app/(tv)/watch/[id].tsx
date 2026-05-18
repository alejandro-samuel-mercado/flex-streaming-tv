import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../theme/colors';
import TVPlayer from '../../../components/tv/TVPlayer';
import { fetchApi } from '../../../lib/api-client';
import { API_ROUTES } from '../../../lib/api-routes';

export default function WatchScreen() {
  const { id, episodeId } = useLocalSearchParams<{ id: string; episodeId?: string }>();
  const router = useRouter();
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [startPosition, setStartPosition] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestAccess = async () => {
      try {
        // Fetch content details for OSD (Title, Subtitle)
        const contentRes = await fetchApi(`${API_ROUTES.CONTENT.BASE}/${id}`);
        let targetTitle = 'Contenido';
        let targetSubtitle = '';
        
        if (contentRes.success && contentRes.data) {
          targetTitle = contentRes.data.translations?.[0]?.title || 'Video';
          
          if (episodeId && contentRes.data.seasons) {
            // Find episode details
            for (const s of contentRes.data.seasons) {
              const ep = s.episodes?.find((e: any) => e.id === episodeId);
              if (ep) {
                targetSubtitle = `T${s.number} E${ep.number} - ${ep.translations?.[0]?.title || ''}`;
                break;
              }
            }
          }
        }

        setMetadata({ title: targetTitle, subtitle: targetSubtitle });

        // Request Stream URL
        const body = episodeId ? { contentId: id, episodeId } : { contentId: id };
        const accessRes = await fetchApi(API_ROUTES.STREAM.REQUEST_ACCESS, {
          method: 'POST',
          body: JSON.stringify(body),
        });

        if (accessRes.success && accessRes.data?.url) {
          setStreamUrl(accessRes.data.url);
          
          // Fetch existing watch progress
          try {
            const histRes = await fetchApi(`${API_ROUTES.HISTORY.BASE}/${id}${episodeId ? `?episodeId=${episodeId}` : ''}`);
            if (histRes.success && histRes.data?.progress) {
              setStartPosition(histRes.data.progress);
            }
          } catch (pe) {
            console.warn('[WatchScreen] Failed to fetch saved progress:', pe);
          }
        } else {
          Alert.alert('Error', 'No se pudo obtener el acceso al video', [
            { text: 'Volver', onPress: () => router.back() }
          ]);
        }
      } catch (e) {
        Alert.alert('Error', 'Problema de conexión', [
          { text: 'Volver', onPress: () => router.back() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    requestAccess();
  }, [id, episodeId, router]);

  if (loading || !streamUrl || !metadata) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <TVPlayer
        contentId={id}
        episodeId={episodeId}
        videoUrl={streamUrl}
        title={metadata.title}
        subtitle={metadata.subtitle}
        startPosition={startPosition}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  loader: {
    flex: 1,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
