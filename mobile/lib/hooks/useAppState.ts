// AppState lifecycle utility — pause/resume animations, polling, etc.
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Hook to track AppState changes (active, background, inactive).
 * Use to pause animations, polling, or expensive work when backgrounded.
 *
 * @param onForeground - Called when app comes back to foreground
 * @param onBackground - Called when app goes to background
 */
export function useAppState(
    onForeground?: () => void,
    onBackground?: () => void,
) {
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
    const prevState = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            // Went from background/inactive → active
            if (
                prevState.current.match(/inactive|background/) &&
                nextState === 'active'
            ) {
                onForeground?.();
            }

            // Went from active → background/inactive
            if (
                prevState.current === 'active' &&
                nextState.match(/inactive|background/)
            ) {
                onBackground?.();
            }

            prevState.current = nextState;
            setAppState(nextState);
        });

        return () => subscription.remove();
    }, [onForeground, onBackground]);

    return appState;
}
