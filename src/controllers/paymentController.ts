import express, { Request, Response } from "express";
import { createPaymentIntent } from "../services/stripeService";

const router = express.Router();

interface CreatePaymentIntentRequest {
    storeId: string;
    amount: number;
    currency: string;
}

const handleCreatePaymentIntent = async (
    req: Request<{}, {}, CreatePaymentIntentRequest>,
    res: Response
): Promise<void> => {
    try {
        const { storeId, amount, currency } = req.body;

        if (!storeId) {
            res.status(400).json({ error: "Missing storeId" });
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
};

router.post("/create-payment-intent", handleCreatePaymentIntent);

export default router;
