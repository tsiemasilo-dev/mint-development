import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mfxnghmuccevsxwcetej.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meG5naG11Y2NldnN4d2NldGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTI1ODAsImV4cCI6MjA4NDQyODU4MH0.lktfglzBMaHd79hLFDRH1HHSwsEwZ56Tv6e287kQiFg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, name, amount, direction, transaction_date, created_at')
    .limit(10);
  console.log('Transactions:', data);
  console.log('Error:', error);
}
test();
