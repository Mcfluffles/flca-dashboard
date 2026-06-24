// FLCA Dashboard Main v1.0

/* Import all the functions */

// @ts-check

import { initializeData } from "./initializeData.js";
import { findShortages } from "./findShortages.js";
import { findCriticalShortages } from "./findCriticalShortages.js";
import { findOOSShortages } from "./findOOSShortages.js";
import { findArbitrage } from "./findArbitrage.js";
import { tradePlannerV1} from "./tradePlanner.js";
import { routePlannerV1 } from "./routePlannerV1.js";
import { inventoryRollup } from "./inventory/inventoryRollup.js";
import { findMaterial } from "./inventory/findMaterial.js";
import { findAllShips } from "./fleet/findAllShips.js";
import { getBlueprintMaterials } from "./blueprints/getBlueprintMaterials.js";
import { fleetRoutePlannerV1 } from "./fleetRoutePlanner.js";
import { productionRollup } from "./production/productionRollup.js";
import { operationsRollup, operationsRollupByCompany } from "./production/operationsRollup.js";
import { consumptionRollup } from "./production/consumptionRollup.js";
import { operationsSummary, operationsSummaryByCompany } from "./production/operationsSummary.js";

import fs from "fs/promises";
import { generateDashboardHTML } from "./display/generateDashboardHTML.js";


import { shipBlueprints } from "./blueprints/ships/shipBlueprints.js";


import "dotenv/config";

async function main() {
     
    /* Call and store all the market, building, etc. data, and store it for use by the following:
    dashboard.exchanges <- all exchange identity information
    dashboard.materials <- all material information
    dashboard.markets <- all summarized market data by ticker by exchange
    dashboard.planets
    dashboard.fleet
    dashboard.orderbooks
    dashboard.storage
    dashboard.recipes
    dashboard.buildings
    dashboard.production
    */

    console.time("initializeData");
    const dashboard = await initializeData();
    console.timeEnd("initializeData");

    console.table(
        dashboard.fleet.AllShips.map(ship => ({
            Company: ship.CompanyCode,
            Ship: ship.Name,
            Registration: ship.Registration,
            Location: ship.Location,
            Condition: Number((ship.Condition * 100).toFixed(1))
        }))
    );

    // const fleetStatus = findAllShips(dashboard);
    // console.table(fleetStatus);

    // const flights = dashboard.flights.AllFlights;
    // console.log(flights);

    // console.time("routePlanner");
    // const plannedRoute = routePlannerV1(dashboard, 
    // {
    //     startExchange: "CI1",
    //     maxCapital: 100000,
    //     shipTonnage: 500,
    //     shipVolume: 500,
    //     fuelCost: 0,
    //     maintCost: 0,
    //     minProfit: 5000,
    //     sortBy: "TripNetProfit",
    //     maxLegs: 6
    // })
    // console.timeEnd("routePlanner");
    // console.table(plannedRoute);




    // const fleetRoutes = fleetRoutePlannerV1(
    //     dashboard,
    //     [
    //         {
    //             ShipName: "PFLO Freightfang",
    //             StartExchange: "CI1",
    //             ShipTonnage: 500,
    //             ShipVolume: 500,
    //             MaxCapital: 500000
    //         },
    //         {
    //             ShipName: "PFLO Tailwind Express",
    //             StartExchange: "CI1",
    //             ShipTonnage: 3000,
    //             ShipVolume: 1000,
    //             MaxCapital: 500000
    //         }
    //     ],
    //     {
    //         fuelCost: 0,
    //         maintCost: 0,
    //         minProfit: 1000,
    //         sortBy: "TripNetProfit",
    //         maxLegsPerShip: 6
    //     }
    // );

    // console.table(
    //     fleetRoutes.flatMap(route => route.Legs)
    // );



    // const production = productionRollup(dashboard);

    // const byCompanyRows = [];

    // for (const companyCode in production.ByCompany) {
    //     byCompanyRows.push(
    //         ...Object.values(production.ByCompany[companyCode])
    //     );
    // }

    // console.table(byCompanyRows);

    // const inventory = inventoryRollup(dashboard, { exchange: "CI1" });
    // const production = productionRollup(dashboard);
    // const consumption = consumptionRollup(dashboard)

    // console.table(
    //     operationsRollup(inventory, production, consumption)
    //         .sort((a, b) => a.Ticker.localeCompare(b.Ticker))
    // );
    // console.table(operationsRollupByCompany(inventory, production, consumption));

    const inventory =
        inventoryRollup(dashboard);

    const production =
        productionRollup(dashboard);

    const consumption =
        consumptionRollup(dashboard);

    const operations =
        operationsSummary(
            inventory,
            production,
            consumption
        );

    const fleet = findAllShips(dashboard);

    const operationsByCompany =
        operationsSummaryByCompany(
            inventory,
            production,
            consumption
        );

    // console.table(
    //     operations
    //         .sort((a, b) => a.SortDaysRemaining - b.SortDaysRemaining)
    // );

    // console.table(
    //     operations
    //         .sort((a, b) => b.PriorityScore - a.PriorityScore)
    // );

    // console.table(
    //     operationsSummary(inventory, production, consumption)
    //         .sort((a, b) => {
    //             if (a.CompanyCode !== b.CompanyCode) {
    //                 return a.CompanyCode.localeCompare(b.CompanyCode);
    //             }

    //             return a.SortDaysRemaining - b.SortDaysRemaining;
    //         })
    // );



    const html = generateDashboardHTML({
        fleet,
        operations,
        operationsByCompany,
        production: production.AllProductionRates,
        inventory: inventory.AllMaterials
    });

    await fs.mkdir("./output", { recursive: true });
    await fs.writeFile("./output/dashboard.html", html);

    // console.log(
    //     JSON.stringify(
    //         dashboard.workforce.AllWorkforce[0].Workforces[0],
    //         null,
    //         2
    //     )
    // );

    // console.table(
    //     operations.map(row => ({
    //         ...row,
    //         DaysRemaining:
    //             row.DaysRemaining === null
    //                 ? "∞"
    //                 : row.DaysRemaining
    //     }))
    // );


    // const bpMats = getBlueprintMaterials(dashboard, shipBlueprints);
    // console.table(bpMats.AllMaterials);

    // const inventory = inventoryRollup(dashboard);
    // console.table(inventory.AllMaterials);
    // console.table(Object.values(inventory.ByCompany.PFLO));

    // const galLocations = findMaterial(dashboard, "SF");
    // console.table(galLocations);

    const route = routePlannerV1(dashboard, {
        startExchange: "CI1",
        maxCapital: 125000,
        shipTonnage: 3000,
        shipVolume: 1000,
        fuelCost: 15000,
        maintCost: 0,
        minProfit: 1000,
        maxLegs: 10,
        sortBy: "TripNetProfit"
    });

    console.table(route.Legs.map(leg => ({
        Leg: leg.Leg,
        BuyExchange: leg.BuyExchange,
        SellExchange: leg.SellExchange,
        TradeCount: leg.Trades.length,
        CapitalUsed: leg.CapitalUsed,
        WeightUsed: leg.WeightUsed,
        VolumeUsed: leg.VolumeUsed,
        NetProfit: leg.NetProfit,
        EndingCapital: leg.EndingCapital
    })));

    console.table(
        route.Legs.flatMap(leg =>
            leg.Trades.map(trade => ({
                Leg: leg.Leg,
                Ticker: trade.Ticker,
                BuyExchange: trade.BuyExchange,
                SellExchange: trade.SellExchange,
                Units: trade.UnitsThisTrip,
                Profit: trade.TripProfit
            }))
        )
    );

}

main();