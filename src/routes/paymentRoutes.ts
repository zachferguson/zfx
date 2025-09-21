import express from "express";
import type { PaymentControllerHandlers } from "../controllers/paymentController";
import { validateCreatePaymentIntent } from "../validators/paymentValidators";

/**
 * Payment routes for Stripe payment intent creation.
 *
 * @module routes/paymentRoutes
 */
export function createPaymentRouter(controller: PaymentControllerHandlers) {
    const router = express.Router();

    router.post(
        "/create-payment-intent",
        validateCreatePaymentIntent,
        controller.handleCreatePaymentIntent
    );

    return router;
}

/**
 * Creates a Stripe payment intent for the given store, amount, and currency.
 *
 * @route POST /create-payment-intent
 * @returns {Promise<void>} Sends response via res object.
 * @note On success, responds with 200 and the client secret. On error, responds with 400 (validation) or 500 (server error).
 */
export default createPaymentRouter;
