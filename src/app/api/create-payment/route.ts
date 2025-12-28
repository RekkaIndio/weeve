import { NextResponse } from 'next/server';
import { createTokenPurchaseLink, TOKEN_PACKAGES } from '@/lib/revolut-payment-links';

export async function POST(req: Request) {
    try {
        const { packageKey, userId } = await req.json();

        if (!packageKey || !userId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Validate package key
        if (!(packageKey in TOKEN_PACKAGES)) {
            return NextResponse.json(
                { error: 'Invalid package' },
                { status: 400 }
            );
        }

        // Create payment link
        const checkoutUrl = await createTokenPurchaseLink(
            packageKey as keyof typeof TOKEN_PACKAGES,
            userId
        );

        return NextResponse.json({ checkoutUrl });
    } catch (error) {
        console.error('[Create Payment] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create payment session' },
            { status: 500 }
        );
    }
}
