// Pull Production Data, V1.0
// @ts-check

import { companyConfigs } from "../config/companies.js";

export async function pullProductionData() {

    const companies = companyConfigs;
    const allProductionData = [];
    const companyProductionData = {};

    for (const company of companies) {
        console.log(`Pulling production data for ${company.CompanyCode} (${company.Username})`)
        const url = `https://rest.fnar.net/production/${company.Username}`;

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
                    `Failed to pull production for ${company.CompanyCode}:`,
                    error.message
                );

                return null;
            }
        }
        const companyProduction = await getData();

        if (!companyProduction) {
            continue;
        }

        companyProductionData[company.CompanyCode] = companyProduction;

        allProductionData.push(
            ...companyProduction.map(prod => ({
                CompanyCode: company.CompanyCode,
                ...prod
            }))
        );
    }

    return {
        AllProduction: allProductionData,
        ByCompany: companyProductionData
    }
}
