import Stripe from "stripe";

export interface IStripeSecretResolver {
    (storeId: string): string | undefined;
}

export interface IStripeCtor {
    new (
        secretKey: string,
        config: ConstructorParameters<typeof Stripe>[1]
    ): Stripe;
}

export interface IStripeService {
    getStripeClient(storeId: string): Stripe;
    createPaymentIntent(
        storeId: string,
        amount: number,
        currency: string
    ): Promise<string | null>;
}

export class StripeService implements IStripeService {
    constructor(
        private readonly getSecretForStore: IStripeSecretResolver,
        private readonly StripeClass: IStripeCtor = Stripe
    ) {}

    getStripeClient(storeId: string): Stripe {
        const secretKey = this.getSecretForStore(storeId);
        if (!secretKey) {
            throw new Error(`No Stripe API key found for store: ${storeId}`);
        }
        const stripeConfig = { apiVersion: "2023-10-16" } as const;
        return new this.StripeClass(
            secretKey,
            stripeConfig as unknown as Stripe.StripeConfig
        );
    }

    async createPaymentIntent(
        storeId: string,
        amount: number,
        currency: string
    ): Promise<string | null> {
        try {
            const stripe = this.getStripeClient(storeId);
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency,
                payment_method_types: ["card"],
            });
            return paymentIntent.client_secret;
        } catch (error) {
            // keep original log shape for tests
            console.error(`Error creating PaymentIntent for ${storeId}`, error);
            throw error as Error;
        }
    }
}

/**
 * Mapping of store IDs to their Stripe secret keys, loaded from environment variables.
 * Add new stores as needed.
 */
const stripeKeys: Record<string, string | undefined> = {
    developerhorizon: process.env.STRIPE_SECRET_DEVELOPERHORIZON,
};

function envSecretResolver(storeId: string): string | undefined {
    return stripeKeys[storeId];
}

/**
 * Returns a Stripe client instance for the given store.
 * Throws if no secret key is found for the store.
 *
 * @param {string} storeId - The store identifier (e.g., 'developerhorizon').
 * @returns {Stripe} - Configured Stripe client instance.
 */
function defaultStripeService(): StripeService {
    return new StripeService(envSecretResolver, Stripe);
}

export const getStripeClient = (storeId: string): Stripe =>
    defaultStripeService().getStripeClient(storeId);

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
export const createPaymentIntent = (
    storeId: string,
    amount: number,
    currency: string
): Promise<string | null> =>
    defaultStripeService().createPaymentIntent(storeId, amount, currency);
