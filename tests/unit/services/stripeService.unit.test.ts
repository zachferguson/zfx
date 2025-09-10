import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * @file Unit tests for stripeService.
 *
 * These tests verify the behavior of stripeService methods using a mocked Stripe
 * constructor and instance to control client creation and PaymentIntent calls.
 *
 * Scenarios covered:
 * - getStripeClient: returns configured client or throws when key missing
 * - createPaymentIntent: creates intent, returns client_secret, bubbles errors
 */

// Hoisted mocks so we can control the Stripe constructor & instance.
const h = vi.hoisted(() => ({
    StripeCtor: vi.fn(), // mocked class/constructor
    stripeInstance: {
        paymentIntents: {
            create: vi.fn(),
        },
    } as any,
}));

// Mock the 'stripe' package's default export (the constructor/class)
vi.mock("stripe", () => ({
    default: h.StripeCtor,
}));

/**
 * Helper: reset module cache and (re)import stripeService AFTER
 * we set env vars in each test.
 */
async function loadStripeService() {
    vi.resetModules();
    const mod = await import("../../../src/services/stripeService");
    return mod;
}

beforeEach(() => {
    vi.clearAllMocks();
    // By default, when someone does `new Stripe(...)`, return our instance
    h.StripeCtor.mockImplementation(() => h.stripeInstance);
    // Reset inner mock too
    h.stripeInstance.paymentIntents.create.mockReset();
});

describe("stripeService (unit)", () => {
    describe("getStripeClient", () => {
        it("returns a Stripe client using the mapped secret key", async () => {
            // Arrange env before import (stripeKeys is computed on import)
            process.env.STRIPE_SECRET_DEVELOPERHORIZON = "sk_test_123";
            const { getStripeClient } = await loadStripeService();

            // Act
            const client = getStripeClient("developerhorizon");

            // Assert: constructor called with correct args & returned our instance
            expect(h.StripeCtor).toHaveBeenCalledTimes(1);
            expect(h.StripeCtor).toHaveBeenCalledWith(
                "sk_test_123",
                expect.objectContaining({ apiVersion: "2023-10-16" })
            );
            expect(client).toBe(h.stripeInstance);
        });

        it("throws when no secret key exists for the store", async () => {
            // No env key set
            delete process.env.STRIPE_SECRET_DEVELOPERHORIZON;
            const { getStripeClient } = await loadStripeService();

            expect(() => getStripeClient("developerhorizon")).toThrow(
                "No Stripe API key found for store: developerhorizon"
            );
            expect(h.StripeCtor).not.toHaveBeenCalled();
        });
    });

    describe("createPaymentIntent", () => {
        it("creates a payment intent and returns client_secret", async () => {
            process.env.STRIPE_SECRET_DEVELOPERHORIZON = "sk_live_abc";
            const { createPaymentIntent } = await loadStripeService();

            // Make Stripe return a client secret
            h.stripeInstance.paymentIntents.create.mockResolvedValue({
                client_secret: "pi_secret_123",
            });

            const secret = await createPaymentIntent(
                "developerhorizon",
                2500,
                "usd"
            );

            // Constructor called with correct key/version
            expect(h.StripeCtor).toHaveBeenCalledWith(
                "sk_live_abc",
                expect.objectContaining({ apiVersion: "2023-10-16" })
            );

            // Called with correct payload
            expect(h.stripeInstance.paymentIntents.create).toHaveBeenCalledWith(
                {
                    amount: 2500,
                    currency: "usd",
                    payment_method_types: ["card"],
                }
            );

            expect(secret).toBe("pi_secret_123");
        });

        it("bubbles errors from Stripe", async () => {
            process.env.STRIPE_SECRET_DEVELOPERHORIZON = "sk_x";
            const { createPaymentIntent } = await loadStripeService();

            h.stripeInstance.paymentIntents.create.mockRejectedValue(
                new Error("stripe-down")
            );

            await expect(
                createPaymentIntent("developerhorizon", 999, "usd")
            ).rejects.toThrow("stripe-down");
        });
    });
});
