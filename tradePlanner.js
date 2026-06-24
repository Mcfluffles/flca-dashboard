// Trade Planner, V1.0

/* 
This function is the basic trade planner. It answer the question, given:
    1. I know where shortages are (our shortage functions)
    2. I know where arbitrage exists (our arbitrage finder)

    Q: What trade should I make given an amount of capital, and a specific ship.

    The passed parameters are two items:
    The dashboard information to calculate arbitrage and shortages
    An object containing the options of the function
        Capital
        shipTonnage
        shipVolume
        and desired sort
*/

import { findArbitrage } from "./findArbitrage.js";
import { findShortages } from "./findShortages.js";
import { findCriticalShortages } from "./findCriticalShortages.js";
import { findOOSShortages } from "./findOOSShortages.js";

export function tradePlannerV1(data, options) {

    //These are the passed options parameters
     const {
        maxCapital,
        shipTonnage,
        shipVolume,
        fuelCost,
        maintCost,
        minProfit,
        sortBy
    } = options;

    //Make the below initializeShortages() eventually
    const arbitrageData = findArbitrage(data);

    const plannedTrades = [];
    
    for (const trade of arbitrageData) {
            const material = data.materials[trade.Ticker];

            const unitsByCapital = maxCapital / trade.AverageBuyPrice;
            const unitsByWeight = shipTonnage / material.Weight;
            const unitsByVolume = shipVolume / material.Volume;

            const unitsThisTrip = Math.floor(Math.min(
                trade.ExecutableUnits,
                unitsByCapital,
                unitsByWeight,
                unitsByVolume
            ));

            if (unitsThisTrip <= 0) continue;

        const tripCost = unitsThisTrip * trade.AverageBuyPrice;
        const tripRevenue = unitsThisTrip * trade.AverageSellPrice;
        const tripProfit = tripRevenue - tripCost;
        const tripExpenses = fuelCost + maintCost;
        const netTripProfit = tripProfit - tripExpenses;

        plannedTrades.push({
        Ticker: trade.Ticker,
        BuyExchange: trade.BuyExchange,
        SellExchange: trade.SellExchange,
        UnitsThisTrip: unitsThisTrip,
        TripCost: Number(tripCost.toFixed(2)),
        TripRevenue: Number(tripRevenue.toFixed(2)),
        TripProfit: Number(tripProfit.toFixed(2)),
        CapitalUsed: Number(tripCost.toFixed(2)),
        WeightUsed: Number((unitsThisTrip * material.Weight).toFixed(2)),
        VolumeUsed: Number((unitsThisTrip * material.Volume).toFixed(2)),
        CapitalEfficiency: Number((tripProfit / tripCost).toFixed(2)),
        TripExpenses: Number(tripExpenses.toFixed(2)),
        TripNetProfit: Number(netTripProfit.toFixed(2)),
});
    }

    plannedTrades.sort((a, b) => b[sortBy] - a[sortBy]);

    return plannedTrades.filter(trade => trade.TripNetProfit >= minProfit);
}