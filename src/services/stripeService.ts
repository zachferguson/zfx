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
