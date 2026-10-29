/**
 * AppNavigator — Root Navigation Container
 * ───────────────────────────────────────────────
 * Wraps the tab navigator inside a NavigationContainer
 * with the custom dark theme. Stack screens (e.g. detail
 * views) will be layered on top of this when needed.
 */

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import TabNavigator from './TabNavigator';
import { Colors } from '../theme';

const HealthDarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.surfaceBorder,
    notification: Colors.danger,
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={HealthDarkTheme}>
      <TabNavigator />
    </NavigationContainer>
  );
}
