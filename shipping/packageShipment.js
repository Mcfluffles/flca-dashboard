const MAX_BLOCK_WEIGHT = 500;
const MAX_BLOCK_VOLUME = 500;
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

        if (unitWeight > MAX_BLOCK_WEIGHT + EPSILON || unitVolume > MAX_BLOCK_VOLUME + EPSILON) {
            throw new Error(
                `${ticker} cannot fit in a 500 t / 500 m³ contract block.`
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

function createBlock(number) {
    return {
        blockNumber: number,
        weight: 0,
        volume: 0,
        items: []
    };
}

function maximumQuantityThatFits(item, remainingWeight, remainingVolume) {
    const byWeight = item.unitWeight > 0
        ? Math.floor((remainingWeight + EPSILON) / item.unitWeight)
        : Number.POSITIVE_INFINITY;

    const byVolume = item.unitVolume > 0
        ? Math.floor((remainingVolume + EPSILON) / item.unitVolume)
        : Number.POSITIVE_INFINITY;

    return Math.min(byWeight, byVolume);
}

export function packageShipment(normalizedItems) {
    const blocks = [];
    let currentBlock = createBlock(1);

    for (const item of normalizedItems) {
        let quantityRemaining = item.quantity;

        while (quantityRemaining > 0) {
            const remainingWeight = MAX_BLOCK_WEIGHT - currentBlock.weight;
            const remainingVolume = MAX_BLOCK_VOLUME - currentBlock.volume;
            let quantityToPack = Math.min(
                quantityRemaining,
                maximumQuantityThatFits(item, remainingWeight, remainingVolume)
            );

            if (!Number.isFinite(quantityToPack)) {
                quantityToPack = quantityRemaining;
            }

            if (quantityToPack <= 0) {
                if (currentBlock.items.length === 0) {
                    throw new Error(
                        `${item.ticker} cannot fit in a 500 t / 500 m³ contract block.`
                    );
                }

                blocks.push(currentBlock);
                currentBlock = createBlock(blocks.length + 1);
                continue;
            }

            const itemWeight = quantityToPack * item.unitWeight;
            const itemVolume = quantityToPack * item.unitVolume;

            currentBlock.items.push({
                ticker: item.ticker,
                name: item.name,
                quantity: quantityToPack,
                weight: itemWeight,
                volume: itemVolume
            });
            currentBlock.weight += itemWeight;
            currentBlock.volume += itemVolume;
            quantityRemaining -= quantityToPack;

            const weightFull = currentBlock.weight >= MAX_BLOCK_WEIGHT - EPSILON;
            const volumeFull = currentBlock.volume >= MAX_BLOCK_VOLUME - EPSILON;

            if ((weightFull || volumeFull) && currentBlock.items.length > 0) {
                blocks.push(currentBlock);
                currentBlock = createBlock(blocks.length + 1);
            }
        }
    }

    if (currentBlock.items.length > 0) {
        blocks.push(currentBlock);
    }

    for (const block of blocks) {
        block.weight = Number(block.weight.toFixed(6));
        block.volume = Number(block.volume.toFixed(6));

        for (const item of block.items) {
            item.weight = Number(item.weight.toFixed(6));
            item.volume = Number(item.volume.toFixed(6));
        }
    }

    return blocks;
}

export function buildShipmentPlan(materialLookup, submittedItems) {
    const items = normalizeShipmentItems(materialLookup, submittedItems);
    const blocks = packageShipment(items);

    return {
        items,
        blocks,
        blockCount: blocks.length,
        totalWeight: Number(
            items.reduce((total, item) => total + item.quantity * item.unitWeight, 0).toFixed(6)
        ),
        totalVolume: Number(
            items.reduce((total, item) => total + item.quantity * item.unitVolume, 0).toFixed(6)
        )
    };
}
