import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, ActivityIndicator, Platform, FlatList, ScrollView, UIManager } from 'react-native';

const { TVEventHandler } = require('react-native');
import Video, { VideoRef, SelectedTrackType, TextTrackType } from 'react-native-video';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Play, Pause, RotateCcw, RotateCw, SkipForward, SkipBack, AlertCircle, List, MessageSquare, Languages, X, Check, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES, API_ORIGIN } from '../../lib/api-routes';
import { scale } from '../../lib/scale';

// Human-readable language labels (ISO 639-1/2 → Spanish)
const LANG_LABELS: Record<string, string> = {
    es: 'Español', spa: 'Español', esp: 'Español',
    en: 'Inglés', eng: 'Inglés',
    pt: 'Portugués', por: 'Portugués',
    fr: 'Francés', fre: 'Francés', fra: 'Francés',
    de: 'Alemán', ger: 'Alemán', deu: 'Alemán',
    it: 'Italiano', ita: 'Italiano',
    ja: 'Japonés', jpn: 'Japonés',
    ko: 'Coreano', kor: 'Coreano',
    zh: 'Chino', chi: 'Chino', zho: 'Chino',
    ru: 'Ruso', rus: 'Ruso',
    ar: 'Árabe', ara: 'Árabe',
    hi: 'Hindi', hin: 'Hindi',
    th: 'Tailandés', tha: 'Tailandés',
    tr: 'Turco', tur: 'Turco',
    pl: 'Polaco', pol: 'Polaco',
    nl: 'Holandés', dut: 'Holandés', nld: 'Holandés',
    sv: 'Sueco', swe: 'Sueco',
    da: 'Danés', dan: 'Danés',
    no: 'Noruego', nor: 'Noruego',
    fi: 'Finlandés', fin: 'Finlandés',
    el: 'Griego', gre: 'Griego', ell: 'Griego',
    he: 'Hebreo', heb: 'Hebreo',
    id: 'Indonesio', ind: 'Indonesio',
    ms: 'Malayo', may: 'Malayo', msa: 'Malayo',
    vi: 'Vietnamita', vie: 'Vietnamita',
    uk: 'Ucraniano', ukr: 'Ucraniano',
    ro: 'Rumano', rum: 'Rumano', ron: 'Rumano',
    cs: 'Checo', cze: 'Checo', ces: 'Checo',
    und: 'Desconocido',
};

function getLangLabel(lang?: string, title?: string, name?: string, fallback?: string): string {
    // If the title is something meaningful (not generic "Track N"), use it
    if (title && !/^(track|pista|subtitle|audio)\s*\d*$/i.test(title.trim())) {
        return title;
    }
    if (name && !/^(track|pista|subtitle|audio)\s*\d*$/i.test(name.trim())) {
        return name;
    }
    // Try to resolve from language code
    if (lang) {
        const code = lang.toLowerCase().trim();
        if (LANG_LABELS[code]) return LANG_LABELS[code];
        // Try first 2 chars
        if (code.length > 2 && LANG_LABELS[code.substring(0, 2)]) return LANG_LABELS[code.substring(0, 2)];
    }
    return fallback || lang || 'Desconocido';
}

const TVFocusGuide = (require('react-native') as any).TVFocusGuideView ?? View;
const TVEvtHandler: any = (require('react-native') as any).TVEventHandler ?? null;
const TVPressable = Pressable as any;

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

interface TVPlayerProps {
    content: any;
    currentEpisode?: any;
    streamData?: any;
    videoUrl: string;
    title: string;
    subtitle?: string;
    startPosition?: number;
}

function TVPlaybackButton({ onPress, onFocus, children, style, hasTVPreferredFocus }: any) {
    const [focused, setFocused] = useState(false);
    return (
        <TVPressable
            focusable
            hasTVPreferredFocus={hasTVPreferredFocus}
            onFocus={() => { setFocused(true); onFocus?.(); }}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.controlBtn,
                style,
                focused && s.controlBtnFocused,
            ]}
        >
            {typeof children === 'function' ? children(focused) : children}
        </TVPressable>
    );
}

function TVMenuButton({ onPress, onFocus, icon: Icon, label, hasTVPreferredFocus }: any) {
    const [focused, setFocused] = useState(false);
    return (
        <TVPressable
            focusable
            hasTVPreferredFocus={hasTVPreferredFocus}
            onFocus={() => { setFocused(true); onFocus?.(); }}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[s.menuBtn, focused && s.menuBtnFocused]}
        >
            <Icon size={scale(20)} color={focused ? Colors.black : Colors.white} />
            {label && <Text style={[s.menuBtnText, focused && s.menuBtnTextFocused]}>{label}</Text>}
        </TVPressable>
    );
}

