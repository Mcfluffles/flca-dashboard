// Find Critical Shortages v1.0
// This function finds critical shortages from the passed dataset, by using a ratio metric instead of simple subtraction.

export function findCriticalShortages(data) {
    const marketData = data.markets;

    const criticalShortages = [];

    for (const ticker in marketData) {
        const exchanges = marketData[ticker];

        for (const cx in exchanges) {
            const listing = exchanges[cx];

            if (
                listing.Supply > 0 &&
                listing.Demand > listing.Supply
            ) {
                criticalShortages.push(
                    {
                        Ticker: ticker,
                        Exchange: cx,
                        Demand: listing.Demand,
                        Supply: listing.Supply,
                        ShortageAmt: listing.Demand - listing.Supply,
                        ShortageRto: listing.Supply === 0
                            ? Infinity
                            : listing.Demand / listing.Supply
                    }
                )
            }

        }
    }

    criticalShortages.sort((a, b) => b.ShortageRto - a.ShortageRto);
    return criticalShortages;

}
