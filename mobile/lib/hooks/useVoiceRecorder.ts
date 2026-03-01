// Voice recorder hook — record and playback voice notes
import { useState, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';

export interface VoiceNote {
    uri: string;
    duration: number; // milliseconds
    createdAt: string;
}

export function useVoiceRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordings, setRecordings] = useState<VoiceNote[]>([]);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Quyền truy cập', 'Cần quyền sử dụng microphone để ghi âm');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
            );
            recordingRef.current = recording;
            setIsRecording(true);
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm');
        }
    };

    const stopRecording = async () => {
        if (!recordingRef.current) return;

        try {
            setIsRecording(false);
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            const status = await recordingRef.current.getStatusAsync();

            if (uri) {
                const note: VoiceNote = {
                    uri,
                    duration: status.durationMillis || 0,
                    createdAt: new Date().toISOString(),
                };
                setRecordings(prev => [...prev, note]);
            }

            recordingRef.current = null;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể dừng ghi âm');
        }
    };

    const playRecording = async (index: number) => {
        const note = recordings[index];
        if (!note) return;

        try {
            // Stop any currently playing
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync({ uri: note.uri });
            soundRef.current = sound;
            setPlayingIndex(index);

            sound.setOnPlaybackStatusUpdate((status) => {
                if ('didJustFinish' in status && status.didJustFinish) {
                    setPlayingIndex(null);
                }
            });

            await sound.playAsync();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể phát lại ghi âm');
            setPlayingIndex(null);
        }
    };

    const removeRecording = (index: number) => {
        setRecordings(prev => prev.filter((_, i) => i !== index));
    };

    const formatDuration = (ms: number): string => {
        const secs = Math.round(ms / 1000);
        const mins = Math.floor(secs / 60);
        const remaining = secs % 60;
        return `${mins}:${remaining.toString().padStart(2, '0')}`;
    };

    return {
        isRecording,
        recordings,
        playingIndex,
        startRecording,
        stopRecording,
        playRecording,
        removeRecording,
        formatDuration,
    };
}
