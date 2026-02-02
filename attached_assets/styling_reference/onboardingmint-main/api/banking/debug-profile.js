import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function respondMissingSupabase(res) {
  if (supabase) return false;
  res.status(500).json({
    success: false,
    error: 'Missing Supabase configuration on the server',
    details: 'Set SUPABASE_URL and SUPABASE_ANON_KEY.'
  });
  return true;
}

function createUserClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (respondMissingSupabase(res)) return;

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!accessToken) {
    return res.status(401).json({ success: false, error: 'Missing bearer token' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user?.id) {
    const message = userError?.message || 'Invalid or expired session';
    return res.status(401).json({ success: false, error: 'Invalid or expired session', details: message });
  }

  const profileClient = supabaseAdmin || supabase;
  const { data: profile, error: profileError } = await profileClient
    .from('profiles')
    // select columns that exist in your schema
    .select('id,first_name,last_name,email,id_number,phone_number')
    .eq('id', userData.user.id)
    .maybeSingle();

  const userClient = createUserClient(accessToken);
  const { data: userProfile, error: userProfileError } = await userClient
    .from('profiles')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();

  return res.status(200).json({
    success: true,
    userId: userData.user.id,
    supabaseAdmin: Boolean(supabaseAdmin),
    profileFound: Boolean(profile),
    profileError: profileError?.message || null,
    userProfileFound: Boolean(userProfile),
    userProfileError: userProfileError?.message || null,
    profile: profile || null
  });
}
