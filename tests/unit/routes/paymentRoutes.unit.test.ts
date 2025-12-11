import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import createPaymentRouter from "../../../src/routes/paymentRoutes";
const mockedCreate = vi.fn(
    (storeId: string, amount: number, currency: string) =>
        Promise.resolve(`mock_${storeId}_${amount}_${currency}`)
);

describe("paymentRoutes (unit)", () => {
    let app: express.Express;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        const router = createPaymentRouter({
            handleCreatePaymentIntent: async (req, res): Promise<void> => {
                const { validationResult } =
                    require("express-validator") as typeof import("express-validator");
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        errors: errors.array().map((e: any) => String(e.msg)),
                    });
                    return;
                }
                const { storeId, amount, currency } = req.body || {};
                const clientSecret = await mockedCreate(
                    storeId,
                    amount,
                    currency
                );
                res.status(200).json({ clientSecret });
                return;
            },
        });
        app.use("/payments", router);
        vi.clearAllMocks();
    });

    it("should call createPaymentIntent service with correct params", async () => {
        (mockedCreate as any).mockResolvedValue("unit_secret");
        const res = await request(app)
            .post("/payments/create-payment-intent")
            .send({ storeId: "store-1", amount: 1000, currency: "usd" });
        expect(res.status).toBe(200);
        expect(res.body.clientSecret).toBe("unit_secret");
        expect(mockedCreate).toHaveBeenCalledWith("store-1", 1000, "usd");
    });
});
