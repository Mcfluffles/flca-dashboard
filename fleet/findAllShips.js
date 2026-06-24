// Find Ships V1.0

/* 
This function is the backbone of the fleet display. It should grab the fleet and storage data from the dashboard dataset,
then it will compare the two to find and return the ship name, registration, ID, location, flight, condition, associated storage id, and fuel levels.
*/

export function findAllShips(data) {
    const fleetData = data.fleet.AllShips;
    const storageData = data.storage.AllStorage;
    const flightData = data.flights?.AllFlights ?? [];

    const allShipsData = [];

    for (const ship of fleetData) {
        const shipId = ship.ShipId;

        const activeFlight = flightData.find(
            flight => flight.ShipId === shipId
        );

        const shipStore = storageData.find(
            store => store.AddressableId === shipId && store.Type === "SHIP_STORE"
        );

        const stlStore = storageData.find(
            store => store.AddressableId === shipId && store.Type === "STL_FUEL_STORE"
        );

        const ftlStore = storageData.find(
            store => store.AddressableId === shipId && store.Type === "FTL_FUEL_STORE"
        );

        allShipsData.push({
            CompanyCode: ship.CompanyCode,
            Name: ship.Name,
            Registration: ship.Registration,
            ShipId: ship.ShipId,
            ReportedLocation: ship.Location,
            FlightId: ship.FlightId,
            FlightStatus: activeFlight
                ? "IN_FLIGHT"
                : "NO_FLIGHT_RECORD",
            IsInFlight: activeFlight ? true : null,
            Condition: ship.Condition,

            CargoWeight: shipStore?.WeightLoad ?? 0,
            CargoWeightCapacity: shipStore?.WeightCapacity ?? 0,
            CargoVolume: shipStore?.VolumeLoad ?? 0,
            CargoVolumeCapacity: shipStore?.VolumeCapacity ?? 0,

            STLFuel: stlStore?.StorageItems?.[0]?.MaterialAmount ?? 0,
            STLFuelCapacityWeight: stlStore?.WeightCapacity ?? 0,

            FTLFuel: ftlStore?.StorageItems?.[0]?.MaterialAmount ?? 0,
            FTLFuelCapacityWeight: ftlStore?.WeightCapacity ?? 0,

            CargoItems: shipStore?.StorageItems ?? [],
            STLFuelStore: stlStore,
            FTLFuelStore: ftlStore
        });
    }
    return allShipsData;
}
