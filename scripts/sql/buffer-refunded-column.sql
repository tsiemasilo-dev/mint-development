-- Marks a buy transaction's unused 8% execution reserve as already refunded,
-- so a full sell-out returns the leftover reserve to the client exactly once.
-- Settlement (api/orderbook/update-price.js settleSellFills) sets this true after
-- crediting the unused buffer when every holding funded by the transaction has
-- closed. Without the flag, a re-run / price correction could refund twice.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buffer_refunded boolean DEFAULT false;
