import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  processTokenPurchase, 
  processBrandPostPayment,
  TOKEN_PACKAGES,
  getTokensForAmount 
} from '@/lib/square-payment';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProcessPaymentRequest {
  sourceId: string; // Payment token from Web Payments SDK
  type: 'token' | 'brand';
  // For token purchases
  packageKey?: keyof typeof TOKEN_PACKAGES;
  userId?: string;
  // For brand post payments
  postType?: 'seed' | 'canon';
  visibilityDays?: number;
  storyId?: string;
}

export async function POST(req: Request) {
  try {
    const body: ProcessPaymentRequest = await req.json();
    const { sourceId, type } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Missing payment token' },
        { status: 400 }
      );
    }

    if (type === 'token') {
      const { packageKey, userId } = body;

      if (!packageKey || !userId) {
        return NextResponse.json(
          { error: 'Missing packageKey or userId for token purchase' },
          { status: 400 }
        );
      }

      if (!(packageKey in TOKEN_PACKAGES)) {
        return NextResponse.json(
          { error: 'Invalid package' },
          { status: 400 }
        );
      }

      // Process the token purchase
      const result = await processTokenPurchase(sourceId, packageKey, userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Payment failed' },
          { status: 400 }
        );
      }

      // Add tokens to user account
      const pkg = TOKEN_PACKAGES[packageKey];
      const { error: tokenError } = await supabaseAdmin.rpc('add_tokens', {
        p_user_id: userId,
        p_token_amount: pkg.tokens,
        p_reference_id: result.paymentId,
        p_metadata: {
          square_payment_id: result.paymentId,
          package: packageKey,
          amount: pkg.amount,
          currency: pkg.currency,
          payment_type: 'token_purchase',
          provider: 'square',
        },
      });

      if (tokenError) {
        console.error('[Square] Error adding tokens:', tokenError);
        // Payment succeeded but token addition failed - should handle refund in production
        return NextResponse.json(
          { error: 'Payment succeeded but failed to add tokens. Please contact support.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentId: result.paymentId,
        tokens: pkg.tokens,
      });

    } else if (type === 'brand') {
      const { postType, visibilityDays, storyId } = body;

      if (!postType || !visibilityDays || !storyId) {
        return NextResponse.json(
          { error: 'Missing postType, visibilityDays, or storyId for brand payment' },
          { status: 400 }
        );
      }

      // Process the brand post payment
      const result = await processBrandPostPayment(sourceId, postType, visibilityDays, storyId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Payment failed' },
          { status: 400 }
        );
      }

      // Update story payment status
      const { error: updateError } = await supabaseAdmin
        .from('stories')
        .update({
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString(),
          square_payment_id: result.paymentId,
        })
        .eq('id', storyId);

      if (updateError) {
        console.error('[Square] Error updating story payment status:', updateError);
        return NextResponse.json(
          { error: 'Payment succeeded but failed to update story. Please contact support.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentId: result.paymentId,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[Square Process Payment] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
