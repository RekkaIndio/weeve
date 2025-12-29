import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
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

        // Get the base URL from request headers
        const headersList = await headers();
        const host = headersList.get('host') || 'www.tryweeve.com';
        const protocol = headersList.get('x-forwarded-proto') || 'https';
        
        // Only use redirect URL if host is a proper domain (not IP or localhost)
        // Revolut rejects redirect URLs with IP addresses or localhost
        const isLocalOrIp = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost)/.test(host);
        const baseUrl = !isLocalOrIp ? `${protocol}://${host}` : undefined;

        // Create payment link with redirect back to wallet
        const checkoutUrl = await createTokenPurchaseLink(
            packageKey as keyof typeof TOKEN_PACKAGES,
            userId,
            baseUrl
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
