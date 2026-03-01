// Offline Database — SQLite initialization with WAL mode
// Core of the offline-first architecture
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

const SCHEMA_VERSION = 1;

/**
 * Get or create the offline SQLite database.
 * Enables WAL mode for concurrent read/write performance.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;

    db = await SQLite.openDatabaseAsync('amthuc_offline.db');

    // Enable WAL mode for better concurrent read/write
    await db.execAsync('PRAGMA journal_mode = WAL;');

    // Create tables
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_orders (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            is_synced INTEGER DEFAULT 1,
            locally_updated INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS offline_inventory (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            is_synced INTEGER DEFAULT 1,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS outbox_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint TEXT NOT NULL,
            method TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TEXT NOT NULL,
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            status TEXT DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS sync_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);

    console.log('[Offline] Database initialized with WAL mode, schema v' + SCHEMA_VERSION);
    return db;
}

/**
 * Save data to offline cache.
 */
export async function cacheData(
    table: 'offline_orders' | 'offline_inventory',
    id: string,
    data: any
): Promise<void> {
    const database = await getDatabase();
    const now = new Date().toISOString();
    const jsonData = JSON.stringify(data);

    await database.runAsync(
        `INSERT OR REPLACE INTO ${table} (id, data, is_synced, updated_at) VALUES (?, ?, 1, ?)`,
        [id, jsonData, now]
    );
}

/**
 * Get cached data by ID.
 */
export async function getCachedData<T>(
    table: 'offline_orders' | 'offline_inventory',
    id: string
): Promise<T | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<{ data: string }>(
        `SELECT data FROM ${table} WHERE id = ?`,
        [id]
    );
    return row ? JSON.parse(row.data) : null;
}

/**
 * Get all cached items.
 */
export async function getAllCachedData<T>(
    table: 'offline_orders' | 'offline_inventory'
): Promise<T[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<{ data: string }>(
        `SELECT data FROM ${table} ORDER BY updated_at DESC`
    );
    return rows.map(row => JSON.parse(row.data));
}

/**
 * Mark an item as locally modified (needs sync).
 */
export async function markAsLocallyUpdated(
    table: 'offline_orders' | 'offline_inventory',
    id: string
): Promise<void> {
    const database = await getDatabase();
    const now = new Date().toISOString();
    await database.runAsync(
        `UPDATE ${table} SET is_synced = 0, locally_updated = 1, updated_at = ? WHERE id = ?`,
        [now, id]
    );
}

/**
 * Get/set sync metadata.
 */
export async function getSyncMeta(key: string): Promise<string | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<{ value: string }>(
        'SELECT value FROM sync_meta WHERE key = ?',
        [key]
    );
    return row?.value ?? null;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
    const database = await getDatabase();
    const now = new Date().toISOString();
    await database.runAsync(
        'INSERT OR REPLACE INTO sync_meta (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, now]
    );
}

/**
 * Close the database connection.
 */
export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.closeAsync();
        db = null;
    }
}
