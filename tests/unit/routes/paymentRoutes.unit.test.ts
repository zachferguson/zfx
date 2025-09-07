import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import paymentRoutes from "../../../src/routes/paymentRoutes";
import * as stripeService from "../../../src/services/stripeService";

vi.mock("../../../src/services/stripeService", () => ({
    createPaymentIntent: vi.fn(),
}));

describe("paymentRoutes (unit)", () => {
    let app: express.Express;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use("/payments", paymentRoutes);
        vi.clearAllMocks();
    });

    it("should call createPaymentIntent service with correct params", async () => {
        (stripeService.createPaymentIntent as any).mockResolvedValue(
            "unit_secret"
        );
        const res = await request(app)
            .post("/payments/create-payment-intent")
            .send({ storeId: "store-1", amount: 1000, currency: "usd" });
        expect(res.status).toBe(200);
        expect(res.body.clientSecret).toBe("unit_secret");
        expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
            "store-1",
            1000,
            "usd"
        );
    });
});
