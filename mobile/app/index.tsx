// Root index — redirect to appropriate screen
import { Redirect } from 'expo-router';
import { useAuthStore } from '../lib/auth-store';

export default function Index() {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/schedule" />;
    }

    return <Redirect href="/(auth)/login" />;
}
