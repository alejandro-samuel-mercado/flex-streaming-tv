import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../theme/colors';
import TVPlayer from '../../../components/tv/TVPlayer';
import { fetchApi } from '../../../lib/api-client';
import { API_ROUTES, API_BASE_URL } from '../../../lib/api-routes';

export default function WatchScreen() {
  const { id, episodeId } = useLocalSearchParams<{ id: string; episodeId?: string }>();
  const router = useRouter();
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamData, setStreamData] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [startPosition, setStartPosition] = useState(0);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<any>(null);
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);

  useEffect(() => {
    const requestAccess = async () => {
      try {
        // Fetch content details
        const contentRes = await fetchApi(`${API_ROUTES.CONTENT.BASE}/${id}`);
        let targetTitle = 'Contenido';
        let targetSubtitle = '';
        let epObj = null;
        
        if (contentRes.success && contentRes.data) {
          setContent(contentRes.data);
          targetTitle = contentRes.data.translations?.[0]?.title || 'Video';
          
          if (episodeId && contentRes.data.seasons) {
            // Find episode details
            for (const s of contentRes.data.seasons) {
              const ep = s.episodes?.find((e: any) => e.id === episodeId);
              if (ep) {
                epObj = { ...ep, seasonNumber: s.number };
                targetSubtitle = `T${s.number} E${ep.number} - ${ep.translations?.[0]?.title || ''}`;
                break;
              }
            }
          } else if (contentRes.data.type !== 'MOVIE' && contentRes.data.seasons?.[0]?.episodes?.[0]) {
             epObj = { ...contentRes.data.seasons[0].episodes[0], seasonNumber: contentRes.data.seasons[0].number };
             targetSubtitle = `T${epObj.seasonNumber} E${epObj.number} - ${epObj.translations?.[0]?.title || ''}`;
          }
        }

        setCurrentEpisode(epObj);
        setMetadata({ title: targetTitle, subtitle: targetSubtitle });

        // Request Stream URL
        const targetEpId = epObj?.id || episodeId;
        const body = targetEpId ? { contentId: id, episodeId: targetEpId } : { contentId: id };
        const accessRes = await fetchApi(API_ROUTES.STREAM.REQUEST_ACCESS, {
          method: 'POST',
          body: JSON.stringify(body),
        });

        if (accessRes.success && accessRes.data && accessRes.data.token && accessRes.data.videoFileId) {
          const { token, videoFileId, masterPlaylist, streamBaseUrl } = accessRes.data;
          setStreamData(accessRes.data);
          const filename = masterPlaylist ? masterPlaylist.split('/').pop() : 'master.m3u8';
          // Use the storage node URL if provided, otherwise fall back to the main API
          const streamHost = streamBaseUrl || API_BASE_URL.replace('/api', '');
          const url = `${streamHost}/api/stream/hls/${videoFileId}/${token}/${filename}`;
          setStreamUrl(url);
          
          // Fetch existing watch progress
          try {
            const histRes = await fetchApi(`${API_ROUTES.HISTORY.BASE}/${id}${targetEpId ? `?episodeId=${targetEpId}` : ''}`);
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

  if (loading || !streamUrl || !metadata || !content) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <TVPlayer
        content={content}
        currentEpisode={currentEpisode}
        streamData={streamData}
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
