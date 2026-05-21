import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { scale } from '../../lib/scale';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Primitive skeleton block ────────────────────────────────────────────────
function SkeletonBlock({ width, height, borderRadius = scale(12), style }: {
    width: number | string;
    height: number | string;
    borderRadius?: number;
    style?: any;
}) {
    return (
        <View
            style={[
                {
                    width: width as any,
                    height: height as any,
                    borderRadius,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                },
                style,
            ]}
        />
    );
}

// ─── Home Skeleton ────────────────────────────────────────────────────────────
export function TVHomeSkeleton() {
    const BANNER_H = SH * 0.72;
    const CARD_W = scale(320);
    const CARD_H = CARD_W * 9 / 16;

    return (
        <View style={s.container}>
            {/* Hero banner */}
            <SkeletonBlock width={SW} height={BANNER_H} borderRadius={0} />

            {/* Rows */}
            <View style={[s.rows, { marginTop: -scale(140) }]}>
                {[0, 1, 2].map(row => (
                    <View key={row} style={s.row}>
                        <SkeletonBlock width={scale(200)} height={scale(22)} borderRadius={scale(6)} style={{ marginBottom: scale(16) }} />
                        <View style={s.cardRow}>
                            {[0, 1, 2, 3, 4].map(card => (
                                <SkeletonBlock key={card} width={CARD_W} height={CARD_H} />
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Explore Skeleton ─────────────────────────────────────────────────────────
export function TVExploreSkeleton() {
    const CARD_W = scale(280);
    const CARD_H = CARD_W * 9 / 16;

    return (
        <View style={[s.container, { paddingTop: scale(130), paddingHorizontal: scale(60) }]}>
            {/* Tabs */}
            <View style={[s.cardRow, { marginBottom: scale(32), gap: scale(12) }]}>
                {[0, 1, 2, 3, 4].map(i => (
                    <SkeletonBlock key={i} width={scale(110)} height={scale(40)} borderRadius={scale(20)} />
                ))}
            </View>
            {/* Grid */}
            {[0, 1, 2].map(row => (
                <View key={row} style={[s.cardRow, { marginBottom: scale(24) }]}>
                    {[0, 1, 2, 3].map(card => (
                        <SkeletonBlock key={card} width={CARD_W} height={CARD_H} />
                    ))}
                </View>
            ))}
        </View>
    );
}

// ─── Film Detail Skeleton ─────────────────────────────────────────────────────
export function TVFilmDetailSkeleton() {
    return (
        <View style={[s.container, { flexDirection: 'row', paddingTop: scale(100), paddingHorizontal: scale(80) }]}>
            {/* Left: poster */}
            <SkeletonBlock width={scale(340)} height={scale(500)} borderRadius={scale(20)} style={{ marginRight: scale(60) }} />

            {/* Right: text lines */}
            <View style={{ flex: 1, gap: scale(16), paddingTop: scale(40) }}>
                <SkeletonBlock width="60%" height={scale(40)} borderRadius={scale(8)} />
                <SkeletonBlock width="40%" height={scale(22)} borderRadius={scale(6)} />
                <SkeletonBlock width="80%" height={scale(18)} borderRadius={scale(6)} />
                <SkeletonBlock width="70%" height={scale(18)} borderRadius={scale(6)} />
                <SkeletonBlock width="75%" height={scale(18)} borderRadius={scale(6)} style={{ marginTop: scale(8) }} />
                <View style={[s.cardRow, { marginTop: scale(24), gap: scale(16) }]}>
                    <SkeletonBlock width={scale(160)} height={scale(52)} borderRadius={scale(14)} />
                    <SkeletonBlock width={scale(160)} height={scale(52)} borderRadius={scale(14)} />
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    rows: { zIndex: 10, paddingHorizontal: scale(60) },
    row: { marginBottom: scale(40) },
    cardRow: { flexDirection: 'row', gap: scale(20) },
});
