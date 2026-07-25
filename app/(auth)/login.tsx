import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useDoubleBackExit } from "../../hooks/useDoubleBackExit";
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withRepeat, withSequence, FadeInUp, FadeIn } from 'react-native-reanimated';
import { User, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import { scale } from '../../lib/scale';

const { width: SW, height: SH } = Dimensions.get('window');

import TVCosmicBackground from '../../components/tv/TVCosmicBackground';

// ─── TV Optimized Input Field ────────────────────────────────────────────────
function TVInputField({
    value, onChange, secureText, icon: Icon,
    hasTVPreferredFocus, returnKeyType, onSubmitEditing,
    placeholder, inputRef: propRef
}: {
    value: string;
    onChange: (v: string) => void;
    secureText?: boolean;
    icon: any;
    hasTVPreferredFocus?: boolean;
    returnKeyType?: any;
    onSubmitEditing?: () => void;
    placeholder?: string;
    inputRef?: React.RefObject<TextInput>;
}) {
    const [focused, setFocused] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const internalRef = useRef<TextInput>(null);
    const inputRef = propRef || internalRef;

    const scaleAnim = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(scaleAnim.value, { duration: 150 }) }],
    }));

    return (
        <Animated.View style={[s.fieldRow, animStyle]}>
            <View style={s.inputContainer}>
                <View style={s.inputIcon}>
                    <Icon size={scale(22)} color={focused ? '#00E5FF' : '#6B7280'} />
                </View>

                <View style={[s.inputBox, focused && s.inputBoxFocused]}>
                    <TextInput
                        ref={inputRef}
                        focusable={true}
                        hasTVPreferredFocus={hasTVPreferredFocus}
                        onFocus={() => { setFocused(true); scaleAnim.value = 1.02; }}
                        onBlur={() => { setFocused(false); scaleAnim.value = 1; }}
                        value={value}
                        onChangeText={onChange}
                        secureTextEntry={secureText && !showPass}
                        style={[s.textInput, { flex: 1, height: '100%' }, focused && s.textInputFocused]}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType={returnKeyType || 'next'}
                        onSubmitEditing={onSubmitEditing}
                        blurOnSubmit={false}
                        placeholder={placeholder}
                        placeholderTextColor="#4B5563"
                    />
                </View>

                {secureText && (
                    <Pressable
                        focusable={false}
                        onPress={() => setShowPass(p => !p)}
                        style={s.eyeBox}
                    >
                        {showPass
                            ? <EyeOff size={scale(22)} color="#6B7280" />
                            : <Eye size={scale(22)} color="#6B7280" />
                        }
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

// ─── Submit Button ─────────────────────────────────────────────────────────────
function SubmitButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withTiming(scaleAnim.value, { duration: 150 }) }],
    }));

    return (
        <Pressable
            focusable
            onFocus={() => { setFocused(true); scaleAnim.value = 1.04; }}
            onBlur={() => { setFocused(false); scaleAnim.value = 1; }}
            onPress={onPress}
            style={s.submitWrapper}
        >
            <Animated.View style={[s.submitBtn, focused && s.submitBtnFocused, animStyle]}>
                <LinearGradient
                    colors={focused ? ['#4DEDFF', '#00E5FF'] : ['#00E5FF', '#0099AA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.submitGradient}
                >
                    {loading
                        ? <ActivityIndicator size="small" color="#02040A" />
                        : <Text style={s.submitText}>INICIAR SESIÓN</Text>
                    }
                </LinearGradient>
            </Animated.View>
        </Pressable>
    );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function LoginScreen() {
    useDoubleBackExit();
    const router = useRouter();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const passwordRef = useRef<TextInput>(null);

    const [kbVisible, setKbVisible] = useState(false);
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const kbOffset = -scale(220);
    const kbAnimStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: withTiming(kbVisible ? kbOffset : 0, { duration: 300, easing: Easing.out(Easing.ease) }) }]
    }));

    const handleLogin = async () => {
        setErrorMsg('');
        if (!username.trim() || !password.trim()) {
            setErrorMsg('Por favor ingresa tu usuario y contraseña.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetchApi(API_ROUTES.AUTH.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ username: username.trim(), password }),
            });
            if (res.success && res.data?.accessToken) {
                await login(res.data.accessToken, res.data.refreshToken, res.data.user);
                router.replace('/(tv)/home');
            } else {
                setErrorMsg(res.message || 'Usuario o contraseña incorrectos.');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'No se pudo conectar con el servidor. Verifica tu red.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={s.container}>
            <TVCosmicBackground />

            <Animated.View style={[s.contentWrapper, { flex: 1 }, kbAnimStyle]}>
                    {/* Form Side */}
                    <View style={s.formSide}>
                    {/* Ethereal Glow behind the card */}
                    <View style={s.glowOrb} pointerEvents="none" />
                    <View style={s.glowOrb2} pointerEvents="none" />
                    
                    <View style={s.glassCard}>
                        
                        <View style={s.logoContainer}>
                            <Image source={require('../../assets/logo.png')} style={s.logo} contentFit="contain" />
                        </View>

                        <Text style={s.title}>Bienvenido de vuelta</Text>
                        <Text style={s.subtitle}>Iniciá sesión para continuar la experiencia</Text>

                        <View style={s.form}>
                            <TVInputField
                                value={username}
                                onChange={setUsername}
                                icon={User}
                                hasTVPreferredFocus
                                placeholder="Usuario"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                            />
                            <TVInputField
                                value={password}
                                onChange={setPassword}
                                secureText
                                icon={Lock}
                                placeholder="Contraseña"
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                                inputRef={passwordRef}
                            />
                            {!!errorMsg && (
                                <View style={s.errorContainer}>
                                    <Text style={s.errorText}>{errorMsg}</Text>
                                </View>
                            )}
                            <SubmitButton onPress={handleLogin} loading={loading} />
                        </View>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#02040A',
        justifyContent: 'center',
        alignItems: 'center',
    },


    contentWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    formSide: {
        width: scale(580),
        alignItems: 'center',
    },
    glowOrb: {
        position: 'absolute',
        width: scale(500),
        height: scale(500),
        borderRadius: scale(250),
        backgroundColor: 'rgba(0, 229, 255, 0.12)',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -scale(250) }, { translateY: -scale(250) }],
    },
    glowOrb2: {
        position: 'absolute',
        width: scale(400),
        height: scale(400),
        borderRadius: scale(200),
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        top: '30%',
        left: '30%',
        transform: [{ translateX: -scale(200) }, { translateY: -scale(200) }],
    },
    glassCard: {
        width: '100%',
        backgroundColor: 'rgba(10, 15, 36, 0.65)', // More transparent for better glass effect
        borderRadius: scale(40),
        paddingHorizontal: scale(56),
        paddingVertical: scale(56),
        borderTopWidth: 1.5,
        borderLeftWidth: 1.5,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#00E5FF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 60,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: scale(48),
    },
    logo: {
        width: scale(220),
        height: scale(65),
    },
    title: {
        fontSize: scale(32),
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: scale(8),
    },
    subtitle: {
        fontSize: scale(16),
        fontWeight: '500',
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: scale(40),
    },
    form: {
        gap: scale(24),
    },

    // ── Input Fields ──
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputContainer: {
        flex: 1,
        height: scale(64),
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: scale(20),
        zIndex: 2,
    },
    inputBox: {
        flex: 1,
        height: '100%',
        backgroundColor: 'rgba(3, 6, 18, 0.9)',
        borderRadius: scale(16),
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingLeft: scale(56),
        paddingRight: scale(56),
        justifyContent: 'center',
    },
    inputBoxFocused: {
        backgroundColor: '#0A0F24',
        borderColor: '#FFFFFF',
        transform: [{ scale: 1.04 }],
        elevation: 10,
    },
    textInput: {
        fontSize: scale(18),
        fontWeight: '600',
        color: '#FFFFFF',
        padding: 0,
        margin: 0,
    },
    textInputFocused: {
        color: '#FFFFFF',
    },
    eyeBox: {
        position: 'absolute',
        right: scale(20),
        zIndex: 2,
    },

    // ── Submit Button ──
    submitWrapper: {
        marginTop: scale(12),
        width: '100%',
    },
    submitBtn: {
        width: '100%',
        height: scale(64),
        borderRadius: scale(16),
        borderWidth: 3,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    submitBtnFocused: {
        borderColor: '#FFFFFF',
        transform: [{ scale: 1.08 }],
        elevation: 10,
    },
    submitGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitText: {
        fontSize: scale(18),
        fontWeight: '900',
        color: '#02040A',
        letterSpacing: 2,
    },

    // ── Error Message ──
    errorContainer: {
        backgroundColor: 'rgba(255, 0, 85, 0.1)',
        borderLeftWidth: 4,
        borderLeftColor: '#FF0055',
        padding: scale(16),
        borderRadius: scale(8),
    },
    errorText: {
        color: '#FF0055',
        fontSize: scale(14),
        fontWeight: '700',
    },
});
