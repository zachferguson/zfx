import express, { Request, Response } from "express";
import { createPaymentIntent } from "../services/stripeService";

interface CreatePaymentIntentRequest {
    storeId: string;
    amount: number;
    currency: string;
}

const router = express.Router();

router.post(
    "/create-payment-intent",
    async (
        req: Request<{}, {}, CreatePaymentIntentRequest>,
        res: Response
    ): Promise<void> => {
        try {
            const { storeId, amount, currency } = req.body;

            if (!storeId || !amount || !currency) {
                res.status(400).json({ error: "Missing required fields" });
                return;
            }

            const clientSecret = await createPaymentIntent(
                storeId,
                amount,
                currency
            );
            res.json({ clientSecret });
        } catch (error) {
            console.error("Payment intent creation failed:", error);
            res.status(500).json({ error: "Payment processing failed" });
        }
    }
);

export default router;
