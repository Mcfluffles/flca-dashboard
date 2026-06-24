// Pull Company Storage Data, V1.0
// @ts-check

/* 
This function will pull all the storage data for FLCA member companies.
*/

import { companyConfigs } from "../config/companies.js";

export async function pullStorageData() {

    const storageData = {};
    const allStorage = [];

    for (const company of companyConfigs) {
        console.log(`Pulling storage data for ${company.CompanyCode} (${company.Username})`);

        const url = `https://rest.fnar.net/storage/${company.Username}`;

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

        const companyStorage = await getData();

        if (!companyStorage) {
            continue;
        }

        storageData[company.CompanyCode] = companyStorage;

        allStorage.push(
            ...companyStorage.map(store => ({
                CompanyCode: company.CompanyCode,
                ...store
            }))
        );

    }
    return {
        Companies: storageData,
        AllStorage: allStorage
    };
}