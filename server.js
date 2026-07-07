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



app.get("/api/member-production", async (req, res) => {
    try {
        const dashboard = await flca.initializeData();
        const table = flca.getProductionByCompany(dashboard);

        res.json(table);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to build member production table" });
    }
});

app.get("/api/routes", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT route, service_type, fuel_cis, fuel_cat, notes
            FROM route_fuel
            ORDER BY service_type, sort_order, route
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



app.listen(port, () => {
    console.log(`FLCA API listening on port ${port}`);
});