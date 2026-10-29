import React, { useEffect, useState } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { supabase } from './src/services/supabase';
import AuthScreen from './src/screens/AuthScreen';
import syncService from './src/services/syncService';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        syncService.syncAll();
      }
    });

    // Listen for auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        syncService.syncAll();
      }
    });

    // Setup periodic sync every 15 minutes if logged in
    const interval = setInterval(() => {
      if (session) syncService.syncAll();
    }, 15 * 60 * 1000);

    // Sync when app comes to foreground
    const appSub = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && session) {
        syncService.syncAll();
      }
    });

    return () => {
      clearInterval(interval);
      appSub.remove();
      authSub.unsubscribe();
    };
  }, [session]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {session ? <AppNavigator /> : <AuthScreen onLoginSuccess={() => {}} />}
    </SafeAreaProvider>
  );
}
