// Operations Rollup, V1.0

export function operationsRollup(inventory, production, consumption) {
    const rows = [];

    for (const ticker in inventory.ByTicker) {
        const inv = inventory.ByTicker[ticker];
        const prod = production.ByTicker[ticker];
        const cons = consumption.ByTicker[ticker];

        rows.push({
            Ticker: ticker,
            Name: inv.Name,
            Amount: inv.Amount,

            BookValue: inv.BookValue,
            ReplacementCost: inv.ReplacementCost,
            LiquidationValue: inv.LiquidationValue,
            AverageMarketValue: inv.AverageMarketValue,

            Weight: inv.Weight,
            Volume: inv.Volume,

            OutputPerHour: prod?.OutputPerHour ?? 0,
            OutputPerDay: prod?.OutputPerDay ?? 0,
            Orders: prod?.Orders ?? 0, 

            InputPerHour: cons?.InputPerHour ?? 0,
            InputPerDay: cons?.InputPerDay ?? 0,
            NetPerHour: (prod?.OutputPerHour ?? 0) - (cons?.InputPerHour ?? 0),
            NetPerDay: (prod?.OutputPerDay ?? 0) - (cons?.InputPerDay ?? 0),
            DaysRemaining: (cons?.InputPerDay ?? 0) > 0
                ? inv.Amount / cons.InputPerDay
                : null
        });
    }

    return rows;
}

export function operationsRollupByCompany(inventory, production, consumption) {
    const rows = [];

    for (const companyCode in inventory.ByCompany) {
        const companyInventory = inventory.ByCompany[companyCode];
        const companyProduction = production.ByCompany[companyCode] ?? {};

        for (const ticker in companyInventory) {
            const inv = companyInventory[ticker];
            const prod = companyProduction[ticker];
            const cons = consumption.ByTicker[ticker];

            rows.push({
                CompanyCode: companyCode,
                Ticker: ticker,
                Name: inv.Name,
                Amount: inv.Amount,

                BookValue: inv.BookValue,
                ReplacementCost: inv.ReplacementCost,
                LiquidationValue: inv.LiquidationValue,
                AverageMarketValue: inv.AverageMarketValue,

                Weight: inv.Weight,
                Volume: inv.Volume,

                OutputPerHour: prod?.OutputPerHour ?? 0,
                OutputPerDay: prod?.OutputPerDay ?? 0,
                Orders: prod?.Orders ?? 0,

                InputPerHour: cons?.InputPerHour ?? 0,
                InputPerDay: cons?.InputPerDay ?? 0,
                NetPerHour: (prod?.OutputPerHour ?? 0) - (cons?.InputPerHour ?? 0),
                NetPerDay: (prod?.OutputPerDay ?? 0) - (cons?.InputPerDay ?? 0),
                DaysRemaining: (cons?.InputPerDay ?? 0) > 0
                    ? inv.Amount / cons.InputPerDay
                    : null
            });
        }
    }

    return rows;
}