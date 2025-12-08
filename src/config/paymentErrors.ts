/**
 * Centralized error messages for payment-related controllers.
 *
 * Used by: `paymentValidators`, `paymentController`
 */

/**
 * Payment error messages keyed by code.
 */
export const PAYMENT_ERRORS = {
    /** Missing required fields in request body. */
    MISSING_FIELDS: "storeId, amount, and currency are required.",
    /** Amount validation failed (must be positive). */
    INVALID_AMOUNT: "Amount must be a positive number.",
    /** Stripe or server failed to process the payment. */
    PAYMENT_FAILED: "Payment processing failed.",
};
