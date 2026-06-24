// Pull Ship Data, v1.0

/* 
This function pulls the fleet data for all FLCA companies for use in displaying status, getting cargo values
ship statistics, etc.
*/

import { companyConfigs } from "../config/companies.js";

export async function pullFleetData() {
    const fleetData = {};
    const allShips = [];

    for (const company of companyConfigs) {
        console.log(
            `Pulling fleet data for ${company.CompanyCode} (${company.Username})`
        );

        const url = `https://rest.fnar.net/ship/ships/${company.Username}`;

        const companyAPI = process.env[`${company.CompanyCode}_API_KEY`];

        async function getData() {
            try {
                const response = await fetch(url, {
                    headers: {
                        Authorization: companyAPI
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                return await response.json();

            } catch (error) {
                console.error(
                    `Failed to pull storage for ${company.CompanyCode}:`,
                    error.message
                );

                return null;
            }
        }

        const companyShipData = await getData();

        if (!companyShipData) {
            continue;
        }

        fleetData[company.CompanyCode] = companyShipData;

        allShips.push(
            ...companyShipData.map(ship => ({
                CompanyCode: company.CompanyCode,
                CompanyName: company.CompanyName,

                IsInFlight: ship.FlightId !== null,
                IsDocked: ship.FlightId === null,
                LocationType: ship.FlightId === null ? "Docked" : "In Flight",

                ...ship
            }))
        );
    }

    return {
        Companies: fleetData,
        AllShips: allShips
    };
}
