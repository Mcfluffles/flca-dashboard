// Pull Recipe Data, V1.0

export async function pullRecipeData() {
    const url = "https://rest.fnar.net/recipes/allrecipes";

    console.log("Fetching recipe data...");

    const response = await fetch(url);
    const recipes = await response.json();

    return recipes;
}
