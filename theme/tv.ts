import { Dimensions } from 'react-native';
import { scale } from '../lib/scale';

const { width: W, height: H } = Dimensions.get('window');

/**
 * Nuba TV — TV-specific constants
 * All sizing designed for 1920x1080 landscape TV screens
 */
export const TV = {
  // === SCREEN ===
  width: W,
  height: H,

  // === SIDEBAR ===
  sidebarCollapsed: scale(72),   // Icon-only mode
  sidebarExpanded: scale(260),   // Icon + label mode
  sidebarExpandDuration: 200,

  // === LAYOUT ===
  contentPaddingLeft: scale(32),
  contentPaddingRight: scale(32),
  contentPaddingTop: scale(24),

  // === HERO BANNER ===
  heroBannerHeight: H * 0.68,
  heroAutoRotateMs: 7000,

  // === FILM CARDS ===
  cardBorderRadius: scale(14),
  cardFocusedScale: 1.10,
  cardAnimDuration: 150,

  // Card sizes in rows
  cardWidthLarge: scale(240),    // "Continue Watching" landscape cards
  cardWidthPoster: scale(160),   // Portrait poster cards (Rakuten TV style)
  cardHeightLarge: scale(140),
  cardHeightPoster: scale(240),

  // Film row
  rowGap: scale(16),
  rowItemGap: scale(14),

  // === FOCUS ===
  focusBorderWidth: scale(4),
  focusBorderRadius: scale(14),
  focusShadowRadius: scale(18),
  focusShadowOpacity: 0.7,
  focusAnimDuration: 150,

  // === TYPOGRAPHY ===
  fontXXL: scale(52),    // Hero title
  fontXL: scale(36),     // Section title
  fontL: scale(24),      // Card title
  fontM: scale(18),      // Body
  fontS: scale(14),      // Metadata
  fontXS: scale(12),     // Labels

  // === PLAYER OSD ===
  playerOSDHideMs: 4000,  // ms before OSD auto-hides
  seekStepSeconds: 10,    // D-Pad left/right seek amount
  progressSaveIntervalMs: 5000, // API progress save interval

  // === KEYBOARD ===
  keyboardKeySize: scale(56),
  keyboardKeyGap: scale(8),

  // === ANIMATION ===
  transitionDuration: 250,
} as const;
