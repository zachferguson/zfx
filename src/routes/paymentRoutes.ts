import express from "express";
import type { PaymentControllerHandlers } from "../controllers/paymentController";
import { validateCreatePaymentIntent } from "../validators/paymentValidators";

/**
 * Payment routes for Stripe payment intent creation.
 *
 * @module routes/paymentRoutes
 */

/**
 * Creates the payment router.
 *
 * @param {PaymentControllerHandlers} controller - Controller with `handleCreatePaymentIntent` handler.
 * @returns {import('express').Router} Express router with `/create-payment-intent` route.
 * @remarks Attaches validation middleware for payment intent creation.
 */
export const createPaymentRouter = (controller: PaymentControllerHandlers) => {
    const router = express.Router();
    /**
     * Handles payment intent creation.
     * @see POST /create-payment-intent
     */
    router.post(
        "/create-payment-intent",
        validateCreatePaymentIntent,
        controller.handleCreatePaymentIntent
    );

    return router;
};

/**
 * Payment routes for Stripe payment intent creation.
 *
 * @module routes/paymentRoutes
 */
export default createPaymentRouter;