const TVSidebarItem = React.forwardRef<any, any>(function TVSidebarItem({ onPress, style, children, hasTVPreferredFocus }, ref) {
    const [focused, setFocused] = useState(false);
    const localRef = useRef<any>(null);
    const [selfId, setSelfId] = useState<number | null>(null);

    React.useImperativeHandle(ref, () => localRef.current);

    useEffect(() => {
        if (localRef.current) {
            setSelfId(safeFindNodeHandle(localRef.current));
        }
    }, []);

    return (
        <TVPressable
            ref={localRef}
            focusable
            hasTVPreferredFocus={hasTVPreferredFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            nextFocusLeft={selfId ?? undefined}
            style={[style, focused && s.itemFocusedWrapper]}
        >
            {typeof children === 'function' ? children(focused) : children}
        </TVPressable>
    );
});

// ─── Focusable Progress Bar ────────────────────────────────────────────────────
const SEEK_STEP_MS = 60_000; // 1 minute per D-Pad press

function ProgressBar({
    positionMs, durationMs, onSeek, onFocusGained, onFocusLost, formatTime,
}: {
    positionMs: number; durationMs: number;
    onSeek: (newMs: number) => void;
    onFocusGained: () => void;
    onFocusLost: () => void;
    formatTime: (ms: number) => string;
}) {
    const [focused, setFocused] = useState(false);

    const mainRef = useRef<any>(null);
    const r1Ref = useRef<any>(null);
    const r2Ref = useRef<any>(null);
    const l1Ref = useRef<any>(null);
    const l2Ref = useRef<any>(null);

    const [nodes, setNodes] = useState<any>({});
    const positionMsRef = useRef(positionMs);
    const durationMsRef = useRef(durationMs);
    const onSeekRef = useRef(onSeek);
    const focusTimerRef = useRef<any>(null);
    const stopTimerRef = useRef<any>(null);
    const groupFocusedRef = useRef(false);

    useEffect(() => {
        positionMsRef.current = positionMs;
        durationMsRef.current = durationMs;
        onSeekRef.current = onSeek;
    }, [positionMs, durationMs, onSeek]);

    const handleLayout = () => {
        setNodes({
            main: safeFindNodeHandle(mainRef.current),
            r1: safeFindNodeHandle(r1Ref.current),
            r2: safeFindNodeHandle(r2Ref.current),
            l1: safeFindNodeHandle(l1Ref.current),
            l2: safeFindNodeHandle(l2Ref.current),
        });
    };

    const handleFocus = () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        groupFocusedRef.current = true;
        setFocused(true);
        onFocusGained();
    };

    const handleBlur = () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        // Debounce blur so visual focus doesn't flicker when bouncing between dummies
        focusTimerRef.current = setTimeout(() => {
            groupFocusedRef.current = false;
            setFocused(false);
            onFocusLost();
        }, 150);
    };

    const doSeek = (direction: 'left' | 'right') => {
        // Prevent accidental seeking if the user navigates DOWN from the Play button 
        // and lands on a dummy. Only seek if we were ALREADY inside the progress bar group!
        if (!groupFocusedRef.current) {
            handleFocus();
            return;
        }

        if (direction === 'left') {
            onSeekRef.current(Math.max(0, positionMsRef.current - SEEK_STEP_MS));
        } else {
            onSeekRef.current(Math.min(durationMsRef.current, positionMsRef.current + SEEK_STEP_MS));
        }

        // When seeking, ensure we don't hide the OSD
        handleFocus();
    };

    const pct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }} onLayout={handleLayout}>
            {/* LEFT PING-PONG */}
            <TVPressable
                ref={l2Ref}
                focusable
                onFocus={() => doSeek('left')}
                onBlur={handleBlur}
                nextFocusLeft={nodes.l1}
                nextFocusRight={nodes.main}
                style={{ width: 1, height: 1, backgroundColor: 'transparent', position: 'absolute', left: -20 }}
            />
            <TVPressable
                ref={l1Ref}
                focusable
                onFocus={() => doSeek('left')}
                onBlur={handleBlur}
                nextFocusLeft={nodes.l2}
                nextFocusRight={nodes.main}
                style={{ width: 1, height: 1, backgroundColor: 'transparent', position: 'absolute', left: -10 }}
            />

            {/* MAIN PROGRESS BAR */}
            <TVPressable
                ref={mainRef}
                focusable
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={[s.progressContainer, focused && s.progressContainerFocused]}
            >
                <Text style={s.timeText}>{formatTime(positionMs)}</Text>
                <View style={s.progressBarTrack}>
                    <View style={[s.progressBarFill, { width: `${pct}%` as any }]} />
                    <View style={[s.progressThumb, { left: `${pct}%` as any }, focused && s.progressThumbFocused]} />
                </View>
                <Text style={s.timeText}>{formatTime(durationMs)}</Text>
            </TVPressable>

            {/* RIGHT PING-PONG */}
            <TVPressable
                ref={r1Ref}
                focusable
                onFocus={() => doSeek('right')}
                onBlur={handleBlur}
                nextFocusRight={nodes.r2}
                nextFocusLeft={nodes.main}
                style={{ width: 1, height: 1, backgroundColor: 'transparent', position: 'absolute', right: -10 }}
            />
            <TVPressable
                ref={r2Ref}
                focusable
                onFocus={() => doSeek('right')}
                onBlur={handleBlur}
                nextFocusRight={nodes.r1}
                nextFocusLeft={nodes.main}
                style={{ width: 1, height: 1, backgroundColor: 'transparent', position: 'absolute', right: -20 }}
            />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper to get the native node handle safely
// ─────────────────────────────────────────────────────────────────────────────

