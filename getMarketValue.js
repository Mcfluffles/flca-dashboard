function getMarketValue(markets, ticker, amount, exchange = "CI1") {
    const market = markets[ticker]?.[exchange];

    return {
        ReplacementCost: market?.Ask
            ? Number((amount * market.Ask).toFixed(2))
            : null,

        LiquidationValue: market?.Bid
            ? Number((amount * market.Bid).toFixed(2))
            : null,

        AverageMarketValue: market?.AveragePrice
            ? Number((amount * market.AveragePrice).toFixed(2))
            : null
    };
}