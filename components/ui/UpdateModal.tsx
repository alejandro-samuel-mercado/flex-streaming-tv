import React, { useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Modal,
    ScrollView, ActivityIndicator, Platform, Linking,
    Animated, Alert
} from 'react-native';
import { Download, X, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { UpdateInfo } from '../../lib/update-checker';
import { Colors } from '../../theme/colors';

interface UpdateModalProps {
    updateInfo: UpdateInfo;
    onDismiss: () => void;
}

export function UpdateModal({ updateInfo, onDismiss }: UpdateModalProps) {
    const [downloading, setDownloading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const progressAnim = useRef(new Animated.Value(0)).current;

    const handleDownload = async () => {
        setDownloading(true);
        setError(null);

        try {
            // Animate the progress bar to simulate download intent
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: false,
            }).start();

            // Open the download URL in the browser.
            // Android will download the APK and prompt to install.
            // The permission REQUEST_INSTALL_PACKAGES (added to app.json) allows this.
            const supported = await Linking.canOpenURL(updateInfo.downloadUrl);
            if (supported) {
                await Linking.openURL(updateInfo.downloadUrl);
                setDownloaded(true);
            } else {
                throw new Error('No se pudo abrir el enlace de descarga');
            }
        } catch (e: any) {
            setError(e.message || 'Error al iniciar la descarga');
            progressAnim.setValue(0);
        } finally {
            setDownloading(false);
        }
    };

    const parseChangelog = (text: string): string[] => {
        if (!text) return [];
        return text
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && l !== '-' && l !== '•');
    };

    const lines = parseChangelog(updateInfo.changelog);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            <View style={s.overlay}>
                <View style={s.card}>
                    {/* Header */}
                    <View style={s.header}>
                        <View style={s.iconBadge}>
                            <Sparkles size={22} color="#a78bfa" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={s.title}>Nueva versión disponible</Text>
                            <Text style={s.subtitle}>
                                v{updateInfo.serverVersionName} · Tenés v{updateInfo.currentVersionCode}
                            </Text>
                        </View>
                        <TouchableOpacity style={s.closeBtn} onPress={onDismiss} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <X size={18} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={s.divider} />

                    {/* Changelog */}
                    {lines.length > 0 && (
                        <View style={s.changelogContainer}>
                            <Text style={s.changelogTitle}>¿Qué hay de nuevo?</Text>
                            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                                {lines.map((line, i) => {
                                    // Strip leading bullet chars if present
                                    const clean = line.replace(/^[-•·*]\s*/, '');
                                    return (
                                        <View key={i} style={s.changelogRow}>
                                            <View style={s.bullet} />
                                            <Text style={s.changelogLine}>{clean}</Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Progress bar (shown while downloading) */}
                    {downloading && (
                        <View style={s.progressContainer}>
                            <View style={s.progressTrack}>
                                <Animated.View style={[s.progressFill, { width: progressWidth }]} />
                            </View>
                            <Text style={s.progressText}>Abriendo descarga…</Text>
                        </View>
                    )}

                    {/* Post-download instruction */}
                    {downloaded && !downloading && (
                        <View style={s.successBanner}>
                            <CheckCircle2 size={16} color="#34d399" />
                            <Text style={s.successText}>
                                El APK se está descargando. Cuando termine, abrí la notificación e instalá la actualización.
                            </Text>
                        </View>
                    )}

                    {/* Error */}
                    {error && (
                        <View style={s.errorBanner}>
                            <AlertCircle size={15} color="#f87171" />
                            <Text style={s.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={s.actions}>
                        <TouchableOpacity style={s.skipBtn} onPress={onDismiss}>
                            <Text style={s.skipText}>Ahora no</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.downloadBtn, (downloading || downloaded) && s.downloadBtnDone]}
                            onPress={downloaded ? onDismiss : handleDownload}
                            disabled={downloading}
                            hasTVPreferredFocus
                            activeOpacity={0.8}
                        >
                            {downloading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : downloaded ? (
                                <>
                                    <CheckCircle2 size={16} color="#fff" />
                                    <Text style={s.downloadText}>Cerrar</Text>
                                </>
                            ) : (
                                <>
                                    <Download size={16} color="#fff" />
                                    <Text style={s.downloadText}>Descargar ahora</Text>
                                    <ArrowRight size={14} color="rgba(255,255,255,0.6)" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#111827',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.3)',
        overflow: 'hidden',
        // Glassmorphism shadow
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(124, 58, 237, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        color: '#f3f4f6',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 3,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    divider: {
        height: 1,
        backgroundColor: '#1f2937',
        marginHorizontal: 0,
    },
    changelogContainer: {
        padding: 20,
        paddingBottom: 0,
    },
    changelogTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    changelogRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 9,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#7c3aed',
        marginTop: 6,
        marginRight: 10,
        flexShrink: 0,
    },
    changelogLine: {
        fontSize: 14,
        color: '#d1d5db',
        lineHeight: 20,
        flex: 1,
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    progressTrack: {
        height: 4,
        backgroundColor: '#1f2937',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#7c3aed',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 6,
        textAlign: 'center',
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: 'rgba(52, 211, 153, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.2)',
        borderRadius: 10,
        margin: 16,
        marginBottom: 0,
        padding: 12,
    },
    successText: {
        fontSize: 13,
        color: '#6ee7b7',
        flex: 1,
        lineHeight: 18,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: 10,
        margin: 16,
        marginBottom: 0,
        padding: 12,
    },
    errorText: {
        fontSize: 13,
        color: '#fca5a5',
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 20,
        paddingTop: 18,
    },
    skipBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    skipText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    downloadBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#7c3aed',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
    },
    downloadBtnDone: {
        backgroundColor: '#059669',
    },
    downloadText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
