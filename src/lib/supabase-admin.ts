import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (typeof window === 'undefined') {
        // Only warn on server side if missing (client side shouldn't use this anyway)
        console.warn('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. Admin operations will fail.');
    }
}

// Note: This client has bypass RLS privileges. Use with caution.
export const supabaseAdmin = createClient<Database>(
    supabaseUrl || '',
    supabaseServiceRoleKey || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
