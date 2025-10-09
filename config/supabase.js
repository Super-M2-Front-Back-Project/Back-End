const { createClient } = require('@supabase/supabase-js');

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
required.forEach(key => {
    if (!process.env[key]) throw new Error(`${key} manquante`);
});

const createSupabaseClient = (key) => createClient(
    process.env.SUPABASE_URL,
    key,
    { auth: { autoRefreshToken: true, persistSession: false, detectSessionInUrl: false } }
);

const supabase = createSupabaseClient(process.env.SUPABASE_ANON_KEY);
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

module.exports = { supabase, supabaseAdmin };
