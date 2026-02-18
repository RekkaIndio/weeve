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
    const { userId, name, avatar, communityCode } = body;

    if (!userId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[API] Completing profile for user: ${userId}`);

    // 1. Initial Update (Name, Avatar, Onboarding Step)
    // We also nullify last_name_change_at to allow initial setup freedom
    const updatePayload: any = {
        name,
        avatar,
        onboarding_step: 1,
        last_name_change_at: null,
    };

    // 2. Community Assignment Logic (Inline for atomicity)
    let assignedCommunityId = '00000000-0000-0000-0000-000000000001'; // Default
    
    if (communityCode) {
        const { data: community } = await supabaseAdmin
            .from('communities')
            .select('id')
            .eq('code', communityCode)
            .single();
        
        if (community) {
            assignedCommunityId = community.id;
            updatePayload.community_id = assignedCommunityId;
        }
    }

    // 3. Execute Update using Service Role (Bypasses RLS)
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('user_id', userId)
        .select()
        .single();
    
    if (updateError) {
        console.error('[API] Error updating profile:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ profile: updatedProfile, success: true });

  } catch (error) {
    console.error('[API] Internal error completing profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
