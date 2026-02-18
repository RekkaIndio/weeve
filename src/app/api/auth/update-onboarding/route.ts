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
    const { userId, onboardingStep, completedOnboarding } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Build update payload dynamically
    const updatePayload: any = {};
    if (onboardingStep !== undefined) updatePayload.onboarding_step = onboardingStep;
    if (completedOnboarding !== undefined) updatePayload.completed_onboarding = completedOnboarding;

    if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ success: true, message: 'No changes requested' });
    }

    console.log(`[API] Updating onboarding for user ${userId}:`, updatePayload);

    // Update using Service Role (Bypasses RLS)
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('user_id', userId);
    
    if (updateError) {
        console.error('[API] Error updating onboarding:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API] Internal error updating onboarding:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
