import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler, DeviceEventEmitter } from 'react-native';
import TVModal from './TVModal';
import { Colors } from '../../theme/colors';
import { LogOut } from 'lucide-react-native';
import { scale } from '../../lib/scale';

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

export default function GlobalExitModal() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('showExitAppModal', () => {
            setVisible(true);
        });
        return () => sub.remove();
    }, []);

    if (!visible) return null;

    return (
        <TVModal visible={visible} onClose={() => setVisible(false)}>
            <View style={s.modalContainer}>
                <LogOut size={scale(64)} color={Colors.error} style={{ marginBottom: scale(24) }} />
                <Text style={s.modalTitle}>¿Salir de Nuba?</Text>
                <Text style={s.modalSubtitle}>¿Estás seguro de que deseas salir de la aplicación?</Text>

                <View style={s.modalActions}>
                    <ModalButton
                        title="CANCELAR"
                        hasTVPreferredFocus
                        onPress={() => setVisible(false)}
                    />
                    <ModalButton
                        title="SÍ, SALIR"
                        isDestructive
                        onPress={() => BackHandler.exitApp()}
                    />
                </View>
            </View>
        </TVModal>
    );
}

const s = StyleSheet.create({
    modalContainer: {
        backgroundColor: 'rgba(5, 8, 15, 0.95)',
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
        borderWidth: 3,
        borderColor: 'transparent',
    },
    modalBtnFocused: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
        borderWidth: 3,
        transform: [{ scale: 1.08 }],
        elevation: 10,
    },
    modalBtnText: {
        fontSize: scale(14),
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
});
