export function consumptionRollup(data) {
    const productionLines = data.production.AllProduction;

    const byTicker = {};
    const byCompany = {};

    for (const line of productionLines) {
        const companyCode = line.CompanyCode;

        if (!byCompany[companyCode]) {
            byCompany[companyCode] = {};
        }

        for (const order of line.Orders) {
            if (order.IsHalted) continue;
            if (order.DurationMs <= 0) continue;

            const hoursPerCycle = order.DurationMs / (1000 * 60 * 60);

            for (const input of order.Inputs) {
                const ticker = input.MaterialTicker;

                const inputPerHour = input.MaterialAmount / hoursPerCycle;
                const inputPerDay = inputPerHour * 24;

                if (!byTicker[ticker]) {
                    byTicker[ticker] = {
                        Ticker: ticker,
                        Name: input.MaterialName,
                        Orders: 0,
                        InputPerHour: 0,
                        InputPerDay: 0
                    };
                }

                if (!byCompany[companyCode][ticker]) {
                    byCompany[companyCode][ticker] = {
                        CompanyCode: companyCode,
                        Ticker: ticker,
                        Name: input.MaterialName,
                        Orders: 0,
                        InputPerHour: 0,
                        InputPerDay: 0
                    };
                }

                byTicker[ticker].Orders += 1;
                byTicker[ticker].InputPerHour += inputPerHour;
                byTicker[ticker].InputPerDay += inputPerDay;

                byCompany[companyCode][ticker].Orders += 1;
                byCompany[companyCode][ticker].InputPerHour += inputPerHour;
                byCompany[companyCode][ticker].InputPerDay += inputPerDay;
            }
        }
    }

    return {
        ByTicker: byTicker,
        AllConsumptionRates: Object.values(byTicker),
        ByCompany: byCompany
    };
}