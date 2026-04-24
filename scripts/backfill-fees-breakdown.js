import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wjaxopmktydlszujstfy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BROKER_FEE_RATE = 0.0025;
const ISIN_FEE_PER_ASSET = 69;
const TRANSACTION_FEE_RATE = 0.038;
const CASH_BUFFER_RATE = 0.08;

async function backfillFeesBreakdown() {
  try {
    console.log('Starting fees_breakdown backfill...');

    // Find all "Fees:" transactions that don't have fees_breakdown
    const { data: feeTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, name, amount, created_at')
      .or(`name.ilike.%Fees: Strategy%,name.ilike.%Fees: Stock%`)
      .is('fees_breakdown', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching fee transactions:', fetchError);
      return;
    }

    console.log(`Found ${feeTransactions.length} transactions to backfill`);

    let updated = 0;
    let skipped = 0;

    for (const tx of feeTransactions) {
      try {
        const feesAmount = tx.amount / 100; // Convert from cents

        // Estimate the buffered base amount (inverse calculation)
        // feesAmount ≈ (bufferedBase * 0.0025) + (ISIN * numAssets) + (bufferedBase * 0.038)
        // feesAmount ≈ (bufferedBase * 0.0415) + (ISIN * numAssets)
        // For simplicity, assume 5 assets as average
        const estimatedNumAssets = 5;
        const estimatedIsinTotal = ISIN_FEE_PER_ASSET * estimatedNumAssets;
        const estimatedBufferedBase = (feesAmount - estimatedIsinTotal) / (BROKER_FEE_RATE + TRANSACTION_FEE_RATE);

        if (estimatedBufferedBase > 0) {
          const brokerAmount = estimatedBufferedBase * BROKER_FEE_RATE;
          const transactionAmount = estimatedBufferedBase * TRANSACTION_FEE_RATE;

          const feesBreakdown = {
            bufferedBase: Math.round(estimatedBufferedBase * 100) / 100,
            brokerAmount: Math.round(brokerAmount * 100) / 100,
            isinTotal: estimatedIsinTotal,
            transactionAmount: Math.round(transactionAmount * 100) / 100,
            totalFees: feesAmount,
            backfilled: true, // Mark as backfilled for reference
          };

          const { error: updateError } = await supabase
            .from('transactions')
            .update({ fees_breakdown: feesBreakdown })
            .eq('id', tx.id);

          if (updateError) {
            console.error(`Error updating transaction ${tx.id}:`, updateError);
            skipped++;
          } else {
            updated++;
            console.log(`✓ Updated transaction ${tx.id} (amount: R${feesAmount.toFixed(2)})`);
          }
        } else {
          console.log(`⊘ Skipped transaction ${tx.id} - unable to estimate breakdown`);
          skipped++;
        }
      } catch (err) {
        console.error(`Error processing transaction ${tx.id}:`, err);
        skipped++;
      }
    }

    console.log(`\nBackfill complete!`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
  } catch (error) {
    console.error('Backfill failed:', error);
  }
}

backfillFeesBreakdown();
