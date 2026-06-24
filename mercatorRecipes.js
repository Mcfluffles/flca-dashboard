// Pull Recipe data for FLCA Mercator Class LCB


//Define the top level recipe
const mercatorPrimaryRecipe = {
    "FFC": 1,
    "LFE": 2,
    "MFE": 2,
    "SFE": 1,
    "QCR": 1,
    "ENG": 1,
    "LCB": 1,
    "MFL": 1,
    "MSL": 1,
    "LHP": 94,
    "SSC": 128,
    "BR1": 1,
    "CQM": 1
};

//Empty lookup tables for later
let recipeLookup = {};
let marketLookup = {};
let buildingLookup = {};
let workforceNeedsLookup = {};
let bestCostLookup = {};
let recommendedBuys = {};
let optimizedBuildCost = 0;
let requiredBuildings = new Set();
let productionPlan = {};

let recipeWorkload = {};
let activeWorkforceCost = 0;

let materialLookup = {};

const cogcBonus = 1.25;
const experts = 5;
const expertBonus = 1 + experts * 0.0568;

const factionBonusByExpertise = {
    MANUFACTURING: 1.10
};

function getMultiplierForExpertise(expertise) {
    return cogcBonus * expertBonus * (factionBonusByExpertise[expertise] ?? 1);
}

function getMultiplierForBuilding(buildingTicker) {
    const building = buildingLookup[buildingTicker];
    const expertise = building?.Expertise ?? "NONE";

    return getMultiplierForExpertise(expertise);
}

const bufferDays = 14;

const commandModuleStorage = {
    weight: 5000,
    volume: 5000
};
const genericStorage = {
    ticker: "STO",
    weight: 5000,
    volume: 5000
};

const habitationBuildings = {
    PIONEER: { ticker: "HB1", capacity: 100 },
    SETTLER: { ticker: "HB2", capacity: 100 },
    TECHNICIAN: { ticker: "HB3", capacity: 100 },
    ENGINEER: { ticker: "HB4", capacity: 100 },
    SCIENTIST: { ticker: "HB5", capacity: 100 }
};

async function grabMaterials() {
    const response = await fetch("https://rest.fnar.net/material/allmaterials");
    const materials = await response.json();

    for (const material of materials) {
        materialLookup[material.Ticker] = material;
    }
};

function buildIntegerQueue(items, targetQueueLength = 100, multiplier = 1) {
    const weightedItems = items.map(item => ({
        ...item,
        adjustedRuns: item.recipeRuns / multiplier
    }));

    const totalAdjustedRuns = weightedItems.reduce(
        (sum, item) => sum + item.adjustedRuns,
        0
    );

    const queue = weightedItems.map(item => {
        const idealShare = item.adjustedRuns / totalAdjustedRuns;
        const idealOrders = idealShare * targetQueueLength;

        return {
            ...item,
            idealShare,
            idealOrders,
            queuedOrders: Math.max(1, Math.round(idealOrders))
        };
    });

    const totalQueuedTime = queue.reduce((sum, item) => {
        const recipe = recipeLookup[item.ticker][0];
        return sum + item.queuedOrders * recipe.TimeMs;
    }, 0);

    for (const item of queue) {
        const recipe = recipeLookup[item.ticker][0];

        item.runtimeShare =
            (item.queuedOrders * recipe.TimeMs) / totalQueuedTime;
    }

    return queue;
}

function resetPlanOutputs() {
    recommendedBuys = {};
    requiredBuildings = new Set();
    productionPlan = {};
    recipeWorkload = {};
    activeWorkforceCost = 0;
    optimizedBuildCost = 0;
    bestCostLookup = {};
}

async function calculateShipCost() {
    let totalCost = 0;

    for (const [ticker, quantity] of Object.entries(mercatorPrimaryRecipe)) {
        const bestCost = await getBestCost(
            ticker,
            quantity
        );

        totalCost += bestCost.totalCost;
    }

    return totalCost;
}

function requiredBasePlan(area) {
    const bases = [];
    let remaining = area;

    while (remaining > 1000) {
        bases.push(1000);
        remaining -= 1000;
    }

    if (remaining > 750) bases.push(1000);
    else if (remaining > 500) bases.push(750);
    else if (remaining > 0) bases.push(500);

    const capacity = bases.reduce((sum, base) => sum + base, 0);
    const freeArea = capacity - area;

    return {
        plan: bases.map(base => `${base}-area`).join(" + "),
        capacity,
        freeArea
    };
}

