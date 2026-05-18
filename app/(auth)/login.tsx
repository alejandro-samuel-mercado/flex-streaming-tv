import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Mail, Lock, Eye, EyeOff, LogIn, ChevronRight } from 'lucide-react-native';
import { Colors } from '../../theme/colors';
import { fetchApi } from '../../lib/api-client';
import { API_ROUTES } from '../../lib/api-routes';
import { useAuth } from '../../context/AuthContext';
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';

// ─── TV Optimized Input Field ─────────────────────────────────────────────────
function TVInputField({
  label, value, onChange, placeholder, secureText, icon: Icon,
  hasTVPreferredFocus, returnKeyType, onSubmitEditing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secureText?: boolean;
  icon: any;
  hasTVPreferredFocus?: boolean;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // For TV, we only want the keyboard to appear when the user PRESSED 'OK' on the field.
  // Navigating over it with the D-Pad should only highlight the wrapper.
  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={s.fieldContainer}>
      <Text style={[s.fieldLabel, focused && s.fieldLabelFocused]}>{label}</Text>
      <Pressable
        focusable
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={handlePress}
        style={[s.fieldWrap, focused && s.fieldWrapFocused]}
      >
        <Icon size={24} color={focused ? Colors.black : 'rgba(255,255,255,0.4)'} strokeWidth={2.5} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={focused ? '' : placeholder} // Clear placeholder when focused for cleaner typing
          placeholderTextColor="rgba(255,255,255,0.2)"
          secureTextEntry={secureText && !showPass}
          style={[s.textInput, focused && s.textInputFocused]}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={label.includes('Correo') ? 'email-address' : 'default'}
          returnKeyType={returnKeyType || 'next'}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
        />
        {secureText && (
          <Pressable
            focusable={false}
            onPress={() => setShowPass(p => !p)}
            hitSlop={12}
          >
            {showPass
              ? <EyeOff size={24} color={focused ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)'} />
              : <Eye size={24} color={focused ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)'} />
            }
          </Pressable>
        )}
      </Pressable>
    </View>
  );
}

// ─── Submit Button ─────────────────────────────────────────────────────────────
function SubmitButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      focusable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      disabled={loading}
      style={[s.submitBtn, focused && s.submitBtnFocused]}
    >
      {loading
        ? <ActivityIndicator size="small" color={focused ? Colors.black : Colors.white} />
        : (
          <>
            <Text style={[s.submitText, focused && s.submitTextFocused]}>INICIAR SESIÓN</Text>
            <ChevronRight size={24} color={focused ? Colors.black : Colors.accent} strokeWidth={3} />
          </>
        )
      }
    </Pressable>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu usuario y contraseña.');
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
        Alert.alert('Acceso Denegado', res.message || 'Usuario o contraseña incorrectos.');
      }
    } catch {
      Alert.alert('Error de Conexión', 'No se pudo conectar con el servidor. Verifica tu red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <TVCosmicBackground />

      <View style={s.contentWrapper}>
        {/* Left Side: Cinematic Branding */}
        <Animated.View entering={FadeIn.duration(800)} style={s.leftSide}>
           <Image source={require('../../assets/logo.png')} style={s.logo} contentFit="contain" />
           <Text style={s.heroText}>Disfruta del mejor contenido en pantalla grande.</Text>
           <Text style={s.subHeroText}>Inicia sesión para acceder a tu catálogo exclusivo de películas y series en máxima calidad.</Text>
        </Animated.View>

        {/* Right Side: Floating Login Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={s.rightSide}>
          <View style={s.loginCard}>
            <View style={s.cardHeader}>
              <LogIn size={32} color={Colors.accent} />
              <Text style={s.cardTitle}>Acceder</Text>
            </View>

            <View style={s.form}>
              <TVInputField
                label="USUARIO"
                value={username}
                onChange={setUsername}
                placeholder="Ingresa tu usuario"
                icon={Mail}
                hasTVPreferredFocus
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <TVInputField
                label="CONTRASEÑA"
                value={password}
                onChange={setPassword}
                placeholder="Ingresa tu contraseña"
                secureText
                icon={Lock}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <View style={s.actionRow}>
                <SubmitButton onPress={handleLogin} loading={loading} />
              </View>
            </View>
            
            <Text style={s.footerNote}>
              ¿Olvidaste tu contraseña? Visita peliplus.com/recovery desde tu móvil o PC.
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02040A',
    justifyContent: 'center',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 100,
    gap: 80,
  },

  // ── Left Side ──
  leftSide: {
    flex: 1,
    paddingVertical: 40,
  },
  logo: {
    width: 260,
    height: 80,
    marginBottom: 60,
  },
  heroText: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 64,
    letterSpacing: -1,
    marginBottom: 24,
  },
  subHeroText: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 34,
    maxWidth: '85%',
  },

  // ── Right Side / Form ──
  rightSide: {
    width: 520,
  },
  loginCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 32,
    padding: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    // Fake blur effect using solid dark color with low opacity over the cosmic bg
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 48,
  },
  cardTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
  },
  form: {
    gap: 32,
  },

  // ── Input Fields ──
  fieldContainer: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginLeft: 8,
  },
  fieldLabelFocused: {
    color: Colors.accent,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  fieldWrapFocused: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
    transform: [{ scale: 1.05 }],
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: Colors.white,
    padding: 0,
    margin: 0,
  },
  textInputFocused: {
    color: Colors.black, // Dark text when the wrapper becomes white
  },

  // ── Submit Button ──
  actionRow: {
    marginTop: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingVertical: 22,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  submitBtnFocused: {
    backgroundColor: Colors.accent,
    transform: [{ scale: 1.05 }],
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  submitText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.accent,
    letterSpacing: 2,
  },
  submitTextFocused: {
    color: Colors.black,
  },

  footerNote: {
    marginTop: 40,
    fontSize: 15,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 22,
  },
});
