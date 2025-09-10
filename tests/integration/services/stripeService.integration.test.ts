import { describe, it, expect, beforeAll } from "vitest";
import dotenv from "dotenv";
import {
    createPaymentIntent,
    getStripeClient,
} from "../../../src/services/stripeService";

/**
 * @file Integration tests for stripeService.
 *
 * This suite runs only when STRIPE_SECRET_DEVELOPERHORIZON (or the relevant secret for the chosen store)
 * is present in the environment. It exercises:
 * - getStripeClient: returns a real Stripe client instance
 * - createPaymentIntent: creates a real payment intent (happy path)
 * - createPaymentIntent: throws when using an invalid store/key configuration
 */

// Load .env for real API keys
beforeAll(() => {
    dotenv.config();
});

const storeId = process.env.TEST_STRIPE_STORE_ID || "developerhorizon";
const testAmount = 100; // $1.00
const testCurrency = "usd";
const stripeSecret = process.env.STRIPE_SECRET_DEVELOPERHORIZON;

const CAN_RUN = Boolean(stripeSecret);

describe.runIf(CAN_RUN)("stripeService (integration)", () => {
    describe("getStripeClient", () => {
        // Should return a real Stripe client instance with paymentIntents.create available
        it("getStripeClient returns a real Stripe client", () => {
            const client = getStripeClient(storeId);
            expect(client).toBeDefined();
            expect(typeof client.paymentIntents.create).toBe("function");
        });
    });

    describe("createPaymentIntent", () => {
        // Should create a real payment intent and return a non-empty clientSecret
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

        // Should throw when called with an invalid store/key configuration
        it("createPaymentIntent throws with invalid key", async () => {
            await expect(
                createPaymentIntent("badstore", testAmount, testCurrency)
            ).rejects.toThrow();
        });
    });
});

describe.runIf(!CAN_RUN)(
    "stripeService (integration) — skipped (missing STRIPE secret)",
    () => {
        // Should skip when STRIPE_SECRET_DEVELOPERHORIZON is not present
        it("skipped because STRIPE_SECRET_DEVELOPERHORIZON is not set", () => {
            expect(true).toBe(true);
        });
    }
);
