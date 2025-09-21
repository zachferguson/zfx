import { Request, Response } from "express";
import type { IStripeService } from "../services/stripeService";
import { createPaymentIntent } from "../services/stripeService";
import type { CreatePaymentIntentRequest } from "../types/createPaymentIntentRequest";
import { PAYMENT_ERRORS } from "../config/paymentErrors";
import { validationResult, type ValidationError } from "express-validator";
import type { ParamsDictionary } from "express-serve-static-core";

/**
 * Creates a Stripe payment intent for the given store, amount, and currency.
 *
 * @route POST /payment-intent
 * @param {Request} req - Express request object, expects { storeId, amount, currency } in body
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type because they do not return a value; all responses are sent via the res object. This is an intentional exception to the project's explicit return type rule.
 */
export type PaymentControllerHandlers = {
    handleCreatePaymentIntent: (
        req: Request<ParamsDictionary, unknown, CreatePaymentIntentRequest>,
        res: Response
    ) => Promise<void>;
};

export function createPaymentController(
    service: IStripeService
): PaymentControllerHandlers {
    return {
        handleCreatePaymentIntent: async (
            req: Request<ParamsDictionary, unknown, CreatePaymentIntentRequest>,
            res: Response
        ): Promise<void> => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    errors: errors
                        .array()
                        .map((e: ValidationError) => String(e.msg)),
                });
                return;
            }
            try {
                const { storeId, amount, currency } = req.body;
                const clientSecret = await service.createPaymentIntent(
                    storeId,
                    amount,
                    currency
                );
                res.status(200).json({ clientSecret });
                return;
            } catch (error) {
                console.error("Payment intent creation failed:", error);
                res.status(500).json({ error: PAYMENT_ERRORS.PAYMENT_FAILED });
                return;
            }
        },
    };
}

// Default-wired handler using function export (mock-friendly in tests)
const defaultService: IStripeService = {
    getStripeClient: () => {
        throw new Error("not used here");
    },
    createPaymentIntent,
};
export const { handleCreatePaymentIntent } =
    createPaymentController(defaultService);
