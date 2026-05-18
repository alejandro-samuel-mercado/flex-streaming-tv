import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { LogOut, User, Settings, CreditCard, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import { TV } from '../../theme/tv';
import { useAuth } from '../../context/AuthContext';
import TVCosmicBackground from '../../components/tv/TVCosmicBackground';

const TVFocusGuide = (require('react-native') as any).TVFocusGuideView ?? View;

// ─── Profile Action Button ─────────────────────────────────────────────────────
function ProfileActionButton({
  label, icon: Icon, onPress, hasTVPreferredFocus, isDestructive,
}: {
  label: string;
  icon: any;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  isDestructive?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        s.actionBtn,
        focused && s.actionBtnFocused,
        isDestructive && s.actionBtnDestructive,
        focused && isDestructive && s.actionBtnDestructiveFocused,
      ]}
    >
      <Icon
        size={28}
        color={
          focused
            ? (isDestructive ? Colors.white : Colors.black)
            : (isDestructive ? Colors.error : Colors.accent)
        }
        strokeWidth={2.5}
      />
      <Text style={[
        s.actionText,
        focused && s.actionTextFocused,
        isDestructive && s.actionTextDestructive,
        focused && isDestructive && { color: Colors.white },
      ]}>
        {label}
      </Text>
      <View style={{ flex: 1 }} />
      <ChevronRight
        size={24}
        color={
          focused
            ? (isDestructive ? Colors.white : Colors.black)
            : 'rgba(255,255,255,0.2)'
        }
      />
    </Pressable>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Salir',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={[s.container, s.centerContainer]}>
        <TVCosmicBackground />
        <Animated.View entering={FadeInDown.duration(600)} style={s.emptyCard}>
          <User size={80} color="rgba(255,255,255,0.2)" style={{ marginBottom: 24 }} />
          <Text style={s.emptyTitle}>No has iniciado sesión</Text>
          <Text style={s.emptySubtitle}>Inicia sesión para ver tu lista de favoritos, retomar tus películas pendientes y gestionar tu cuenta.</Text>
          <ProfileActionButton
            label="INICIAR SESIÓN"
            icon={User}
            onPress={() => router.push('/(auth)/login')}
            hasTVPreferredFocus
          />
        </Animated.View>
      </View>
    );
  }

  const currentProfile = user?.profiles?.[0];
  const acc = user?.endUserAccount;
  const isPremium = acc?.planId != null;

  // Smart client-side calculation to detect stacked/accumulated plans
  let isAccumulated = false;
  if (isPremium && acc?.endDate && acc?.plan?.durationDays) {
    const today = new Date();
    const expiry = new Date(acc.endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const baseDuration = acc.plan.durationDays + (acc.plan.bonusDays || 0);
    
    // If remaining days are greater than the base duration plus a small buffer of 5 days, it's stacked
    if (remainingDays > baseDuration + 5) {
      isAccumulated = true;
    }
  }

  return (
    <TVFocusGuide destinations={[]} style={s.container}>
      <TVCosmicBackground />

      <View style={s.contentWrapper}>
        
        {/* ── Left Side: User Identity Card ── */}
        <Animated.View entering={FadeIn.duration(800)} style={s.leftSide}>
          <Text style={s.pageTitle}>Mi Cuenta</Text>

          <View style={s.identityCard}>
            <View style={s.avatarSection}>
              <View style={s.avatarBig}>
                <Text style={s.avatarBigText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={s.userInfoCol}>
                <Text style={s.userName} numberOfLines={1}>{user?.name}</Text>
                <Text style={s.userEmail} numberOfLines={1}>{user?.email}</Text>
                <Text style={s.userRole}>Rol: {user?.role === 'ADMIN' ? 'Administrador' : 'Cliente'}</Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.planSection}>
              <View style={s.planHeader}>
                <CreditCard size={24} color={isPremium ? Colors.accent : Colors.textMuted} />
                <Text style={s.planTitle}>
                  {isPremium ? 'Suscripción Activa' : 'Sin Suscripción Activa'}
                </Text>
              </View>
              {isPremium ? (
                <View style={s.planDetailsGrid}>
                  <View style={s.planDetailRow}>
                    <Text style={s.planDetailLabel}>Plan contratado:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.planDetailValue}>{acc?.plan?.name || 'Premium'}</Text>
                      {isAccumulated && (
                        <View style={s.accumulatedBadge}>
                          <Text style={s.accumulatedBadgeText}>ACUMULADO</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={s.planDetailRow}>
                    <Text style={s.planDetailLabel}>Dispositivos:</Text>
                    <Text style={s.planDetailValue}>Hasta {acc?.maxDevices || 4} simultáneos</Text>
                  </View>
                  <View style={s.planDetailRow}>
                    <Text style={s.planDetailLabel}>Estado de cuenta:</Text>
                    <Text style={[s.planDetailValue, { color: '#10B981' }]}>Activo</Text>
                  </View>
                  {acc?.endDate && (
                    <View style={s.planDetailRow}>
                      <Text style={s.planDetailLabel}>Fecha de vencimiento:</Text>
                      <Text style={s.planDetailValue}>{new Date(acc.endDate).toLocaleDateString()}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={s.planDesc}>
                  Adquiere una suscripción en la plataforma para desbloquear la reproducción en alta definición de todo el catálogo.
                </Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* ── Right Side: Action Menu ── */}
        <Animated.View entering={FadeInRight.delay(200).duration(600).springify()} style={s.rightSide}>
          <Text style={s.menuLabel}>MI ESPACIO</Text>
          
          <View style={s.menuList}>
            <ProfileActionButton
              label="Mi Lista de Favoritos"
              icon={User}
              onPress={() => router.push('/(tv)/favorites')}
              hasTVPreferredFocus
            />
            <ProfileActionButton
              label="Historial de Reproducción"
              icon={Settings}
              onPress={() => router.push('/(tv)/history')}
            />
            <ProfileActionButton
              label="Cerrar Sesión"
              icon={LogOut}
              onPress={handleLogout}
              isDestructive
            />
          </View>
        </Animated.View>

      </View>
    </TVFocusGuide>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#02040A',
    paddingTop: 140, // Clears the top nav
    paddingHorizontal: 80,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
  },

  contentWrapper: {
    flexDirection: 'row',
    gap: 80,
  },

  // ── Left Side (Identity) ──
  leftSide: {
    flex: 1,
    maxWidth: 600,
  },
  pageTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
    marginBottom: 40,
  },
  identityCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 32,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  avatarBig: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  avatarBigText: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.black,
  },
  userInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 40,
  },
  planSection: {
    gap: 16,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
  },
  planDesc: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 24,
  },
  planDetailsGrid: {
    gap: 12,
    marginTop: 8,
  },
  planDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  planDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  planDetailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  accumulatedBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  accumulatedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  datePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  datePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },

  // ── Right Side (Menu) ──
  rightSide: {
    flex: 1,
    paddingTop: 8,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 3,
    marginBottom: 24,
    marginLeft: 8,
  },
  menuList: {
    gap: 16,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 32,
    paddingVertical: 28,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionBtnFocused: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
    transform: [{ scale: 1.03 }],
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 10,
  },
  actionText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  actionTextFocused: {
    color: Colors.black,
  },

  actionBtnDestructive: {
    marginTop: 24,
    backgroundColor: 'rgba(239,68,68,0.05)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  actionBtnDestructiveFocused: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
    shadowColor: Colors.error,
  },
  actionTextDestructive: {
    color: Colors.error,
  },

  // ── Empty State ──
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 60,
    borderRadius: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: 600,
  },
  emptyTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 16,
  },
  emptySubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
});
