//Data initialization function, gets all market, CX, and Commodity Data
//To do: expand to building data, and whatever else we need.

import { pullExchangeIdentity } from "./data/pullExchanges.js";
import { pullCommodityLookup } from "./data/pullCommodityLookup.js";
import { pullMarketData } from "./data/pullMarketData.js";
import { pullFullOrderBooks } from "./data/pullFullOrderBooks.js";
import { pullFleetData } from "./data/pullFleetData.js";
import { pullStorageData } from "./data/pullStorageData.js";
import { pullPlanetData } from "./data/pullPlanetData.js";
import { pullFlightData } from "./data/pullFlightData.js";
import { pullRecipeData } from "./data/pullRecipeData.js";
import { pullBuildingData } from "./data/pullBuildingData.js";
import { pullProductionData } from "./data/pullProductionData.js";
import { pullWorkforceData } from "./data/pullWorkforceData.js";

//import { CACHE_TTLS, getCachedData } from "./cache/functions/cacheFunctions.js";
import { getCachedData } from "./cache/functions/cacheFunctions.js";

const CACHE_TTLS = {
    static: 1,
    market: 1,
    ops:1
};

export async function initializeData() {
    const staticData = await getCachedData(
        "./cache/snapshots/static-cache.json",
        CACHE_TTLS.static,
        async () => {
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
        }
    );

    const marketData = await getCachedData(
        "./cache/snapshots/market-cache.json",
        CACHE_TTLS.market,
        async () => {
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
        }
    );

    const opsData = await getCachedData(
        "./cache/snapshots/ops-cache.json",
        CACHE_TTLS.ops,
        async () => {
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
        }
    );

    return {
        ...staticData,
        ...marketData,
        ...opsData
    };
}
