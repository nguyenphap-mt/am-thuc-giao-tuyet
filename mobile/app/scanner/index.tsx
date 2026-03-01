// QR Code Scanner Screen
import { useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Alert,
    Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { hapticLight, hapticSuccess } from '../../lib/haptics';

export default function QRScannerScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);

        // Determine action based on QR content
        if (data.startsWith('ITEM:')) {
            // Inventory item QR code
            const itemId = data.replace('ITEM:', '');
            router.push(`/inventory/${itemId}`);
        } else if (data.startsWith('ORDER:')) {
            // Order QR code
            const orderId = data.replace('ORDER:', '');
            router.push(`/orders/${orderId}`);
        } else if (data.startsWith('EVENT:')) {
            // Event check-in QR
            const eventId = data.replace('EVENT:', '');
            router.push(`/event/${eventId}`);
        } else if (data.startsWith('http')) {
            // URL — open in browser
            Alert.alert('Link', data, [
                { text: 'Hủy', style: 'cancel', onPress: () => setScanned(false) },
                { text: 'Mở', onPress: () => Linking.openURL(data) },
            ]);
        } else {
            Alert.alert('QR Code', data, [
                { text: 'OK', onPress: () => setScanned(false) },
            ]);
        }
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Quét mã QR' }} />
                <Text style={styles.messageText}>Đang kiểm tra quyền camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Quét mã QR' }} />
                <View style={styles.permissionCard}>
                    <MaterialIcons name="photo-camera" size={64} color={Colors.textTertiary} />
                    <Text style={styles.permissionTitle}>Cần quyền Camera</Text>
                    <Text style={styles.permissionText}>
                        Cho phép truy cập camera để quét mã QR hàng hóa, đơn hàng, hoặc check-in sự kiện.
                    </Text>
                    <Pressable
                        style={({ pressed }) => [styles.permissionBtn, pressed && { opacity: 0.8 }]}
                        onPress={requestPermission}
                        accessibilityLabel="Cho phép truy cập camera"
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <Text style={styles.permissionBtnText}>Cho phép Camera</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Quét mã QR', headerTransparent: true, headerTintColor: '#fff' }} />

            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
                {/* Overlay with scan area */}
                <View style={styles.overlay}>
                    <View style={styles.overlayTop} />
                    <View style={styles.overlayMiddle}>
                        <View style={styles.overlaySide} />
                        <View style={styles.scanArea}>
                            {/* Corner markers */}
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                        </View>
                        <View style={styles.overlaySide} />
                    </View>
                    <View style={styles.overlayBottom}>
                        <Text style={styles.hintText}>
                            Đưa mã QR vào khung hình để quét
                        </Text>

                        {scanned && (
                            <Pressable
                                style={({ pressed }) => [styles.rescanBtn, pressed && { opacity: 0.8 }]}
                                onPress={() => { hapticLight(); setScanned(false); }}
                                accessibilityLabel="Quét lại mã QR"
                                accessibilityRole="button"
                                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                            >
                                <View style={styles.rescanRow}>
                                    <MaterialIcons name="sync" size={16} color="#fff" />
                                    <Text style={styles.rescanBtnText}>Quét lại</Text>
                                </View>
                            </Pressable>
                        )}

                        {/* Supported QR types */}
                        <View style={styles.supportedTypes}>
                            <Text style={styles.supportedLabel}>Hỗ trợ:</Text>
                            <View style={styles.supportedRow}><MaterialIcons name="inventory-2" size={12} color="rgba(255,255,255,0.7)" /><Text style={styles.supportedItem}>Hàng hóa</Text></View>
                            <View style={styles.supportedRow}><MaterialIcons name="receipt-long" size={12} color="rgba(255,255,255,0.7)" /><Text style={styles.supportedItem}>Đơn hàng</Text></View>
                            <View style={styles.supportedRow}><MaterialIcons name="event" size={12} color="rgba(255,255,255,0.7)" /><Text style={styles.supportedItem}>Check-in</Text></View>
                        </View>
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

const SCAN_SIZE = 260;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    messageText: { color: '#fff', fontSize: FontSize.md, textAlign: 'center', marginTop: 100 },
    // Overlay
    overlay: { flex: 1 },
    overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    overlayMiddle: { flexDirection: 'row', height: SCAN_SIZE },
    overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    scanArea: {
        width: SCAN_SIZE,
        height: SCAN_SIZE,
        backgroundColor: 'transparent',
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        paddingTop: Spacing.xxl,
        gap: Spacing.lg,
    },
    // Corner markers
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: Colors.primary,
    },
    cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
    cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
    // Hint
    hintText: {
        fontSize: FontSize.md,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    rescanBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
    },
    rescanBtnText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    supportedTypes: {
        flexDirection: 'row',
        gap: Spacing.md,
        alignItems: 'center',
    },
    supportedLabel: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs },
    supportedItem: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
    // Permission
    permissionCard: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxxl,
        backgroundColor: Colors.bgSecondary,
    },
    rescanRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    supportedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    permissionTitle: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    permissionText: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xxl,
    },
    permissionBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
    },
    permissionBtnText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
});
