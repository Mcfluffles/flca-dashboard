// Find Arbitrage Opportunities, v1.0
//This function finds arbitrage opportunites and sends them back to the caller to be displayed on the dashboard.
//This function recieves the dashboard data as a parameter.

import { calculateDepthArbitrage } from "./calcArbitrageDepth.js";

export function findArbitrage(data) {
    const orderBooks = data.orderBooks;
    const materials = data.materials;
    const opportunities = [];

    for (const ticker in orderBooks) {
        const exchanges = orderBooks[ticker];

        for (const buyCX in exchanges) {
            const buyBook = exchanges[buyCX];

            for (const sellCX in exchanges) {
                if (sellCX === buyCX) continue;

                const sellBook = exchanges[sellCX];

                const depth = calculateDepthArbitrage(buyBook, sellBook);

                if (depth.GrossProfit > 0) {
                    const material = materials[ticker];

                    opportunities.push({
                        Ticker: ticker,
                        BuyExchange: buyCX,
                        SellExchange: sellCX,
                        ExecutableUnits: depth.ExecutableUnits,
                        AverageBuyPrice: depth.AverageBuyPrice,
                        AverageSellPrice: depth.AverageSellPrice,
                        ProfitPerUnit: depth.ProfitPerUnit,
                        ProfitPerVolume: Number((depth.ProfitPerUnit / material.Volume).toFixed(2)),
                        ProfitPerWeight: Number((depth.ProfitPerUnit / material.Weight).toFixed(2)),
                        TotalCost: depth.TotalCost,
                        TotalRevenue: depth.TotalRevenue,
                        GrossProfit: depth.GrossProfit,
                        CapitalEfficiency: Number((depth.GrossProfit / depth.TotalCost).toFixed(3))
                    });
                }
            }
        }
    }

    opportunities.sort((a, b) => b.GrossProfit - a.GrossProfit);

    return opportunities;
}
