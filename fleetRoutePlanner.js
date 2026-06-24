// Fleet Route Planner, V1.0

/*
This function plans routes for multiple ships using a round-robin planner.

Each ship gets one chance to pick a trade per round.
All ships share one working market copy, so once one ship consumes an opportunity,
the next ship sees the updated order books.
*/

import { tradePlannerV1 } from "./tradePlanner.js";
import { consumeDepthArbitrage } from "./consumeDepthArbitrage.js";

export function fleetRoutePlannerV1(data, ships, options) {
    const {
        fuelCost,
        maintCost,
        minProfit,
        sortBy,
        maxLegsPerShip
    } = options;

    const workingData = {
        ...data,
        orderBooks: structuredClone(data.orderBooks)
    };

    const shipStates = ships.map(ship => ({
        ShipName: ship.ShipName,
        StartExchange: ship.StartExchange,
        CurrentExchange: ship.StartExchange,
        ShipTonnage: ship.ShipTonnage,
        ShipVolume: ship.ShipVolume,
        CurrentCapital: ship.MaxCapital,
        StartingCapital: ship.MaxCapital,
        Legs: [],
        TotalProfit: 0
    }));

    for (let round = 0; round < maxLegsPerShip; round++) {
        for (const ship of shipStates) {
            const trades = tradePlannerV1(workingData, {
                maxCapital: ship.CurrentCapital,
                shipTonnage: ship.ShipTonnage,
                shipVolume: ship.ShipVolume,
                fuelCost,
                maintCost,
                minProfit,
                sortBy: sortBy ?? "TripNetProfit"
            });

            const pickedTrade = trades
                .filter(trade => trade.BuyExchange === ship.CurrentExchange)[0];

            if (!pickedTrade) {
                continue;
            }

            consumeDepthArbitrage(
                workingData.orderBooks[pickedTrade.Ticker][pickedTrade.BuyExchange],
                workingData.orderBooks[pickedTrade.Ticker][pickedTrade.SellExchange],
                pickedTrade.UnitsThisTrip
            );

            const plannedLeg = {
                ShipName: ship.ShipName,
                Leg: ship.Legs.length + 1,
                Round: round + 1,
                StartingCapital: Number(ship.CurrentCapital.toFixed(2)),
                EndingCapital: Number((ship.CurrentCapital + pickedTrade.TripNetProfit).toFixed(2)),
                ...pickedTrade
            };

            ship.Legs.push(plannedLeg);

            ship.CurrentCapital += pickedTrade.TripNetProfit;
            ship.CurrentExchange = pickedTrade.SellExchange;
            ship.TotalProfit += pickedTrade.TripNetProfit;
        }
    }

    return shipStates.map(ship => ({
        ShipName: ship.ShipName,
        StartExchange: ship.StartExchange,
        EndingExchange: ship.CurrentExchange,
        StartingCapital: Number(ship.StartingCapital.toFixed(2)),
        EndingCapital: Number(ship.CurrentCapital.toFixed(2)),
        TotalProfit: Number(ship.TotalProfit.toFixed(2)),
        Legs: ship.Legs
    }));
}