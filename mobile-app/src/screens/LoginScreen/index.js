import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const DOCTORS = {
  'Tarun Kumar': '6161',
  'Prithiviraj': '6175',
  'Vinesh': '6308',
  'Hariharan': '123'
};

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [scannerMode, setScannerMode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleDoctorLogin = () => {
    const trimmedUser = username.trim();
    if (DOCTORS[trimmedUser] && DOCTORS[trimmedUser] === password) {
      Alert.alert("Success", `Welcome Dr. ${trimmedUser}`);
      navigation.replace('MainApp');
    } else {
      Alert.alert("Error", "Invalid doctor credentials.");
    }
  };

  const startPatientLogin = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission required", "Camera permission is needed to scan QR for patient authentication.");
        return;
      }
    }
    setScannerMode(true);
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScannerMode(false);
    Alert.alert("Secondary Auth Successful", "Patient QR Scanned successfully.");
    navigation.replace('MainApp');
  };

  if (scannerMode) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <TouchableOpacity style={styles.cancelScanButton} onPress={() => setScannerMode(false)}>
            <Text style={styles.cancelScanText}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Ionicons name="medical-outline" size={48} color={Colors.primary} />
          <Text style={styles.title}>Health Memory Layer</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Doctor Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Doctor Username"
            placeholderTextColor={Colors.textTertiary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity style={styles.loginBtn} onPress={handleDoctorLogin}>
            <Text style={styles.loginBtnText}>Login as Provider</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.patientSection}>
          <Text style={styles.patientInfoText}>
            Each App holder is considered a Patient by default. Use QR for secondary authentication.
          </Text>
          <TouchableOpacity style={styles.qrBtn} onPress={startPatientLogin}>
            <Ionicons name="qr-code-outline" size={20} color={Colors.textInverse} style={{ marginRight: 8 }} />
            <Text style={styles.qrBtnText}>Patient QR Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  label: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.background,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 50,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  loginBtnText: {
    ...Typography.h3,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.md,
  },
  patientSection: {
    alignItems: 'center',
  },
  patientInfoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  qrBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    height: 50,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBtnText: {
    ...Typography.h3,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cancelScanButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    margin: Spacing.xl,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cancelScanText: {
    ...Typography.h3,
    color: Colors.textPrimary,
  }
});
