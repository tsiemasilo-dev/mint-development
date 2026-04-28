-- Add fees_breakdown column to transactions table
ALTER TABLE transactions
ADD COLUMN fees_breakdown JSONB DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_transactions_fees_breakdown ON transactions USING GIN (fees_breakdown);

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'fees_breakdown';
