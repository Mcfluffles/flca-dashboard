// Pull Flight Data V1.0
// @ts-check

import { companyConfigs } from "../config/companies.js";

export async function pullFlightData() {

    const flightData = {};
    const allFlightData = [];

    for (const company of companyConfigs) {
        console.log(`Pulling flight data for ${company.CompanyCode} (${company.Username})`);

        const url = `https://rest.fnar.net/ship/flights/${company.Username}`;

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

        // console.log(response.status, response.statusText);
        const companyFlightData = await getData();

        if (!companyFlightData) {
            continue;
        }

        // console.log(company.CompanyCode, companyFlightData);
        // console.log("Is array?", Array.isArray(companyFlightData));

        // allFlightData[company.CompanyCode] = companyFlightData; 

        flightData[company.CompanyCode] = companyFlightData;

        allFlightData.push(
            ...companyFlightData.map(flight => ({
                CompanyCode: company.CompanyCode,
                ...flight
            }))
        );

    }

    return {
        Companies: flightData,
        AllFlights: allFlightData
    };
}
