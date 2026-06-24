// Inventory Rollup, V1.0

/*
This functions rolls up the inventory counts obtained by the pull storage function into something usable.
The function is passed the dashboard data by the caller.
*/

// Inventory Rollup, V1.0

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

export function inventoryRollup(data, options = {}) {
    const storageData = data.storage.AllStorage;
    const markets = data.markets;
    const exchange = options.exchange ?? "CI1";

    const byTicker = {};
    const byCompany = {};

    for (const store of storageData) {
        const companyCode = store.CompanyCode;

        if (!byCompany[companyCode]) {
            byCompany[companyCode] = {};
        }

        for (const item of store.StorageItems) {
            const ticker = item.MaterialTicker;

            if (!byTicker[ticker]) {
                byTicker[ticker] = {
                    Ticker: ticker,
                    Name: item.MaterialName,
                    Amount: 0,
                    BookValue: 0,
                    Weight: 0,
                    Volume: 0
                };
            }

            if (!byCompany[companyCode][ticker]) {
                byCompany[companyCode][ticker] = {
                    CompanyCode: companyCode,
                    Ticker: ticker,
                    Name: item.MaterialName,
                    Amount: 0,
                    BookValue: 0,
                    Weight: 0,
                    Volume: 0
                };
            }

            byTicker[ticker].Amount += item.MaterialAmount;
            byTicker[ticker].BookValue += item.MaterialValue;
            byTicker[ticker].Weight += item.TotalWeight;
            byTicker[ticker].Volume += item.TotalVolume;

            byCompany[companyCode][ticker].Amount += item.MaterialAmount;
            byCompany[companyCode][ticker].BookValue += item.MaterialValue;
            byCompany[companyCode][ticker].Weight += item.TotalWeight;
            byCompany[companyCode][ticker].Volume += item.TotalVolume;
        }
    }

    for (const ticker in byTicker) {
        byTicker[ticker] = {
            ...byTicker[ticker],
            Amount: Number(byTicker[ticker].Amount.toFixed(2)),
            BookValue: Number(byTicker[ticker].BookValue.toFixed(2)),
            Weight: Number(byTicker[ticker].Weight.toFixed(2)),
            Volume: Number(byTicker[ticker].Volume.toFixed(2)),
            ...getMarketValue(markets, ticker, byTicker[ticker].Amount, exchange)
        };
    }

    for (const companyCode in byCompany) {
        for (const ticker in byCompany[companyCode]) {
            byCompany[companyCode][ticker] = {
                ...byCompany[companyCode][ticker],
                Amount: Number(byCompany[companyCode][ticker].Amount.toFixed(2)),
                BookValue: Number(byCompany[companyCode][ticker].BookValue.toFixed(2)),
                Weight: Number(byCompany[companyCode][ticker].Weight.toFixed(2)),
                Volume: Number(byCompany[companyCode][ticker].Volume.toFixed(2)),
                ...getMarketValue(
                    markets,
                    ticker,
                    byCompany[companyCode][ticker].Amount,
                    exchange
                )
            };
        }
    }

    return {
        ExchangeUsed: exchange,
        AllMaterials: Object.values(byTicker),
        ByTicker: byTicker,
        ByCompany: byCompany
    };
}