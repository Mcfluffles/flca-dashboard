// Consume Depth Arbitrage, v1.0

/*
This function walks the order books and consumes the orders for the arbitrage calculator so the route planner does not reselect them.
This function is passed the buy order book and sell order book given by the calling function, from the working orders dataset.
*/

export function consumeDepthArbitrage(buyBook, sellBook, maxUnitsToConsume) {
    const asks = buyBook.asks;
    const bids = sellBook.bids;

    let totalUnits = 0;
    let totalCost = 0;
    let totalRevenue = 0;

    while (asks.length > 0 && bids.length > 0) {
        const ask = asks[0];
        const bid = bids[0];

        if (bid.price <= ask.price) {
            break;
        }

        const remainingUnits = maxUnitsToConsume - totalUnits;

        if (remainingUnits <= 0) {
            break;
        }

        const tradeQty = Math.min(
            ask.qty,
            bid.qty,
            remainingUnits
        );

        totalUnits += tradeQty;
        totalCost += tradeQty * ask.price;
        totalRevenue += tradeQty * bid.price;

        ask.qty -= tradeQty;
        bid.qty -= tradeQty;

        if (ask.qty === 0) asks.shift();
        if (bid.qty === 0) bids.shift();
    }

    const grossProfit = totalRevenue - totalCost;

    return {
        ExecutableUnits: totalUnits,
        TotalCost: Number(totalCost.toFixed(2)),
        TotalRevenue: Number(totalRevenue.toFixed(2)),
        GrossProfit: Number(grossProfit.toFixed(2)),
        AverageBuyPrice: totalUnits > 0
            ? Number((totalCost / totalUnits).toFixed(2))
            : 0,
        AverageSellPrice: totalUnits > 0
            ? Number((totalRevenue / totalUnits).toFixed(2))
            : 0,
        ProfitPerUnit: totalUnits > 0
            ? Number((grossProfit / totalUnits).toFixed(2))
            : 0
    };
}