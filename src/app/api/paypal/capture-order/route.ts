import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  captureOrder, 
  parseReferenceId,
  TOKEN_PACKAGES,
  getTokensForAmount 
} from '@/lib/paypal-payment';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CaptureOrderRequest {
  orderId: string;
  type: 'token' | 'brand';
  // For token purchases
  packageKey?: keyof typeof TOKEN_PACKAGES;
  userId?: string;
  // For brand post payments
  storyId?: string;
}

export async function POST(req: Request) {
  try {
    const body: CaptureOrderRequest = await req.json();
    const { orderId, type } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing order ID' },
        { status: 400 }
      );
    }

    // Capture the payment
    const result = await captureOrder(orderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Payment capture failed' },
        { status: 400 }
      );
    }

    // Parse reference ID to determine payment type
    const parsed = result.referenceId 
      ? parseReferenceId(result.referenceId)
      : { type: type };

    if (type === 'token' || parsed.type === 'token') {
      const { packageKey, userId } = body;

      if (!packageKey || !userId) {
        console.error('[PayPal Capture] Missing token purchase details');
        return NextResponse.json(
          { error: 'Missing packageKey or userId' },
          { status: 400 }
        );
      }

      // Get token amount from package or payment amount
      const pkg = TOKEN_PACKAGES[packageKey as keyof typeof TOKEN_PACKAGES];
      const tokensToAdd = pkg?.tokens || (result.amount ? getTokensForAmount(result.amount) : 0);

      if (tokensToAdd <= 0) {
        console.error('[PayPal Capture] Could not determine token amount');
        return NextResponse.json(
          { error: 'Invalid payment amount' },
          { status: 400 }
        );
      }

      // Add tokens to user account
      const { error: tokenError } = await supabaseAdmin.rpc('add_tokens', {
        p_user_id: userId,
        p_token_amount: tokensToAdd,
        p_reference_id: result.captureId || orderId,
        p_metadata: {
          paypal_order_id: orderId,
          paypal_capture_id: result.captureId,
          package: packageKey,
          amount: result.amount,
          payment_type: 'token_purchase',
          provider: 'paypal',
        },
      });

      if (tokenError) {
        console.error('[PayPal Capture] Error adding tokens:', tokenError);
        return NextResponse.json(
          { error: 'Payment succeeded but failed to add tokens. Please contact support.' },
          { status: 500 }
        );
      }

      console.log(`[PayPal Capture] Added ${tokensToAdd} tokens to user ${userId}`);

      return NextResponse.json({
        success: true,
        captureId: result.captureId,
        tokens: tokensToAdd,
      });

    } else if (type === 'brand' || parsed.type === 'brand') {
      const { storyId } = body;
      const finalStoryId = storyId || parsed.storyId;

      if (!finalStoryId) {
        console.error('[PayPal Capture] Missing story ID for brand payment');
        return NextResponse.json(
          { error: 'Missing storyId' },
          { status: 400 }
        );
      }

      // Update story payment status
      const { error: updateError } = await supabaseAdmin
        .from('stories')
        .update({
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString(),
          paypal_order_id: orderId,
          paypal_capture_id: result.captureId,
        })
        .eq('id', finalStoryId);

      if (updateError) {
        console.error('[PayPal Capture] Error updating story payment status:', updateError);
        return NextResponse.json(
          { error: 'Payment succeeded but failed to update story. Please contact support.' },
          { status: 500 }
        );
      }

      console.log(`[PayPal Capture] Updated story ${finalStoryId} payment status to completed`);

      return NextResponse.json({
        success: true,
        captureId: result.captureId,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[PayPal Capture Order] Error:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}
