import React, { useEffect, memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withRepeat, withSequence } from 'react-native-reanimated';
import { scale } from '../../lib/scale';

const { width: SW, height: SH } = Dimensions.get('window');

// Generate static sparkle positions once, split into 3 groups (reduced count for performance)
const SPARKLES_G1 = Array.from({ length: 4 }).map((_, i) => ({
    id: `g1_${i}`, top: Math.random() * SH, left: Math.random() * SW,
    size: Math.random() * 4 + 4, opacity: Math.random() * 0.6 + 0.4,
    color: Math.random() > 0.5 ? '#FFFFFF' : '#00E5FF'
}));
const SPARKLES_G2 = Array.from({ length: 4 }).map((_, i) => ({
    id: `g2_${i}`, top: Math.random() * SH, left: Math.random() * SW,
    size: Math.random() * 4 + 4, opacity: Math.random() * 0.6 + 0.4,
    color: Math.random() > 0.5 ? '#FFFFFF' : '#8A2BE2'
}));
const SPARKLES_G3 = Array.from({ length: 4 }).map((_, i) => ({
    id: `g3_${i}`, top: Math.random() * SH, left: Math.random() * SW,
    size: Math.random() * 4 + 4, opacity: Math.random() * 0.6 + 0.4,
    color: '#FFFFFF'
}));

function TVCosmicBackgroundInner() {
    const breatheAnim = useSharedValue(0.4);
    const twinkle1 = useSharedValue(0.2);
    const twinkle2 = useSharedValue(0.8);
    const twinkle3 = useSharedValue(0.5);

    useEffect(() => {
        breatheAnim.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        twinkle1.value = withRepeat(withSequence(withTiming(1, { duration: 2000 }), withTiming(0.2, { duration: 2000 })), -1, true);
        twinkle2.value = withRepeat(withSequence(withTiming(0.2, { duration: 3000 }), withTiming(1, { duration: 3000 })), -1, true);
        twinkle3.value = withRepeat(withSequence(withTiming(1, { duration: 2500 }), withTiming(0.3, { duration: 2500 })), -1, true);
    }, []);

    const animStyle = useAnimatedStyle(() => ({ opacity: breatheAnim.value }));
    const t1Style = useAnimatedStyle(() => ({ opacity: twinkle1.value }));
    const t2Style = useAnimatedStyle(() => ({ opacity: twinkle2.value }));
    const t3Style = useAnimatedStyle(() => ({ opacity: twinkle3.value }));

    return (
        <View style={s.container} pointerEvents="none">
            {/* Base dark gradient */}
            <LinearGradient
                colors={['#050B14', '#02040A', '#000000']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Animated Neon Flashes */}
            <Animated.View style={[StyleSheet.absoluteFillObject, animStyle]}>
                <View style={s.neonCyan} />
                <View style={s.neonPurple} />
                <View style={s.neonOrange} />
            </Animated.View>

            {/* Subtle glass overlay to blend the neons */}
            <View style={s.glassOverlay} />

            {/* Sparkles / Stars (Rendered ABOVE the overlay so they pop) */}
            <Animated.View style={[StyleSheet.absoluteFillObject, t1Style]}>
                {SPARKLES_G1.map(sp => <SparkleDot key={sp.id} sp={sp} />)}
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFillObject, t2Style]}>
                {SPARKLES_G2.map(sp => <SparkleDot key={sp.id} sp={sp} />)}
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFillObject, t3Style]}>
                {SPARKLES_G3.map(sp => <SparkleDot key={sp.id} sp={sp} />)}
            </Animated.View>
        </View>
    );
}

export default memo(TVCosmicBackgroundInner);

// Sparkle subcomponent to keep JSX clean (removed expensive shadows for TV perf)
const SparkleDot = memo(({ sp }: { sp: any }) => (
    <View
        style={{
            position: 'absolute',
            top: sp.top,
            left: sp.left,
            width: sp.size,
            height: sp.size,
            borderRadius: sp.size / 2,
            backgroundColor: sp.color,
            opacity: sp.opacity,
        }}
    />
));

const s = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#02040A',
        zIndex: -1,
    },
    neonCyan: {
        position: 'absolute',
        top: -SH * 0.3,
        left: -SW * 0.1,
        width: SW * 0.7,
        height: SW * 0.7,
        borderRadius: SW * 0.35,
        backgroundColor: 'rgba(0, 229, 255, 0.12)', // Neon Cyan
    },
    neonPurple: {
        position: 'absolute',
        top: SH * 0.2,
        left: SW * 0.4,
        width: SW * 0.5,
        height: SW * 0.5,
        borderRadius: SW * 0.25,
        backgroundColor: 'rgba(138, 43, 226, 0.08)', // Deep Purple
    },
    neonOrange: {
        position: 'absolute',
        bottom: -SH * 0.3,
        right: -SW * 0.1,
        width: SW * 0.6,
        height: SW * 0.6,
        borderRadius: SW * 0.3,
        backgroundColor: 'rgba(255, 107, 0, 0.12)', // Neon Orange
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(2, 4, 10, 0.3)', 
    }
});
