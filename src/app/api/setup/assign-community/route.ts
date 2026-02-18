
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// We need the SERVICE_ROLE key to bypass RLS for the assignment
// This client is strictly for server-side admin operations
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
    const { userId, communityCode } = await request.json();

    if (!userId || !communityCode) {
      return NextResponse.json({ error: 'Missing userId or communityCode' }, { status: 400 });
    }

    console.log(`[API] Assigning community. User: ${userId}, Code: ${communityCode}`);

    // 1. Find the community (Case-insensitive)
    const { data: communities, error: findError } = await supabaseAdmin
      .from('communities')
      .select('id, name')
      .ilike('code', communityCode)
      .eq('is_active', true)
      .limit(1);

    if (findError) {
      console.error('[API] Error finding community:', findError);
      return NextResponse.json({ error: 'Error finding community' }, { status: 500 });
    }

    const community = communities?.[0];

    if (!community) {
      console.warn(`[API] Community not found for code: ${communityCode}`);
      // Return 404 so client knows to fallback or alert
      return NextResponse.json({ error: 'Community not found', errorCode: 'NOT_FOUND' }, { status: 404 });
    }

    console.log(`[API] Found community: ${community.name} (${community.id})`);

    // 2. Update the profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ community_id: community.id })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[API] Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    console.log(`[API] Successfully assigned user ${userId} to ${community.name}`);

    return NextResponse.json({ 
      success: true, 
      communityId: community.id, 
      communityName: community.name 
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
