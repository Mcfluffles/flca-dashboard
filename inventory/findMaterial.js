//Find Material V1.0
export function findMaterial(data, ticker) {
    const storageData = data.storage.AllStorage;
    const results = [];

    for (const store of storageData) {
        for (const item of store.StorageItems) {
            if (item.MaterialTicker === ticker) {
                results.push({
                    Ticker: item.MaterialTicker,
                    Name: item.MaterialName,
                    CompanyCode: store.CompanyCode,
                    StoreName: store.Name,
                    StoreType: store.Type,
                    StorageId: store.StorageId,
                    AddressableId: store.AddressableId,
                    Amount: item.MaterialAmount,
                    Value: Number(item.MaterialValue.toFixed(2)),
                    Weight: Number(item.TotalWeight.toFixed(2)),
                    Volume: Number(item.TotalVolume.toFixed(2))
                });
            }
        }
    }

    return results.sort((a, b) => b.Amount - a.Amount);
}