// Offline Queue — stores failed API calls for retry when back online
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@offline_queue';

export interface QueuedRequest {
    id: string;
    method: 'POST' | 'PUT' | 'DELETE';
    url: string;
    body?: any;
    createdAt: string;
    retryCount: number;
}

/**
 * Add a failed request to the offline queue
 */
export async function enqueueRequest(
    method: 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: any,
): Promise<void> {
    const queue = await getQueue();
    const item: QueuedRequest = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        method,
        url,
        body,
        createdAt: new Date().toISOString(),
        retryCount: 0,
    };
    queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[Offline] Queued ${method} ${url}`);
}

/**
 * Get all queued requests
 */
export async function getQueue(): Promise<QueuedRequest[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Remove a request from the queue after successful sync
 */
export async function dequeueRequest(id: string): Promise<void> {
    const queue = await getQueue();
    const filtered = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

/**
 * Clear the entire queue
 */
export async function clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Get queue length (for badge display)
 */
export async function getQueueLength(): Promise<number> {
    const queue = await getQueue();
    return queue.length;
}
