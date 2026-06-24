// Cache functions V1.0

import fs from "fs/promises";
import path from "path";

export const CACHE_TTLS = {
    static: 1000 * 60 * 60 * 24 * 7,
    market: 1000 * 60 * 10,
    ops: 1000 * 60 * 10
};

export async function readCache(cacheName, ttlMs) {
    try {
        const raw = await fs.readFile(cacheName, "utf8");
        const cache = JSON.parse(raw);

        const age = Date.now() - cache.createdAt;

        if (age > ttlMs) {
            return null;
        }

        return cache.data;
    } catch {
        return null;
    }
}

export async function writeCache(cacheName, fresh) {
    const cache = {
        createdAt: Date.now(),
        createdAtISO: new Date().toISOString(),
        cacheName,
        data: fresh
    };

    await fs.mkdir(path.dirname(cacheName), { recursive: true });
    await fs.writeFile(cacheName, JSON.stringify(cache, null, 2));
}

export async function getCachedData(cacheName, ttlMs, fetchFreshData) {
    const cached = await readCache(cacheName, ttlMs);

    if (cached) {
        return cached;
    }

    const fresh = await fetchFreshData();
    await writeCache(cacheName, fresh);

    return fresh;
}