import { Request, Response } from "express";
import { createPaymentIntent } from "../services/stripeService";
import { CreatePaymentIntentRequest } from "../types/createPaymentIntentRequest";
import { PAYMENT_ERRORS } from "../config/paymentErrors";
import { body, validationResult } from "express-validator";

export const validateCreatePaymentIntent = [
    body("storeId").notEmpty().withMessage(PAYMENT_ERRORS.MISSING_FIELDS),
    body("amount")
        .notEmpty()
        .withMessage(PAYMENT_ERRORS.MISSING_FIELDS)
        .isFloat({ gt: 0 })
        .withMessage(PAYMENT_ERRORS.INVALID_AMOUNT),
    body("currency").notEmpty().withMessage(PAYMENT_ERRORS.MISSING_FIELDS),
];
/**
 * Creates a Stripe payment intent for the given store, amount, and currency.
 *
 * @route POST /payment-intent
 * @param {Request} req - Express request object, expects { storeId, amount, currency } in body
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return value; sends response via res)
 * @note In TypeScript, Express handlers should omit the return type because they do not return a value; all responses are sent via the res object. This is an intentional exception to the project's explicit return type rule.
 */
export const handleCreatePaymentIntent = async (
    req: Request<any, any, CreatePaymentIntentRequest>,
    res: Response
) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            errors: errors.array().map((e) => e.msg),
        });
        return;
    }
    try {
        const { storeId, amount, currency } = req.body;
        const clientSecret = await createPaymentIntent(
            storeId,
            amount,
            currency
        );
        res.json({ clientSecret });
        return;
    } catch (error) {
        console.error("Payment intent creation failed:", error);
        res.status(500).json({ error: PAYMENT_ERRORS.PAYMENT_FAILED });
        return;
    }
};
