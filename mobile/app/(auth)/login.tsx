// Login Screen
import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../lib/auth-store';
import { getApiBaseUrl } from '../../constants/config';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Thông báo', 'Vui lòng nhập email và mật khẩu');
            return;
        }

        setIsSubmitting(true);
        try {
            const baseUrl = getApiBaseUrl();

            // Call login API
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString(),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || 'Đăng nhập thất bại');
            }

            const data = await response.json();

            // Fetch user profile
            const meResponse = await fetch(`${baseUrl}/api/v1/auth/me`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` },
            });

            if (!meResponse.ok) throw new Error('Không thể tải thông tin người dùng');

            const user = await meResponse.json();

            await login(data.access_token, {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                tenant_id: user.tenant_id,
            });
        } catch (error: any) {
            Alert.alert('Lỗi đăng nhập', error.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Ẩm Thực{'\n'}Giao Tuyết</Text>
                    <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="name@example.com"
                            placeholderTextColor={Colors.textTertiary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor={Colors.textTertiary}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={isSubmitting}
                        style={styles.buttonWrapper}
                    >
                        <LinearGradient
                            colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.button}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Đăng nhập</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={styles.version}>v1.0.0 — Staff Edition</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xxl,
        justifyContent: 'center',
    },
    header: {
        marginBottom: Spacing.xxxl,
    },
    title: {
        fontSize: FontSize.title,
        fontWeight: '800',
        color: Colors.textPrimary,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    form: {
        gap: Spacing.lg,
    },
    inputGroup: {
        gap: Spacing.xs,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        backgroundColor: Colors.bgSecondary,
    },
    buttonWrapper: {
        marginTop: Spacing.sm,
    },
    button: {
        height: 52,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: Colors.textInverse,
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    version: {
        textAlign: 'center',
        color: Colors.textTertiary,
        fontSize: FontSize.xs,
        marginTop: Spacing.xxxl,
    },
});
