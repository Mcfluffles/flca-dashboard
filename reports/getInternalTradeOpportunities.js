export function getInternalTradeOpportunities(operationsByCompany) {
    const producers = operationsByCompany.filter(o => o.NetPerDay > 0);
    const consumers = operationsByCompany.filter(o => o.NetPerDay < 0);

    const opportunities = [];

    for (const producer of producers) {
        for (const consumer of consumers) {
            if (producer.Ticker !== consumer.Ticker) continue;
            if (producer.CompanyCode === consumer.CompanyCode) continue;

            const availablePerDay = producer.NetPerDay;
            const neededPerDay = Math.abs(consumer.NetPerDay);
            const matchedPerDay = Math.min(availablePerDay, neededPerDay);

            opportunities.push({
                Ticker: producer.Ticker,
                Name: producer.Name,

                Seller: producer.CompanyCode,
                Buyer: consumer.CompanyCode,

                SellerSurplusPerDay: Number(availablePerDay.toFixed(2)),
                BuyerDeficitPerDay: Number(neededPerDay.toFixed(2)),
                MatchedPerDay: Number(matchedPerDay.toFixed(2)),

                SellerValuePerDay: producer.NetAvgValuePerDay,
                BuyerDeficitValuePerDay: Math.abs(consumer.NetAvgValuePerDay ?? 0),

                BuyerDaysRemaining: consumer.DaysRemaining,
                BuyerStatus: consumer.Status
            });
        }
    }

    return opportunities.sort((a, b) => {
        if (a.BuyerStatus !== b.BuyerStatus) {
            const priority = {
                CRITICAL: 1,
                LOW: 2,
                HEALTHY: 3,
                ABUNDANT: 4,
                SURPLUS: 5
            };

            return priority[a.BuyerStatus] - priority[b.BuyerStatus];
        }

        return b.MatchedPerDay - a.MatchedPerDay;
    });
}