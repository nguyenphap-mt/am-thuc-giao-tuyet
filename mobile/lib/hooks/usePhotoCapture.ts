// Photo capture utility — camera + gallery picker
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface CapturedPhoto {
    uri: string;
    width: number;
    height: number;
    fileName?: string;
}

export function usePhotoCapture() {
    const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
    const [loading, setLoading] = useState(false);

    const requestPermission = async (): Promise<boolean> => {
        if (Platform.OS === 'web') return true;
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Quyền truy cập', 'Cần quyền sử dụng camera để chụp ảnh');
            return false;
        }
        return true;
    };

    const takePhoto = async () => {
        const granted = await requestPermission();
        if (!granted) return;

        setLoading(true);
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const newPhoto: CapturedPhoto = {
                    uri: asset.uri,
                    width: asset.width || 0,
                    height: asset.height || 0,
                    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
                };
                setPhotos(prev => [...prev, newPhoto]);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể chụp ảnh');
        } finally {
            setLoading(false);
        }
    };

    const pickFromGallery = async () => {
        setLoading(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                allowsMultipleSelection: true,
                selectionLimit: 5,
            });

            if (!result.canceled && result.assets.length > 0) {
                const newPhotos: CapturedPhoto[] = result.assets.map(asset => ({
                    uri: asset.uri,
                    width: asset.width || 0,
                    height: asset.height || 0,
                    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
                }));
                setPhotos(prev => [...prev, ...newPhotos]);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể chọn ảnh');
        } finally {
            setLoading(false);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const clearPhotos = () => setPhotos([]);

    return {
        photos,
        loading,
        takePhoto,
        pickFromGallery,
        removePhoto,
        clearPhotos,
    };
}
