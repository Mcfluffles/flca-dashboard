// Commodity lookup function
// Returns Weight, Volume, etc. of all materials and stores in a lookup table.

export async function pullCommodityLookup() {

    const response = await fetch("https://rest.fnar.net/material/allmaterials");
    const allMaterials = await response.json();

    let materialCount = 0;

    console.log("Pulling material data...");

    const materialLookup = {};

    for (const material of allMaterials) {
        //console.log(`Pulling material data for ${material.Ticker}`)

        materialLookup[material.Ticker] = {
            Name: material.Name,
            Weight: material.Weight,
            Volume: material.Volume,
            Category: material.CategoryName
        };

        materialCount++;

    }

    console.log(`Pulled data for ${materialCount} materials.`)

    return materialLookup;
}
