-- Links a sold holding back to the exact pending "Sell:" transaction it
-- belongs to, so settlement (api/orderbook/update-price.js settleSellFills)
-- can find and credit the right transaction deterministically — instead of
-- guessing "the user's most recent pending Sell:", which breaks once a
-- strategy's securities are filled in separate CRM actions over time.
ALTER TABLE public.stock_holdings_c ADD COLUMN IF NOT EXISTS sell_transaction_id uuid;
