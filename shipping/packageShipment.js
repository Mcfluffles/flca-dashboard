const SCU_WEIGHT = 500;
const SCU_VOLUME = 500;
const EPSILON = 1e-9;

function toFiniteNumber(value, fieldName) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        throw new Error(`${fieldName} must be a number.`);
    }

    return number;
}

export function normalizeShipmentItems(materialLookup, submittedItems) {
    if (!Array.isArray(submittedItems) || submittedItems.length === 0) {
        throw new Error("Add at least one material to the shipment.");
    }

    const combinedItems = new Map();

    submittedItems.forEach((submittedItem, index) => {
        const ticker = String(submittedItem?.ticker ?? "")
            .trim()
            .toUpperCase();
        const quantity = toFiniteNumber(
            submittedItem?.quantity,
            `Quantity on line ${index + 1}`
        );
        const material = materialLookup?.[ticker];

        if (!ticker) {
            throw new Error(`Material ticker is required on line ${index + 1}.`);
        }

        if (!material) {
            throw new Error(`Unknown material ticker: ${ticker}.`);
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new Error(`Quantity for ${ticker} must be a positive whole number.`);
        }

        const unitWeight = toFiniteNumber(material.Weight, `${ticker} weight`);
        const unitVolume = toFiniteNumber(material.Volume, `${ticker} volume`);

        if (unitWeight < 0 || unitVolume < 0) {
            throw new Error(`${ticker} has invalid weight or volume data.`);
        }

        if (unitWeight > SCU_WEIGHT + EPSILON || unitVolume > SCU_VOLUME + EPSILON) {
            throw new Error(
                `${ticker} cannot fit in a 500 t / 500 m³ Standard Cargo Unit.`
            );
        }

        const existing = combinedItems.get(ticker);

        if (existing) {
            existing.quantity += quantity;
        } else {
            combinedItems.set(ticker, {
                ticker,
                name: material.Name ?? ticker,
                quantity,
                unitWeight,
                unitVolume
            });
        }
    });

    return [...combinedItems.values()];
}

function createScu(number) {
    return {
        scuNumber: number,
        // Kept for compatibility with existing database and frontend code.
        blockNumber: number,
        weight: 0,
        volume: 0,
        items: []
    };
}

function loadScore(scu) {
    return Math.max(scu.weight / SCU_WEIGHT, scu.volume / SCU_VOLUME);
}

function addItemToScu(scu, item, quantity) {
    if (quantity <= 0) {
        return;
    }

    const weight = quantity * item.unitWeight;
    const volume = quantity * item.unitVolume;

    const existing = scu.items.find(existingItem => existingItem.ticker === item.ticker);

    if (existing) {
        existing.quantity += quantity;
        existing.weight += weight;
        existing.volume += volume;
    } else {
        scu.items.push({
            ticker: item.ticker,
            name: item.name,
            quantity,
            weight,
            volume
        });
    }

    scu.weight += weight;
    scu.volume += volume;
}

/**
 * Builds the minimum number of SCUs from the shipment's aggregate weight and
 * volume, then spreads whole material units as evenly as possible across them.
 *
 * This is intentionally not rigid 500/500 bin packing. In Prosperous Universe,
 * the contract lines must use whole material quantities, while the carrying
 * hull is sized by the aggregate SCU capacity. For example, 83,333 SF at
 * 0.06/0.06 occupies 4,999.98/4,999.98 and therefore fits in 10 SCUs. The
 * indivisible units are distributed as 8,334 in three SCUs and 8,333 in seven.
 */
export function packageShipment(normalizedItems) {
    const totalWeight = normalizedItems.reduce(
        (total, item) => total + item.quantity * item.unitWeight,
        0
    );
    const totalVolume = normalizedItems.reduce(
        (total, item) => total + item.quantity * item.unitVolume,
        0
    );

    const scuCount = Math.max(
        1,
        Math.ceil(Math.max(
            totalWeight / SCU_WEIGHT,
            totalVolume / SCU_VOLUME
        ) - EPSILON)
    );

    const scus = Array.from({ length: scuCount }, (_, index) => createScu(index + 1));

    for (const item of normalizedItems) {
        const baseQuantity = Math.floor(item.quantity / scuCount);
        const remainder = item.quantity % scuCount;

        // Give every SCU its even share first.
        if (baseQuantity > 0) {
            for (const scu of scus) {
                addItemToScu(scu, item, baseQuantity);
            }
        }

        // Place leftover whole units on the currently lightest SCUs. This keeps
        // mixed-material shipments balanced without losing or inventing units.
        if (remainder > 0) {
            const lightest = [...scus]
                .sort((a, b) => loadScore(a) - loadScore(b) || a.scuNumber - b.scuNumber)
                .slice(0, remainder);

            for (const scu of lightest) {
                addItemToScu(scu, item, 1);
            }
        }
    }

    for (const scu of scus) {
        scu.weight = Number(scu.weight.toFixed(6));
        scu.volume = Number(scu.volume.toFixed(6));

        for (const item of scu.items) {
            item.weight = Number(item.weight.toFixed(6));
            item.volume = Number(item.volume.toFixed(6));
        }
    }

    return scus;
}

export function buildShipmentPlan(materialLookup, submittedItems) {
    const items = normalizeShipmentItems(materialLookup, submittedItems);
    const scus = packageShipment(items);

    return {
        items,
        scus,
        // Kept for compatibility with the current request persistence route.
        blocks: scus,
        scuCount: scus.length,
        blockCount: scus.length,
        totalWeight: Number(
            items.reduce((total, item) => total + item.quantity * item.unitWeight, 0).toFixed(6)
        ),
        totalVolume: Number(
            items.reduce((total, item) => total + item.quantity * item.unitVolume, 0).toFixed(6)
        )
    };
}
