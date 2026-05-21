import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Search, User, Heart } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import { scale } from '../../lib/scale';

const NAV_ITEMS = [
    { key: 'home', label: 'Inicio', route: '/(tv)/home' },
    { key: 'movies', label: 'Películas', route: '/(tv)/explore?type=MOVIE' },
    { key: 'series', label: 'Series', route: '/(tv)/explore?type=SERIES' },
    { key: 'explore', label: 'Explorar', route: '/(tv)/explore' },
];

export default function TVTopNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth(); // Hook de autenticación

    // CRITICAL FIX: useGlobalSearchParams must be used inside Layout components like TVTopNav
    // useLocalSearchParams will be empty here because the nav is rendered at the _layout level!
    const params = useGlobalSearchParams();

    const getIsActive = (item: typeof NAV_ITEMS[0]) => {
        const isExplorePath = pathname === '/(tv)/explore' || pathname === '/explore';

        if (item.key === 'home') return pathname === '/(tv)/home' || pathname === '/home' || pathname === '/';
        if (item.key === 'movies') return isExplorePath && params.type === 'MOVIE';
        if (item.key === 'series') return isExplorePath && params.type === 'SERIES';
        if (item.key === 'explore') return isExplorePath && !params.type;
        if (item.key === 'favorites') return pathname.includes('/favorites');

        return false;
    };

    return (
        <View style={s.container}>
            {/* Left Area: Standard Logo Placement */}
            <View style={s.leftArea}>
                <Image source={require('../../assets/logo.png')} style={s.logoImage} contentFit="contain" />
            </View>

            {/* Center Nav Items: Isla Flotante */}
            <View style={s.centerNav}>
                {NAV_ITEMS.map((item) => {
                    const active = getIsActive(item);
                    return (
                        <NavPill
                            key={item.key}
                            label={item.label}
                            isActive={active}
                            onPress={() => router.push(item.route as any)}
                        />
                    );
                })}

                <TopNavIconButton
                    icon={Search}
                    onPress={() => {
                        const isExplorePath = pathname === '/(tv)/explore' || pathname === '/explore';
                        if (isExplorePath) {
                            router.push({
                                pathname: '/(tv)/explore',
                                params: { ...params, focusSearch: Date.now().toString() }
                            });
                        } else {
                            router.push({
                                pathname: '/(tv)/explore',
                                params: { focusSearch: Date.now().toString() }
                            });
                        }
                    }}
                />
            </View>

            {/* Right Area: Utility Icons and Profile Avatar */}
            <View style={s.rightArea}>

                {/* Favoritos (Mi Lista) usando Heart */}
                {user && (
                    <TopNavIconButton 
                        icon={Heart} 
                        onPress={() => router.push('/(tv)/favorites')} 
                        isActive={pathname.includes('/favorites')} 
                    />
                )}

                {/* Profile avatar on the far right using Dicebear bottts */}
                <TopNavIconButton icon={User} onPress={() => router.push('/(tv)/profile')} isAvatar user={user} />
            </View>
        </View>
    );
}

function NavPill({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
    const [focused, setFocused] = useState(false);

    return (
        <Pressable
            focusable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.pill,
                isActive && s.pillActive,
                focused && !isActive && s.pillFocused, // Only apply focus style if not active, to prevent dual-highlighting visual confusion
            ]}
        >
            <Text style={[
                s.pillText,
                isActive && s.pillTextActive,
                focused && !isActive && s.pillTextFocused,
            ]}>
                {label}
            </Text>
        </Pressable>
    );
}

function TopNavIconButton({ icon: Icon, onPress, isAvatar, user, isActive }: any) {
    const [focused, setFocused] = useState(false);

    return (
        <View style={focused ? { transform: [{ scale: 1.1 }] } : undefined}>
            <Pressable
                focusable
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onPress={onPress}
                style={[
                    s.iconBtn, 
                    focused && s.iconBtnFocused, 
                    isAvatar && s.avatarBtn, 
                    isAvatar && focused && s.avatarBtnFocused
                ]}
            >
                {isAvatar && user ? (
                    <Image 
                        source={{ uri: `https://api.dicebear.com/7.x/bottts/png?seed=${user.id || 'default'}&backgroundColor=e5e7eb` }} 
                        style={{ width: '100%', height: '100%', borderRadius: scale(25) }} 
                    />
                ) : (
                    <Icon 
                        size={scale(24)} 
                        color={focused || isAvatar ? Colors.black : Colors.white} 
                        fill={isActive ? (focused ? Colors.black : Colors.white) : 'transparent'}
                    />
                )}
            </Pressable>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 56,
        paddingTop: 32,
        zIndex: 9999,
    },
    leftArea: {
        width: 150,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    logoImage: {
        width: 130,
        height: 38,
    },
    centerNav: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)', // Fondo de Isla Flotante
        paddingHorizontal: scale(12),
        paddingVertical: scale(8),
        borderRadius: scale(40),
        gap: scale(8),
    },
    rightArea: {
        width: 200,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 16,
    },
    pill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    pillActive: {
        backgroundColor: '#FFFFFF',
    },
    pillFocused: {
        borderColor: '#FFFFFF',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    pillText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#D1D5DB', // Google TV grey text
        letterSpacing: 0.3,
    },
    pillTextActive: {
        color: '#000000',
        fontWeight: '800',
    },
    pillTextFocused: {
        color: '#FFFFFF',
    },
    iconBtn: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.0)',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconBtnFocused: {
        backgroundColor: '#FFFFFF',
    },
    avatarBtn: {
        backgroundColor: '#E5E7EB', // Google TV light grey avatar background
    },
    avatarBtnFocused: {
        borderColor: '#FFFFFF', // High contrast ring around avatar when focused
        borderWidth: 2,
    }
});
