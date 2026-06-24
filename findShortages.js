//Shortage Finder v1.0
//This function will search the basic market data and then identify and score the shortage, and then sort by rank, with the most "critical" shortage first.
//The function must be passed the market dataset as a parameter.

export function findShortages(data) {
    const marketData = data.markets;
    const shortages = [];

    for (const ticker in marketData) {
        const exchanges = marketData[ticker]

        for (const cx in exchanges) {
            const listing = exchanges[cx];

            if (listing.Demand > listing.Supply) {
                shortages.push(
                    {
                        Ticker: ticker,
                        Exchange: cx,
                        Demand: listing.Demand,
                        Supply: listing.Supply,
                        ShortageAmt: listing.Demand - listing.Supply
                    }
                )
            }

        }

    }

    shortages.sort((a,b) => b.ShortageAmt - a.ShortageAmt)

    return shortages;
}
