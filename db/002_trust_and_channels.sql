-- Warranty per listing (only where the store publishes it per product) and checked store policies.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS warranty_months int;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS warranty_by text;          -- manufacturer | store | seller | <brand/store name>
ALTER TABLE stores ADD COLUMN IF NOT EXISTS policies jsonb;            -- bnpl[], cod, delivery, returns, warranty_policy, sources[], checked

-- Alerts on several channels. address = email | telegram chat id | WhatsApp number | push endpoint.
ALTER TABLE alerts ALTER COLUMN email DROP NOT NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS push_sub jsonb;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS base_price numeric;       -- lowest price when the alert was made (NULL = not in stock then)
UPDATE alerts SET address = email WHERE address IS NULL AND channel = 'email';
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_email_product_id_country_key;
CREATE UNIQUE INDEX IF NOT EXISTS alerts_channel_addr_uq ON alerts (channel, address, product_id, country) WHERE address IS NOT NULL;
CREATE INDEX IF NOT EXISTS alerts_due ON alerts (verified_at) WHERE unsubscribed_at IS NULL;
