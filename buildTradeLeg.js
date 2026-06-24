// Build Trade Leg, V1.0

/*
Builds one cargo leg from a starting exchange.

V1 rule:
One leg has one BuyExchange and one SellExchange,
but may include multiple tickers going to that same SellExchange.
*/

import { tradePlannerV1 } from "./tradePlanner.js";
import { consumeDepthArbitrage } from "./consumeDepthArbitrage.js";

export function buildTradeLeg(data, options) {
    const {
        buyExchange,
        maxCapital,
        shipTonnage,
        shipVolume,
        fuelCost,
        maintCost,
        minProfit,
        sortBy
    } = options;

    let remainingCapital = maxCapital;
    let remainingTonnage = shipTonnage;
    let remainingVolume = shipVolume;

    let sellExchange = null;

    const tradesInLeg = [];

    let totalCost = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalWeight = 0;
    let totalVolume = 0;

    while (
        remainingCapital > 0 &&
        remainingTonnage > 0 &&
        remainingVolume > 0
    ) {
        const trades = tradePlannerV1(data, {
            maxCapital: remainingCapital,
            shipTonnage: remainingTonnage,
            shipVolume: remainingVolume,
            fuelCost: 0,
            maintCost: 0,
            minProfit,
            sortBy: sortBy ?? "TripNetProfit"
        });

        const candidate = trades.find(trade => {
            if (trade.BuyExchange !== buyExchange) {
                return false;
            }

            if (sellExchange && trade.SellExchange !== sellExchange) {
                return false;
            }

            return true;
        });

        if (!candidate) {
            break;
        }

        if (!sellExchange) {
            sellExchange = candidate.SellExchange;
        }

        consumeDepthArbitrage(
            data.orderBooks[candidate.Ticker][candidate.BuyExchange],
            data.orderBooks[candidate.Ticker][candidate.SellExchange],
            candidate.UnitsThisTrip
        );

        tradesInLeg.push(candidate);

        remainingCapital -= candidate.TripCost;
        remainingTonnage -= candidate.WeightUsed;
        remainingVolume -= candidate.VolumeUsed;

        totalCost += candidate.TripCost;
        totalRevenue += candidate.TripRevenue;
        totalProfit += candidate.TripProfit;
        totalWeight += candidate.WeightUsed;
        totalVolume += candidate.VolumeUsed;

        if (candidate.TripCost <= 0 || candidate.UnitsThisTrip <= 0) {
            break;
        }
    }

    if (tradesInLeg.length === 0) {
        return null;
    }

    const tripExpenses = fuelCost + maintCost;
    const netProfit = totalProfit - tripExpenses;

    if (netProfit < minProfit) {
        return null;
    }

    return {
        BuyExchange: buyExchange,
        SellExchange: sellExchange,
        Trades: tradesInLeg,

        TotalCost: Number(totalCost.toFixed(2)),
        TotalRevenue: Number(totalRevenue.toFixed(2)),
        TotalProfit: Number(totalProfit.toFixed(2)),
        TripExpenses: Number(tripExpenses.toFixed(2)),
        NetProfit: Number(netProfit.toFixed(2)),

        CapitalUsed: Number(totalCost.toFixed(2)),
        WeightUsed: Number(totalWeight.toFixed(2)),
        VolumeUsed: Number(totalVolume.toFixed(2)),

        RemainingCapital: Number(remainingCapital.toFixed(2)),
        RemainingTonnage: Number(remainingTonnage.toFixed(2)),
        RemainingVolume: Number(remainingVolume.toFixed(2))
    };
}