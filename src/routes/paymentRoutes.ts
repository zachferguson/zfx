import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { createPaymentIntent } from "../services/stripeService";

const router = express.Router();

interface CreatePaymentIntentRequest {
    storeId: string;
    amount: number;
    currency: string;
}

router.post(
    "/create-payment-intent",
    [
        body("storeId").notEmpty().withMessage("Missing storeId"),
        body("amount").notEmpty().withMessage("Missing amount"),
        body("currency").notEmpty().withMessage("Missing currency"),
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        try {
            const { storeId, amount, currency } =
                req.body as CreatePaymentIntentRequest;
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
