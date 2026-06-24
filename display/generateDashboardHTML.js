// Generate Dashboard HTML, V1.0

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatNumber(value) {
    if (value === null || value === undefined) return "";
    if (value === "∞") return "∞";

    const num = Number(value);

    if (Number.isNaN(num)) return escapeHTML(value);

    return num.toLocaleString(undefined, {
        maximumFractionDigits: 2
    });
}

function renderTable(title, rows, columns) {
    const bodyRows = rows.map(row => {
        const cells = columns.map(col => {
            return `<td>${formatNumber(row[col.key])}</td>`;
        }).join("");

        return `<tr>${cells}</tr>`;
    }).join("");

    const headers = columns.map(col =>
        `<th>${escapeHTML(col.label)}</th>`
    ).join("");

    return `
        <section class="card">
            <h2>${escapeHTML(title)}</h2>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>${headers}</tr>
                    </thead>
                    <tbody>
                        ${bodyRows}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function statusClass(status) {
    return String(status ?? "").toLowerCase();
}

function renderOperationsTable(title, rows) {
    const bodyRows = rows.map(row => `
        <tr>
            <td>${escapeHTML(row.CompanyCode ?? "")}</td>
            <td>${escapeHTML(row.Ticker)}</td>
            <td>${escapeHTML(row.Name)}</td>
            <td>${formatNumber(row.Amount)}</td>
            <td>${formatNumber(row.ProducedPerDay)}</td>
            <td>${formatNumber(row.ConsumedPerDay)}</td>
            <td>${formatNumber(row.NetPerDay)}</td>
            <td>${formatNumber(row.DaysRemaining)}</td>
            <td><span class="status ${statusClass(row.Status)}">${escapeHTML(row.Status)}</span></td>
        </tr>
    `).join("");

    return `
        <section class="card">
            <h2>${escapeHTML(title)}</h2>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Ticker</th>
                            <th>Name</th>
                            <th>Amount</th>
                            <th>Produced/day</th>
                            <th>Consumed/day</th>
                            <th>Net/day</th>
                            <th>Days remaining</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </div>
        </section>
    `;
}

export function generateDashboardHTML({
    fleet = [],
    operations = [],
    operationsByCompany = [],
    production = [],
    inventory = []
}) {
    const generatedAt = new Date().toLocaleString();

    const totalBookValue = inventory.reduce(
        (sum, item) => sum + (Number(item.BookValue) || 0),
        0
    );

    const totalLiquidationValue = inventory.reduce(
        (sum, item) => sum + (Number(item.LiquidationValue) || 0),
        0
    );

    const criticalCount = operations.filter(
        item => item.Status === "CRITICAL"
    ).length;

    const lowCount = operations.filter(
        item => item.Status === "LOW"
    ).length;

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>FLCA Dashboard</title>
    <style>
        body {
            margin: 0;
            padding: 24px;
            background: #0f172a;
            color: #e5e7eb;
            font-family: Arial, sans-serif;
        }

        h1, h2 {
            margin-top: 0;
        }

        .subtitle {
            color: #94a3b8;
            margin-bottom: 24px;
        }

        .cards {
            display: grid;
            grid-template-columns: repeat(4, minmax(160px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .metric, .card {
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 14px;
            padding: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,.2);
        }

        .metric .label {
            color: #94a3b8;
            font-size: 13px;
        }

        .metric .value {
            font-size: 28px;
            font-weight: 700;
            margin-top: 8px;
        }

        .card {
            margin-bottom: 24px;
        }

        .table-wrap {
            overflow-x: auto;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            font-size: 14px;
        }

        th, td {
            padding: 10px 12px;
            border-bottom: 1px solid #1f2937;
            text-align: left;
            white-space: nowrap;
        }

        th {
            color: #cbd5e1;
            background: #0b1120;
            position: sticky;
            top: 0;
        }

        tr:hover {
            background: #162033;
        }

        .status {
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
        }

        .critical {
            background: #7f1d1d;
            color: #fecaca;
        }

        .low {
            background: #78350f;
            color: #fde68a;
        }

        .healthy {
            background: #064e3b;
            color: #a7f3d0;
        }

        .abundant {
            background: #1e3a8a;
            color: #bfdbfe;
        }

        .surplus {
            background: #312e81;
            color: #ddd6fe;
        }
    </style>
</head>
<body>
    <h1>FLCA Command Dashboard</h1>
    <div class="subtitle">Generated ${escapeHTML(generatedAt)}</div>

    <div class="cards">
        <div class="metric">
            <div class="label">Ships tracked</div>
            <div class="value">${formatNumber(fleet.length)}</div>
        </div>

        <div class="metric">
            <div class="label">Book value</div>
            <div class="value">${formatNumber(totalBookValue)}</div>
        </div>

        <div class="metric">
            <div class="label">Liquidation value</div>
            <div class="value">${formatNumber(totalLiquidationValue)}</div>
        </div>

        <div class="metric">
            <div class="label">Critical / Low materials</div>
            <div class="value">${criticalCount} / ${lowCount}</div>
        </div>
    </div>

    ${renderTable("Fleet Status", fleet, [
        { key: "CompanyCode", label: "Company" },
        { key: "Name", label: "Ship" },
        { key: "Registration", label: "Registration" },
        { key: "ReportedLocation", label: "Location" },
        { key: "Condition", label: "Condition" },
        { key: "CargoWeight", label: "Cargo t" },
        { key: "CargoWeightCapacity", label: "Cargo cap t" },
        { key: "STLFuel", label: "SF" },
        { key: "FTLFuel", label: "FF" }
    ])}

    ${renderOperationsTable(
        "Operations Overview",
        operations
            .slice()
            .sort((a, b) => a.SortDaysRemaining - b.SortDaysRemaining)
    )}

    ${renderOperationsTable(
        "Operations by Company",
        operationsByCompany
            .slice()
            .sort((a, b) => {
                if (a.CompanyCode !== b.CompanyCode) {
                    return String(a.CompanyCode).localeCompare(String(b.CompanyCode));
                }

                return a.SortDaysRemaining - b.SortDaysRemaining;
            })
    )}

    ${renderTable("Production Rates", production, [
        { key: "Ticker", label: "Ticker" },
        { key: "Name", label: "Name" },
        { key: "Orders", label: "Orders" },
        { key: "OutputPerHour", label: "Output/hour" },
        { key: "OutputPerDay", label: "Output/day" }
    ])}

    ${renderTable("Inventory", inventory, [
        { key: "Ticker", label: "Ticker" },
        { key: "Name", label: "Name" },
        { key: "Amount", label: "Amount" },
        { key: "BookValue", label: "Book value" },
        { key: "LiquidationValue", label: "Liquidation value" },
        { key: "ReplacementCost", label: "Replacement cost" },
        { key: "Weight", label: "Weight" },
        { key: "Volume", label: "Volume" }
    ])}
</body>
</html>`;
}