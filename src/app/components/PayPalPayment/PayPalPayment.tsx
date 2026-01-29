'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import styles from './PayPalPayment.module.css';

interface PayPalPaymentProps {
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

interface PayPalConfig {
    clientId: string;
    environment: 'sandbox' | 'production';
    currency: string;
}

// Inner component that uses PayPal hooks
function PayPalButtonWrapper({
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
}: PayPalPaymentProps) {
    const [{ isPending }] = usePayPalScriptReducer();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createOrderHandler = useCallback(async (): Promise<string> => {
        setError(null);
        setProcessing(true);

        try {
            const payload: Record<string, unknown> = { type };

            if (type === 'token') {
                payload.packageKey = packageKey;
                payload.userId = userId;
            } else if (type === 'brand') {
                payload.postType = postType;
                payload.visibilityDays = visibilityDays;
                payload.storyId = storyId;
            }

            const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create order');
            }

            return result.orderId;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
            setError(errorMessage);
            onError?.(errorMessage);
            throw err;
        } finally {
            setProcessing(false);
        }
    }, [type, packageKey, userId, postType, visibilityDays, storyId, onError]);

    const onApproveHandler = useCallback(async (data: { orderID: string }): Promise<void> => {
        setProcessing(true);
        setError(null);

        try {
            const payload: Record<string, unknown> = {
                orderId: data.orderID,
                type,
            };

            if (type === 'token') {
                payload.packageKey = packageKey;
                payload.userId = userId;
            } else if (type === 'brand') {
                payload.storyId = storyId;
            }

            const response = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Payment failed');
            }

            onSuccess?.(result.captureId || data.orderID);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Payment failed';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setProcessing(false);
        }
    }, [type, packageKey, userId, storyId, onSuccess, onError]);

    const onCancelHandler = useCallback(() => {
        setProcessing(false);
        onCancel?.();
    }, [onCancel]);

    const onErrorHandler = useCallback((err: Record<string, unknown>) => {
        console.error('[PayPal] Error:', err);
        const errorMessage = 'Payment could not be processed. Please try again.';
        setError(errorMessage);
        onError?.(errorMessage);
        setProcessing(false);
    }, [onError]);

    if (isPending) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading payment options...</p>
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className={styles.errorMessage}>
                    {error}
                </div>
            )}

            <div className={styles.paypalButtonsContainer}>
                <PayPalButtons
                    style={{
                        layout: 'vertical',
                        color: 'gold',
                        shape: 'rect',
                        label: 'pay',
                        height: 48,
                    }}
                    disabled={processing}
                    createOrder={createOrderHandler}
                    onApprove={onApproveHandler}
                    onCancel={onCancelHandler}
                    onError={onErrorHandler}
                />
            </div>
        </>
    );
}

export default function PayPalPayment(props: PayPalPaymentProps) {
    const [config, setConfig] = useState<PayPalConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { amount, currency = 'GBP', description, onCancel } = props;

    useEffect(() => {
        async function fetchConfig() {
            try {
                const response = await fetch('/api/paypal/config');
                if (!response.ok) {
                    throw new Error('Failed to load payment configuration');
                }
                const data = await response.json();
                setConfig(data);
            } catch (err) {
                setError('Unable to load payment form. Please try again.');
                console.error('[PayPalPayment] Config fetch error:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchConfig();
    }, []);

    const formatAmount = (amountInMinor: number, currencyCode: string) => {
        const majorUnits = amountInMinor / 100;
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currencyCode,
        }).format(majorUnits);
    };

    const paypalOptions = useMemo(() => ({
        clientId: config?.clientId || '',
        currency: currency,
        intent: 'capture',
        disableFunding: 'card', // Disable inline card fields to avoid COMPLIANCE_VIOLATION in Sandbox
    }), [config?.clientId, currency]);

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

    if (!config || error) {
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

            <PayPalScriptProvider options={paypalOptions}>
                <PayPalButtonWrapper {...props} />
            </PayPalScriptProvider>
        </div>
    );
}
