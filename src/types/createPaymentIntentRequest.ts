/**
 * Request body for creating a Stripe payment intent.
 *
 * Used by: paymentController (as req.body type)
 */
export interface CreatePaymentIntentRequest {
    /** Store identifier to resolve Stripe secret. */
    storeId: string;
    /** Amount in smallest currency unit (e.g., cents). */
    amount: number;
    /** ISO currency code, e.g., "USD". */
    currency: string;
}
