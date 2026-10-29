/**
 * HomeDashboard Screen
 * ───────────────────────────────────────────────
 * High-level health summary with recent alerts.
 * No PHI is logged to the console.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Share,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { syncService } from '../../services';
import authService from '../../services/authService';
import storageService from '../../services/storageService';
import { Alert } from 'react-native';

/* ── Placeholder metric cards ── */
const MetricCard = ({ icon, label, value, color }) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={22} color={color} style={styles.cardIcon} />
    <View style={styles.cardContent}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  </View>
);

const AlertRow = ({ severity, message, time }) => {
  const colorMap = {
    critical: Colors.danger,
    warning: Colors.warning,
    info: Colors.info,
  };
  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertDot, { backgroundColor: colorMap[severity] }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.alertMessage} numberOfLines={1}>{message}</Text>
        <Text style={styles.alertTime}>{time}</Text>
      </View>
    </View>
  );
};

export default function HomeDashboard({ navigation }) {
  const [isOnline, setIsOnline] = useState(true);
  const [userRecords, setUserRecords] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out of your wallet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await authService.logout();
            } catch (e) {
              console.error("Logout error:", e);
            }
          }
        }
      ]
    );
  };

  const loadLocalRecords = async () => {
    try {
      const records = await storageService.getFHIRResources('Observation');
      if (Array.isArray(records)) {
        setUserRecords(records);
      }
    } catch (err) {
      console.log("Error loading records:", err);
    }
  };

  // Auto-reload records whenever the dashboard screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadLocalRecords();
    }, [])
  );

  useEffect(() => {
    loadLocalRecords();
    const checkNetwork = async () => {
      const online = await syncService.isOnline();
      setIsOnline(online);
      loadLocalRecords();
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Patient Ledger</Text>
            <Text style={styles.name}>Immutable Wallet</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleLogout} style={[styles.avatar, { marginRight: Spacing.sm }]}>
              <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
            </View>
          </View>
        </View>

        {/* ── Sync & State Pills ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg }}>
          <View style={styles.syncPill}>
            <Ionicons 
              name={isOnline ? "cloud-done-outline" : "cloud-offline-outline"} 
              size={14} 
              color={isOnline ? Colors.success : Colors.warning} 
            />
            <Text style={[styles.syncText, { color: isOnline ? Colors.success : Colors.warning }]}>
              {isOnline ? "Timeline Synced" : "Offline mode — reading cached ledger"}
            </Text>
          </View>
          <View style={[styles.syncPill, { marginLeft: Spacing.sm, borderColor: Colors.info, backgroundColor: 'rgba(62,168,255,0.1)' }]}>
            <Ionicons name="eye-outline" size={14} color={Colors.info} />
            <Text style={[styles.syncText, { color: Colors.info }]}>Read-Only</Text>
          </View>
        </View>

        {/* ── Metrics Grid ── */}
        <Text style={styles.sectionTitle}>Immutable Vitals</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="heart-outline"
            label="Heart Rate"
            value="72 bpm"
            color={Colors.danger}
          />
          <MetricCard
            icon="water-outline"
            label="Blood Pressure"
            value="120/80"
            color={Colors.info}
          />
          <MetricCard
            icon="thermometer-outline"
            label="Temperature"
            value="98.4°F"
            color={Colors.warning}
          />
          <MetricCard
            icon="fitness-outline"
            label="SpO₂"
            value="98%"
            color={Colors.primary}
          />
          <MetricCard
            icon="time-outline"
            label="Time Intake"
            value="08:00 AM"
            color={Colors.success}
          />
          <MetricCard
            icon="medical-outline"
            label="Next Dose"
            value="In 2 hrs"
            color={Colors.primary}
          />
        </View>

        {/* ── Quick Upload Action Banner ── */}
        <TouchableOpacity
          style={styles.uploadBanner}
          onPress={() => {
            if (navigation && navigation.navigate) {
              navigation.navigate('Upload');
            }
          }}
          activeOpacity={0.85}
        >
          <View style={styles.uploadBannerLeft}>
            <View style={styles.uploadIconCircle}>
              <Ionicons name="cloud-upload" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.uploadBannerTitle}>Upload Medical Document</Text>
              <Text style={styles.uploadBannerSubtitle}>
                Add lab reports, discharge summaries or clinical notes
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* ── Timeline of Care ── */}
        <Text style={styles.sectionTitle}>Timeline of Care</Text>
        <View style={styles.alertsContainer}>
          {[
            ...[...userRecords].reverse().map(rec => ({
              type: 'document',
              severity: 'info',
              message: `${rec.code_display || 'Medical Document'} (${rec.category_display || 'General'})`,
              time: rec.effective_dt ? new Date(rec.effective_dt).toLocaleString() : 'Recently Added',
              source: 'Gemini AI Upload',
              imageData: rec.imageData || null,
              shareContent: `Report: ${rec.code_display}\nSummary: ${rec.summary || ''}\nSaved to Sovereign Health Wallet.`
            })),
            {
              type: 'document',
              severity: 'info',
              message: 'Lab Report: Complete Blood Count & Liver Panel',
              time: new Date(Date.now() - 86400000 * 2).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + new Date(Date.now() - 86400000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              source: 'Hospital Operator Upload',
              shareContent: 'Lab Report: CBC & Liver Panel\nDate: ' + new Date(Date.now() - 86400000 * 2).toLocaleString() + '\nSource: LalPathLabs · Aashvi Diagnostics\n\nThis is a read-only record from your Health Memory Layer.',
            },
            {
              type: 'document',
              severity: 'info',
              message: 'Previous Discharge Summary (Readmission)',
              time: new Date(Date.now() - 86400000 * 5).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + new Date(Date.now() - 86400000 * 5).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              source: 'Hospital Operator Upload',
              shareContent: 'Discharge Summary\nDate: ' + new Date(Date.now() - 86400000 * 5).toLocaleString() + '\nSource: General Medicine · Hospital Operator Upload\n\nThis is a read-only record from your Health Memory Layer.',
            },
            {
              type: 'note',
              severity: 'warning',
              message: 'Clinical Note: Mild chest pain and fatigue. Vitals stable. Advised rest and ordered metabolic panel.',
              time: new Date(Date.now() - 86400000 * 7).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + new Date(Date.now() - 86400000 * 7).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              source: 'Dr. Tarun Kumar',
            }
          ].map((alert, i) => (
            <View key={i} style={[styles.alertRow, { flexDirection: 'column', alignItems: 'flex-start', paddingBottom: Spacing.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                <View style={[styles.alertDot, {
                  marginTop: 5,
                  backgroundColor: alert.severity === 'critical' ? Colors.danger : alert.severity === 'warning' ? Colors.warning : Colors.info
                }]} />
                
                {alert.imageData && (
                  <TouchableOpacity
                    onPress={() => setPreviewImage(alert.imageData)}
                    style={{ marginRight: 10, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceBorder }}
                  >
                    <Image
                      source={{ uri: alert.imageData }}
                      style={{ width: 52, height: 52, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.alertMessage} numberOfLines={3}>{alert.message}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, flexWrap: 'wrap' }}>
                    <Text style={styles.alertTime}>{alert.time}</Text>
                    <Text style={[styles.alertTime, { color: Colors.primary }]}>{alert.source}</Text>
                  </View>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                {alert.imageData && (
                  <TouchableOpacity
                    onPress={() => setPreviewImage(alert.imageData)}
                    style={[styles.downloadBtn, { backgroundColor: Colors.surfaceElevated }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="image-outline" size={13} color={Colors.primary} />
                    <Text style={styles.downloadBtnText}>View Image</Text>
                  </TouchableOpacity>
                )}
                {alert.type === 'document' && (
                  <TouchableOpacity
                    onPress={() => Share.share({ message: alert.shareContent, title: alert.message })}
                    style={styles.downloadBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="download-outline" size={13} color={Colors.primary} />
                    <Text style={styles.downloadBtnText}>Share / Download</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── Document Lightbox Modal ── */}
        <Modal
          visible={!!previewImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={{ width: '100%', height: '80%', borderRadius: 12 }}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  greeting: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  name: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Sync pill */
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  syncText: {
    ...Typography.caption,
    color: Colors.success,
    marginLeft: Spacing.xs,
  },

  /* Section titles */
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  /* Metrics grid */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardIcon: {
    marginBottom: Spacing.sm,
  },
  cardContent: {},
  cardLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  cardValue: {
    ...Typography.h2,
    marginTop: 2,
  },

  /* Alerts */
  alertsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  alertMessage: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  alertTime: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    marginLeft: Spacing.md + 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    backgroundColor: Colors.primary + '15',
    alignSelf: 'flex-start',
  },
  downloadBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },

  /* Quick Upload Banner */
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderColor: Colors.primary + '50',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  uploadBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBannerTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  uploadBannerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
