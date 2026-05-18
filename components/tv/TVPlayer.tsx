import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, ActivityIndicator, Platform } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Play, Pause, SkipBack, SkipForward, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES, API_ORIGIN } from '../../lib/api-routes';

interface TVPlayerProps {
  contentId: string;
  episodeId?: string;
  videoUrl: string;
  title: string;
  subtitle?: string;
  startPosition?: number;
}

export default function TVPlayer({ contentId, episodeId, videoUrl, title, subtitle, startPosition = 0 }: TVPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const webVideoRef = useRef<HTMLVideoElement>(null);
  
  // Player state
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // OSD (On-Screen Display) State
  const [osdVisible, setOsdVisible] = useState(true);
  const osdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const osdOpacity = useSharedValue(1);

  // Progress tracking
  const lastSaveTime = useRef(0);

  const showOSD = useCallback(() => {
    setOsdVisible(true);
    osdOpacity.value = withTiming(1, { duration: 200 });
    
    if (osdTimer.current) clearTimeout(osdTimer.current);
    osdTimer.current = setTimeout(() => {
      osdOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(setOsdVisible)(false);
      });
    }, TV.playerOSDHideMs);
  }, []);

  useEffect(() => {
    showOSD();
    return () => { if (osdTimer.current) clearTimeout(osdTimer.current); };
  }, [showOSD]);

  // Handle Web Video HLS and Playback binding
  useEffect(() => {
    if (Platform.OS !== 'web' || !videoUrl || !webVideoRef.current) return;
    const video = webVideoRef.current;
    let hlsInstance: any = null;

    let absoluteVideoUrl = videoUrl;
    if (!videoUrl.startsWith('http')) {
      const normalized = videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`;
      absoluteVideoUrl = `${API_ORIGIN}${normalized}`;
    }

    const applySeekAndPlay = () => {
      if (startPosition > 0) {
        video.currentTime = startPosition;
      }
      video.play().catch((err) => {
        console.warn('[TVPlayer] Autoplay prevented or failed:', err);
      });
    };

    if (absoluteVideoUrl.includes('.m3u8')) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = absoluteVideoUrl;
        video.addEventListener('loadedmetadata', applySeekAndPlay);
      } else {
        const initHls = () => {
          const HlsClass = (window as any).Hls;
          if (HlsClass && HlsClass.isSupported()) {
            hlsInstance = new HlsClass();
            hlsInstance.loadSource(absoluteVideoUrl);
            hlsInstance.attachMedia(video);
            hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, () => {
              if (startPosition > 0) {
                video.currentTime = startPosition;
              }
              video.play().catch((err) => {
                console.warn('[TVPlayer] HLS autoplay prevented:', err);
              });
            });
          }
        };

        if (!(window as any).Hls) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
          script.onload = initHls;
          document.body.appendChild(script);
        } else {
          initHls();
        }
      }
    } else {
      video.src = absoluteVideoUrl;
      video.addEventListener('loadedmetadata', applySeekAndPlay);
      if (video.readyState >= 1) {
        applySeekAndPlay();
      }
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      video.removeEventListener('loadedmetadata', applySeekAndPlay);
    };
  }, [videoUrl, startPosition]);

  // Web Video Event Listener Bridging
  useEffect(() => {
    if (Platform.OS !== 'web' || !webVideoRef.current) return;
    const video = webVideoRef.current;

    const onTimeUpdate = () => {
      setStatus({
        isLoaded: true,
        isPlaying: !video.paused,
        positionMillis: video.currentTime * 1000,
        durationMillis: video.duration * 1000,
      } as any);

      if (loading && video.currentTime > 0) {
        setLoading(false);
      }

      const now = Date.now();
      if (now - lastSaveTime.current > TV.progressSaveIntervalMs) {
        lastSaveTime.current = now;
        saveProgress(video.currentTime * 1000, video.duration * 1000);
      }
    };

    const onCanPlay = () => {
      setLoading(false);
    };

    const onPlaying = () => {
      setLoading(false);
      setError(false);
    };

    const onWaiting = () => {
      setLoading(true);
    };

    const onError = () => {
      setError(true);
      setLoading(false);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('error', onError);
    };
  }, [loading, videoUrl]);

  const togglePlayPause = async () => {
    showOSD();
    if (Platform.OS === 'web') {
      const video = webVideoRef.current;
      if (video) {
        if (video.paused) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    } else {
      if (!videoRef.current || !status || !('isPlaying' in status)) return;
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const seek = async (direction: 'forward' | 'backward') => {
    showOSD();
    const amount = TV.seekStepSeconds;
    
    if (Platform.OS === 'web') {
      const video = webVideoRef.current;
      if (video) {
        let newPos = direction === 'forward' ? video.currentTime + amount : video.currentTime - amount;
        video.currentTime = Math.max(0, Math.min(newPos, video.duration || 0));
      }
    } else {
      if (!videoRef.current || !status || !('positionMillis' in status)) return;
      const current = status.positionMillis;
      const duration = status.durationMillis || 0;
      const amountMs = amount * 1000;
      let newPos = direction === 'forward' ? current + amountMs : current - amountMs;
      newPos = Math.max(0, Math.min(newPos, duration));
      await videoRef.current.setPositionAsync(newPos);
    }
  };

  // Back button handling
  useEffect(() => {
    const backAction = () => {
      if (osdVisible) {
        osdOpacity.value = withTiming(0, { duration: 150 }, () => runOnJS(setOsdVisible)(false));
        if (osdTimer.current) clearTimeout(osdTimer.current);
        return true;
      } else {
        router.back();
        return true;
      }
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [osdVisible, router]);

  // Universal Smart TV Browser Remote Control integration
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Light up OSD controls on any remote control key press
      showOSD();

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek('backward');
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek('forward');
          break;
        case 'Escape':
        case 'BrowserBack':
        case 'Back':
          e.preventDefault();
          router.back();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const onPlaybackStatusUpdate = (s: AVPlaybackStatus) => {
    setStatus(s);
    if (!s.isLoaded) {
      if (s.error) setError(true);
      return;
    }

    if (loading && s.positionMillis > 0) setLoading(false);

    const now = Date.now();
    if (now - lastSaveTime.current > TV.progressSaveIntervalMs) {
      lastSaveTime.current = now;
      saveProgress(s.positionMillis, s.durationMillis || 0);
    }
  };

  const saveProgress = async (pos: number, dur: number) => {
    if (pos === 0 || dur === 0) return;
    try {
      await fetchApi(API_ROUTES.HISTORY.PROGRESS, {
        method: 'POST',
        body: JSON.stringify({
          contentId,
          episodeId,
          progressSeconds: Math.floor(pos / 1000),
          durationSeconds: Math.floor(dur / 1000),
        }),
      });
    } catch {}
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const osdAnimStyle = useAnimatedStyle(() => ({ opacity: osdOpacity.value }));

  const isLoaded = status && 'isLoaded' in status && status.isLoaded;
  const isPlaying = isLoaded && status.isPlaying;
  const position = isLoaded ? status.positionMillis : 0;
  const duration = isLoaded ? status.durationMillis || 1 : 1;
  const progressPct = (position / duration) * 100;

  return (
    <View style={s.container}>
      {Platform.OS === 'web' ? (
        <video
          ref={webVideoRef}
          style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'black' }}
          autoPlay
          playsInline
          controls={false}
        />
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          positionMillis={startPosition * 1000}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
      )}

      {loading && !error && (
        <View style={s.centerOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {error && (
        <View style={s.centerOverlay}>
          <AlertCircle size={48} color={Colors.error} style={{ marginBottom: 16 }} />
          <Text style={s.errorText}>No se pudo cargar el video</Text>
        </View>
      )}

      {/* Invisible overlay to catch D-Pad focus and clicks */}
      <Pressable
        style={StyleSheet.absoluteFill}
        focusable
        hasTVPreferredFocus
        onPress={togglePlayPause}
        // Emulate D-Pad left/right using blur/focus hacks if needed, 
        // but react-native TV handles D-Pad arrows natively. 
        // In a real app, we'd use useTVEventHandler to catch raw remote codes.
      />

      {/* OSD (On-Screen Display) */}
      <Animated.View style={[StyleSheet.absoluteFill, osdAnimStyle]} pointerEvents={osdVisible ? 'box-none' : 'none'}>
        {/* Top Gradient - Title */}
        <LinearGradient colors={['rgba(0,0,0,0.8)', 'transparent']} style={s.topBar}>
          <Text style={s.title}>{title}</Text>
          {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
        </LinearGradient>

        {/* Center icon indicator */}
        <View style={s.centerOverlay}>
          {!isPlaying && isLoaded && !loading && (
            <View style={s.pauseIndicator}>
              <Pause size={48} color={Colors.white} fill={Colors.white} />
            </View>
          )}
        </View>

        {/* Bottom Gradient - Controls & Progress */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={s.bottomBar}>
          
          <View style={s.controlsRow}>
            <View style={s.timeInfo}>
              <Text style={s.timeText}>{formatTime(position)}</Text>
            </View>

            {/* Simulated focusable control buttons */}
            <View style={s.mainControls}>
              <View style={s.controlBtn}><SkipBack size={24} color={Colors.white} fill={Colors.white} /></View>
              <View style={[s.controlBtn, s.playBtn]}>
                {isPlaying ? (
                  <Pause size={28} color={Colors.black} fill={Colors.black} />
                ) : (
                  <Play size={28} color={Colors.black} fill={Colors.black} style={{ marginLeft: 4 }} />
                )}
              </View>
              <View style={s.controlBtn}><SkipForward size={24} color={Colors.white} fill={Colors.white} /></View>
            </View>

            <View style={s.timeInfo}>
              <Text style={s.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={s.progressBarTrack}>
            <View style={[s.progressBarFill, { width: `${progressPct}%` }]} />
            <View style={[s.progressThumb, { left: `${progressPct}%` }]} />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 40,
    paddingHorizontal: 60,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 20,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  pauseIndicator: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingBottom: 40,
    paddingHorizontal: 60,
    paddingTop: 80,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeInfo: {
    width: 100,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    fontVariant: ['tabular-nums'],
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.white,
    marginLeft: -8,
    shadowColor: Colors.primary,
    shadowOpacity: 1,
    shadowRadius: 10,
  },
});
