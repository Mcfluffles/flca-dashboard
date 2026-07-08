// Cache functions V1.0

import fs from "fs/promises";
import path from "path";

export const CACHE_TTLS = {
    static: 1000 * 60 * 60 * 24 * 7,
    market: 1000 * 60 * 10,
    ops: 1000 * 60 * 10
};

export async function readCache(pool, cacheKey, ttlMs) {
    const result = await pool.query(
        `
        SELECT data, fetched_at
        FROM api_cache
        WHERE cache_key = $1
        `,
        [cacheKey]
    );

    if (result.rows.length === 0) return null;

    const fetchedAt = new Date(result.rows[0].fetched_at).getTime();
    const age = Date.now() - fetchedAt;

    if (age > ttlMs) return null;

    return result.rows[0].data;
}

export async function writeCache(pool, cacheKey, fresh) {
    await pool.query(
        `
        INSERT INTO api_cache (cache_key, data, fetched_at)
        VALUES ($1, $2, now())
        ON CONFLICT (cache_key)
        DO UPDATE SET
            data = EXCLUDED.data,
            fetched_at = now()
        `,
        [cacheKey, JSON.stringify(fresh)]
    );
}

export async function getCachedData(
    pool,
    cacheKey,
    ttlMs,
    fetchFreshData,
    forceRefresh = false
) {
    if (!forceRefresh) {
        const cached = await readCache(pool, cacheKey, ttlMs);

        if (cached) {
            console.log(`✓ Cache hit: ${cacheKey}`);
            return cached;
        }

        console.log(`↻ Refreshing: ${cacheKey}`);
    }

    const fresh = await fetchFreshData();
    await writeCache(pool, cacheKey, fresh);

    return fresh;
}