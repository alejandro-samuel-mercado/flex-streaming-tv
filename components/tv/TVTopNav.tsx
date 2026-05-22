import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter, usePathname, useGlobalSearchParams } from 'expo-router';

import { Search, User, Heart } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import { scale } from '../../lib/scale';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES } from '../../lib/api-routes';

// "Inicio" and "Explorar" are fixed items
const HOME_ITEM = { key: 'home', label: 'Inicio', route: '/(tv)/home', type: null as string | null };
const EXPLORE_ITEM = { key: 'explore', label: 'Explorar', route: '/(tv)/explore', type: null as string | null };

export default function TVTopNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const params = useGlobalSearchParams();

    // Dynamic nav items from backend content types
    const [typeItems, setTypeItems] = useState<{ key: string; label: string; route: string; type: string }[]>([]);

    // Translation dictionary for backend types
    const TYPE_LABELS: Record<string, string> = {
        'MOVIE': 'Películas',
        'SERIES': 'Series',
        'ANIME': 'Anime',
        'KDRAMA': 'K-Dramas'
    };

    // Wanted order
    const WANTED_TYPES = ['MOVIE', 'SERIES', 'ANIME', 'KDRAMA'];

    useEffect(() => {
        fetchApi(API_ROUTES.CATEGORIES.CONTENT_TYPES)
            .then((res: any) => {
                if (res?.success && Array.isArray(res.data)) {
                    const items: any[] = [];
                    WANTED_TYPES.forEach(wt => {
                        if (res.data.includes(wt)) {
                            items.push({
                                key: wt,
                                label: TYPE_LABELS[wt] || wt,
                                route: `/(tv)/explore?type=${wt}`,
                                type: wt
                            });
                        }
                    });
                    setTypeItems(items.length > 0 ? items : fallbackItems);
                }
            })
            .catch(() => {
                setTypeItems(fallbackItems);
            });
    }, []);

    const fallbackItems = [
        { key: 'MOVIE', label: 'Películas', route: '/(tv)/explore?type=MOVIE', type: 'MOVIE' },
        { key: 'SERIES', label: 'Series', route: '/(tv)/explore?type=SERIES', type: 'SERIES' },
        { key: 'ANIME', label: 'Anime', route: '/(tv)/explore?type=ANIME', type: 'ANIME' },
        { key: 'KDRAMA', label: 'K-Dramas', route: '/(tv)/explore?type=KDRAMA', type: 'KDRAMA' },
    ];

    const allItems = [HOME_ITEM, EXPLORE_ITEM, ...(typeItems.length > 0 ? typeItems : fallbackItems)];

    const getIsActive = (item: typeof allItems[0]) => {
        const isHome = pathname === '/(tv)/home' || pathname === '/home' || pathname === '/';
        const isExplorePath = pathname === '/(tv)/explore' || pathname === '/explore';

        if (item.key === 'home') return isHome;
        if (item.key === 'explore') return isExplorePath && !params.type;
        if (item.type) return isExplorePath && params.type === item.type;
        return false;
    };

    return (
        <View style={s.container}>
            {/* Left: Logo */}
            <View style={s.leftArea}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={s.logoImage}
                    contentFit="contain"
                />
            </View>

            {/* Center: Floating nav pills container — includes search icon */}
            <View style={s.centerNavWrapper}>
                <View style={s.centerNav}>
                    {allItems.map((item) => (
                        <NavPill
                            key={item.key}
                            label={item.label}
                            isActive={getIsActive(item)}
                            onPress={() => router.push(item.route as any)}
                        />
                    ))}
                    {/* Separator */}
                    <View style={s.navSeparator} />
                    {/* Search inside floating pill */}
                    <IconBtn onPress={() => router.push({ pathname: '/(tv)/explore', params: { focusSearch: Date.now().toString() } } as any)}>
                        <Search size={scale(16)} color={Colors.white} />
                    </IconBtn>
                </View>
            </View>

            {/* Right: Favorites & User */}
            <View style={s.rightArea}>
                {!!user && (
                    <IconBtn onPress={() => router.push('/(tv)/favorites')}>
                        <Heart
                            size={scale(22)}
                            color={pathname === '/(tv)/favorites' || pathname === '/favorites' ? Colors.accent : Colors.white}
                            fill={pathname === '/(tv)/favorites' || pathname === '/favorites' ? Colors.accent : 'transparent'}
                        />
                    </IconBtn>
                )}
                <UserBtn
                    onPress={() => router.push('/(tv)/profile')}
                />
            </View>
        </View>
    );
}

// ─── NavPill ───────────────────────────────────────────────────────────────────
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
                focused && !isActive && s.pillFocused,
                focused && { transform: [{ scale: 1.08 }] }
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

// ─── IconBtn ───────────────────────────────────────────────────────────────────
function IconBtn({ onPress, children }: any) {
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            focusable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.iconBtn,
                focused && s.iconBtnFocused,
                focused && { transform: [{ scale: 1.1 }] }
            ]}
        >
            {children}
        </Pressable>
    );
}

// ─── UserBtn ───────────────────────────────────────────────────────────────────
function UserBtn({ onPress }: any) {
    const { user } = useAuth();
    const [focused, setFocused] = useState(false);
    return (
        <Pressable
            focusable
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPress={onPress}
            style={[
                s.iconBtn,
                s.avatarBtn,
                focused && s.avatarBtnFocused,
                focused && { transform: [{ scale: 1.1 }] }
            ]}
        >
            {user ? (
                <Image 
                    source={{ uri: `https://api.dicebear.com/7.x/bottts/png?seed=${user.id || 'default'}&backgroundColor=e5e7eb` }} 
                    style={{ width: '100%', height: '100%', borderRadius: scale(25) }} 
                />
            ) : (
                <User size={scale(24)} color={focused ? Colors.black : Colors.white} />
            )}
        </Pressable>
    );
}

const s = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: scale(100),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(56),
        paddingTop: scale(32),
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
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: scale(8),
        paddingVertical: scale(8),
        borderRadius: scale(40),
        gap: scale(4),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    navSeparator: {
        width: 1,
        height: scale(24),
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: scale(4),
    },
    rightArea: {
        width: scale(150),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: scale(16),
    },
    pill: {
        paddingHorizontal: scale(20),
        paddingVertical: scale(10),
        borderRadius: scale(24),
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
        fontSize: scale(16),
        fontWeight: '600',
        color: '#D1D5DB',
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
        width: scale(44),
        height: scale(44),
        borderRadius: scale(22),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconBtnFocused: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: '#FFFFFF',
    },
    avatarBtn: {
        backgroundColor: '#E5E7EB',
    },
    avatarBtnFocused: {
        borderColor: '#FFFFFF',
        borderWidth: 2,
    }
});
