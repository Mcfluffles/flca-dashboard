import { inventoryRollup } from "../inventory/inventoryRollup.js";
import { productionRollup } from "../production/productionRollup.js";
import { consumptionRollup } from "../production/consumptionRollup.js";
import { operationsSummaryByCompany } from "../production/operationsSummary.js";

export function getProductionByCompany(dashboard) {
    const inventory = inventoryRollup(dashboard);
    const production = productionRollup(dashboard);
    const consumption = consumptionRollup(dashboard);

    const operationsByCompany = operationsSummaryByCompany(
        inventory,
        production,
        consumption
    );

    return operationsByCompany
        .filter(o => o.NetPerDay > 0)
        .sort((a, b) => {
            if (a.CompanyCode !== b.CompanyCode) {
                return a.CompanyCode.localeCompare(b.CompanyCode);
            }

            return b.NetPerDay - a.NetPerDay;
        });
}