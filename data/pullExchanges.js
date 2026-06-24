//Pull the Exchange Names from the FIO Endpoint

export async function pullExchangeIdentity() {
    const response = await fetch("https://rest.fnar.net/exchange/station"); //Fetch the page and get the pwomise fwom the apwi uwu
    const exchanges = await response.json(); //Turn the response promise into a JavaScript Object Array

    const exchangeLookup = {}; //We need this object to iterate over, later we can use things like exchangeLookup.BEN.Currency
    const exchangeLookupCK = {};

    for (const station of exchanges) {

        exchangeLookup[station.NaturalId] = { 
            Name: station.Name,
            ComexCode: station.ComexCode,
            ComexName: station.ComexName,
            Currency: station.CurrencyCode,
            Country: station.CountryName
        };

        exchangeLookupCK[station.ComexCode] = {
            Name: station.Name,
            NaturalId: station.NaturalId,
            ComexName: station.ComexName,
            Currency: station.CurrencyCode,
            Country: station.CountryName
        };
    };

    return { byNaturalId: exchangeLookup, byComexCode: exchangeLookupCK }; //Return the lookup table for use in the calling function!
}