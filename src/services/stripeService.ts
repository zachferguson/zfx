import Stripe from "stripe";

/**
 * Resolves the Stripe secret for a given store.
 */
export interface IStripeSecretResolver {
    /**
     * Resolves the Stripe secret for a given store.
     *
     * @param {string} storeId - Store identifier.
     * @returns {string | undefined} Secret API key or `undefined` if not configured.
     */
    (storeId: string): string | undefined;
}

/**
 * Stripe constructor interface to allow overrides in tests.
 */
export interface IStripeCtor {
    new (
        secretKey: string,
        config: ConstructorParameters<typeof Stripe>[1]
    ): Stripe;
}

/**
 * Contract for Stripe client creation and payment intents.
 */
export interface IStripeService {
    /**
     * Creates a configured Stripe client for a store.
     *
     * @param {string} storeId - Store identifier.
     * @returns {Stripe} Configured Stripe client.
     */
    getStripeClient(storeId: string): Stripe;
    /**
     * Creates a PaymentIntent and returns its client secret.
     *
     * @param {string} storeId - Store identifier.
     * @param {number} amount - Amount in minor units (e.g., cents).
     * @param {string} currency - ISO currency code (e.g., "USD").
     * @returns {Promise<string | null>} Client secret or `null` if unavailable.
     */
    createPaymentIntent(
        storeId: string,
        amount: number,
        currency: string
    ): Promise<string | null>;
}

/**
 * Stripe-backed implementation of `IStripeService`.
 */
export class StripeService implements IStripeService {
    /**
     * Stripe-backed payment service.
     *
     * @param {IStripeSecretResolver} getSecretForStore - Resolver for per-store Stripe secrets.
     * @param {IStripeCtor} [StripeClass=Stripe] - Stripe constructor override (useful for tests).
     */
    constructor(
        private readonly getSecretForStore: IStripeSecretResolver,
        private readonly StripeClass: IStripeCtor = Stripe
    ) {}

    /**
     * Creates a configured Stripe client for a store.
     *
     * @param {string} storeId - Store identifier.
     * @returns {Stripe} Configured Stripe client.
     * @throws {Error} When no secret is found for the store.
     */
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

    /**
     * Creates a PaymentIntent and returns its client secret.
     *
     * @param {string} storeId - Store identifier.
     * @param {number} amount - Amount in minor units (e.g., cents).
     * @param {string} currency - ISO currency code (e.g., "USD").
     * @returns {Promise<string | null>} Client secret or `null` if unavailable.
     * @remarks Uses payment method type `card`.
     */
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
