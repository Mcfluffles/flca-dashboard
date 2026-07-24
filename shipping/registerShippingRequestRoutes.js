import crypto from "node:crypto";
import { buildShipmentPlan } from "./packageShipment.js";

function cleanOptionalText(value, maximumLength = 2000) {
    const text = String(value ?? "").trim();
    return text ? text.slice(0, maximumLength) : null;
}

function requireText(value, fieldName, maximumLength = 200) {
    const text = String(value ?? "").trim();

    if (!text) {
        throw new Error(`${fieldName} is required.`);
    }

    return text.slice(0, maximumLength);
}

function createTrackingCode() {
    return `FLN-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

async function loadShipmentPlan(flca, pool, items) {
    const dashboard = await flca.initializeData(pool, false);
    return buildShipmentPlan(dashboard.materials, items);
}

export function registerShippingRequestRoutes(app, pool, flca) {
    app.post("/api/shipping-requests/preview", async (req, res) => {
        try {
            const plan = await loadShipmentPlan(flca, pool, req.body?.items);
            res.json(plan);
        } catch (error) {
            console.error("Shipment preview failed:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Unable to package shipment."
            });
        }
    });

    app.post("/api/shipping-requests", async (req, res) => {
        const client = await pool.connect();

        try {
            const customerCompany = requireText(
                req.body?.customerCompany,
                "Customer company"
            );
            const customerContact = requireText(
                req.body?.customerContact,
                "Customer contact"
            );
            const originCode = requireText(req.body?.originCode, "Origin", 50);
            const destinationCode = requireText(
                req.body?.destinationCode,
                "Destination",
                50
            );
            const serviceCode = cleanOptionalText(req.body?.serviceCode, 50);
            const preferredOperatorCode = cleanOptionalText(
                req.body?.preferredOperatorCode,
                50
            );
            const notes = cleanOptionalText(req.body?.notes, 4000);

            if (originCode === destinationCode) {
                throw new Error("Origin and destination must be different.");
            }

            const plan = await loadShipmentPlan(flca, pool, req.body?.items);
            const trackingCode = createTrackingCode();

            await client.query("BEGIN");

            const requestResult = await client.query(
                `
                    INSERT INTO shipping_requests (
                        tracking_code,
                        customer_company,
                        customer_contact,
                        origin_code,
                        destination_code,
                        service_code,
                        preferred_operator_code,
                        status,
                        total_weight,
                        total_volume,
                        block_count,
                        notes
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'REQUESTED', $8, $9, $10, $11)
                    RETURNING id
                `,
                [
                    trackingCode,
                    customerCompany,
                    customerContact,
                    originCode,
                    destinationCode,
                    serviceCode,
                    preferredOperatorCode,
                    plan.totalWeight,
                    plan.totalVolume,
                    plan.blockCount,
                    notes
                ]
            );

            const requestId = requestResult.rows[0].id;
            const itemIds = new Map();

            for (const item of plan.items) {
                const itemResult = await client.query(
                    `
                        INSERT INTO shipping_request_items (
                            request_id,
                            material_ticker,
                            material_name,
                            quantity,
                            unit_weight,
                            unit_volume
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING id
                    `,
                    [
                        requestId,
                        item.ticker,
                        item.name,
                        item.quantity,
                        item.unitWeight,
                        item.unitVolume
                    ]
                );

                itemIds.set(item.ticker, itemResult.rows[0].id);
            }

            for (const block of plan.blocks) {
                const blockResult = await client.query(
                    `
                        INSERT INTO shipping_request_blocks (
                            request_id,
                            block_number,
                            weight,
                            volume
                        )
                        VALUES ($1, $2, $3, $4)
                        RETURNING id
                    `,
                    [requestId, block.blockNumber, block.weight, block.volume]
                );

                const blockId = blockResult.rows[0].id;

                for (const blockItem of block.items) {
                    await client.query(
                        `
                            INSERT INTO shipping_request_block_items (
                                block_id,
                                request_item_id,
                                quantity
                            )
                            VALUES ($1, $2, $3)
                        `,
                        [blockId, itemIds.get(blockItem.ticker), blockItem.quantity]
                    );
                }
            }

            await client.query("COMMIT");

            res.status(201).json({
                trackingCode,
                status: "REQUESTED",
                ...plan
            });
        } catch (error) {
            await client.query("ROLLBACK");
            console.error("Shipment request failed:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Unable to submit shipment request."
            });
        } finally {
            client.release();
        }
    });
}
