
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service Role Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, email, avatar, dateOfBirth, inviteCode, referrerCode } = body;

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[API] Creating/Syncing profile for user: ${userId} (${email})`);

    // 1. Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
        console.error('[API] Error creating profile (check existing):', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // If exists, just return it
    if (existingProfile) {
        console.log('[API] Profile already exists, returning it.');
        return NextResponse.json({ profile: existingProfile, created: false });
    }

    // 2. Prepare Profile Data (default values matching auth.ts)
    const newProfile = {
        user_id: userId,
        name: name || email.split('@')[0],
        email: email,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        role: 'user',
        is_private: false,
        is_influencer: false,
        tokens: 100, // Default tokens
        invite_code: inviteCode || `${(name || email.split('@')[0]).toUpperCase().slice(0, 3).replace(/[^A-Z]/g, 'U')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        onboarding_step: 0,
        completed_onboarding: false,
        date_of_birth: dateOfBirth,
        community_id: '00000000-0000-0000-0000-000000000001', // Default, will be updated by setup API
        last_name_change_at: null,
    };

    // 3. Insert Profile
    // We use simple insert since we checked existence. 
    // If race condition happens, unique constraint on user_id will catch it.
    const { data: inserted, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();
    
    if (insertError) {
        // If it's a unique constraint violation, try fetching again (race condition)
        if (insertError.code === '23505') {
             const { data: retryFetch } = await supabaseAdmin.from('profiles').select('*').eq('user_id', userId).single();
             if (retryFetch) {
                 return NextResponse.json({ profile: retryFetch, created: false });
             }
        }
        console.error('[API] Error creating profile (insert):', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 4. Handle Referrer (optional)
    if (referrerCode) {
        try {
            const { data: referrer } = await supabaseAdmin
                .from('profiles')
                .select('user_id')
                .eq('invite_code', referrerCode)
                .single();

            if (referrer) {
                // Add friend request or friendship (using service role bypasses RLS on friendships too)
                await supabaseAdmin.from('friendships').insert([
                     { user_id: userId, friend_id: referrer.user_id },
                     { user_id: referrer.user_id, friend_id: userId }
                ]);
            }
        } catch (e) {
            console.warn('[API] Failed to process referrer:', e);
            // Don't fail the request for this
        }
    }

    return NextResponse.json({ profile: inserted, created: true });

  } catch (error) {
    console.error('[API] Internal error creating profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
