// @ts-check
async function pullRoute() {
    const url = "https://api.flca.space/api/routes";

    const response = await fetch(url);
    const pfloRouteTable = await response.json();

    return pfloRouteTable;
}

async function main() {
    const route = await pullRoute();
    console.log(route);
}

main();