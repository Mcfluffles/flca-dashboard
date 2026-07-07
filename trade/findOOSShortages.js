// Find Out of Stock Shortages v1.0
//the shortages with zeros in them.

export function findOOSShortages(data) {
    const marketData = data.markets;

    const oosShortages = [];

    for (const ticker in marketData) {
        const exchanges = marketData[ticker];

        for (const cx in exchanges) {
            const listing = exchanges[cx];

            if (
                listing.Supply === 0 &&
                listing.Demand > 0
            ) {
                oosShortages.push(
                    {
                        Ticker: ticker,
                        Exchange: cx,
                        Demand: listing.Demand,
                        Supply: listing.Supply,
                        ShortageAmt: listing.Demand - listing.Supply,
                    }
                )
            }

        }
    }

    oosShortages.sort((a, b) => b.ShortageAmt - a.ShortageAmt);
    return oosShortages;
}

