//Pull Planet Data, V1.0

export async function pullPlanetData() {
    const url = "https://rest.fnar.net/planet/allplanets";

    console.log("Pulling planet data...")
    const response = await fetch(url);
    const planetData = await response.json();

    return planetData
}