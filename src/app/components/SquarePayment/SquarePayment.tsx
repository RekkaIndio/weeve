'use client';

import { useEffect, useState, useCallback } from 'react';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import styles from './SquarePayment.module.css';

interface SquarePaymentProps {
    // Payment type
    type: 'token' | 'brand';

    // For token purchases
    packageKey?: string;
    userId?: string;

    // For brand post payments
    postType?: 'seed' | 'canon';
    visibilityDays?: number;
    storyId?: string;

    // Display info
    amount: number; // In minor units (pence)
    currency?: string;
    description?: string;

    // Callbacks
    onSuccess?: (paymentId: string) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
}

interface SquareConfig {
    applicationId: string;
    locationId: string;
    environment: 'sandbox' | 'production';
}

export default function SquarePayment({
    type,
    packageKey,
    userId,
    postType,
    visibilityDays,
    storyId,
    amount,
    currency = 'GBP',
    description,
    onSuccess,
    onError,
    onCancel,
}: SquarePaymentProps) {
    const [config, setConfig] = useState<SquareConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSecureContext, setIsSecureContext] = useState(true);

    useEffect(() => {
        // Check if we're in a secure context (HTTPS or localhost on desktop)
        const checkSecureContext = () => {
            if (typeof window !== 'undefined') {
                // window.isSecureContext is false on mobile devices accessing via HTTP
                const secure = window.isSecureContext;
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                // Desktop browsers allow localhost, but mobile WebViews may not
                setIsSecureContext(secure || (isLocalhost && !navigator.userAgent.includes('Mobile')));
            }
        };
        checkSecureContext();
    }, []);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const response = await fetch('/api/square/config');
                if (!response.ok) {
                    throw new Error('Failed to load payment configuration');
                }
                const data = await response.json();
                setConfig(data);
            } catch (err) {
                setError('Unable to load payment form. Please try again.');
                console.error('[SquarePayment] Config fetch error:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchConfig();
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlePayment = useCallback(async (tokenResult: any, buyer: any) => {
        // Check if tokenization was successful
        if (tokenResult.status !== 'OK' || !tokenResult.token) {
            const errorMessage = tokenResult.errors?.[0]?.message || 'Card tokenization failed. Please try again.';
            setError(errorMessage);
            onError?.(errorMessage);
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const payload: Record<string, unknown> = {
                sourceId: tokenResult.token,
                type,
            };

            if (type === 'token') {
                payload.packageKey = packageKey;
                payload.userId = userId;
            } else if (type === 'brand') {
                payload.postType = postType;
                payload.visibilityDays = visibilityDays;
                payload.storyId = storyId;
            }

            const response = await fetch('/api/square/process-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Payment failed');
            }

            onSuccess?.(result.paymentId);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Payment failed';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setProcessing(false);
        }
    }, [type, packageKey, userId, postType, visibilityDays, storyId, onSuccess, onError]);

    const formatAmount = (amountInMinor: number, currencyCode: string) => {
        const majorUnits = amountInMinor / 100;
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currencyCode,
        }).format(majorUnits);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading payment form...</p>
                </div>
            </div>
        );
    }

    // Show HTTPS required message for mobile devices
    if (!isSecureContext) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Complete Payment</h2>
                    {description && <p className={styles.description}>{description}</p>}
                    <div className={styles.amount}>
                        {formatAmount(amount, currency)}
                    </div>
                </div>
                <div className={styles.errorMessage}>
                    <strong>Secure Connection Required</strong>
                    <br />
                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                        Card payments require HTTPS. Please use the web version or deploy to a secure server.
                    </span>
                </div>
                <button onClick={onCancel} className={styles.cancelButton}>
                    Go Back
                </button>
            </div>
        );
    }

    if (!config) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <p>{error || 'Payment is not available at this time.'}</p>
                    <button onClick={onCancel} className={styles.cancelButton}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Complete Payment</h2>
                {description && <p className={styles.description}>{description}</p>}
                <div className={styles.amount}>
                    {formatAmount(amount, currency)}
                </div>
            </div>

            {error && (
                <div className={styles.errorMessage}>
                    {error}
                </div>
            )}

            <PaymentForm
                applicationId={config.applicationId}
                locationId={config.locationId}
                cardTokenizeResponseReceived={handlePayment}
                createPaymentRequest={() => ({
                    countryCode: 'GB',
                    currencyCode: currency,
                    total: {
                        amount: (amount / 100).toString(),
                        label: description || 'Payment',
                    },
                })}
            >
                <CreditCard
                    buttonProps={{
                        css: {
                            backgroundColor: '#6366f1',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: 600,
                            padding: '16px 24px',
                            borderRadius: '12px',
                            cursor: processing ? 'not-allowed' : 'pointer',
                            opacity: processing ? 0.7 : 1,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                backgroundColor: processing ? '#6366f1' : '#5558dd',
                            },
                        },
                    }}
                >
                    {processing ? 'Processing...' : `Pay ${formatAmount(amount, currency)}`}
                </CreditCard>
            </PaymentForm>

            <button onClick={onCancel} className={styles.cancelButton} disabled={processing}>
                Cancel
            </button>

            <div className={styles.securityNote}>
                <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
                </svg>
                <span>Secured by Square</span>
            </div>
        </div>
    );
}
