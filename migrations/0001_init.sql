-- Thread House orders
CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  INTEGER NOT NULL,              -- unix ms
  name        TEXT    NOT NULL,
  phone       TEXT    NOT NULL,              -- 01XXXXXXXXX
  address     TEXT    NOT NULL,
  qty         INTEGER NOT NULL,
  items       TEXT    NOT NULL,              -- JSON: [{ "color": "black", "size": "L" }]
  subtotal    INTEGER NOT NULL,
  delivery    INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'new',
  note        TEXT    NOT NULL DEFAULT '',
  event_id    TEXT    NOT NULL,              -- Meta Pixel/CAPI dedup id
  capi        TEXT,                          -- CAPI result ("ok" / error)
  ip          TEXT,
  user_agent  TEXT,
  fbp         TEXT,
  fbc         TEXT,
  source_url  TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (status, id DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone   ON orders (phone);