function fitsBasePlan(areaByExpertise, maxBasesPerExpertise = 3) {
    for (const [expertise, area] of Object.entries(areaByExpertise)) {
        const basePlan = requiredBasePlan(area);
        const baseCount = basePlan.plan.split(" + ").filter(Boolean).length;

        if (baseCount > maxBasesPerExpertise) {
            return false;
        }
    }

    return true;
}

async function runScenario(targetDays) {
    resetPlanOutputs();

    const cost = await calculateShipCost();

    const recipeWorkloadByBuilding = {};

    for (const item of Object.values(recipeWorkload)) {
        recipeWorkloadByBuilding[item.buildingTicker] ??= [];
        recipeWorkloadByBuilding[item.buildingTicker].push(item);
    }

    const practicalBuildingCounts = {};

    for (const [buildingTicker, items] of Object.entries(recipeWorkloadByBuilding)) {
        const totalEffectiveDays = items.reduce((sum, item) => {
            const buildingDays = item.timeMs / 1000 / 60 / 60 / 24;
            const buildingMultiplier = getMultiplierForBuilding(buildingTicker);
            return sum + (buildingDays / buildingMultiplier);
        }, 0);

        practicalBuildingCounts[buildingTicker] =
            Math.ceil(totalEffectiveDays / targetDays);
    }

    const practicalAreaReport =
        buildAreaReportFromBuildingCounts(practicalBuildingCounts);

    // storage
    const storageFlowByExpertiseLocal = {};

    for (const item of Object.values(recipeWorkload)) {
        const recipe = recipeLookup[item.ticker][0];
        const building = buildingLookup[item.buildingTicker];
        const expertise = building.Expertise ?? "NONE";

        storageFlowByExpertiseLocal[expertise] ??= {
            inputWeightPerDay: 0,
            inputVolumePerDay: 0,
            outputWeightPerDay: 0,
            outputVolumePerDay: 0
        };

        const runsPerDay = item.recipeRuns / targetDays;

        for (const input of recipe.Inputs) {
            const material = materialLookup[input.Ticker];

            storageFlowByExpertiseLocal[expertise].inputWeightPerDay +=
                (input.Amount ?? 0) * (material?.Weight ?? 0) * runsPerDay;

            storageFlowByExpertiseLocal[expertise].inputVolumePerDay +=
                (input.Amount ?? 0) * (material?.Volume ?? 0) * runsPerDay;
        }

        for (const output of recipe.Outputs) {
            const material = materialLookup[output.Ticker];

            storageFlowByExpertiseLocal[expertise].outputWeightPerDay +=
                (output.Amount ?? 0) * (material?.Weight ?? 0) * runsPerDay;

            storageFlowByExpertiseLocal[expertise].outputVolumePerDay +=
                (output.Amount ?? 0) * (material?.Volume ?? 0) * runsPerDay;
        }
    }

    const storageByExpertise = {};

    for (const [expertise, flow] of Object.entries(storageFlowByExpertiseLocal)) {
        const requiredWeight =
            (flow.inputWeightPerDay + flow.outputWeightPerDay) * bufferDays;

        const requiredVolume =
            (flow.inputVolumePerDay + flow.outputVolumePerDay) * bufferDays;

        const extraWeight = Math.max(0, requiredWeight - commandModuleStorage.weight);
        const extraVolume = Math.max(0, requiredVolume - commandModuleStorage.volume);

        const storageBuilding = buildingLookup[genericStorage.ticker];

        const storageCount = Math.max(
            0,
            Math.ceil(extraWeight / genericStorage.weight),
            Math.ceil(extraVolume / genericStorage.volume)
        );

        const storageArea = storageCount * storageBuilding.AreaCost;

        storageByExpertise[expertise] = {
            storageTicker: genericStorage.ticker,
            storageCount,
            storageArea,
            requiredWeight,
            requiredVolume,
            extraWeight,
            extraVolume
        };

        practicalAreaReport.areaByExpertise[expertise] ??= 0;
        practicalAreaReport.areaByExpertise[expertise] += storageArea;
    }

    return {
        targetDays,
        shipsPerMonth: 30 / targetDays,
        cost,
        areaByExpertise: practicalAreaReport.areaByExpertise,
        practicalBuildingCounts,
        recipeWorkloadByBuilding,
        storageByExpertise,
        habitationReport: practicalAreaReport.habitationReport,
        workforceByExpertise: practicalAreaReport.workforceByExpertise,
        fits: fitsBasePlan(practicalAreaReport.areaByExpertise, 2)
    };
}

