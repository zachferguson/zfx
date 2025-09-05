import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// --- mock stripeService ---
vi.mock("../services/stripeService", () => ({
    createPaymentIntent: vi.fn(),
}));

import { createPaymentIntent } from "../services/stripeService";
import paymentRouter from "./paymentController";

const mockedStripe = vi.mocked({ createPaymentIntent });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/payments", paymentRouter);
    return app;
}

describe("paymentController", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    it("POST /payments/create-payment-intent -> 400 when storeId is missing", async () => {
        const res = await request(app)
            .post("/payments/create-payment-intent")
            .send({ amount: 1000, currency: "usd" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Missing storeId");
        expect(mockedStripe.createPaymentIntent).not.toHaveBeenCalled();
    });

    it("POST /payments/create-payment-intent -> 200 returns clientSecret", async () => {
        mockedStripe.createPaymentIntent.mockResolvedValue("secret_123");

        const res = await request(app)
            .post("/payments/create-payment-intent")
            .send({ storeId: "store-1", amount: 1000, currency: "usd" });

        expect(res.status).toBe(200);
        expect(res.body.clientSecret).toBe("secret_123");
        expect(mockedStripe.createPaymentIntent).toHaveBeenCalledWith(
            "store-1",
            1000,
            "usd"
        );
    });

    it("POST /payments/create-payment-intent -> 500 when service throws", async () => {
        mockedStripe.createPaymentIntent.mockRejectedValue(
            new Error("stripe down")
        );

        const res = await request(app)
            .post("/payments/create-payment-intent")
            .send({ storeId: "store-1", amount: 1000, currency: "usd" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Payment processing failed");
    });
});
