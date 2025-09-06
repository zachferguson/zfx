import { body } from "express-validator";
import { PAYMENT_ERRORS } from "../config/paymentErrors";

/**
 * Validation chain for payment intent creation.
 */
export const validateCreatePaymentIntent = [
    body("storeId").notEmpty().withMessage(PAYMENT_ERRORS.MISSING_FIELDS),
    body("amount")
        .notEmpty()
        .withMessage(PAYMENT_ERRORS.MISSING_FIELDS)
        .isFloat({ gt: 0 })
        .withMessage(PAYMENT_ERRORS.INVALID_AMOUNT),
    body("currency").notEmpty().withMessage(PAYMENT_ERRORS.MISSING_FIELDS),
];
