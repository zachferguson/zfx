import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createPaymentIntent } from "../../../src/services/stripeService";
import paymentRoutes from "../../../src/routes/paymentRoutes";
import { PAYMENT_ERRORS } from "../../../src/config/paymentErrors";

/**
 * @file Integration tests for the paymentController.
 *
 * Verifies payment endpoints using a real Express app with mocked Stripe service.
 *
 * Scenarios covered:
 * - Creating a payment intent with valid and invalid data
 * - Error handling for missing fields and service failures
 */

vi.mock("../../../src/services/stripeService", () => ({
    createPaymentIntent: vi.fn(),
}));

const mockedCreatePaymentIntent = vi.mocked(createPaymentIntent);

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/payments", paymentRoutes);
    return app;
}

describe("paymentController (integration)", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    describe("POST /payments/create-payment-intent", () => {
        // Test: returns 400 if storeId is missing from the request
        it("400 when storeId is missing", async () => {
            const res = await request(app)
                .post("/payments/create-payment-intent")
                .send({ amount: 1000, currency: "usd" });
            expect(res.status).toBe(400);
            if (Array.isArray(res.body.errors)) {
                expect(res.body.errors).toContain(
                    PAYMENT_ERRORS.MISSING_FIELDS
                );
            } else {
                expect(res.body.error).toBeDefined();
            }
            expect(mockedCreatePaymentIntent).not.toHaveBeenCalled();
        });

        // Test: returns 200 and clientSecret for a valid payment intent
        it("200 returns clientSecret", async () => {
            mockedCreatePaymentIntent.mockResolvedValue("secret_123");
            const res = await request(app)
                .post("/payments/create-payment-intent")
                .send({ storeId: "store-1", amount: 1000, currency: "usd" });
            expect(res.status).toBe(200);
            expect(res.body.clientSecret).toBe("secret_123");
            expect(mockedCreatePaymentIntent).toHaveBeenCalledWith(
                "store-1",
                1000,
                "usd"
            );
        });

        // Test: returns 500 if the payment service throws an error
        it("500 when service throws", async () => {
            mockedCreatePaymentIntent.mockRejectedValue(
                new Error("stripe down")
            );
            const res = await request(app)
                .post("/payments/create-payment-intent")
                .send({ storeId: "store-1", amount: 1000, currency: "usd" });
            expect(res.status).toBe(500);
            expect(res.body.error).toBe(PAYMENT_ERRORS.PAYMENT_FAILED);
        });
    });
});
