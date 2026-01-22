import { NextResponse } from 'next/server';
import { 
  createTokenOrder, 
  createBrandPostOrder,
  TOKEN_PACKAGES 
} from '@/lib/paypal-payment';

interface CreateOrderRequest {
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
    const body: CreateOrderRequest = await req.json();
    const { type } = body;

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

      const result = await createTokenOrder(packageKey, userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to create order' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        orderId: result.orderId,
      });

    } else if (type === 'brand') {
      const { postType, visibilityDays, storyId } = body;

      if (!postType || !visibilityDays || !storyId) {
        return NextResponse.json(
          { error: 'Missing postType, visibilityDays, or storyId for brand payment' },
          { status: 400 }
        );
      }

      const result = await createBrandPostOrder(postType, visibilityDays, storyId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to create order' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        orderId: result.orderId,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[PayPal Create Order] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
