import { supabaseAdmin } from './api/_lib/supabase.js';
async function test() {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('id, name, amount, direction, transaction_date, created_at')
    .limit(10);
  console.log('Transactions:', data);
  console.log('Error:', error);
}
test();
