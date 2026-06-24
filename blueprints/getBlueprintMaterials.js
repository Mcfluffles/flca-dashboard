// Get Blueprint Materials, V1.0

/*
This function accepts the ship blueprint js file.
*/

// Get Blueprint Materials, V1.0

import { recipeLookup } from "../tools/recipeLookup.js";

export function getBlueprintMaterials(data, blueprintList, selectedRecipes = {}) {
    const allMaterials = {};
    const baseMaterials = {};
    const recipeChoices = {};

    function addToBucket(bucket, ticker, qty) {
        if (!bucket[ticker]) {
            bucket[ticker] = 0;
        }

        bucket[ticker] += qty;
    }

    function chooseRecipe(ticker, recipes) {
        if (recipes.length === 1) {
            return recipes[0];
        }

        const selectedRecipeId = selectedRecipes[ticker];

        if (!selectedRecipeId) {
            return null;
        }

        return recipes.find(recipe =>
            recipe.RecipeId === selectedRecipeId ||
            recipe.Id === selectedRecipeId ||
            recipe.Name === selectedRecipeId ||
            recipe.RecipeName === selectedRecipeId
        ) ?? null;
    }

    function expandMaterial(ticker, qtyNeeded, depth = 0) {
        addToBucket(allMaterials, ticker, qtyNeeded);

        const recipes = recipeLookup(data, ticker);

        if (recipes.length === 0) {
            addToBucket(baseMaterials, ticker, qtyNeeded);
            return;
        }

        const chosenRecipe = chooseRecipe(ticker, recipes);

        if (!chosenRecipe) {
            if (!recipeChoices[ticker]) {
                recipeChoices[ticker] = {
                    NeededQty: 0,
                    Recipes: recipes
                };
            }

            recipeChoices[ticker].NeededQty += qtyNeeded;
            return;
        }

        const output = chosenRecipe.Outputs.find(
            output => output.Ticker === ticker
        );

        if (!output) {
            return;
        }

        const outputQty = output.Amount;
        const batches = qtyNeeded / outputQty;

        for (const input of chosenRecipe.Inputs) {
            const inputQtyNeeded = input.Amount * batches;

            expandMaterial(
                input.Ticker,
                inputQtyNeeded,
                depth + 1
            );
        }
    }

    for (const blueprint of blueprintList) {
        for (const material of blueprint.materials) {
            expandMaterial(
                material.ticker,
                material.qty
            );
        }
    }

    return {
        AllMaterials: allMaterials,
        BaseMaterials: baseMaterials,
        RecipeChoices: recipeChoices
    };
}