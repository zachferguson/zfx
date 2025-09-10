/**
 * Request body for creating a Stripe payment intent.
 *
 * Used by: paymentController (as req.body type)
 */
export interface CreatePaymentIntentRequest {
    storeId: string;
    amount: number;
    currency: string;
}
