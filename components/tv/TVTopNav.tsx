import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, DeviceEventEmitter } from 'react-native';
import { useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Search, User } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import { scale } from '../../lib/scale';

const NAV_ITEMS = [
    { key: 'search', label: '', icon: Search, route: { pathname: '/(tv)/explore', params: { focusSearch: '1' } } },
    { key: 'home', label: 'Inicio', route: '/(tv)/home' },
    { key: 'MOVIE', label: 'Películas', route: { pathname: '/(tv)/explore', params: { type: 'MOVIE' } }, type: 'MOVIE' },
    { key: 'SERIES', label: 'Series', route: { pathname: '/(tv)/explore', params: { type: 'SERIES' } }, type: 'SERIES' },
    { key: 'ANIME', label: 'Animes', route: { pathname: '/(tv)/explore', params: { type: 'ANIME' } }, type: 'ANIME' },
    { key: 'KIDS', label: 'Infantiles', route: { pathname: '/(tv)/explore', params: { type: 'KIDS' } }, type: 'KIDS' },
    { key: 'mynuba', label: 'Mi Nuba', route: '/(tv)/my-nuba' },
];

export default function TVTopNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const params = useGlobalSearchParams();
    
    // Nav is always visible now as requested by user
    const getIsActive = (item: typeof NAV_ITEMS[0]) => {
        if (item.key === 'search') return false; // Search is just an action
        const isHome = pathname === '/(tv)/home' || pathname === '/home' || pathname === '/';
        const isExplorePath = pathname === '/(tv)/explore' || pathname === '/explore';
        const isMyNuba = pathname === '/(tv)/my-nuba';

        if (item.key === 'home') return isHome;
        if (item.key === 'mynuba') return isMyNuba;
        if (item.type) return isExplorePath && params.type === item.type;
        return false;
    };

    return (
        <View style={s.container} pointerEvents="auto">
            {/* Left: Logo */}
            <View style={s.leftArea}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={s.logoImage}
                    contentFit="contain"
                />
            </View>

            {/* Center: Modern Nav Pills */}
            <View style={s.centerNavWrapper}>
                <View style={s.centerNav}>
                    {NAV_ITEMS.map((item) => (
                        <NavPill
                            key={item.key}
                            item={item}
                            isActive={getIsActive(item)}
                            onPress={() => router.push(item.route as any)}
                        />
                    ))}
                </View>
            </View>

            {/* Right: User */}
            <View style={s.rightArea}>
                <UserBtn onPress={() => router.push('/(tv)/profile')} />
            </View>
        </View>
    );
}

function NavPill({ item, isActive, onPress }: { item: typeof NAV_ITEMS[0]; isActive: boolean; onPress: () => void }) {
    const [focused, setFocused] = useState(false);
    const Icon = item.icon;

    return (
        <Pressable
            focusable
            onFocus={() => {
                setFocused(true);
            }}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.pill,
                isActive && s.pillActive,
                focused && !isActive && s.pillFocused,
                item.key === 'search' && s.searchPill
            ]}
        >
            <View style={[s.pillContent, focused ? { transform: [{ scale: 1.05 }] } : undefined]}>
                {Icon && <Icon size={scale(18)} color={isActive ? Colors.black : (focused ? Colors.white : '#D1D5DB')} />}
                {!!item.label && (
                    <Text style={[
                        s.pillText,
                        isActive && s.pillTextActive,
                        focused && !isActive && s.pillTextFocused,
                    ]}>
                        {item.label}
                    </Text>
                )}
            </View>
        </Pressable>
    );
}

function UserBtn({ onPress }: any) {
    const { user } = useAuth();
    const [focused, setFocused] = useState(false);

    return (
        <Pressable
            focusable
            onFocus={() => {
                setFocused(true);
            }}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.iconBtn,
                s.avatarBtn,
                focused && s.avatarBtnFocused
            ]}
        >
            <View style={[{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }, focused && { transform: [{ scale: 1.1 }] }]}>
                {user ? (
                    <Image 
                        source={{ uri: `https://api.dicebear.com/7.x/bottts/png?seed=${user.id || 'default'}&backgroundColor=e5e7eb` }} 
                        style={{ width: '100%', height: '100%', borderRadius: scale(25) }} 
                    />
                ) : (
                    <User size={scale(24)} color={focused ? Colors.black : Colors.white} />
                )}
            </View>
        </Pressable>
    );
}

const s = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: scale(90),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(56),
        paddingTop: scale(16),
        zIndex: 9999,
    },
    leftArea: {
        width: scale(150),
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    logoImage: {
        width: scale(130),
        height: scale(38),
    },
    centerNavWrapper: {
        position: 'absolute',
        left: 0, right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1,
    },
    centerNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingHorizontal: scale(10),
        paddingVertical: scale(10),
    },
    pill: {
        paddingHorizontal: scale(24),
        paddingVertical: scale(12),
        borderRadius: scale(30),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    searchPill: {
        paddingHorizontal: scale(16),
    },
    pillActive: {
        backgroundColor: '#FFFFFF',
    },
    pillFocused: {
        borderColor: 'rgba(0, 229, 255, 0.5)',
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
    },
    pillContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
    },
    pillText: {
        fontSize: scale(17),
        fontWeight: '600',
        color: '#D1D5DB',
        letterSpacing: 0.3,
    },
    pillTextActive: {
        color: '#000000',
        fontWeight: '900',
    },
    pillTextFocused: {
        color: '#FFFFFF',
    },
    rightArea: {
        width: scale(150),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    iconBtn: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    avatarBtn: {
        backgroundColor: '#E5E7EB',
    },
    avatarBtnFocused: {
        borderColor: '#00E5FF',
        borderWidth: 2,
    }
});
