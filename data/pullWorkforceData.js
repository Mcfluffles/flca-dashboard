// Pull Production Data, V1.0
// @ts-check

import { companyConfigs } from "../config/companies.js";

export async function pullWorkforceData() {

    const companies = companyConfigs;
    const allWorkforceData = [];
    const companyWorkforceData = {};

    for (const company of companies) {
        console.log(`Pulling workforce data for ${company.CompanyCode} (${company.Username})`)
        const url = `https://rest.fnar.net/workforce/${company.Username}`;


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
                    `Failed to pull workforce for ${company.CompanyCode}:`,
                    error.message
                );

                return null;
            }
        }

        const companyWorkforce = await getData();

        if (!companyWorkforce) {
            continue;
        }


        companyWorkforceData[company.CompanyCode] = companyWorkforce;

        allWorkforceData.push(
            ...companyWorkforce.map(work => ({
                CompanyCode: company.CompanyCode,
                ...work
            }))
        );
    }

    return {
        AllWorkforce: allWorkforceData,
        ByCompany: companyWorkforceData
    }
}
