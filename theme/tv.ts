import { Dimensions } from 'react-native';

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
  sidebarCollapsed: 72,   // Icon-only mode
  sidebarExpanded: 260,   // Icon + label mode
  sidebarExpandDuration: 200,

  // === LAYOUT ===
  contentPaddingLeft: 32,
  contentPaddingRight: 32,
  contentPaddingTop: 24,

  // === HERO BANNER ===
  heroBannerHeight: H * 0.68,
  heroAutoRotateMs: 7000,

  // === FILM CARDS ===
  cardBorderRadius: 14,
  cardFocusedScale: 1.10,
  cardAnimDuration: 150,

  // Card sizes in rows
  cardWidthLarge: 240,    // "Continue Watching" landscape cards
  cardWidthPoster: 160,   // Portrait poster cards (Rakuten TV style)
  cardHeightLarge: 140,
  cardHeightPoster: 240,

  // Film row
  rowGap: 16,
  rowItemGap: 14,

  // === FOCUS ===
  focusBorderWidth: 4,
  focusBorderRadius: 14,
  focusShadowRadius: 18,
  focusShadowOpacity: 0.7,
  focusAnimDuration: 150,

  // === TYPOGRAPHY ===
  fontXXL: 52,    // Hero title
  fontXL: 36,     // Section title
  fontL: 24,      // Card title
  fontM: 18,      // Body
  fontS: 14,      // Metadata
  fontXS: 12,     // Labels

  // === PLAYER OSD ===
  playerOSDHideMs: 4000,  // ms before OSD auto-hides
  seekStepSeconds: 10,    // D-Pad left/right seek amount
  progressSaveIntervalMs: 5000, // API progress save interval

  // === KEYBOARD ===
  keyboardKeySize: 56,
  keyboardKeyGap: 8,

  // === ANIMATION ===
  transitionDuration: 250,
} as const;
