//Create Order Books, v1.0

/*
This function calls the /exchanges/full endpoint to generate the crossCX wide order books.
Then we will only pull the tickers we need later as live data, while everything else will use this cached data.

This function must be passed the dashboard data.
*/

export async function pullFullOrderBooks() {
    const response = await fetch("https://rest.fnar.net/exchange/full");
    const fullExchangeData = await response.json();

    const orderBooks = {};

    for (const listing of fullExchangeData) {
        const ticker = listing.MaterialTicker;
        const exchange = listing.ExchangeCode;

        if (!orderBooks[ticker]) {
            orderBooks[ticker] = {};
        }

        orderBooks[ticker][exchange] = {
            BuyingOrders: listing.BuyingOrders,
            SellingOrders: listing.SellingOrders,

            asks: listing.SellingOrders
                .filter(order => order.ItemCount !== null)
                .map(order => ({
                    qty: order.ItemCount,
                    price: order.ItemCost
                }))
                .sort((a, b) => a.price - b.price),

            bids: listing.BuyingOrders
                .filter(order => order.ItemCount !== null)
                .map(order => ({
                    qty: order.ItemCount,
                    price: order.ItemCost
                }))
                .sort((a, b) => b.price - a.price),

            Ask: listing.Ask,
            Bid: listing.Bid,
            Supply: listing.Supply,
            Demand: listing.Demand,
            Timestamp: listing.Timestamp
        };
    }

    return orderBooks;
}