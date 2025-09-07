import Stripe from "stripe";

/**
 * Mapping of store IDs to their Stripe secret keys, loaded from environment variables.
 * Add new stores as needed.
 */
const stripeKeys: Record<string, string> = {
    developerhorizon: process.env.STRIPE_SECRET_DEVELOPERHORIZON!,
};

/**
 * Returns a Stripe client instance for the given store.
 * Throws if no secret key is found for the store.
 *
 * @param {string} storeId - The store identifier (e.g., 'developerhorizon').
 * @returns {Stripe} - Configured Stripe client instance.
 */
export const getStripeClient = (storeId: string): Stripe => {
    const secretKey = stripeKeys[storeId];
    if (!secretKey) {
        throw new Error(`No Stripe API key found for store: ${storeId}`);
    }
    return new Stripe(secretKey, {
        apiVersion: "2023-10-16" as any,
    });
};

/**
 * Creates a Stripe PaymentIntent for the given store, amount, and currency.
 * Returns the client secret for the created PaymentIntent.
 *
 * @param {string} storeId - The store identifier (must have a configured secret key).
 * @param {number} amount - The amount to charge, in the smallest currency unit (e.g., cents).
 * @param {string} currency - The currency code (e.g., 'usd').
 * @returns {Promise<string | null>} - The client secret for the PaymentIntent, or null if not available.
 * @throws {Error} - If the PaymentIntent creation fails or the store is not configured.
 */
export const createPaymentIntent = async (
    storeId: string,
    amount: number,
    currency: string
): Promise<string | null> => {
    try {
        const stripe = getStripeClient(storeId);
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method_types: ["card"],
        });
        return paymentIntent.client_secret;
    } catch (error) {
        console.error(`Error creating PaymentIntent for ${storeId}`, error);
        throw error;
    }
};
