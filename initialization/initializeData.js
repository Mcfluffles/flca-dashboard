//Data initialization function, gets all market, CX, and Commodity Data
//To do: expand to building data, and whatever else we need.

import { pullExchangeIdentity } from "../data/pullExchanges.js";
import { pullCommodityLookup } from "../data/pullCommodityLookup.js";
import { pullMarketData } from "../data/pullMarketData.js";
import { pullFullOrderBooks } from "../data/pullFullOrderBooks.js";
import { pullFleetData } from "../data/pullFleetData.js";
import { pullStorageData } from "../data/pullStorageData.js";
import { pullPlanetData } from "../data/pullPlanetData.js";
import { pullFlightData } from "../data/pullFlightData.js";
import { pullRecipeData } from "../data/pullRecipeData.js";
import { pullBuildingData } from "../data/pullBuildingData.js";
import { pullProductionData } from "../data/pullProductionData.js";
import { pullWorkforceData } from "../data/pullWorkforceData.js";

import { CACHE_TTLS, getCachedData } from "../cache/functions/cacheFunctions.js";
// import { getCachedData } from "../cache/functions/cacheFunctions.js";

// const CACHE_TTLS = {
//     static: 1,
//     market: 1,
//     ops:1
// };

export async function initializeData(pool, forceRefresh = false) {
    const staticData = await getCachedData(
        pool,
        "static-cache",
        CACHE_TTLS.static,
        async () => {

            console.time("Static Data")

            try { 
                console.log("Pulling fresh static data");
                const [exchanges, materials, recipes, buildings, planets] =
                    await Promise.all([
                        pullExchangeIdentity(),
                        pullCommodityLookup(),
                        pullRecipeData(),
                        pullBuildingData(),
                        pullPlanetData()
                    ]);
            

                return {
                    exchanges,
                    materials,
                    recipes,
                    buildings,
                    planets
                };

            } finally { console.timeEnd("Static Data") }

        },
        forceRefresh
    );

    const marketData = await getCachedData(
        pool,
        "market-cache",
        CACHE_TTLS.market,
        async () => {

            console.time("Market Data")

            try {
                console.log("Pulling fresh market data");
                const [markets, orderBooks] =
                    await Promise.all([
                        pullMarketData(),
                        pullFullOrderBooks()
                    ]);

                return {
                    markets,
                    orderBooks
                };
            } finally { console.timeEnd("Market Data") }
        },
        forceRefresh
    );

    const opsData = await getCachedData(
        pool,
        "ops-cache",
        CACHE_TTLS.ops,
        async () => {

            console.time("Ops Data")

            try {
                console.log("Pulling fresh ops data");
                const [fleet, storage, flights, production, workforce] =
                    await Promise.all([
                        pullFleetData(),
                        pullStorageData(),
                        pullFlightData(),
                        pullProductionData(),
                        pullWorkforceData()
                    ]);

                return {
                    fleet,
                    storage,
                    flights,
                    production,
                    workforce
                };
            } finally { console.timeEnd("Ops Data") }
        },
        forceRefresh
    );

    return {
        ...staticData,
        ...marketData,
        ...opsData
    };
}
