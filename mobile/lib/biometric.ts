// Biometric authentication utility
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export async function isBiometricAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        return compatible && enrolled;
    } catch {
        return false;
    }
}

export async function isBiometricEnabled(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
        const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        return val === 'true';
    } catch {
        return false;
    }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function authenticateWithBiometric(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Xác thực để đăng nhập',
            cancelLabel: 'Hủy',
            disableDeviceFallback: false,
            fallbackLabel: 'Dùng mật khẩu',
        });
        return result.success;
    } catch {
        return false;
    }
}

export async function getBiometricType(): Promise<string> {
    if (Platform.OS === 'web') return 'none';
    try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return Platform.OS === 'ios' ? 'Face ID' : 'Nhận diện khuôn mặt';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return Platform.OS === 'ios' ? 'Touch ID' : 'Vân tay';
        }
        return 'Sinh trắc học';
    } catch {
        return 'none';
    }
}
