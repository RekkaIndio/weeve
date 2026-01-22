
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

async function generateLink(email: string) {
    console.log(`Generating recovery link for: ${email}`);
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
            redirectTo: 'https://www.tryweeve.com/reset-password',
        },
    });

    if (error) {
        console.error('Error generating link:', error);
        return;
    }

    if (data && data.properties && data.properties.action_link) {
        console.log('\nSUCCESS! Here is the manual recovery link:');
        console.log('---------------------------------------------------');
        console.log(data.properties.action_link);
        console.log('---------------------------------------------------');
        console.log('You can send this URL directly to the user.');
    } else {
        console.log('No link returned in properties:', data);
    }
}

// User from the logs
const targetEmail = 'alfiewhiten@icloud.com';
generateLink(targetEmail);
