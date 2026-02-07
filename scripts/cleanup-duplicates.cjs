const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
  console.log('Starting duplicate cleanup...');

  const { error: deleteError } = await db
    .from('stock_holdings')
    .delete()
    .eq('id', 'dddbe1ec-de54-4644-959c-bba1fb9b54c4');

  if (deleteError) {
    console.error('Error deleting duplicate MTNZF.JO holding:', deleteError.message);
  } else {
    console.log('Deleted duplicate MTNZF.JO holding (dddbe1ec...)');
  }

  const { error: updateError } = await db
    .from('stock_holdings')
    .update({ quantity: 1, market_value: 10627 })
    .eq('security_id', '54539f26-2b28-416c-b9cf-25aecb9f2361')
    .eq('user_id', '3401d428-4ed7-4ba1-ae64-4bd16d2485a4');

  if (updateError) {
    console.error('Error updating GLN.JO holding:', updateError.message);
  } else {
    console.log('Updated GLN.JO holding: quantity=1, market_value=10627');
  }

  console.log('Cleanup complete.');
}

cleanup().catch(console.error);
