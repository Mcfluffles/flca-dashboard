// Pull Building Data, V1.0

export async function pullBuildingData() {
    const url = "https://rest.fnar.net/building/allbuildings";

    const response = await fetch(url);
    const buildings = await response.json();

    return buildings;
}
