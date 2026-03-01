// Sync Engine — background synchronization on reconnect
// Orchestrates data pull from backend + outbox queue replay
import api from '../api';
import { cacheData, setSyncMeta, getSyncMeta } from './database';
import { processQueue } from './outbox-queue';

/**
 * Full sync — pull latest data from backend and cache locally.
 * Called when device comes back online or on app foreground.
 */
export async function fullSync(): Promise<{
    ordersSync: number;
    inventorySync: number;
    outboxProcessed: number;
    outboxFailed: number;
}> {
    console.log('[Sync] Starting full sync...');

    // 1. Process outbox queue first (push local changes)
    const outboxResult = await processQueue(async (endpoint, method, payload) => {
        switch (method) {
            case 'POST':
                return api.post(endpoint, payload);
            case 'PUT':
                return api.put(endpoint, payload);
            case 'DELETE':
                return api.delete(endpoint);
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    });

    // 2. Pull latest orders
    let ordersSync = 0;
    try {
        const ordersRes = await api.get('/orders?limit=100');
        const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes.items ?? []);
        for (const order of orders) {
            await cacheData('offline_orders', order.id, order);
            ordersSync++;
        }
        await setSyncMeta('last_sync_orders', new Date().toISOString());
    } catch (error) {
        console.error('[Sync] Failed to sync orders:', error);
    }

    // 3. Pull latest inventory
    let inventorySync = 0;
    try {
        const itemsRes = await api.get('/inventory/items?limit=200');
        const items = Array.isArray(itemsRes) ? itemsRes : (itemsRes.items ?? []);
        for (const item of items) {
            await cacheData('offline_inventory', item.id, item);
            inventorySync++;
        }
        await setSyncMeta('last_sync_inventory', new Date().toISOString());
    } catch (error) {
        console.error('[Sync] Failed to sync inventory:', error);
    }

    // 4. Update last full sync timestamp
    await setSyncMeta('last_full_sync', new Date().toISOString());

    console.log(`[Sync] Complete — Orders: ${ordersSync}, Inventory: ${inventorySync}, Outbox: ${outboxResult.processed} OK, ${outboxResult.failed} failed`);

    return {
        ordersSync,
        inventorySync,
        outboxProcessed: outboxResult.processed,
        outboxFailed: outboxResult.failed,
    };
}

/**
 * Get the last sync timestamp.
 */
export async function getLastSyncTime(): Promise<string | null> {
    return getSyncMeta('last_full_sync');
}

/**
 * Quick sync — only process outbox queue (faster).
 */
export async function quickSync(): Promise<{ processed: number; failed: number }> {
    return processQueue(async (endpoint, method, payload) => {
        switch (method) {
            case 'POST':
                return api.post(endpoint, payload);
            case 'PUT':
                return api.put(endpoint, payload);
            case 'DELETE':
                return api.delete(endpoint);
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    });
}
