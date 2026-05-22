import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { LogOut, User, History, Play, Trash2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import TVModal from '../../components/tv/TVModal';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES, resolveImageUrl } from '../../lib/api-routes';
import { scale } from '../../lib/scale';
import { useDoubleBackExit } from '../../hooks/useDoubleBackExit';

const { width: SW, height: SH } = Dimensions.get('window');
const RW = SW - scale(460) - scale(120) - scale(50); // Right column width
const H_COLS = 4;
const H_GAP = scale(16);
const H_CARD_W = (RW - H_GAP * (H_COLS - 1)) / H_COLS;
const H_CARD_H = H_CARD_W * 1.5; // 2:3 poster ratio

function ModalButton({ onPress, title, isDestructive = false, hasTVPreferredFocus = false }: any) {
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            focusable
            hasTVPreferredFocus={hasTVPreferredFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                isDestructive ? s.modalBtnDestructive : s.modalBtn,
                focused && (isDestructive ? s.modalBtnDestructiveFocused : s.modalBtnFocused)
            ]}
        >
            <Text style={[
                isDestructive ? s.modalBtnDestructiveText : s.modalBtnText,
                focused && (isDestructive ? s.modalBtnDestructiveTextFocused : s.modalBtnTextFocused)
            ]}>
                {title}
            </Text>
        </Pressable>
    );
}

function MainActionButton({ onPress, title, isLogin = false, hasTVPreferredFocus = false }: any) {
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            focusable
            hasTVPreferredFocus={hasTVPreferredFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.logoutBtn,
                isLogin && { width: '100%', borderColor: '#38BDF8', marginTop: scale(10) },
                focused && (isLogin ? { backgroundColor: '#38BDF8', transform: [{ scale: 1.05 }] } : [s.logoutBtnFocused, { transform: [{ scale: 1.05 }] }])
            ]}
        >
            {isLogin ? null : <LogOut size={scale(18)} color={focused ? Colors.black : Colors.error} />}
            <Text style={
                isLogin
                    ? { fontSize: scale(14), fontWeight: '800', color: focused ? '#000' : '#38BDF8' }
                    : [s.logoutBtnText, focused && s.logoutBtnTextFocused]
            }>
                {title}
            </Text>
        </Pressable>
    );
}