function buildAreaReportFromBuildingCounts(buildingCounts) {
    const areaByExpertise = {};
    const workforceByExpertise = {};

    for (const [buildingTicker, count] of Object.entries(buildingCounts)) {
        const building = buildingLookup[buildingTicker];
        const expertise = building.Expertise ?? "NONE";

        areaByExpertise[expertise] ??= 0;
        areaByExpertise[expertise] += count * building.AreaCost;

        workforceByExpertise[expertise] ??= {
            PIONEER: 0,
            SETTLER: 0,
            TECHNICIAN: 0,
            ENGINEER: 0,
            SCIENTIST: 0
        };

        workforceByExpertise[expertise].PIONEER += (building.Pioneers ?? 0) * count;
        workforceByExpertise[expertise].SETTLER += (building.Settlers ?? 0) * count;
        workforceByExpertise[expertise].TECHNICIAN += (building.Technicians ?? 0) * count;
        workforceByExpertise[expertise].ENGINEER += (building.Engineers ?? 0) * count;
        workforceByExpertise[expertise].SCIENTIST += (building.Scientists ?? 0) * count;
    }

    const habitationReport = [];

    for (const [expertise, workforce] of Object.entries(workforceByExpertise)) {
        for (const [workforceType, workerCount] of Object.entries(workforce)) {
            if (workerCount <= 0) continue;

            const hab = habitationBuildings[workforceType];
            const habBuilding = buildingLookup[hab.ticker];

            const habCount = Math.ceil(workerCount / hab.capacity);
            const habArea = habCount * habBuilding.AreaCost;

            areaByExpertise[expertise] += habArea;

            habitationReport.push({
                expertise,
                workforceType,
                workerCount,
                habTicker: hab.ticker,
                habCount,
                habArea
            });
        }
    }

    return {
        areaByExpertise,
        workforceByExpertise,
        habitationReport
    };
}

async function getBestCost(ticker, quantity) {
    const cacheKey = `${ticker}:${quantity}`

    if (bestCostLookup[cacheKey]) {
        return bestCostLookup[cacheKey];
    }

    const marketData = await fetchMarketData(ticker);
    const buyCost = calculateMarketBuyCost(marketData, quantity);

    const possibleRecipes = recipeLookup[ticker];

    if (!possibleRecipes) {
        const result = {
            source: "BUY/RAW",
            ...buyCost
        };

        bestCostLookup[cacheKey] = result;
        return result;
    }

    const recipe = possibleRecipes[0];

    const recipeMultiplier = getMultiplierForBuilding(recipe.BuildingTicker);

    const matchingOutput = recipe.Outputs.find(output => output.Ticker === ticker);
    const recipeRuns = quantity / matchingOutput.Amount;

    let makeTotalCost = 0;
    let makeCanFill = true;

    const workforceCost = await getWorkforceCostForRecipe(
        recipe,
        recipeRuns,
        recipeMultiplier
    );
    makeTotalCost += workforceCost;
    activeWorkforceCost += workforceCost;

    for (const input of recipe.Inputs) {
        const inputAmountNeeded = input.Amount * recipeRuns;
        const inputBestCost = await getBestCost(
            input.Ticker,
            inputAmountNeeded
        );

        makeTotalCost += inputBestCost.totalCost;

        if (!inputBestCost.canFill) {
            makeCanFill = false;
        }
    }

    const makeCost = {
        canFill: makeCanFill,
        quantityNeeded: quantity,
        quantityFilled: quantity,
        totalCost: makeTotalCost,
        averagePrice: makeTotalCost / quantity
    };

    let result;

    if (buyCost.canFill && buyCost.totalCost < makeCost.totalCost) {

        recommendedBuys[ticker] ??= 0;
        recommendedBuys[ticker] += quantity;

        result = {
            source: "BUY",
            ...buyCost
        };
    } else {
        requiredBuildings.add(recipe.BuildingTicker);

        const productionKey = `${recipe.BuildingTicker}:${ticker}`;

        productionPlan[productionKey] ??= {
            ticker,
            quantity: 0,
            buildingTicker: recipe.BuildingTicker,
            depth: getDepth(ticker)
        };

        productionPlan[productionKey].quantity += quantity;

        const recipeWorkloadKey = `${recipe.BuildingTicker}:${ticker}`;

        recipeWorkload[recipeWorkloadKey] ??= {
            buildingTicker: recipe.BuildingTicker,
            ticker,
            timeMs: 0,
            recipeRuns: 0
        };

        recipeWorkload[recipeWorkloadKey].timeMs += recipeRuns * recipe.TimeMs;
        recipeWorkload[recipeWorkloadKey].recipeRuns += recipeRuns;
        
        result = {
            source: "MAKE",
            ...makeCost
        };
    }

    bestCostLookup[cacheKey] = result;
    return result;
}

