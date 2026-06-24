// Production Rollup, V1.0

export function productionRollup(data) {
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

            for (const output of order.Outputs) {
                const ticker = output.MaterialTicker;

                const outputPerHour = output.MaterialAmount / hoursPerCycle;
                const outputPerDay = outputPerHour * 24;

                if (!byTicker[ticker]) {
                    byTicker[ticker] = {
                        Ticker: ticker,
                        Name: output.MaterialName,
                        Orders: 0,
                        OutputPerHour: 0,
                        OutputPerDay: 0
                    };
                }

                if (!byCompany[companyCode][ticker]) {
                    byCompany[companyCode][ticker] = {
                        CompanyCode: companyCode,
                        Ticker: ticker,
                        Name: output.MaterialName,
                        Orders: 0,
                        OutputPerHour: 0,
                        OutputPerDay: 0
                    };
                }

                byTicker[ticker].Orders += 1;
                byTicker[ticker].OutputPerHour += outputPerHour;
                byTicker[ticker].OutputPerDay += outputPerDay;

                byCompany[companyCode][ticker].Orders += 1;
                byCompany[companyCode][ticker].OutputPerHour += outputPerHour;
                byCompany[companyCode][ticker].OutputPerDay += outputPerDay;
            }
        }
    }

    return {
        ByTicker: byTicker,
        AllProductionRates: Object.values(byTicker),
        ByCompany: byCompany
    };
}