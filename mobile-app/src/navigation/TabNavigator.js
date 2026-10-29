/**
 * TabNavigator — Bottom Tab Navigation
 * ───────────────────────────────────────────────
 * Two primary tabs: Home (Ledger) and Consent.
 * Custom styled for the dark-mode health aesthetic.
 */

import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeDashboard from '../screens/HomeDashboard';
import UploadDocument from '../screens/UploadDocument';
import ConsentQR from '../screens/ConsentQR';
import { Colors, Typography } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  {
    name: 'Home',
    component: HomeDashboard,
    iconFocused: 'home',
    iconDefault: 'home-outline',
  },
  {
    name: 'Upload',
    component: UploadDocument,
    iconFocused: 'cloud-upload',
    iconDefault: 'cloud-upload-outline',
  },
  {
    name: 'Consent',
    component: ConsentQR,
    iconFocused: 'qr-code',
    iconDefault: 'qr-code-outline',
  },
];

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.iconDefault}
                size={24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    ...Typography.micro,
    fontSize: 10,
    letterSpacing: 0.8,
  },
});
