import { body, param } from "express-validator";
import { PRINTIFY_ERRORS } from "../config/printifyErrors";

/**
 * Validation chain for submitting a Printify order.
 * Expects non-empty 'storeId', 'order', and 'stripe_payment_id' fields in the body. Returns validation error MISSING_ORDER_FIELDS if missing.
 */
export const validateSubmitOrder = [
    body("storeId")
        .notEmpty()
        .withMessage(PRINTIFY_ERRORS.MISSING_ORDER_FIELDS),
    body("order").notEmpty().withMessage(PRINTIFY_ERRORS.MISSING_ORDER_FIELDS),
    body("stripe_payment_id")
        .notEmpty()
        .withMessage(PRINTIFY_ERRORS.MISSING_ORDER_FIELDS),
];

/**
 * Validation chain for getting Printify order status.
 * Expects non-empty 'orderId' and 'email' fields in the body. Returns validation error MISSING_ORDER_STATUS_FIELDS if missing.
 */
export const validateGetOrderStatus = [
    body("orderId")
        .notEmpty()
        .withMessage(PRINTIFY_ERRORS.MISSING_ORDER_STATUS_FIELDS),
    body("email")
        .notEmpty()
        .withMessage(PRINTIFY_ERRORS.MISSING_ORDER_STATUS_FIELDS),
];

/**
 * Validation chain for getting Printify products by store ID.
 * Expects non-empty 'id' param. Returns validation error MISSING_STORE_ID if missing.
 */
export const validateGetProducts = [
    param("id").notEmpty().withMessage(PRINTIFY_ERRORS.MISSING_STORE_ID),
];

/**
 * Validation chain for getting Printify shipping options.
 * Expects non-empty 'id' param, 'address_to', and 'line_items' fields in the body. Returns validation error MISSING_STORE_ID or MISSING_SHIPPING_FIELDS if missing.
 */
export const validateGetShippingOptions = [
    param("id").notEmpty().withMessage(PRINTIFY_ERRORS.MISSING_STORE_ID),
    body("address_to")
        .notEmpty()
        .withMessage(PRINTIFY_ERRORS.MISSING_SHIPPING_FIELDS),
    body("line_items")
        .isArray({ min: 1 })
        .withMessage(PRINTIFY_ERRORS.MISSING_SHIPPING_FIELDS),
];
