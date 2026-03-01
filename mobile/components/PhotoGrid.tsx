// PhotoGrid — thumbnail gallery with add button
import {
    View,
    Text,
    Image,
    Pressable,
    StyleSheet,
    ActionSheetIOS,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/colors';
import { hapticLight, hapticWarning } from '../lib/haptics';
import { CapturedPhoto } from '../lib/hooks/usePhotoCapture';

interface PhotoGridProps {
    photos: CapturedPhoto[];
    loading?: boolean;
    onTakePhoto: () => void;
    onPickGallery: () => void;
    onRemovePhoto: (index: number) => void;
    maxPhotos?: number;
}

export default function PhotoGrid({
    photos,
    loading,
    onTakePhoto,
    onPickGallery,
    onRemovePhoto,
    maxPhotos = 10,
}: PhotoGridProps) {
    const canAdd = photos.length < maxPhotos;

    const showAddOptions = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Hủy', '📷 Chụp ảnh', '🖼️ Chọn từ thư viện'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) onTakePhoto();
                    if (buttonIndex === 2) onPickGallery();
                },
            );
        } else {
            // Android: use Alert as action sheet
            Alert.alert('Thêm ảnh', 'Chọn nguồn ảnh', [
                { text: 'Hủy', style: 'cancel' },
                { text: '📷 Chụp ảnh', onPress: onTakePhoto },
                { text: '🖼️ Từ thư viện', onPress: onPickGallery },
            ]);
        }
    };

    const handleRemove = (index: number) => {
        Alert.alert('Xóa ảnh', 'Bạn muốn xóa ảnh này?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xóa', style: 'destructive', onPress: () => onRemovePhoto(index) },
        ]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                📸 Ảnh đính kèm ({photos.length}/{maxPhotos})
            </Text>

            <View style={styles.grid}>
                {photos.map((photo, index) => (
                    <View key={`photo-${index}`} style={styles.photoWrapper}>
                        <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                        <Pressable
                            style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
                            onPress={() => { hapticWarning(); handleRemove(index); }}
                            accessibilityLabel={`Xóa ảnh ${index + 1}`}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}
                        >
                            <Text style={styles.removeBtnText}>✕</Text>
                        </Pressable>
                    </View>
                ))}

                {canAdd && (
                    <Pressable
                        style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
                        onPress={() => { hapticLight(); showAddOptions(); }}
                        disabled={loading}
                        accessibilityLabel={`Thêm ảnh, đã có ${photos.length} trên ${maxPhotos}`}
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <>
                                <Text style={styles.addIcon}>＋</Text>
                                <Text style={styles.addText}>Thêm ảnh</Text>
                            </>
                        )}
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const THUMB_SIZE = 90;

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    label: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    photoWrapper: {
        position: 'relative',
    },
    thumbnail: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgTertiary,
    },
    removeBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    removeBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textInverse,
    },
    addButton: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: BorderRadius.md,
        borderWidth: 2,
        borderColor: Colors.borderLight,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.bgTertiary,
    },
    addIcon: {
        fontSize: 24,
        color: Colors.textTertiary,
        fontWeight: '300',
    },
    addText: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
        marginTop: 2,
    },
});
