import express from "express";
import { handleCreatePaymentIntent } from "../controllers/paymentController";
import { validateCreatePaymentIntent } from "../validators/paymentValidators";

/**
 * Payment routes for Stripe payment intent creation.
 *
 * @module routes/paymentRoutes
 */
const router = express.Router();

/**
 * Creates a Stripe payment intent for the given store, amount, and currency.
 *
 * @route POST /create-payment-intent
 * @returns {Promise<void>} Sends response via res object.
 * @note On success, responds with 200 and the client secret. On error, responds with 400 (validation) or 500 (server error).
 */
router.post(
    "/create-payment-intent",
    validateCreatePaymentIntent,
    handleCreatePaymentIntent
);

export default router;
