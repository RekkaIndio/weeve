/**
 * Revolut Merchant API Client
 * Handles payment order creation and management
 */

export interface RevolutOrder {
  id: string;
  public_id: string;
  type: 'PAYMENT';
  state: 'PENDING' | 'PROCESSING' | 'AUTHORISED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  description?: string;
  merchant_order_ext_ref?: string;
  customer_email?: string;
  order_amount: {
    value: number;
    currency: string;
  };
  checkout_url?: string;
}

export interface CreateOrderParams {
  amount: number; // Amount in minor units (cents/pence)
  currency: string;
  description?: string;
  merchantOrderExtRef?: string; // Our reference ID (user_id or story_id)
  customerEmail?: string;
  metadata?: Record<string, string>;
}

const REVOLUT_API_BASE = {
  sandbox: 'https://sandbox-merchant.revolut.com/api',
  production: 'https://merchant.revolut.com/api',
};

function getApiBase(): string {
  const env = process.env.REVOLUT_ENVIRONMENT || 'sandbox';
  return REVOLUT_API_BASE[env as keyof typeof REVOLUT_API_BASE] || REVOLUT_API_BASE.sandbox;
}

function getApiKey(): string {
  const key = process.env.REVOLUT_API_KEY;
  if (!key) {
    throw new Error('REVOLUT_API_KEY environment variable is not set');
  }
  return key;
}

/**
 * Create a payment order and get a checkout URL
 */
export async function createOrder(params: CreateOrderParams): Promise<RevolutOrder> {
  const apiBase = getApiBase();
  const apiKey = getApiKey();

  const response = await fetch(`${apiBase}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Revolut-Api-Version': '2024-09-01',
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      merchant_order_ext_ref: params.merchantOrderExtRef,
      customer_email: params.customerEmail,
      metadata: params.metadata,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[Revolut] Order creation failed:', response.status, errorData);
    throw new Error(`Revolut API error: ${response.status} - ${errorData}`);
  }

  const order = await response.json() as RevolutOrder;
  console.log('[Revolut] Order created:', order.id, order.public_id);
  
  return order;
}

/**
 * Get an existing order by ID
 */
export async function getOrder(orderId: string): Promise<RevolutOrder> {
  const apiBase = getApiBase();
  const apiKey = getApiKey();

  const response = await fetch(`${apiBase}/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Revolut-Api-Version': '2024-09-01',
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[Revolut] Get order failed:', response.status, errorData);
    throw new Error(`Revolut API error: ${response.status} - ${errorData}`);
  }

  return await response.json() as RevolutOrder;
}

/**
 * Generate a checkout URL for an order
 * This creates the hosted checkout page URL
 */
export async function getCheckoutUrl(orderId: string): Promise<string> {
  const env = process.env.REVOLUT_ENVIRONMENT || 'sandbox';
  const checkoutBase = env === 'production' 
    ? 'https://checkout.revolut.com'
    : 'https://sandbox-checkout.revolut.com';
  
  return `${checkoutBase}/pay/${orderId}`;
}

/**
 * Verify webhook signature
 * Revolut signs webhooks using HMAC-SHA256
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Revolut webhook signature verification
  // The signature header contains: timestamp.v1=signature
  const crypto = require('crypto');
  
  try {
    const parts = signature.split('.');
    if (parts.length !== 2) {
      console.error('[Revolut] Invalid signature format');
      return false;
    }
    
    const [timestampPart, signaturePart] = parts;
    const timestamp = timestampPart.split('=')[1];
    const sig = signaturePart.split('=')[1];
    
    if (!timestamp || !sig) {
      console.error('[Revolut] Missing timestamp or signature');
      return false;
    }
    
    // Check timestamp is within 5 minutes
    const timestampMs = parseInt(timestamp, 10);
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      console.error('[Revolut] Webhook timestamp too old');
      return false;
    }
    
    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    // Constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch (error) {
    console.error('[Revolut] Signature verification error:', error);
    return false;
  }
}
