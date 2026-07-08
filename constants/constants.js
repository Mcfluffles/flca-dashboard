//Chaching constants
export const CACHE_TTLS = {
    static: 24 * 60 * 60 * 1000,      // 24 hours
    market: 5 * 60 * 1000,            // 5 minutes
    production: 15 * 60 * 1000,       // 15 minutes
    fleet: 1 * 60 * 1000,             // 1 minute
    storage: 2 * 60 * 1000,           // 2 minutes
    flights: 30 * 1000                // 30 seconds
};

/*
THIS FILE IS NOT CURRENTLY IMPLEMENTED ANYWHERE

Cache TTLS are currently in cache/cacheFuntions.js
*/