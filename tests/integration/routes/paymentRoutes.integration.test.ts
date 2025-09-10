import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

/**
 * @file Integration tests for paymentRoutes.
 *
 * Verifies the payment routing layer using a real Express app with mocked Stripe service.
 *
 * Scenarios covered:
 * - Validation errors for missing fields (storeId, amount, currency)
 * - Successful creation of a payment intent
 * - Error handling when the Stripe service fails
 */

// Mock the Stripe service used by the routes (must come before importing the route handler)
vi.mock("../../../src/services/stripeService", () => ({
    createPaymentIntent: vi.fn(),
}));

import { createPaymentIntent } from "../../../src/services/stripeService";
import paymentRoutes from "../../../src/routes/paymentRoutes";
import { PAYMENT_ERRORS } from "../../../src/config/paymentErrors";

const mockedCreatePaymentIntent = vi.mocked(createPaymentIntent);

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/payments", paymentRoutes);
    return app;
}

describe("paymentRoutes (integration)", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    describe("POST /payments/create-payment-intent", () => {
        // Should return 400 when storeId is missing
        it("POST /payments/create-payment-intent -> 400 when storeId is missing", async () => {
            const res = await request(app)
                .post("/payments/create-payment-intent")
                .send({ amount: 1000, currency: "usd" });
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(PAYMENT_ERRORS.MISSING_FIELDS);
            expect(mockedCreatePaymentIntent).not.toHaveBeenCalled();
        });

        // Should return 400 when amount is missing
        it("POST /payments/create-payment-intent -> 400 when amount is missing", async () => {
            const res = await request(app)
                .post("/payments/create-payment-intent")
                .send({ storeId: "store-1", currency: "usd" });
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(PAYMENT_ERRORS.MISSING_FIELDS);
            expect(mockedCreatePaymentIntent).not.toHaveBeenCalled();
        });

        // Should return 400 when currency is missing
        it("POST /payments/create-payment-intent -> 400 when currency is missing", async () => {
            const res = await request(app)
                .post("/payments/create-payment-intent")
                .send({ storeId: "store-1", amount: 1000 });
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(PAYMENT_ERRORS.MISSING_FIELDS);
            expect(mockedCreatePaymentIntent).not.toHaveBeenCalled();
        });

        // Should return 200 and clientSecret for a valid request
        it("POST /payments/create-payment-intent -> 200 returns clientSecret", async () => {
            mockedCreatePaymentIntent.mockResolvedValue("pi_secret_123");
            const body = { storeId: "store-1", amount: 2500, currency: "usd" };
            const res = await request(app)
                .post("/payments/create-payment-intent")
                .send(body);
            expect(res.status).toBe(200);
            expect(res.body.clientSecret).toBe("pi_secret_123");
            expect(mockedCreatePaymentIntent).toHaveBeenCalledWith(
                "store-1",
                2500,
                "usd"
            );
        });

        // Should return 500 when the service throws
        it("POST /payments/create-payment-intent -> 500 when service throws", async () => {
            mockedCreatePaymentIntent.mockRejectedValue(
                new Error("stripe-down")
            );
            const res = await request(app)
                .post("/payments/create-payment-intent")
                .send({ storeId: "store-1", amount: 1000, currency: "usd" });
            expect(res.status).toBe(500);
            expect(res.body.error).toBe(PAYMENT_ERRORS.PAYMENT_FAILED);
        });
    });
});
