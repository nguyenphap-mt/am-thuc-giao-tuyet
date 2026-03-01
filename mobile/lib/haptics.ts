// Shared haptic feedback utility
// Maps action contexts to appropriate haptic intensity levels
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback for subtle interactions (tap, toggle, select)
 */
export function hapticLight() {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Haptic feedback for important actions (confirm, submit, swipe)
 */
export function hapticMedium() {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Haptic feedback for destructive / final actions (delete)
 */
export function hapticHeavy() {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/**
 * Success notification haptic
 */
export function hapticSuccess() {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Error notification haptic
 */
export function hapticError() {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/**
 * Warning notification haptic
 */
export function hapticWarning() {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
