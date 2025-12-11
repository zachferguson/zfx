import { Request, Response } from "express";
import type { IStripeService } from "../services/stripeService";
import type { CreatePaymentIntentRequest } from "../types/createPaymentIntentRequest";
import { PAYMENT_ERRORS } from "../config/paymentErrors";
import { validationResult } from "express-validator";
import { sendError } from "../utils/sendError";
import type { ParamsDictionary } from "express-serve-static-core";

/**
 * Payment controller handler signatures.
 *
 * @remarks Defines the function types used by the payment controller.
 */
/**
 * Map of payment controller handlers.
 */
export type PaymentControllerHandlers = {
    /** Creates a Stripe payment intent. */
    handleCreatePaymentIntent: (
        req: Request<ParamsDictionary, unknown, CreatePaymentIntentRequest>,
        res: Response
    ) => Promise<void>;
};

/**
 * Creates the payment controller handlers.
 *
 * @param {IStripeService} service - Stripe service providing `createPaymentIntent`.
 * @returns {PaymentControllerHandlers} Object containing the `handleCreatePaymentIntent` handler.
 * @remarks Wires `handleCreatePaymentIntent` to the provided `IStripeService`; all responses are sent via `res`.
 */
export const createPaymentController = (
    service: IStripeService
): PaymentControllerHandlers => {
    return {
        /**
         * Creates a payment intent.
         *
         * @see POST /payment-intent
         * @param {Request<ParamsDictionary, unknown, CreatePaymentIntentRequest>} req - Express request; body `{ storeId, amount, currency }`.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks Uses Stripe to create a payment intent; supports multiple stores via `storeId`. On success: 200 `{ clientSecret }`. On validation error: 400 `{ errors }`. On server error: 500 `{ error }`.
         */
        handleCreatePaymentIntent: async (
            req: Request<ParamsDictionary, unknown, CreatePaymentIntentRequest>,
            res: Response
        ): Promise<void> => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
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
                sendError(res, 500, PAYMENT_ERRORS.PAYMENT_FAILED);
                return;
            }
        },
    };
};
