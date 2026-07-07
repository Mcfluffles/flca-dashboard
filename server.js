import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();

app.use(cors({
    origin: ["https://pflo.flca.space", "http://localhost:5500"]
}));

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.get("/", (req, res) => {
    res.json({ ok: true, service: "PFLO API" });
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

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`PFLO API listening on port ${port}`);
});