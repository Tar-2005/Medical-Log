/**
 * Health Memory Layer — Design Tokens
 * Dark-mode-first, healthcare-grade color palette.
 * Accessibility: All foreground/background combos meet WCAG AA contrast ratios.
 */

export const Colors = {
  // ── Backgrounds ──
  background: '#0B0F1A',        // Deep navy-black canvas
  surface: '#131929',           // Card / elevated surface
  surfaceElevated: '#1A2238',   // Modal / sheet overlay
  surfaceBorder: '#232D45',     // Subtle border on cards

  // ── Primary Accent (Teal / Health Green) ──
  primary: '#00D9A6',           // Main CTA / active states
  primaryMuted: '#00B88C',      // Pressed state
  primaryGhost: 'rgba(0,217,166,0.10)', // Ghost button bg

  // ── Secondary Accent (Cool Violet) ──
  secondary: '#7C5CFC',        // QR / consent highlights
  secondaryMuted: '#6347D4',

  // ── Alert Spectrum ──
  danger: '#FF4D6A',           // Critical alerts
  warning: '#FFB547',          // Moderate warnings
  info: '#3EA8FF',             // Informational badges
  success: '#00D9A6',          // Re-uses primary

  // ── Typography ──
  textPrimary: '#F0F2F5',      // Headings, body
  textSecondary: '#8E99AF',    // Captions, labels
  textTertiary: '#505C75',     // Disabled text
  textInverse: '#0B0F1A',      // Text on primary buttons

  // ── Misc ──
  divider: '#1E2740',
  overlay: 'rgba(0,0,0,0.55)',
  skeleton: '#1A2238',
};

export default Colors;
