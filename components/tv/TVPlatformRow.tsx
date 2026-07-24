import React, { memo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { scale } from '../../lib/scale';

interface Platform {
    id: string;
    name: string;
    logoReq: any;
    brandColor: string;
}

// Curated list of top-tier popular streaming services with premium high-resolution transparent PNG icons
const STATIC_PLATFORMS: Platform[] = [
    { id: '1', name: 'Netflix', logoReq: require('../../assets/platforms/netflix.png'), brandColor: '#E50914' },
    { id: '2', name: 'Disney+', logoReq: require('../../assets/platforms/disney.png'), brandColor: '#00D4FF' },
    { id: '3', name: 'Prime Video', logoReq: require('../../assets/platforms/prime.png'), brandColor: '#00A8E8' },
    { id: '5', name: 'Apple TV+', logoReq: require('../../assets/platforms/appletv.png'), brandColor: '#1C1C1E' },

    { id: '6', name: 'Paramount+', logoReq: require('../../assets/platforms/paramount.png'), brandColor: '#0064FF' },
    { id: '8', name: 'Crunchyroll', logoReq: require('../../assets/platforms/crunchyroll.png'), brandColor: '#F47521' },

    { id: '4', name: 'Max', logoReq: require('../../assets/platforms/max.png'), brandColor: '#6B21A8' },

    { id: '7', name: 'Hulu', logoReq: require('../../assets/platforms/hulu.png'), brandColor: '#1CE783' },

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
                            { backgroundColor: 'rgba(0,0,0,0.6)' },
                            index !== STATIC_PLATFORMS.length - 1 && { marginRight: scale(14) }
                        ]}
                    >
                        <Image
                            source={item.logoReq}
                            style={s.logo}
                            resizeMode="contain"
                        />
                    </View>
                ))}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    section: {
        marginBottom: scale(28),
    },
    header: {
        paddingHorizontal: scale(56),
        marginBottom: scale(1),
    },
    sectionTitle: {
        fontSize: scale(16), // Smaller title
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)', // Slightly dimmed
        letterSpacing: 0.4,
    },
    listContent: {
        flexDirection: 'row',
        paddingHorizontal: scale(56),
        paddingTop: scale(8),
        paddingBottom: scale(8),
    },
    circle: {
        width: scale(54), // Smaller circles
        height: scale(54),
        borderRadius: scale(27),
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '65%',
        height: '65%',
    },
});

const TVPlatformRow = memo(TVPlatformRowInner);
export default TVPlatformRow;
