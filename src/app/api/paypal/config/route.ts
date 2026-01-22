import { NextResponse } from 'next/server';
import { getPayPalConfig } from '@/lib/paypal-client';

export async function GET() {
  try {
    const config = getPayPalConfig();
    
    if (!config.clientId) {
      return NextResponse.json(
        { error: 'PayPal is not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientId: config.clientId,
      environment: config.environment,
      currency: config.currency,
    });
  } catch (error) {
    console.error('[PayPal Config] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get PayPal configuration' },
      { status: 500 }
    );
  }
}
