// Pull the market data for a material.
//The format is Ticker.ComexCode "H.CI1"

export async function pullMarketData() {
    const url = "https://rest.fnar.net/exchange/all"

    console.log("Fetching market data...")

    const response = await fetch(url);
    const allMarketData = await response.json();

   const marketLookup = {};

    for (const listing of allMarketData) {

        const ticker = listing.MaterialTicker;
        const cx = listing.ExchangeCode;

        if (!marketLookup[ticker]) {

            marketLookup[ticker] = {};
        }

        marketLookup[ticker][cx] = {
            Ask: listing.Ask,
            AskQty: listing.AskCount,
            Supply: listing.Supply,
            Bid: listing.Bid,
            BidQty: listing.BidCount,
            Demand: listing.Demand,
            AveragePrice: listing.PriceAverage
        };
    };

    return marketLookup;

} 