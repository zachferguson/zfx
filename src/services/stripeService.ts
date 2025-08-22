import Stripe from "stripe";

const stripeKeys: Record<string, string> = {
    developerhorizon: process.env.STRIPE_SECRET_DEVELOPERHORIZON!,
};

export const getStripeClient = (storeId: string): Stripe => {
    const secretKey = stripeKeys[storeId];
    if (!secretKey) {
        throw new Error(`No Stripe API key found for store: ${storeId}`);
    }
    return new Stripe(secretKey, {
        apiVersion: "2023-10-16" as any,
    });
};

export const createPaymentIntent = async (
    storeId: string,
    amount: number,
    currency: string
) => {
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
