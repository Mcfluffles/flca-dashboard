import express from "express";
import cors from "cors";
import pg from "pg";

//
import * as flca from "./function.js";

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;

/*app.use(cors({
    origin: ["https://pflo.flca.space", "http://localhost:5500"]
}));*/

app.use(cors({
    origin: function (origin, callback) {
        if (
            !origin ||
            origin === "https://pflo.flca.space" ||
            /^http:\/\/localhost:\d+$/.test(origin)
        ) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
}));

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.get("/", (req, res) => {
    res.json({ ok: true, service: "FLCA API" });
});

///
/// INTERNAL TRADING
///

app.get("/api/internal-trade-opportunities", async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === "true";
        const dashboard = await flca.initializeData(pool, forceRefresh);

        const inventory = flca.inventoryRollup(dashboard);
        const production = flca.productionRollup(dashboard);
        const consumption = flca.consumptionRollup(dashboard);

        const ops = flca.operationsSummaryByCompany(
            inventory,
            production,
            consumption
        );

        const trades = flca.getInternalTradeOpportunities(ops);

        res.json(trades);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to build trade opportunities" });
    }
});



///
/// MEMBER PRODUCTION AND CONSUMPTION
///

app.get("/api/member-net-production", async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === "true";

        console.time("Initialize Data");
        const dashboard = await flca.initializeData(pool, forceRefresh);
        console.timeEnd("Initialize Data");

        const table = flca.getProductionByCompany(dashboard);

        res.json(table);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to build member production table" });
    }
});

app.get("/api/member-net-consumption", async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === "true";

        console.time("Initialize Data");
        const dashboard = await flca.initializeData(pool, forceRefresh);
        console.timeEnd("Initialize Data");

        const table = flca.getConsumptionByCompany(dashboard);

        res.json(table);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to build member production table" });
    }
});


///
/// CONFIGURATION
///

app.get("/api/companies", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                company_code AS "CompanyCode",
                username AS "Username",
                company_name AS "CompanyName",
                is_active AS "IsActive",
                sort_order AS "SortOrder"
            FROM flca_companies
            WHERE is_active = true
            ORDER BY sort_order, company_code
        `);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load companies" });
    }
});

///
/// FLN Routing and Pricing
///

app.get("/api/routes", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT region, route, service_type, fuel_cis, fuel_cat, notes, origin_code, destination_code
            FROM route_fuel
            ORDER BY region, service_type, sort_order, route
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }

    // catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: "Failed to load routes" });
    // }
});

app.get("/api/service-levels", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                service_code AS "ServiceCode",
                service_name AS "ServiceName",
                delivery_days AS "DeliveryDays",
                rate_cis AS "RateCIS",
                rate_cat AS "RateCAT",
                description AS "Description",
                sort_order AS "SortOrder"
            FROM service_levels
            WHERE is_active = true
            ORDER BY sort_order, service_name
        `);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to load service levels"
        });
    }
});

app.get("/api/operators", async (req, res) => {
    try {
        const result = await pool.query(`
                SELECT
                    operator_code AS "OperatorCode",
                    operator_name AS "OperatorName",
                    discord_username AS "DiscordUsername",
                    notes AS "Notes"
                FROM operators
                WHERE is_active = true
                ORDER BY operator_name
            `);

        res.json(result.rows);
    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: "Failed to load operators"
        });
    }
});

app.get("/api/operator-routes", async (req, res) => {
    try {
        const result = await pool.query(`
             SELECT
                opr.operator_code AS "OperatorCode",
                opr.route_id AS "RouteId",
                rf.origin_code AS "OriginCode",
                rf.destination_code AS "DestinationCode",
                rf.route AS "Route",
                opr.notes AS "Notes"
            FROM operator_routes opr
            JOIN route_fuel rf
                ON opr.route_id = rf.id
            WHERE opr.is_active = true
            ORDER BY
                opr.operator_code,
                rf.region,
                rf.sort_order,
                rf.route
        `);

        res.json(result.rows);
    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: "Failed to load operator routes"
        });
    }
});



app.listen(port, () => {
    console.log(`FLCA API listening on port ${port}`);
});