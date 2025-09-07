import { describe, it, expect, beforeAll } from "vitest";
import dotenv from "dotenv";
import {
    createPaymentIntent,
    getStripeClient,
} from "../../../src/services/stripeService";

// Load .env for real API keys
beforeAll(() => {
    dotenv.config();
});

describe("stripeService Integration", () => {
    const storeId = process.env.TEST_STRIPE_STORE_ID || "developerhorizon";
    const testAmount = 100; // $1.00
    const testCurrency = "usd";
    const stripeSecret = process.env.STRIPE_SECRET_DEVELOPERHORIZON;

    if (!stripeSecret) {
        describe.skip("Stripe integration tests", () => {
            it("skipped because STRIPE_SECRET_DEVELOPERHORIZON is not set", () => {
                expect(true).toBe(true);
            });
        });
        return;
    }

    it("getStripeClient returns a real Stripe client", () => {
        const client = getStripeClient(storeId);
        expect(client).toBeDefined();
        expect(typeof client.paymentIntents.create).toBe("function");
    });

    it("createPaymentIntent creates a real payment intent", async () => {
        const clientSecret = await createPaymentIntent(
            storeId,
            testAmount,
            testCurrency
        );
        expect(typeof clientSecret).toBe("string");
        expect(clientSecret).not.toBeNull();
        if (clientSecret) {
            expect(clientSecret.length).toBeGreaterThan(10);
        }
    });

    it("createPaymentIntent throws with invalid key", async () => {
        // Use a fake storeId to trigger error
        await expect(
            createPaymentIntent("badstore", testAmount, testCurrency)
        ).rejects.toThrow();
    });
});
