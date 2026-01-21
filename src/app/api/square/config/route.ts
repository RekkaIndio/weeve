import { NextResponse } from 'next/server';

/**
 * Get Square configuration for the frontend
 * Returns non-sensitive config needed by Web Payments SDK
 */
export async function GET() {
  const applicationId = process.env.SQUARE_APPLICATION_ID || process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId = process.env.SQUARE_LOCATION_ID || process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';

  if (!applicationId || !locationId) {
    return NextResponse.json(
      { error: 'Square is not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    applicationId,
    locationId,
    environment,
  });
}
