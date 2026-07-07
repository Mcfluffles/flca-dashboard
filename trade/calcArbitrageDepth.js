// Calculate Depth Arbitrage, v1.0

/*
This function parses the order books and returns the executable units, total cost, revenue, profit, etc. for arbitrage opportunities
This function is passed the buy order book and sell order book given by the calling function, probably from the dashboard dataset.
*/

export function calculateDepthArbitrage(buyBook, sellBook) {
    const asks = buyBook.asks.map(order => ({ ...order }));
    const bids = sellBook.bids.map(order => ({ ...order }));

    let askIndex = 0;
    let bidIndex = 0;

    let totalUnits = 0;
    let totalCost = 0;
    let totalRevenue = 0;

    if (
        buyBook.asks.length === 0 ||
        sellBook.bids.length === 0 ||
        sellBook.bids[0].price <= buyBook.asks[0].price
    ) {
        return {
            ExecutableUnits: 0,
            TotalCost: 0,
            TotalRevenue: 0,
            GrossProfit: 0,
            AverageBuyPrice: 0,
            AverageSellPrice: 0,
            ProfitPerUnit: 0
        };
    }

    while (askIndex < asks.length && bidIndex < bids.length) {
        const ask = asks[askIndex];
        const bid = bids[bidIndex];

        if (bid.price <= ask.price) {
            break;
        }

        const tradeQty = Math.min(ask.qty, bid.qty);

        totalUnits += tradeQty;
        totalCost += tradeQty * ask.price;
        totalRevenue += tradeQty * bid.price;

        ask.qty -= tradeQty;
        bid.qty -= tradeQty;

        if (ask.qty === 0) askIndex++;
        if (bid.qty === 0) bidIndex++;

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