async function grabBuildings() {
    const response = await fetch("https://rest.fnar.net/building/allbuildings");
    const buildings = await response.json();

    for (const building of buildings) {
        buildingLookup[building.Ticker] = building;
    }
}

async function grabWorkforceNeeds() {
    const response = await fetch("https://rest.fnar.net/global/workforceneeds");
    const workforceNeeds = await response.json();

    for (const workforceType of workforceNeeds) {
        workforceNeedsLookup[workforceType.WorkforceType] = workforceType.Needs;
    }
}

await grabMaterials();

//Pull le market data per ticker function
async function fetchMarketData(ticker) {
    if (marketLookup[ticker]) {
        return marketLookup[ticker];
    }

    const response = await fetch(
        `https://rest.fnar.net/exchange/${ticker}.CI1`
    );

    const marketData = await response.json();

    marketLookup[ticker] = marketData;
    return marketData;
}

function calculateMarketBuyCost(marketData, quantityNeeded) {
    let quantityRemaining = quantityNeeded;
    let quantityFilled = 0;
    let totalCost = 0;

    let decision;

    if (!marketData.SellingOrders || marketData.SellingOrders.length === 0) {
        return {
            canFill: false,
            quantityNeeded,
            quantityFilled: 0,
            totalCost: Infinity,
            averagePrice: Infinity
        };
    }

    for (const order of marketData.SellingOrders) {
        const quantityToBuy = Math.min(quantityRemaining, order.ItemCount);

        quantityFilled += quantityToBuy;
        totalCost += quantityToBuy * order.ItemCost;
        quantityRemaining -= quantityToBuy;

        if (quantityRemaining <= 0) {
            break;
        }
    }

    return {
        canFill: quantityRemaining <= 0,
        quantityNeeded,
        quantityFilled,
        totalCost,
        averagePrice: totalCost / quantityFilled
    };
}

async function getWorkforceCostForRecipe(
    recipe,
    recipeRuns,
    productionMultiplier
) {
    const building = buildingLookup[recipe.BuildingTicker];

    if (!building) {
        return 0;
    }

    const recipeDays = recipe.TimeMs / 1000 / 60 / 60 / 24 / productionMultiplier;
    let totalWorkforceCost = 0;

    const workforceTypes = [
        ["PIONEER", "Pioneers"],
        ["SETTLER", "Settlers"],
        ["TECHNICIAN", "Technicians"],
        ["ENGINEER", "Engineers"],
        ["SCIENTIST", "Scientists"]
    ];

    for (const [workforceType, buildingField] of workforceTypes) {
        const workerCount = building[buildingField];

        if (!workerCount) {
            continue;
        }

        const needs = workforceNeedsLookup[workforceType];

        for (const need of needs) {
            const needTicker = need.MaterialTicker;
            const needAmount = need.Amount;

            const totalNeedAmount = (workerCount / 100) * needAmount * recipeDays * recipeRuns;

            const marketData = await fetchMarketData(needTicker);
            const buyCost = calculateMarketBuyCost(marketData, totalNeedAmount);

            totalWorkforceCost += buyCost.totalCost;
        }
    }

    return totalWorkforceCost;
}

