// Voice Note Player component — playback recorded voice notes
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/colors';
import { hapticLight } from '../lib/haptics';

interface Props {
    uri: string;
    duration?: number;
    onDelete?: () => void;
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function VoiceNotePlayer({ uri, duration = 0, onDelete }: Props) {
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        hapticLight();
        setIsPlaying(!isPlaying);
        // In a real implementation, this would use expo-av to play/pause
    };

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.7 }]}
                onPress={togglePlay}
                accessibilityLabel={isPlaying ? 'Tạm dừng ghi chú thoại' : 'Phát ghi chú thoại'}
                accessibilityRole="button"
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
                <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
            </Pressable>

            <View style={styles.info}>
                <Text style={styles.label}>Ghi chú thoại</Text>
                <Text style={styles.duration}>{formatDuration(duration)}</Text>
            </View>

            {onDelete && (
                <Pressable
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => { hapticLight(); onDelete(); }}
                    accessibilityLabel="Xóa ghi chú thoại"
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    playBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        fontSize: 16,
        color: Colors.textInverse,
    },
    info: {
        flex: 1,
        gap: 2,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: '500',
        color: Colors.textPrimary,
    },
    duration: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
        fontVariant: ['tabular-nums'],
    },
    deleteBtn: {
        padding: Spacing.xs,
    },
    deleteIcon: {
        fontSize: 18,
    },
});
