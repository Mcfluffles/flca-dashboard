export async function getCachedJson(pool, cacheKey, ttlMs, refreshFn, forceRefresh = false) {
    const cached = await pool.query(
        "SELECT data, fetched_at FROM api_cache WHERE cache_key = $1",
        [cacheKey]
    );

    const now = Date.now();

    if (!forceRefresh && cached.rows.length) {
        const fetchedAt = new Date(cached.rows[0].fetched_at).getTime();

        if (now - fetchedAt < ttlMs) {
            return cached.rows[0].data;
        }
    }

    const fresh = await refreshFn();

    await pool.query(
        `
        INSERT INTO api_cache (cache_key, data, fetched_at)
        VALUES ($1, $2, now())
        ON CONFLICT (cache_key)
        DO UPDATE SET data = EXCLUDED.data, fetched_at = now()
        `,
        [cacheKey, JSON.stringify(fresh)]
    );

    return fresh;
}