//Define the function to pull the recipe data from the FIO endpoint

async function grabRecipes() {
    const response = await fetch("https://rest.fnar.net/recipes/allrecipes");
    const recipes = await response.json();

    for (const recipe of recipes) { //for recipe inside recipes
        for (const output of recipe.Outputs) { //Look at output for each recipe inside recipes
            const outputTicker = output.Ticker; 

            recipeLookup[outputTicker] ??= []; //If the ticker doesnt yet exist in the recipeLookup array, create it with an empty array assigned
            recipeLookup[outputTicker].push(recipe); //On this iteration, add the recipe to the ticker array inside recipeLookup
        }
    }

    await grabBuildings();
    await grabWorkforceNeeds();

    for (const [ticker, quantity] of Object.entries(mercatorPrimaryRecipe)) {
        const bestCost = await getBestCost(ticker, quantity);
        optimizedBuildCost += bestCost.totalCost;

        console.log(
            `${ticker}: best ${bestCost.totalCost}, source ${bestCost.source}`
        );
    }

    console.log(`Optimized build cost: ${optimizedBuildCost}`);

    console.log(`Sell @ 10% margin: ${optimizedBuildCost * 1.10}`);
    console.log(`Sell @ 20% margin: ${optimizedBuildCost * 1.20}`);
    console.log(`Sell @ 30% margin: ${optimizedBuildCost * 1.30}`);
    console.log(`Sell @ 50% margin: ${optimizedBuildCost * 1.50}`);
    console.log(`Sell @ 60% margin: ${optimizedBuildCost * 1.60}`);
    console.log(`Sell @ 65% margin: ${optimizedBuildCost * 1.65}`);

    console.log("Recommended buys:");
    console.log(recommendedBuys);

    const buyReport = [];

    for (const [ticker, quantity] of Object.entries(recommendedBuys)) {
        const marketData = await fetchMarketData(ticker);
        const buyCost = calculateMarketBuyCost(marketData, quantity);

        buyReport.push({
            ticker,
            quantity,
            totalCost: buyCost.totalCost
        });
    }

    buyReport.sort(
        (a, b) => b.totalCost - a.totalCost
    );

    console.log("\nRecommended Purchases:");

    for (const item of buyReport) {
        console.log(
            `${item.ticker}: ${item.quantity} units, ${item.totalCost.toFixed(0)} CIS`
        );
    }

    const totalBuySpend = buyReport.reduce(
        (sum, item) => sum + item.totalCost,
        0
    );

    console.log(
        `\nTotal Recommended Purchase Spend: ${totalBuySpend.toFixed(0)} CIS`
    );

    console.log("\nScenario Optimization:");

    const scenarios = [];

    for (let targetDays = 30; targetDays >= 1; targetDays--) {
        const scenario = await runScenario(targetDays);
        scenarios.push(scenario);

        console.log(
            `${targetDays} days: ${scenario.shipsPerMonth.toFixed(2)} ships/month, ` +
            `fits: ${scenario.fits}`
        );
    }

    const bestScenario = scenarios
        .filter(scenario => scenario.fits)
        .sort((a, b) => b.shipsPerMonth - a.shipsPerMonth)[0];

    if (!bestScenario) {
        console.log("\nBest Scenario:");
        console.log("No scenario fits within the selected base limit.");
        return;
    }

    console.log("\nBest Scenario:");

    console.log(
        `${bestScenario.targetDays} day cadence = ` +
        `${bestScenario.shipsPerMonth.toFixed(2)} ships/month`
    );

    for (const [expertise, area] of Object.entries(bestScenario.areaByExpertise)) {
        const basePlan = requiredBasePlan(area);

        console.log(
            `${expertise}: ${area} area -> ${basePlan.plan} ` +
            `(capacity ${basePlan.capacity}, free ${basePlan.freeArea})`
        );
    }

    console.log("\nBest Scenario Building Plan:");

    const detailedBest = await runScenario(bestScenario.targetDays);

    for (const [buildingTicker, count] of Object.entries(detailedBest.practicalBuildingCounts)) {
        const building = buildingLookup[buildingTicker];
        const expertise = building.Expertise ?? "NONE";

        console.log(`${expertise}: ${count}x ${buildingTicker}`);
    }

    console.log("\nBest Scenario Habitation Plan:");

    for (const hab of detailedBest.habitationReport) {
        console.log(
            `${hab.expertise}: ${hab.habCount}x ${hab.habTicker} ` +
            `for ${hab.workerCount} ${hab.workforceType}, area ${hab.habArea}`
        );
    }

    console.log("\nBest Scenario Storage Plan:");

    for (const [expertise, storage] of Object.entries(detailedBest.storageByExpertise)) {
        console.log(
            `${expertise}: ${storage.storageCount}x ${storage.storageTicker}, ` +
            `area ${storage.storageArea}, ` +
            `${bufferDays}-day buffer ${storage.requiredWeight.toFixed(0)}t / ` +
            `${storage.requiredVolume.toFixed(0)}m³`
        );
    }

    console.log("\nBest Scenario Production Lines by Base:");

    for (const [buildingTicker, items] of Object.entries(detailedBest.recipeWorkloadByBuilding)) {
        const building = buildingLookup[buildingTicker];
        const expertise = building.Expertise ?? "NONE";

        console.log(`\n${expertise} / ${buildingTicker}:`);

        const totalRuns = items.reduce((sum, item) => sum + item.recipeRuns, 0);
        const buildingMultiplier = getMultiplierForBuilding(buildingTicker);

        const totalBoostedOrdersPerMonth =
            items.reduce((sum, item) => {
                return sum + (item.recipeRuns / buildingMultiplier) * bestScenario.shipsPerMonth;
            }, 0);

        const queueLength = Math.ceil(totalBoostedOrdersPerMonth);

        const integerQueue = buildIntegerQueue(items, queueLength, buildingMultiplier);

        const buildingCount = detailedBest.practicalBuildingCounts[buildingTicker];

        const totalQueuedTime = integerQueue.reduce((sum, queueItem) => {
            const queueRecipe = recipeLookup[queueItem.ticker][0];
            return sum + queueItem.queuedOrders * queueRecipe.TimeMs;
        }, 0);

        for (const item of integerQueue) {
            const recipe = recipeLookup[item.ticker][0];

            const matchingOutput = recipe.Outputs.find(
                output => output.Ticker === item.ticker
            );

            const boostedOutputPerRun =
                matchingOutput.Amount * buildingMultiplier

            const unitsPerShip =
                item.recipeRuns * matchingOutput.Amount;

            const unitsPerMonthRequired =
                unitsPerShip * bestScenario.shipsPerMonth;

            const runsPerMonthAtFullBase =
                item.queuedOrders *
                buildingCount * 30 * 24 * 60 * 60 * 1000 * buildingMultiplier
                / totalQueuedTime;

            const unitsPerMonthAtFullBase =
                runsPerMonthAtFullBase * matchingOutput.Amount;

            console.log(
                `  ${item.ticker}: ` +
                `${item.recipeRuns.toFixed(2)} base runs/ship, ` +
                `${item.adjustedRuns.toFixed(2)} boosted orders/ship, ` +
                `${unitsPerMonthRequired.toFixed(2)} required/month, ` +
                `${unitsPerMonthAtFullBase.toFixed(2)} full-base/month, ` +
                `${(item.idealShare * 100).toFixed(1)}% order share, ` +
                `${(item.runtimeShare * 100).toFixed(1)}% runtime share, ` +
                `${item.queuedOrders} queued orders`
            );

            const utilization =
                unitsPerMonthRequired /
                unitsPerMonthAtFullBase;

            console.log(
                `${item.ticker}: ${(utilization * 100).toFixed(1)}% base utilization`
            );
        }
    }

};

function getDepth(ticker) {
    const possibleRecipes = recipeLookup[ticker];

    if (!possibleRecipes) {
        return 0;
    }

    if (!possibleRecipes) {
        return 0; // true raw/base item
    }

    const recipe = possibleRecipes[0];

    if (recipe.Inputs.length === 0) {
        return 1; // craftable/generated item with no inputs
    }

    const inputDepths = recipe.Inputs.map(
        input => getDepth(input.Ticker)
    );

    return 1 + Math.max(...inputDepths);
};

//Now call the function
grabRecipes();