export default function TVPlayer({ content, currentEpisode, streamData, videoUrl, title, subtitle, startPosition = 0 }: TVPlayerProps) {
    const router = useRouter();
    const videoRef = useRef<VideoRef>(null);
    const webVideoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<any>(null);
    // Ref to the transparent overlay Pressable — needed to retain focus when OSD is hidden
    const overlayRef = useRef<any>(null);

    const contentId = content?.id;
    const episodeId = currentEpisode?.id;

    // Player state
    const [isPlaying, setIsPlaying] = useState(true);
    const isPlayingRef = useRef(true);
    const [positionMillis, setPositionMillis] = useState(startPosition * 1000);
    const positionMillisRef = useRef(startPosition * 1000);
    const [durationMillis, setDurationMillis] = useState(1);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    // OSD (On-Screen Display) State
    const [osdVisible, setOsdVisible] = useState(true);
    const osdVisibleRef = useRef(true);
    const osdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const osdOpacity = useSharedValue(1);

    // Menus
    const [activeMenu, setActiveMenu] = useState<'episodes' | 'subs' | 'audio' | null>(null);
    const [selectedSub, setSelectedSub] = useState<string | number>('off');
    const [selectedAudio, setSelectedAudio] = useState<string | number>('auto');
    const [detectedAudioTracks, setDetectedAudioTracks] = useState<any[]>([]);
    const [detectedTextTracks, setDetectedTextTracks] = useState<any[]>([]);
    const firstSidebarItemRef = useRef<any>(null);

    const [activeVideoUrl, setActiveVideoUrl] = useState(videoUrl);
    useEffect(() => {
        setActiveVideoUrl(videoUrl);
    }, [videoUrl]);

    // Progress tracking
    const lastSaveTime = useRef(0);

    const allEpisodes = useMemo(() => {
        if (!content?.seasons) return [];
        return content.seasons.flatMap((s: any) => (s.episodes || []).map((e: any) => ({ ...e, seasonNumber: s.number })));
    }, [content]);

    const currentIdx = useMemo(() => {
        if (!currentEpisode) return -1;
        return allEpisodes.findIndex((e: any) => e.id === currentEpisode.id);
    }, [allEpisodes, currentEpisode]);

    const subsList = useMemo(() => {
        const dbSubs = streamData?.subtitleTracks || currentEpisode?.videoFiles?.[0]?.subtitleTracks || content?.videoFiles?.[0]?.subtitleTracks || [];
        const mappedDetected = detectedTextTracks.map((t: any, idx: number) => ({
            label: getLangLabel(t.language, t.title, t.name, `Subtítulo ${idx + 1}`),
            language: t.language,
            title: t.title || t.name,
            type: t.type,
            index: t.index !== undefined ? t.index : idx
        }));

        const combined = dbSubs.map((s: any) => ({
            ...s,
            label: getLangLabel(s.language, s.label, s.name, s.label),
        }));
        mappedDetected.forEach(dt => {
            if (dt.language && !combined.some((c: any) => c.language === dt.language)) {
                combined.push(dt);
            } else if (!dt.language) {
                combined.push(dt);
            }
        });
        return combined;
    }, [streamData, currentEpisode, content, detectedTextTracks]);

    const externalTextTracks = useMemo(() => {
        const dbSubs = streamData?.subtitleTracks || currentEpisode?.videoFiles?.[0]?.subtitleTracks || content?.videoFiles?.[0]?.subtitleTracks || [];
        return dbSubs.filter((s: any) => s.url).map((s: any) => ({
            title: s.label || s.name || s.language || 'Subtítulo',
            language: s.language || 'es',
            type: TextTrackType.VTT,
            uri: s.url
        }));
    }, [streamData, currentEpisode, content]);

    const hasNext = currentIdx >= 0 && currentIdx < allEpisodes.length - 1;
    const hasPrev = currentIdx > 0;

    const hideOSD = useCallback(() => {
        osdVisibleRef.current = false;
        setOsdVisible(false);
        // Explicitly shift focus back to the overlay Pressable so key events continue to propagate
        setTimeout(() => {
            overlayRef.current?.focus?.();
        }, 80);
    }, []);

    const showOSD = useCallback(() => {
        osdVisibleRef.current = true;
        setOsdVisible(true);
        setIsPlaying(isPlayingRef.current);
        setPositionMillis(positionMillisRef.current);
        osdOpacity.value = withTiming(1, { duration: 200 });

        if (osdTimer.current) clearTimeout(osdTimer.current);
        if (!activeMenuRef.current) {
            osdTimer.current = setTimeout(() => {
                osdOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
                    if (finished) runOnJS(hideOSD)();
                });
            }, TV.playerOSDHideMs);
        }
    }, [hideOSD]);

    useEffect(() => {
        showOSD();
        return () => { if (osdTimer.current) clearTimeout(osdTimer.current); };
    }, []); // Run only on mount

    // Handle Web Video HLS and Playback binding
    useEffect(() => {
        if (Platform.OS !== 'web' || !activeVideoUrl || !webVideoRef.current) return;
        const video = webVideoRef.current;
        let hlsInstance: any = null;

        let absoluteVideoUrl = activeVideoUrl;
        if (!activeVideoUrl.startsWith('http')) {
            const normalized = activeVideoUrl.startsWith('/') ? activeVideoUrl : `/${activeVideoUrl}`;
            absoluteVideoUrl = `${API_ORIGIN}${normalized}`;
        }

        const applySeekAndPlay = () => {
            const currentSecs = positionMillisRef.current > 5000 ? positionMillisRef.current / 1000 : startPosition;
            if (currentSecs > 0) {
                video.currentTime = currentSecs;
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
                        hlsRef.current = hlsInstance;
                        hlsInstance.loadSource(absoluteVideoUrl);
                        hlsInstance.attachMedia(video);
                        hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, () => {
                            const currentSecs = positionMillisRef.current > 5000 ? positionMillisRef.current / 1000 : startPosition;
                            if (currentSecs > 0) {
                                video.currentTime = currentSecs;
                            }
                            
                            // El audio correcto ya viene marcado como DEFAULT=YES desde el servidor
                            // gracias al parámetro ?audioIndex=N, por lo que hls.js lo seleccionará automáticamente.

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
            if (hlsInstance) hlsInstance.destroy();
            video.removeEventListener('loadedmetadata', applySeekAndPlay);
        };
    }, [activeVideoUrl, startPosition]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !webVideoRef.current) return;
        const video = webVideoRef.current;
        const onTimeUpdate = () => {
            const pos = video.currentTime * 1000;
            const dur = video.duration * 1000;

            positionMillisRef.current = pos;
            if (dur > 1000) setDurationMillis(dur);

            if (loading && pos > 0) setLoading(false);

            const now = Date.now();
            if (now - lastSaveTime.current > TV.progressSaveIntervalMs) {
                lastSaveTime.current = now;
                saveProgress(pos, dur);
            }

            if (osdVisibleRef.current) {
                setPositionMillis(pos);
            }
        };
        const onCanPlay = () => setLoading(false);
        const onPlaying = () => { setLoading(false); setError(false); setIsPlaying(true); isPlayingRef.current = true; };
        const onPause = () => { setIsPlaying(false); isPlayingRef.current = false; };
        const onWaiting = () => setLoading(true);
        const onError = () => { setError(true); setLoading(false); };

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
    }, [loading, activeVideoUrl]);

    // Sync HTML5 Video TextTracks (Web) when selectedSub changes
    useEffect(() => {
        if (Platform.OS !== 'web' || !webVideoRef.current) return;
        const video = webVideoRef.current;

        const updateTracks = () => {
            const tracks = video.textTracks;
            if (!tracks) return;

            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                let isMatch = false;

                if (selectedSub === 'off') {
                    isMatch = false;
                } else if (typeof selectedSub === 'number') {
                    isMatch = (selectedSub === i);
                } else if (typeof selectedSub === 'string') {
                    if (selectedSub.startsWith('LANG:')) {
                        isMatch = (track.language === selectedSub.replace('LANG:', ''));
                    } else if (selectedSub.startsWith('TITLE:')) {
                        isMatch = (track.label === selectedSub.replace('TITLE:', ''));
                    }
                }

                track.mode = isMatch ? 'showing' : 'disabled';
            }
        };

        // Run immediately
        updateTracks();

        // Also run when new tracks are added to the video element
        video.textTracks.addEventListener('addtrack', updateTracks);
        return () => {
            video.textTracks.removeEventListener('addtrack', updateTracks);
        };
    }, [selectedSub, externalTextTracks]);


    const togglePlayPause = async () => {
        showOSD();
        if (Platform.OS === 'web') {
            const video = webVideoRef.current;
            if (video) {
                if (video.paused) video.play().catch(() => { });
                else video.pause();
            }
        } else {
            const newPlaying = !isPlayingRef.current;
            isPlayingRef.current = newPlaying;
            setIsPlaying(newPlaying);
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
            if (!videoRef.current) return;
            const current = positionMillisRef.current;
            const duration = durationMillis;
            const amountMs = amount * 1000;
            let newPos = direction === 'forward' ? current + amountMs : current - amountMs;
            newPos = Math.max(0, Math.min(newPos, duration));

            videoRef.current.seek(newPos / 1000);
            positionMillisRef.current = newPos;
            setPositionMillis(newPos);
        }
    };

    const goNext = () => { if (!hasNext) return; router.replace(`/(tv)/watch/${contentId}?episodeId=${allEpisodes[currentIdx + 1].id}` as any); };
    const goPrev = () => { if (!hasPrev) return; router.replace(`/(tv)/watch/${contentId}?episodeId=${allEpisodes[currentIdx - 1].id}` as any); };

    // Unified seek to absolute position (works on web and native)
    const seekToPosition = useCallback((newPosMs: number) => {
        const clamped = Math.max(0, Math.min(newPosMs, durationMillis));
        if (Platform.OS === 'web') {
            const video = webVideoRef.current;
            if (video) video.currentTime = clamped / 1000;
        } else {
            videoRef.current?.seek(clamped / 1000);
        }
        positionMillisRef.current = clamped;
        setPositionMillis(clamped);
    }, [durationMillis]);

    const restart = useCallback(() => {
        showOSD();
        seekToPosition(0);
        // If paused, start playing
        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsPlaying(true);
            if (Platform.OS === 'web') webVideoRef.current?.play().catch(() => { });
        }
    }, [seekToPosition, showOSD]);

    const changeAudio = useCallback((value: string | number) => {
        console.log('[TVPlayer:changeAudio] value=', value, 'type=', typeof value, 'videoUrl=', videoUrl);
        setSelectedAudio(value);
        setActiveMenu(null);
        showOSD();
        
        if (typeof value === 'number') {
            setLoading(true);
            const currentPos = positionMillisRef.current;
            
            // Force ExoPlayer/HLS.js to reload with the new default audio track
            let newUrl = videoUrl;
            if (newUrl.includes('?')) {
                // If there's an existing audioIndex param, replace it; otherwise append it
                if (newUrl.includes('audioIndex=')) {
                    newUrl = newUrl.replace(/([?&])audioIndex=\d+/, `$1audioIndex=${value}`);
                } else {
                    newUrl = `${newUrl}&audioIndex=${value}`;
                }
            } else {
                newUrl = `${newUrl}?audioIndex=${value}`;
            }
            
            // Add a cache buster parameter to bypass browser/HLS.js memory caches
            const timestamp = Date.now();
            if (newUrl.includes('cb=')) {
                newUrl = newUrl.replace(/([?&])cb=\d+/, `$1cb=${timestamp}`);
            } else {
                newUrl = `${newUrl}&cb=${timestamp}`;
            }
            
            console.log('[TVPlayer:changeAudio] newUrl=', newUrl);
            setActiveVideoUrl(newUrl);
        } else {
            console.log('[TVPlayer:changeAudio] value is not a number, skipping URL change');
        }
    }, [videoUrl, showOSD]);

    // Back button handling
    useEffect(() => {
        const backAction = () => {
            if (activeMenu) {
                setActiveMenu(null);
                showOSD();
                return true;
            }
            router.back();
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [activeMenu, router, showOSD, hideOSD, osdOpacity]);

    // Refs to sync player handler state without re-creating the event listener constantly
    const activeMenuRef = useRef(activeMenu);
    const showOSDRef = useRef(showOSD);
    const durationMillisRef = useRef(durationMillis);

    useEffect(() => {
        activeMenuRef.current = activeMenu;
        showOSDRef.current = showOSD;
        durationMillisRef.current = durationMillis;
    }, [activeMenu, showOSD, durationMillis]);

    // D-Pad: show OSD on directional keys, seek on left/right when OSD is hidden.
    // Instead of TVEventHandler (which is broken in some RN builds), we use dummy focusable elements
    // around the main overlay. This is a bulletproof method for capturing D-Pad events.



    // When a sidebar menu opens, move focus to its first item
    useEffect(() => {
        if (activeMenu && firstSidebarItemRef.current) {
            // Delay must be long enough for the sidebar to fully mount and ref to be assigned
            const timer = setTimeout(() => {
                firstSidebarItemRef.current?.focus?.();
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [activeMenu]);

    const onProgress = (data: { currentTime: number; seekableDuration: number }) => {
        const pos = data.currentTime * 1000;
        const dur = data.seekableDuration * 1000;

        if (loading && pos > 0) setLoading(false);

        positionMillisRef.current = pos;
        if (dur > 1000) setDurationMillis(dur);

        const now = Date.now();
        if (now - lastSaveTime.current > TV.progressSaveIntervalMs) {
            lastSaveTime.current = now;
            saveProgress(pos, dur);
        }

        if (osdVisibleRef.current) {
            setPositionMillis(pos);
        }
    };

    const onLoad = (data: any) => {
        setIsLoaded(true);
        setLoading(false);
        setDurationMillis(data.duration * 1000);
        
        // If we have a saved position in the ref (e.g. from an audio track change) or startPosition
        const targetPos = positionMillisRef.current > 5000 ? positionMillisRef.current / 1000 : startPosition;
        if (targetPos > 0) {
            videoRef.current?.seek(targetPos);
        }
        
        if (Array.isArray(data.audioTracks)) {
            setDetectedAudioTracks(data.audioTracks);
        }
        if (Array.isArray(data.textTracks)) {
            setDetectedTextTracks(data.textTracks);
        }
    };

    const onAudioTracks = (data: any) => {
        if (Array.isArray(data.audioTracks)) {
            setDetectedAudioTracks(data.audioTracks);
        }
    };

    const onTextTracks = (data: any) => {
        if (Array.isArray(data.textTracks)) {
            setDetectedTextTracks(data.textTracks);
        }
    };

    const onEnd = () => {
        if (hasNext) goNext();
        else router.back();
    };

    const onBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
        setLoading(isBuffering);
    };

    const saveProgress = async (pos: number, dur: number) => {
        if (!pos || isNaN(pos) || pos === 0 || !contentId) return;
        
        const finalProgress = Math.floor(pos / 1000);
        const finalDuration = (dur && !isNaN(dur) && dur > 0) ? Math.floor(dur / 1000) : undefined;

        try {
            await fetchApi(API_ROUTES.HISTORY.PROGRESS, {
                method: 'POST',
                body: JSON.stringify({
                    contentId,
                    episodeId,
                    progress: finalProgress,
                    duration: finalDuration,
                }),
            });
        } catch { }
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

    const position = positionMillis;
    const duration = durationMillis || 1;
    const progressPct = (position / duration) * 100;



    const audioList = useMemo(() => {
        const dbAudio = streamData?.audioTracks || currentEpisode?.videoFiles?.[0]?.audioTracks || content?.videoFiles?.[0]?.audioTracks || [];
        const mappedDetected = detectedAudioTracks.map((t: any, idx: number) => ({
            label: getLangLabel(t.language, t.title, t.name, `Audio ${idx + 1}`),
            language: t.language,
            index: t.index !== undefined ? t.index : idx,
            isDefault: t.selected
        }));

        const combined = dbAudio.map((a: any) => ({
            ...a,
            label: getLangLabel(a.language, a.label, a.name, a.label),
        }));
        mappedDetected.forEach(da => {
            if (da.language && !combined.some((c: any) => c.language === da.language)) {
                combined.push(da);
            } else if (!da.language) {
                combined.push(da);
            }
        });
        return combined;
    }, [streamData, currentEpisode, content, detectedAudioTracks]);

    return (
        <View style={s.container}>
            {Platform.OS === 'web' ? (
                <video
                    ref={webVideoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'black' }}
                    autoPlay
                    playsInline
                    controls={false}
                    crossOrigin="anonymous"
                >
                    {externalTextTracks.map((track, i) => (
                        <track
                            key={i}
                            src={track.uri}
                            kind="subtitles"
                            srcLang={track.language}
                            label={track.title}
                        />
                    ))}
                </video>
            ) : (
                <Video
                    key={activeVideoUrl}
                    ref={videoRef}
                    source={{ uri: activeVideoUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="contain"
                    paused={!isPlaying}
                    onProgress={onProgress}
                    onLoad={onLoad}
                    onAudioTracks={onAudioTracks}
                    onTextTracks={onTextTracks}
                    onEnd={onEnd}
                    onBuffer={onBuffer}
                    onError={() => { setError(true); setLoading(false); }}
                    progressUpdateInterval={2000}
                    selectedAudioTrack={
                        selectedAudio === 'auto'
                            ? { type: SelectedTrackType.SYSTEM }
                            : typeof selectedAudio === 'number'
                                ? { type: SelectedTrackType.INDEX, value: selectedAudio }
                                : typeof selectedAudio === 'string' && selectedAudio !== 'auto'
                                    ? { type: SelectedTrackType.LANGUAGE, value: selectedAudio }
                                    : { type: SelectedTrackType.SYSTEM }
                    }
                    selectedTextTrack={
                        selectedSub === 'off'
                            ? { type: SelectedTrackType.DISABLED }
                            : typeof selectedSub === 'number'
                                ? { type: SelectedTrackType.INDEX, value: selectedSub }
                                : typeof selectedSub === 'string' && selectedSub.startsWith('LANG:')
                                    ? { type: SelectedTrackType.LANGUAGE, value: selectedSub.replace('LANG:', '') }
                                    : typeof selectedSub === 'string' && selectedSub.startsWith('TITLE:')
                                        ? { type: SelectedTrackType.TITLE, value: selectedSub.replace('TITLE:', '') }
                                        : { type: SelectedTrackType.DISABLED }
                    }
                    {...(externalTextTracks.length > 0 ? { textTracks: externalTextTracks } : {})}
                    useTextureView={false}
                    controls={false}
                    playInBackground={false}
                    bufferConfig={{
                        // Increased buffer sizes to prevent mid-playback stops on slow servers.
                        // ExoPlayer will pre-download up to 2 minutes ahead, providing a large
                        // cushion against bandwidth drops and high server processing latency.
                        minBufferMs: 30000,              // Start buffering ahead: 30s (was 15s)
                        maxBufferMs: 120000,             // Max pre-buffer: 2 minutes (was 50s)
                        bufferForPlaybackMs: 2500,       // Resume playback after: 2.5s of data
                        bufferForPlaybackAfterRebufferMs: 8000, // After rebuffer stall: need 8s (was 5s)
                    }}
                />
            )}

            {loading && !error && (
                <View style={s.centerOverlay}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                </View>
            )}

            {error && (
                <View style={s.centerOverlay}>
                    <AlertCircle size={scale(48)} color={Colors.error} style={{ marginBottom: scale(16) }} />
                    <Text style={s.errorText}>No se pudo cargar el video</Text>
                </View>
            )}

            {/* Invisible Dummy components to catch D-Pad presses when overlay is focused */}
            {!osdVisible && !activeMenu && (
                <>
                    <Pressable
                        focusable
                        onFocus={() => {
                            showOSD();
                            overlayRef.current?.focus?.();
                        }}
                        style={{ position: 'absolute', top: -1, width: 1, height: 1 }}
                    />
                    <Pressable
                        focusable
                        onFocus={() => {
                            showOSD();
                            overlayRef.current?.focus?.();
                        }}
                        style={{ position: 'absolute', bottom: -1, width: 1, height: 1 }}
                    />
                    <Pressable
                        focusable
                        onFocus={() => {
                            showOSD();
                            seek('backward');
                            setTimeout(() => overlayRef.current?.focus?.(), 50);
                        }}
                        style={{ position: 'absolute', left: -1, width: 1, height: 1 }}
                    />
                    <Pressable
                        focusable
                        onFocus={() => {
                            showOSD();
                            seek('forward');
                            setTimeout(() => overlayRef.current?.focus?.(), 50);
                        }}
                        style={{ position: 'absolute', right: -1, width: 1, height: 1 }}
                    />
                </>
            )}

            {/* Transparent focused overlay to intercept all remote presses when OSD is hidden */}
            <TVPressable
                ref={overlayRef}
                style={StyleSheet.absoluteFill}
                focusable={!osdVisible && !activeMenu}
                hasTVPreferredFocus={!osdVisible && !activeMenu}
                onPress={() => {
                    // Center/Select button only opens the OSD menu — does NOT toggle play/pause
                    if (!activeMenu) showOSD();
                }}
            />

            {/* OSD (On-Screen Display) */}
            {osdVisible && (
                <Animated.View style={[StyleSheet.absoluteFill, osdAnimStyle]} pointerEvents={!activeMenu ? 'box-none' : 'none'}>
                    <LinearGradient colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0)']} style={s.topBar}>
                        <Text style={s.title}>{title}</Text>
                        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
                    </LinearGradient>

                    <View style={s.centerOverlay}>
                        {!isPlaying && isLoaded && !loading && (
                            <View style={s.pauseIndicator}>
                                <Pause size={scale(48)} color={Colors.white} fill={Colors.white} />
                            </View>
                        )}
                    </View>

                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.95)']} style={s.bottomBar}>
                        <View style={s.controlsRow}>
                            {/* Left Menus */}
                            <View style={s.sideControls}>
                                {content?.seasons?.length > 0 && (
                                    <TVMenuButton
                                        icon={List} label="Episodios"
                                        onPress={() => { setActiveMenu('episodes'); hideOSD(); }}
                                        onFocus={showOSD}
                                    />
                                )}
                                {subsList.length > 0 && (
                                    <TVMenuButton icon={MessageSquare} onPress={() => { setActiveMenu('subs'); hideOSD(); }} onFocus={showOSD} />
                                )}
                                {audioList.length > 0 && (
                                    <TVMenuButton icon={Languages} onPress={() => { setActiveMenu('audio'); hideOSD(); }} onFocus={showOSD} />
                                )}
                            </View>

                            {/* Center Playback */}
                            <View style={s.mainControls}>
                                {hasPrev && (
                                    <TVPlaybackButton onPress={goPrev} onFocus={showOSD} style={{ marginRight: scale(16) }}>
                                        {(f: boolean) => <SkipBack size={scale(24)} color={f ? Colors.black : Colors.white} fill={f ? Colors.black : Colors.white} />}
                                    </TVPlaybackButton>
                                )}

                                {/* Restart Button - Placed exactly before the rewind 20s button */}
                                <TVPlaybackButton onPress={restart} onFocus={showOSD} style={{ marginRight: scale(16) }}>
                                    {(f: boolean) => (
                                        <View style={{ alignItems: 'center' }}>
                                            <RefreshCw size={scale(24)} color={f ? Colors.black : Colors.white} />
                                            <Text style={[s.skipText, f && s.skipTextFocused]}>Reiniciar</Text>
                                        </View>
                                    )}
                                </TVPlaybackButton>

                                <TVPlaybackButton onPress={() => seek('backward')} onFocus={showOSD}>
                                    {(f: boolean) => (
                                        <View style={{ alignItems: 'center' }}>
                                            <RotateCcw size={scale(28)} color={f ? Colors.black : Colors.white} />
                                            <Text style={[s.skipText, f && s.skipTextFocused]}>20s</Text>
                                        </View>
                                    )}
                                </TVPlaybackButton>
                                <TVPlaybackButton onPress={togglePlayPause} onFocus={showOSD} style={s.playBtn} hasTVPreferredFocus>
                                    {(f: boolean) => isPlaying
                                        ? <Pause size={scale(36)} color={Colors.black} fill={Colors.black} />
                                        : <Play size={scale(36)} color={Colors.black} fill={Colors.black} style={{ marginLeft: scale(4) }} />}
                                </TVPlaybackButton>
                                <TVPlaybackButton onPress={() => seek('forward')} onFocus={showOSD}>
                                    {(f: boolean) => (
                                        <View style={{ alignItems: 'center' }}>
                                            <RotateCw size={scale(28)} color={f ? Colors.black : Colors.white} />
                                            <Text style={[s.skipText, f && s.skipTextFocused]}>20s</Text>
                                        </View>
                                    )}
                                </TVPlaybackButton>
                                {hasNext && (
                                    <TVPlaybackButton onPress={goNext} onFocus={showOSD} style={{ marginLeft: scale(16) }}>
                                        {(f: boolean) => <SkipForward size={scale(24)} color={f ? Colors.black : Colors.white} fill={f ? Colors.black : Colors.white} />}
                                    </TVPlaybackButton>
                                )}
                            </View>

                            {/* Right Spacer for balance */}
                            <View style={s.sideControls} />
                        </View>

                        {/* Progress Bar — focusable, left/right to seek continuously */}
                        <ProgressBar
                            positionMs={position}
                            durationMs={duration}
                            onSeek={(newMs) => seekToPosition(newMs)}
                            onFocusGained={() => {
                                // Stop OSD hide timer — keep menu visible while user scrubs
                                if (osdTimer.current) { clearTimeout(osdTimer.current); osdTimer.current = null; }
                                if (!osdVisibleRef.current) showOSD();
                            }}
                            onFocusLost={() => {
                                // Only start hide timer when user truly leaves the progress bar
                                if (osdTimer.current) clearTimeout(osdTimer.current);
                                osdTimer.current = setTimeout(() => {
                                    osdOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
                                        if (finished) runOnJS(hideOSD)();
                                    });
                                }, TV.playerOSDHideMs);
                            }}
                            formatTime={formatTime}
                        />
                    </LinearGradient>
                </Animated.View>
            )}

            {/* Sidebars */}
            {activeMenu && (
                <View style={s.sidebarOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} focusable={false} onPress={() => { setActiveMenu(null); showOSD(); }} />
                    <View style={s.sidebar}>
                        <LinearGradient colors={['rgba(2,4,10,0.98)', 'rgba(2,4,10,0.95)']} style={StyleSheet.absoluteFill} />
                        <View style={s.sidebarHeader}>
                            <Text style={s.sidebarTitle}>
                                {activeMenu === 'episodes' ? 'Episodios' : activeMenu === 'subs' ? 'Subtítulos' : 'Idioma y Audio'}
                            </Text>
                        </View>

                        <TVFocusGuide destinations={[]} style={{ flex: 1 }}>
                            {activeMenu === 'episodes' && (
                                <FlatList
                                    data={allEpisodes}
                                    keyExtractor={(item) => item.id}
                                    contentContainerStyle={{ padding: scale(24), gap: scale(16) }}
                                    renderItem={({ item: ep, index: epIdx }) => (
                                        <TVSidebarItem
                                            ref={episodeId === ep.id ? firstSidebarItemRef : undefined}
                                            hasTVPreferredFocus={episodeId === ep.id}
                                            onPress={() => { setActiveMenu(null); router.replace(`/(tv)/watch/${contentId}?episodeId=${ep.id}` as any); }}
                                            style={[s.epItem, episodeId === ep.id && s.epItemActive]}
                                        >
                                            {(focused: boolean) => (
                                                <>
                                                    <View style={[s.epNum, focused && s.epNumFocused, episodeId === ep.id && s.epNumActive]}>
                                                        <Text style={[s.epNumText, focused && s.epNumTextFocused]}>{ep.number ?? ''}</Text>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[s.epName, focused && s.epNameFocused, episodeId === ep.id && s.epNameActive]} numberOfLines={1}>
                                                            {ep.translations?.[0]?.title || `Episodio ${ep.number ?? ''}`}
                                                        </Text>
                                                        <Text style={[s.epMeta, focused && s.epMetaFocused]}>Temporada {ep.seasonNumber ?? ''}</Text>
                                                    </View>
                                                </>
                                            )}
                                        </TVSidebarItem>
                                    )}
                                />
                            )}

                            {activeMenu === 'subs' && (
                                <ScrollView contentContainerStyle={{ padding: scale(24), gap: scale(16) }}>
                                    <TVSidebarItem
                                        ref={selectedSub === 'off' ? firstSidebarItemRef : undefined}
                                        hasTVPreferredFocus={selectedSub === 'off'}
                                        onPress={() => { setSelectedSub('off'); setActiveMenu(null); showOSD(); }}
                                        style={s.trackItem}
                                    >
                                        {(focused: boolean) => (
                                            <>
                                                <Text style={[s.trackText, focused && s.trackTextFocused]}>Desactivados</Text>
                                                {selectedSub === 'off' && <Check size={scale(20)} color={focused ? Colors.black : Colors.accent} />}
                                            </>
                                        )}
                                    </TVSidebarItem>
                                    {subsList.map((sub: any, i: number) => {
                                        // Prefer numeric index for maximum ExoPlayer compatibility
                                        let value: string | number;
                                        if (sub.index !== undefined && typeof sub.index === 'number') {
                                            value = sub.index;
                                        } else if (sub.language) {
                                            value = `LANG:${sub.language}`;
                                        } else if (sub.title && typeof sub.title === 'string') {
                                            value = `TITLE:${sub.title}`;
                                        } else {
                                            value = i;
                                        }

                                        const isSelected = selectedSub === value;
                                        return (
                                            <TVSidebarItem 
                                                key={i} 
                                                hasTVPreferredFocus={isSelected}
                                                ref={isSelected ? firstSidebarItemRef : undefined}
                                                onPress={() => { setSelectedSub(value); setActiveMenu(null); showOSD(); }} 
                                                style={s.trackItem}
                                            >
                                                {(focused: boolean) => (
                                                    <>
                                                        <Text style={[s.trackText, focused && s.trackTextFocused]}>{sub.label || sub.language || `Pista ${i + 1}`}</Text>
                                                        {isSelected && <Check size={scale(20)} color={focused ? Colors.black : Colors.accent} />}
                                                    </>
                                                )}
                                            </TVSidebarItem>
                                        );
                                    })}
                                </ScrollView>
                            )}

                            {activeMenu === 'audio' && (
                                <ScrollView contentContainerStyle={{ padding: scale(24), gap: scale(16) }}>
                                    {audioList.map((aud: any, i: number) => {
                                        // SIEMPRE usar número para que changeAudio construya ?audioIndex=N
                                        // Prioridad: aud.index > aud.trackIndex > posición i
                                        const numericIndex: number =
                                            typeof aud.index === 'number' ? aud.index :
                                            typeof aud.trackIndex === 'number' ? aud.trackIndex :
                                            i;
                                        const isSelected = selectedAudio === numericIndex || (selectedAudio === 'auto' && i === 0);
                                        return (
                                            <TVSidebarItem
                                                key={i}
                                                ref={isSelected ? firstSidebarItemRef : undefined}
                                                hasTVPreferredFocus={isSelected}
                                                onPress={() => changeAudio(numericIndex)}
                                                style={s.trackItem}
                                            >
                                                {(focused: boolean) => (
                                                    <>
                                                        <Text style={[s.trackText, focused && s.trackTextFocused]}>{aud.label || aud.language || `Audio ${i + 1}`}</Text>
                                                        {isSelected && <Check size={scale(20)} color={focused ? Colors.black : Colors.accent} />}
                                                    </>
                                                )}
                                            </TVSidebarItem>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </TVFocusGuide>
                    </View>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black },
    centerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: scale(24), color: Colors.white, fontWeight: '600' },

    topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: scale(40), paddingHorizontal: scale(60), paddingBottom: scale(80) },
    title: { fontSize: scale(36), fontWeight: '900', color: Colors.white },
    subtitle: { fontSize: scale(22), color: 'rgba(255,255,255,0.7)', marginTop: scale(8), fontWeight: '600' },

    pauseIndicator: { width: scale(96), height: scale(96), borderRadius: scale(48), backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: scale(40), paddingHorizontal: scale(60), paddingTop: scale(100) },

    controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(32) },
    sideControls: { flexDirection: 'row', gap: scale(16), width: scale(300) },
    mainControls: { flexDirection: 'row', alignItems: 'center', gap: scale(24) },

    controlBtn: { width: scale(64), height: scale(64), borderRadius: scale(32), justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'transparent' },
    controlBtnFocused: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: Colors.white, transform: [{ scale: 1.1 }] },
    playBtn: { width: scale(80), height: scale(80), borderRadius: scale(40), backgroundColor: Colors.white, borderColor: Colors.white },

    skipText: { fontSize: scale(12), color: Colors.white, fontWeight: '700', marginTop: scale(2) },
    skipTextFocused: { color: Colors.black },

    menuBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(10), paddingHorizontal: scale(20), paddingVertical: scale(12), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'transparent' },
    menuBtnFocused: { backgroundColor: Colors.white },
    menuBtnText: { fontSize: scale(16), fontWeight: '700', color: Colors.white },
    menuBtnTextFocused: { color: Colors.black },

    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: scale(20), paddingVertical: scale(8), paddingHorizontal: scale(12), borderRadius: scale(12), borderWidth: 2, borderColor: 'transparent' },
    progressContainerFocused: { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.05)' },
    timeText: { fontSize: scale(18), fontWeight: '600', color: Colors.white, fontVariant: ['tabular-nums'], width: scale(80), textAlign: 'center' },
    progressBarTrack: { flex: 1, height: scale(8), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: scale(4), justifyContent: 'center' },
    progressBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.accent, borderRadius: scale(4) },
    progressThumb: { position: 'absolute', width: scale(20), height: scale(20), borderRadius: scale(10), backgroundColor: Colors.white, marginLeft: scale(-10) },
    progressThumbFocused: { width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: Colors.accent, marginLeft: scale(-14) },

    // Sidebar
    sidebarOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sidebar: { width: scale(500), height: '100%', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' },
    sidebarHeader: { padding: scale(32), borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    sidebarTitle: { fontSize: scale(24), fontWeight: '800', color: Colors.white },

    epItem: { flexDirection: 'row', alignItems: 'center', gap: scale(16), padding: scale(16), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'transparent' },
    epItemFocused: { backgroundColor: Colors.white, transform: [{ scale: 1.02 }] },
    epItemActive: { borderColor: Colors.accent, backgroundColor: 'rgba(0,195,255,0.1)' },
    epNum: { width: scale(48), height: scale(48), borderRadius: scale(8), backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    epNumFocused: { backgroundColor: 'rgba(0,0,0,0.1)' },
    epNumActive: { backgroundColor: Colors.accent },
    epNumText: { fontSize: scale(18), fontWeight: '800', color: Colors.white },
    epNumTextFocused: { color: Colors.black },
    epName: { fontSize: scale(18), fontWeight: '700', color: Colors.white, marginBottom: scale(4) },
    epNameFocused: { color: Colors.black },
    epNameActive: { color: Colors.accent },
    epMeta: { fontSize: scale(14), color: 'rgba(255,255,255,0.5)' },
    epMetaFocused: { color: 'rgba(0,0,0,0.6)' },

    trackItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: scale(20), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'transparent' },
    itemFocusedWrapper: { backgroundColor: Colors.white, transform: [{ scale: 1.02 }] },
    trackText: { fontSize: scale(18), fontWeight: '600', color: Colors.white },
    trackTextFocused: { color: Colors.black },
});
