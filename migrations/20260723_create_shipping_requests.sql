CREATE TABLE IF NOT EXISTS shipping_requests (
    id BIGSERIAL PRIMARY KEY,
    tracking_code TEXT NOT NULL UNIQUE,
    customer_company TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    origin_code TEXT NOT NULL,
    destination_code TEXT NOT NULL,
    service_code TEXT,
    preferred_operator_code TEXT,
    status TEXT NOT NULL DEFAULT 'REQUESTED',
    total_weight NUMERIC(18, 6) NOT NULL DEFAULT 0,
    total_volume NUMERIC(18, 6) NOT NULL DEFAULT 0,
    block_count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shipping_requests_status_idx
    ON shipping_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS shipping_requests_customer_idx
    ON shipping_requests (customer_company, created_at DESC);

CREATE TABLE IF NOT EXISTS shipping_request_items (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL
        REFERENCES shipping_requests(id) ON DELETE CASCADE,
    material_ticker TEXT NOT NULL,
    material_name TEXT NOT NULL,
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    unit_weight NUMERIC(18, 6) NOT NULL CHECK (unit_weight >= 0),
    unit_volume NUMERIC(18, 6) NOT NULL CHECK (unit_volume >= 0)
);

CREATE TABLE IF NOT EXISTS shipping_request_blocks (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL
        REFERENCES shipping_requests(id) ON DELETE CASCADE,
    block_number INTEGER NOT NULL CHECK (block_number > 0),
    weight NUMERIC(18, 6) NOT NULL CHECK (weight >= 0 AND weight <= 500),
    volume NUMERIC(18, 6) NOT NULL CHECK (volume >= 0 AND volume <= 500),
    UNIQUE (request_id, block_number)
);

CREATE TABLE IF NOT EXISTS shipping_request_block_items (
    block_id BIGINT NOT NULL
        REFERENCES shipping_request_blocks(id) ON DELETE CASCADE,
    request_item_id BIGINT NOT NULL
        REFERENCES shipping_request_items(id) ON DELETE CASCADE,
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (block_id, request_item_id)
);
