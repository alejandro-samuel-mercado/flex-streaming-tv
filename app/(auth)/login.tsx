import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { User, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';
import { scale } from '../../lib/scale';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── TV Optimized Input Field ────────────────────────────────────────────────
function TVInputField({
  value, onChange, secureText, icon: Icon,
  hasTVPreferredFocus, returnKeyType, onSubmitEditing,
}: {
  value: string;
  onChange: (v: string) => void;
  secureText?: boolean;
  icon: any;
  hasTVPreferredFocus?: boolean;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const scaleAnim = useSharedValue(1);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(scaleAnim.value, { duration: 150 }) }],
  }));

  return (
    <Animated.View style={[s.fieldRow, animStyle]}>
      <View style={[s.iconBox, focused && s.iconBoxFocused]}>
        <Icon size={scale(28)} color={focused ? '#FFFFFF' : '#9CA3AF'} strokeWidth={3} />
      </View>

      <Pressable
        focusable
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={() => { setFocused(true); scaleAnim.value = 1.04; }}
        onBlur={() => { setFocused(false); scaleAnim.value = 1; }}
        onPress={handlePress}
        style={[s.inputBox, focused && s.inputBoxFocused]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secureText && !showPass}
          style={[s.textInput, focused && s.textInputFocused]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType || 'next'}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </Pressable>

      {secureText && (
        <Pressable
          focusable={false}
          onPress={() => setShowPass(p => !p)}
          hitSlop={20}
          style={s.eyeBox}
        >
          {showPass
            ? <EyeOff size={scale(24)} color="#9CA3AF" />
            : <Eye size={scale(24)} color="#9CA3AF" />
          }
        </Pressable>
      )}
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
    <Animated.View style={[s.submitWrapper, animStyle]}>
      <Pressable
        focusable
        onFocus={() => { setFocused(true); scaleAnim.value = 1.06; }}
        onBlur={() => { setFocused(false); scaleAnim.value = 1; }}
        onPress={onPress}
        disabled={loading}
        style={[s.submitBtn, focused && s.submitBtnFocused]}
      >
        {loading
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Text style={[s.submitText, focused && s.submitTextFocused]}>Aceptar</Text>
        }
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const passwordRef = useRef<TextInput>(null);

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
        // Run login context setup asynchronously so it doesn't block UI navigation
        login(res.data.accessToken, res.data.refreshToken, res.data.user).catch(console.warn);
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
      {/* Animated Divergent Cosmic Background */}
      <TVCosmicBackground />

      <View style={s.contentWrapper}>
        {/* Left Side: Form */}
        <View style={s.formSide}>
          <Animated.Text style={s.mainTitle}>
            Iniciar Sesión
          </Animated.Text>
          
          <Animated.View style={[s.loginCard, { backgroundColor: 'rgba(10, 10, 15, 0.95)' }]}>

            <View style={s.form}>
              <TVInputField
                value={username}
                onChange={setUsername}
                icon={User}
                hasTVPreferredFocus
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <TVInputField
                value={password}
                onChange={setPassword}
                secureText
                icon={Lock}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              {!!errorMsg && (
                <View style={s.errorContainer}>
                  <Text style={s.errorText}>{errorMsg}</Text>
                </View>
              )}
              <SubmitButton onPress={handleLogin} loading={loading} />
            </View>
          </Animated.View>
        </View>

        {/* Right Side: Big Logo */}
        <Animated.View style={s.brandSide}>
           <Image source={require('../../assets/logo.png')} style={s.logo} contentFit="contain" />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070614',
    justifyContent: 'center',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(100),
    gap: scale(100),
    width: '100%',
    justifyContent: 'center',
  },

  // ── Form Side (Left) ──
  formSide: {
    width: scale(540),
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: scale(52),
    fontWeight: '800',
    color: '#FFFFFF',
    alignSelf: 'flex-start',
    marginBottom: scale(30),
    marginLeft: scale(20),
  },
  loginCard: {
    backgroundColor: 'rgba(10, 10, 15, 0.55)', // Translucent glass base
    borderRadius: scale(24),
    paddingHorizontal: scale(42),
    paddingVertical: scale(62),
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  form: {
    gap: scale(34),
  },

  // ── Input Fields ──
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
  },
  iconBox: {
    width: scale(72),
    height: scale(72),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxFocused: {
    backgroundColor: '#3b82f6', // Bright blue on focus
  },
  inputBox: {
    flex: 1,
    height: scale(72),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: scale(16),
    paddingHorizontal: scale(24),
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputBoxFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#3b82f6',
  },
  textInput: {
    fontSize: scale(24),
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
    margin: 0,
  },
  textInputFocused: {
    color: '#000000',
  },
  eyeBox: {
    position: 'absolute',
    right: scale(-40),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Submit Button ──
  submitWrapper: {
    alignItems: 'center',
    marginTop: scale(20),
  },
  submitBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Dark glass button
    paddingVertical: scale(14),
    paddingHorizontal: scale(48),
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  submitBtnFocused: {
    backgroundColor: '#FFFFFF', // Highlight white on focus
    borderColor: '#FFFFFF',
  },
  submitText: {
    fontSize: scale(24),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  submitTextFocused: {
    color: '#000000',
  },

  // ── Error Message ──
  errorContainer: {
    marginTop: scale(10),
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Light translucent red
    padding: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#FCA5A5', // Light red for dark backgrounds
    fontSize: scale(14),
    fontWeight: '700',
    textAlign: 'center',
  },

  // ── Brand Side (Right) ──
  brandSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: scale(450),
    height: scale(250),
  },
});
