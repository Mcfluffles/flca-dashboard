// recipeLookup, V1.0

export function recipeLookup(data, ticker) {
    const recipes = data.recipes;
    const selectedRecipes = [];

    for (const recipe of recipes) {
        for (const output of recipe.Outputs) {
            if (output.Ticker === ticker) {
                selectedRecipes.push(recipe);
            }
        }
    }

    return selectedRecipes;
}
