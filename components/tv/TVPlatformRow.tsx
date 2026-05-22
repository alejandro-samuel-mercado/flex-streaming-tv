import React, { memo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { scale } from '../../lib/scale';

interface Platform {
    id: string;
    name: string;
    logoReq: any;
    brandColor: string;
}

// Curated list of top-tier popular streaming services with premium high-resolution transparent PNG icons
// Using local downloaded assets to guarantee flawless rendering
const STATIC_PLATFORMS: Platform[] = [
    { id: '1', name: 'Netflix', logoReq: require('../../assets/platforms/netflix.png'), brandColor: '#E50914' },
    { id: '2', name: 'Disney+', logoReq: require('../../assets/platforms/disney.png'), brandColor: '#00D4FF' },
    { id: '3', name: 'Prime Video', logoReq: require('../../assets/platforms/prime.png'), brandColor: '#00A8E8' },
    { id: '4', name: 'Max', logoReq: require('../../assets/platforms/max.png'), brandColor: '#6B21A8' },
    { id: '5', name: 'Apple TV+', logoReq: require('../../assets/platforms/appletv.png'), brandColor: '#1C1C1E' },
    { id: '6', name: 'Paramount+', logoReq: require('../../assets/platforms/paramount.png'), brandColor: '#0064FF' },
    { id: '7', name: 'Hulu', logoReq: require('../../assets/platforms/hulu.png'), brandColor: '#1CE783' },
    { id: '8', name: 'Crunchyroll', logoReq: require('../../assets/platforms/crunchyroll.png'), brandColor: '#F47521' },
    { id: '9', name: 'Peacock', logoReq: require('../../assets/platforms/peacock.png'), brandColor: '#010101' },
    { id: '10', name: 'YouTube', logoReq: require('../../assets/platforms/youtube.png'), brandColor: '#FF0000' },
];

function TVPlatformRowInner({ title }: { title: string; items?: any[] }) {
    return (
        <View style={s.section}>
            <View style={s.header}>
                <Text style={s.sectionTitle}>{title}</Text>
            </View>
            <View style={s.listContent}>
                {STATIC_PLATFORMS.map((item, index) => (
                    <View
                        key={item.id}
                        style={[
                            s.circle,
                            {
                                backgroundColor: item.brandColor + '15',
                                borderColor: 'rgba(255,255,255,0.08)'
                            }
                        ]}
                    >
                        <Image
                            source={item.logoReq}
                            style={s.logo}
                            contentFit="contain"
                        />
                    </View>
                ))}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    section: {
        marginBottom: scale(36),
    },
    header: {
        paddingHorizontal: scale(56),
        marginBottom: scale(14),
    },
    sectionTitle: {
        fontSize: scale(20),
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.4,
    },
    listContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(20),
        paddingHorizontal: scale(56),
        paddingTop: scale(12),
        paddingBottom: scale(12),
    },
    circle: {
        width: scale(84),
        height: scale(84),
        borderRadius: scale(42),
        overflow: 'hidden',
        borderWidth: 2.5,
        backgroundColor: '#15171C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '74%',
        height: '74%',
    },
});

const TVPlatformRow = memo(TVPlatformRowInner);
export default TVPlatformRow;
