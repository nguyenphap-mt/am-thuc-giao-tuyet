// Outbox Queue — pending mutation queue for offline writes
// Pattern: Write locally → queue mutation → replay on reconnect
import { getDatabase } from './database';

interface OutboxItem {
    id: number;
    endpoint: string;
    method: 'POST' | 'PUT' | 'DELETE';
    payload: string;
    created_at: string;
    retry_count: number;
    max_retries: number;
    status: 'pending' | 'sending' | 'failed' | 'done';
}

/**
 * Add a mutation to the outbox queue.
 * Called when a write operation happens while offline.
 */
export async function addToQueue(
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE',
    payload: any
): Promise<number> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const jsonPayload = JSON.stringify(payload);

    const result = await db.runAsync(
        `INSERT INTO outbox_queue (endpoint, method, payload, created_at) VALUES (?, ?, ?, ?)`,
        [endpoint, method, jsonPayload, now]
    );

    console.log(`[Outbox] Queued: ${method} ${endpoint} (id: ${result.lastInsertRowId})`);
    return result.lastInsertRowId;
}

/**
 * Get all pending items from the queue.
 */
export async function getPendingItems(): Promise<OutboxItem[]> {
    const db = await getDatabase();
    return db.getAllAsync<OutboxItem>(
        `SELECT * FROM outbox_queue WHERE status IN ('pending', 'failed') AND retry_count < max_retries ORDER BY created_at ASC`
    );
}

/**
 * Process the outbox queue — replay pending mutations to backend.
 * Called when device comes back online.
 */
export async function processQueue(
    apiCall: (endpoint: string, method: string, payload: any) => Promise<any>
): Promise<{ processed: number; failed: number }> {
    const items = await getPendingItems();
    let processed = 0;
    let failed = 0;

    for (const item of items) {
        try {
            await updateItemStatus(item.id, 'sending');

            const payload = JSON.parse(item.payload);
            await apiCall(item.endpoint, item.method, payload);

            await updateItemStatus(item.id, 'done');
            processed++;
            console.log(`[Outbox] ✅ Synced: ${item.method} ${item.endpoint}`);
        } catch (error) {
            failed++;
            await incrementRetry(item.id);
            console.error(`[Outbox] ❌ Failed: ${item.method} ${item.endpoint}`, error);
        }
    }

    // Clean up completed items
    if (processed > 0) {
        await cleanupDone();
    }

    return { processed, failed };
}

/**
 * Update item status.
 */
async function updateItemStatus(id: number, status: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        'UPDATE outbox_queue SET status = ? WHERE id = ?',
        [status, id]
    );
}

/**
 * Increment retry count for a failed item.
 */
async function incrementRetry(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        `UPDATE outbox_queue SET retry_count = retry_count + 1, status = 'failed' WHERE id = ?`,
        [id]
    );
}

/**
 * Remove completed items older than 1 hour.
 */
async function cleanupDone(): Promise<void> {
    const db = await getDatabase();
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    await db.runAsync(
        `DELETE FROM outbox_queue WHERE status = 'done' AND created_at < ?`,
        [oneHourAgo]
    );
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(): Promise<{ pending: number; failed: number; total: number }> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ pending: number; failed: number; total: number }>(
        `SELECT 
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
            COUNT(*) as total
         FROM outbox_queue WHERE status != 'done'`
    );
    return result ?? { pending: 0, failed: 0, total: 0 };
}
