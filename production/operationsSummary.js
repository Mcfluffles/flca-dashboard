export function operationsSummary(
    inventory,
    production,
    consumption
) {
    const rows = [];

    for (const ticker in inventory.ByTicker) {
        const inv = inventory.ByTicker[ticker];
        const prod = production.ByTicker[ticker];
        const cons = consumption.ByTicker[ticker];

        const outputPerDay =
            prod?.OutputPerDay ?? 0;

        const inputPerDay =
            cons?.InputPerDay ?? 0;

        const netPerDay =
            outputPerDay - inputPerDay;

        const daysRemaining =
            netPerDay < 0
                ? Number((inv.Amount / Math.abs(netPerDay)).toFixed(1))
                : null;

        const status =
            netPerDay >= 0
                ? "SURPLUS"
                : daysRemaining < 2
                    ? "CRITICAL"
                    : daysRemaining < 5
                        ? "LOW"
                        : daysRemaining < 14
                            ? "HEALTHY"
                            : "ABUNDANT";

        const priorityScore =
            netPerDay < 0
                ? Math.abs(netPerDay) / inv.Amount
                : 0;

        rows.push({
            Ticker: ticker,
            Amount: inv.Amount,

            ProducedPerDay: outputPerDay,
            ConsumedPerDay: inputPerDay,
            NetPerDay: netPerDay,

            DaysRemaining: daysRemaining ?? "∞",
            SortDaysRemaining: daysRemaining ?? 999999,
            Status: status,
            PriorityScore: priorityScore
        });
    }

    return rows;
}

export function operationsSummaryByCompany(inventory, production, consumption) {
    const rows = [];

    for (const companyCode in inventory.ByCompany) {
        const companyInventory = inventory.ByCompany[companyCode];
        const companyProduction = production.ByCompany[companyCode] ?? {};
        const companyConsumption = consumption.ByCompany[companyCode] ?? {};

        for (const ticker in companyInventory) {
            const inv = companyInventory[ticker];
            const prod = companyProduction[ticker];
            const cons = companyConsumption[ticker];

            const producedPerDay = prod?.OutputPerDay ?? 0;
            const consumedPerDay = cons?.InputPerDay ?? 0;
            const netPerDay = producedPerDay - consumedPerDay;

            const daysRemaining =
                netPerDay < 0
                    ? Number((inv.Amount / Math.abs(netPerDay)).toFixed(1))
                    : null;

            const status =
                netPerDay >= 0
                    ? "SURPLUS"
                    : daysRemaining < 2
                        ? "CRITICAL"
                        : daysRemaining < 5
                            ? "LOW"
                            : daysRemaining < 14
                                ? "HEALTHY"
                                : "ABUNDANT";

            const priorityScore =
                netPerDay < 0
                    ? Math.abs(netPerDay) / inv.Amount
                    : 0;

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

                ProducedPerDay: Number(producedPerDay.toFixed(2)),
                ConsumedPerDay: Number(consumedPerDay.toFixed(2)),
                NetPerDay: Number(netPerDay.toFixed(2)),

                DaysRemaining: daysRemaining ?? "∞",
                SortDaysRemaining: daysRemaining ?? 999999,
                PriorityScore: Number(priorityScore.toFixed(6)),
                Status: status
            });
        }
    }

    return rows;
}