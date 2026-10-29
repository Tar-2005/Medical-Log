/**
 * Health Memory Layer — Typography Scale
 * Uses system fonts with a clear hierarchy.
 * All weights map to React Native fontWeight strings.
 */

import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography = {
  fontFamily,

  // ── Scale ──
  hero: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  h3: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  micro: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};

export default Typography;
