import { supabaseAdmin } from './api/_lib/supabase.js';
async function test() {
  const { data, error } = await supabaseAdmin.from('transactions').select('family_member_id').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
