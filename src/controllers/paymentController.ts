import { Request, Response } from "express";
import { createPaymentIntent } from "../services/stripeService";
import { CreatePaymentIntentRequest } from "../types/createPaymentIntentRequest";

export const handleCreatePaymentIntent = async (
    req: Request<any, any, CreatePaymentIntentRequest>,
    res: Response
) => {
    try {
        const { storeId, amount, currency } = req.body;
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