// ─── History Item Component (Optimized for D-Pad) ──────────────────────────────
function HistoryItem({
    item, index, onPlay, onRemove,
}: {
    item: any; index: number;
    onPlay: () => void;
    onRemove: () => void;
}) {
    const [cardFocused, setCardFocused] = useState(false);
    const [removeFocused, setRemoveFocused] = useState(false);
    const c = item.content || {};
    const backdrop = c.thumbnails?.find((t: any) => t.type === 'POSTER')?.url
        || c.thumbnails?.find((t: any) => t.type === 'BACKDROP')?.url
        || c.thumbnails?.find((t: any) => t.type === 'BANNER')?.url
        || c.thumbnails?.[0]?.url;
    const title = c.translations?.[0]?.title || '';
    const progress = item.progressSeconds || 0;
    const duration = item.durationSeconds || 0;
    const progressPct = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;

    return (
        <View style={s.historyItemContainer}>
            {/* Poster Card */}
            <Pressable
                focusable
                hasTVPreferredFocus={index === 0}
                onFocus={() => setCardFocused(true)}
                onBlur={() => setCardFocused(false)}
                onPress={onPlay}
                style={[s.historyCard, cardFocused && s.historyCardFocused]}
            >
                {backdrop ? (
                    <Image
                        source={resolveImageUrl(backdrop)}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
                        <Play size={scale(24)} color="rgba(255,255,255,0.15)" fill="rgba(255,255,255,0.15)" />
                    </View>
                )}

                <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
                    style={[StyleSheet.absoluteFill, s.historyCardGradient]}
                />
                <Text style={s.historyCardTitle} numberOfLines={1}>{title}</Text>

                {progressPct > 0 && (
                    <View style={s.historyProgressBar}>
                        <View style={[s.historyProgressFill, { width: `${progressPct}%` as any }]} />
                    </View>
                )}
            </Pressable>

            {/* Delete button */}
            <Pressable
                focusable
                onFocus={() => setRemoveFocused(true)}
                onBlur={() => setRemoveFocused(false)}
                onPress={onRemove}
                style={[s.removeBtn, removeFocused && s.removeBtnFocused]}
            >
                <Trash2 size={scale(13)} color={removeFocused ? '#FFF' : '#EF4444'} />
                <Text style={[s.removeBtnText, removeFocused && s.removeBtnTextFocused]}>Quitar</Text>
            </Pressable>
        </View>
    );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    
    useDoubleBackExit();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [idToRemove, setIdToRemove] = useState<string | null>(null);
    
    // History states
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        if (!user) { setHistoryLoading(false); return; }
        try {
            const res = await fetchApi(`${API_ROUTES.HISTORY.LIST}?limit=15`);
            if (res.success && res.data) {
                setHistory(res.data.data || res.data.items || res.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setHistoryLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const handlePlay = useCallback((item: any) => {
        const c = item.content || {};
        if (item.episodeId) {
            router.push({ pathname: `/(tv)/watch/${c.id}` as any, params: { episodeId: item.episodeId } });
        } else {
            router.push(`/(tv)/watch/${c.id}` as any);
        }
    }, [router]);

    const handleRemoveHistory = useCallback((item: any) => {
        const c = item.content || {};
        setIdToRemove(c.id);
    }, []);

    const confirmRemoveHistory = useCallback(async (contentId: string) => {
        setHistory(prev => prev.filter(i => (i.content?.id || i.id) !== contentId));
        try {
            await fetchApi(`${API_ROUTES.HISTORY.BASE}/${contentId}`, { method: 'DELETE' });
        } catch {
            loadHistory();
        }
    }, [loadHistory]);

    const performLogout = async () => {
        setShowLogoutConfirm(false);
        setIsLoggingOut(true);
        await new Promise(r => setTimeout(r, 1800));
        await logout();
        router.replace('/(auth)/login');
    };

    // ── Logout Loading Overlay ─────────────────────────────────────────────
    if (isLoggingOut) {
        return (
            <View style={[s.logoutOverlay, { backgroundColor: '#050814' }]}>
                <View style={s.logoutCard}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={s.logoutLogo}
                        contentFit="contain"
                    />
                    <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: scale(32) }} />
                    <Text style={s.logoutText}>Cerrando sesión...</Text>
                </View>
            </View>
        );
    }

    const avatarUrl = `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(user?.name || 'default')}`;

    if (!user) {
        return (
            <View style={[s.container, { backgroundColor: '#050814' }]}>

                <View style={s.contentWrapper}>
                    <View style={s.leftCol}>
                        <Text style={s.mainTitle}>
                            Mi Perfil
                        </Text>
                        
                        <View style={s.identityCard}>
                            <View style={{ alignItems: 'center', gap: scale(20), paddingVertical: scale(20) }}>
                                <User size={scale(64)} color="#38BDF8" strokeWidth={2.5} />
                                <Text style={s.emptyHistoryTitle}>No has iniciado sesión</Text>
                                <Text style={s.emptyHistorySubtitle}>Inicia sesión para acceder a tu perfil y personalizar tu experiencia.</Text>
                                <MainActionButton
                                    hasTVPreferredFocus
                                    isLogin
                                    title="INICIAR SESIÓN"
                                    onPress={() => router.push('/(auth)/login')}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    const acc = user?.endUserAccount;
    const isPremium = acc?.planId != null;
    const baseDays = acc?.plan?.durationDays || 30;
    const bonusDays = acc?.plan?.bonusDays || 0;
    const totalDays = baseDays + bonusDays;
    const remainingDays = acc?.endDate ? Math.max(0, Math.ceil((new Date(acc.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

    // Smart client-side calculation to detect stacked/accumulated plans
    let isAccumulated = false;
    if (isPremium && acc?.endDate && acc?.plan?.durationDays) {
        const today = new Date();
        const expiry = new Date(acc.endDate);
        const diffTime = expiry.getTime() - today.getTime();
        const remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const baseDuration = acc.plan.durationDays + (acc.plan.bonusDays || 0);

        if (remaining > baseDuration + 5) {
            isAccumulated = true;
        }
    }

    return (
        <View style={[s.container, { backgroundColor: '#050814' }]}>

            <View style={s.contentWrapper}>
                {/* Left Side: Profile Identity & Subscription */}
                <View style={s.leftCol}>
                    <Text style={s.mainTitle}>
                        Mi Perfil
                    </Text>

                    <View style={s.identityCard}>
                        {/* User Identity Header */}
                        <View style={s.identityHeader}>
                            <View style={s.avatarContainer}>
                                <Image
                                    source={avatarUrl}
                                    style={s.avatarImage}
                                />
                            </View>
                            <View style={s.userTextCol}>
                                <Text style={s.userName} numberOfLines={1}>{user?.name}</Text>
                                <Text style={s.userEmail} numberOfLines={1}>{user?.email}</Text>
                            </View>
                        </View>

                        <View style={s.divider} />

                        {/* Subscription details */}
                        <View style={s.subSection}>
                            <View style={s.subHeader}>
                                <Text style={s.subSectionTitle}>Mi Suscripción</Text>
                                {isAccumulated && (
                                    <View style={s.accumulatedBadge}>
                                        <Text style={s.accumulatedBadgeText}>PLAN ACUMULADO</Text>
                                    </View>
                                )}
                            </View>

                            {isPremium ? (
                                <View style={s.premiumDetails}>
                                    <View style={s.detailsGrid}>
                                        <View style={s.detailRow}>
                                            <Text style={s.detailLabel}>Plan:</Text>
                                            <Text style={[s.detailVal, { color: '#38BDF8', fontWeight: '900' }]}>
                                                {acc?.plan?.name || 'PREMIUM'}
                                            </Text>
                                        </View>
                                        <View style={s.detailRow}>
                                            <Text style={s.detailLabel}>Pantallas simultáneas:</Text>
                                            <Text style={s.detailVal}>Hasta {acc?.maxDevices || 4} pantallas</Text>
                                        </View>
                                        <View style={s.detailRow}>
                                            <Text style={s.detailLabel}>Fecha de Vencimiento:</Text>
                                            <Text style={s.detailVal}>
                                                {acc?.endDate ? new Date(acc.endDate).toLocaleDateString() : 'N/A'}
                                            </Text>
                                        </View>
                                        <View style={s.detailRow}>
                                            <Text style={s.detailLabel}>Días Contratados:</Text>
                                            <Text style={s.detailVal}>{totalDays} días</Text>
                                        </View>
                                        <View style={s.detailRow}>
                                            <Text style={s.detailLabel}>Días Restantes:</Text>
                                            <Text style={[s.detailVal, { color: '#10B981', fontWeight: '900' }]}>
                                                {remainingDays} días de servicio
                                            </Text>
                                        </View>
                                        <View style={s.detailRow}>
                                            <Text style={s.detailLabel}>Estado de cuenta:</Text>
                                            <Text style={[s.detailVal, { color: '#10B981', fontWeight: '800' }]}>Activo</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={s.standardDetails}>
                                    <Text style={s.standardText}>
                                        Estás usando la cuenta gratuita. Suscríbete para acceder al catálogo en alta definición sin publicidad y habilitar múltiples pantallas simultáneas.
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={s.divider} />

                        {/* Actions */}
                        <MainActionButton
                            title="Cerrar Sesión"
                            onPress={() => setShowLogoutConfirm(true)}
                        />
                    </View>
                </View>

                {/* Right Side: Continue Watching Grid & Content */}
                <View style={s.rightCol}>
                    <Text style={s.sectionTitle}>
                        Continuar Viendo
                    </Text>

                    {historyLoading ? (
                        <View style={s.rightCenter}>
                            <ActivityIndicator size="large" color="#38BDF8" />
                        </View>
                    ) : history.length === 0 ? (
                        <View style={s.emptyHistoryCard}>
                            <History size={scale(48)} color="rgba(255,255,255,0.15)" />
                            <Text style={s.emptyHistoryTitle}>Sin historial reciente</Text>
                            <Text style={s.emptyHistorySubtitle}>
                                Las películas y series que comiences a ver aparecerán aquí para continuar donde las dejaste.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ flex: 1 }}>
                            <FlatList
                                numColumns={H_COLS}
                                data={history}
                                keyExtractor={(item, i) => (item.content?.id || item.id || i.toString())}
                                contentContainerStyle={s.historyList}
                                columnWrapperStyle={s.historyRow}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item, index }) => (
                                    <HistoryItem
                                        item={item}
                                        index={index}
                                        onPlay={() => handlePlay(item)}
                                        onRemove={() => handleRemoveHistory(item)}
                                    />
                                )}
                            />
                        </View>
                    )}
                </View>
            </View>

            {/* TV-Friendly Logout Confirmation Modal */}
            <TVModal visible={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)}>
                <View style={s.modalContainer}>
                    <LogOut size={scale(64)} color={Colors.error} style={{ marginBottom: scale(24) }} />
                    <Text style={s.modalTitle}>Cerrar Sesión</Text>
                    <Text style={s.modalSubtitle}>¿Estás seguro de que deseas salir de tu cuenta?</Text>
                    
                    <View style={s.modalActions}>
                        <ModalButton
                            title="CANCELAR"
                            hasTVPreferredFocus
                            onPress={() => setShowLogoutConfirm(false)}
                        />
                        <ModalButton
                            title="SÍ, SALIR"
                            isDestructive
                            onPress={performLogout}
                        />
                    </View>
                </View>
            </TVModal>

            {/* Remove History Confirmation Modal */}
            <TVModal visible={idToRemove !== null} onClose={() => setIdToRemove(null)}>
                <View style={s.modalContainer}>
                    <Trash2 size={scale(64)} color={Colors.error} style={{ marginBottom: scale(24) }} />
                    <Text style={s.modalTitle}>¿Quitar del Historial?</Text>
                    <Text style={s.modalSubtitle}>¿Eliminar este título de tu historial de visualización?</Text>
                    <View style={s.modalActions}>
                        <ModalButton
                            title="CANCELAR"
                            hasTVPreferredFocus
                            onPress={() => setIdToRemove(null)}
                        />
                        <ModalButton
                            title="SÍ, ELIMINAR"
                            isDestructive
                            onPress={() => {
                                if (idToRemove) { confirmRemoveHistory(idToRemove); setIdToRemove(null); }
                            }}
                        />
                    </View>
                </View>
            </TVModal>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050B18',
    },
    glowCircle: {
        position: 'absolute',
        width: scale(600),
        height: scale(600),
        borderRadius: scale(300),
        top: -scale(150),
        left: -scale(150),
    },
    contentWrapper: {
        flex: 1,
        flexDirection: 'row',
        paddingTop: scale(130), // Clears TV top navigation bar
        paddingHorizontal: scale(60),
        gap: scale(50),
    },

    // Left Column
    leftCol: {
        width: scale(460),
        flexDirection: 'column',
    },
    mainTitle: {
        fontSize: scale(32),
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: scale(20),
        letterSpacing: -0.5,
    },
    identityCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: scale(24),
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        padding: scale(28),
    },
    identityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(18),
    },
    avatarContainer: {
        width: scale(64),
        height: scale(64),
        borderRadius: scale(32),
        borderWidth: 2,
        borderColor: '#38BDF8',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    userTextCol: {
        flex: 1,
    },
    userName: {
        fontSize: scale(20),
        fontWeight: '800',
        color: '#FFFFFF',
    },
    userEmail: {
        fontSize: scale(13),
        color: '#9CA3AF',
        marginTop: scale(2),
    },
    divider: {
        height: 1,
        backgroundColor: '#1E293B',
        marginVertical: scale(20),
    },
    subSection: {
        gap: scale(14),
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subSectionTitle: {
        fontSize: scale(16),
        fontWeight: '800',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    planBadge: {
        paddingHorizontal: scale(10),
        paddingVertical: scale(4),
        borderRadius: scale(6),
        borderWidth: 1,
    },
    planBadgePremium: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: '#38BDF8',
    },
    planBadgeStandard: {
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderColor: '#9CA3AF',
    },
    planBadgeText: {
        fontSize: scale(10),
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    planBadgeTextPremium: {
        color: '#38BDF8',
    },
    planBadgeTextStandard: {
        color: '#9CA3AF',
    },
    accumulatedBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderWidth: 1,
        borderColor: '#38BDF8',
        paddingHorizontal: scale(10),
        paddingVertical: scale(4),
        borderRadius: scale(6),
    },
    accumulatedBadgeText: {
        fontSize: scale(10),
        fontWeight: '900',
        color: '#38BDF8',
    },
    premiumDetails: {
        gap: scale(14),
    },
    detailsGrid: {
        gap: scale(8),
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: scale(13),
        color: '#6B7280',
        fontWeight: '600',
    },
    detailVal: {
        fontSize: scale(13),
        color: '#E2E8F0',
        fontWeight: '700',
    },
    standardDetails: {
        padding: scale(12),
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: scale(10),
    },
    standardText: {
        fontSize: scale(12),
        color: '#9CA3AF',
        lineHeight: scale(18),
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 1.5,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        paddingVertical: scale(12),
        borderRadius: scale(12),
    },
    logoutBtnFocused: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 2,
    },
    logoutBtnText: {
        fontSize: scale(14),
        fontWeight: '800',
        color: '#EF4444',
    },
    logoutBtnTextFocused: {
        color: '#FFFFFF',
    },

    // Right Column
    rightCol: {
        flex: 1,
        flexDirection: 'column',
    },
    sectionTitle: {
        fontSize: scale(24),
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: scale(20),
        letterSpacing: -0.5,
    },
    rightCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyHistoryCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: scale(24),
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        padding: scale(40),
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(14),
        flex: 1,
    },
    emptyHistoryTitle: {
        fontSize: scale(18),
        fontWeight: '800',
        color: '#FFFFFF',
    },
    emptyHistorySubtitle: {
        fontSize: scale(13),
        color: '#9CA3AF',
        textAlign: 'center',
        maxWidth: scale(360),
        lineHeight: scale(20),
    },

    // Horizontal History List
    historyList: {
        gap: H_GAP,
        paddingBottom: scale(60),
    },
    historyRow: {
        gap: H_GAP,
    },
    historyItemContainer: {
        width: H_CARD_W,
    },
    historyCard: {
        height: H_CARD_H,
        borderRadius: scale(12),
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: '#0F172A',
        justifyContent: 'flex-end',
    },
    historyCardFocused: {
        borderColor: '#FFFFFF',
    },
    historyCardGradient: {
        justifyContent: 'flex-end',
        padding: scale(10),
    },
    historyCardTitle: {
        fontSize: scale(12),
        fontWeight: '700',
        color: '#FFFFFF',
    },
    historyProgressBar: {
        height: scale(4),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: scale(2),
        marginHorizontal: scale(10),
        marginBottom: scale(10),
    },
    historyProgressFill: {
        height: '100%',
        backgroundColor: '#38BDF8',
        borderRadius: scale(2),
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(5),
        marginTop: scale(6),
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        paddingVertical: scale(5),
        borderRadius: scale(8),
    },
    removeBtnFocused: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    removeBtnText: {
        fontSize: scale(11),
        fontWeight: '700',
        color: '#EF4444',
    },
    removeBtnTextFocused: {
        color: '#FFFFFF',
    },

    // Modal Confirmation
    modalContainer: {
        backgroundColor: 'rgba(5, 8, 15, 0.95)', // Highly opaque dark base to replace BlurView
        padding: scale(36),
        borderRadius: scale(24),
        alignItems: 'center',
        maxWidth: scale(450),
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    modalTitle: {
        fontSize: scale(24),
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: scale(10),
    },
    modalSubtitle: {
        fontSize: scale(14),
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: scale(24),
        lineHeight: scale(20),
    },
    modalActions: {
        flexDirection: 'row',
        gap: scale(14),
    },
    modalBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: scale(24),
        paddingVertical: scale(10),
        borderRadius: scale(10),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalBtnFocused: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
        borderWidth: 3,
        transform: [{ scale: 1.08 }],
        elevation: 10,
    },
    modalBtnText: {
        fontSize: scale(16),
        fontWeight: '800',
        color: '#D1D5DB',
    },
    modalBtnTextFocused: {
        color: '#000000',
    },
    modalBtnDestructive: {
        backgroundColor: 'rgba(239,68,68,0.08)',
        paddingHorizontal: scale(24),
        paddingVertical: scale(10),
        borderRadius: scale(10),
        borderWidth: 3,
        borderColor: 'transparent',
    },
    modalBtnDestructiveFocused: {
        backgroundColor: '#EF4444',
        borderColor: '#FFFFFF',
        borderWidth: 3,
        transform: [{ scale: 1.08 }],
        elevation: 10,
    },
    modalBtnDestructiveText: {
        fontSize: scale(14),
        fontWeight: '800',
        color: '#EF4444',
    },
    modalBtnDestructiveTextFocused: {
        color: '#FFFFFF',
    },

    // Logout screen overlay
    logoutOverlay: {
        ...StyleSheet.absoluteFillObject,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    logoutCard: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
    },
    logoutLogo: {
        width: scale(180),
        height: scale(56),
        opacity: 0.9,
    },
    logoutText: {
        marginTop: scale(16),
        fontSize: scale(16),
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 0.5,
    },
});
