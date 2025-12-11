import express from "express";
import {
    validateGetProducts,
    validateGetShippingOptions,
    validateSubmitOrder,
    validateGetOrderStatus,
} from "../validators/printifyValidators";
import type { PrintifyController } from "../controllers/printifyController";

/**
 * Printify routes for product, shipping, and order operations.
 *
 * @module routes/printifyRoutes
 */

/**
 * Creates the Printify router.
 *
 * @param {PrintifyController} controller - Controller with product, shipping, order submission, and status handlers.
 * @returns {import('express').Router} Express router for Printify endpoints.
 * @remarks Attaches validation middleware for each route.
 */
export const createPrintifyRouter = (controller: PrintifyController) => {
    const router = express.Router();

    /**
     * Gets all Printify products for a given store.
     * @see GET /printify/:id/products
     */
    router.get("/:id/products", validateGetProducts, controller.getProducts);

    /**
     * Gets Printify shipping options for a given store and order details.
     * @see POST /printify/:id/shipping-options
     */
    router.post(
        "/:id/shipping-options",
        validateGetShippingOptions,
        controller.getShippingOptions
    );

    /**
     * Submits a new order to Printify and saves it in the database.
     * @see POST /printify/submit-order
     */
    router.post("/submit-order", validateSubmitOrder, controller.submitOrder);

    /**
     * Gets the status and details of a Printify order for a customer.
     * @see POST /printify/order-status
     */
    router.post(
        "/order-status",
        validateGetOrderStatus,
        controller.getOrderStatus
    );

    return router;
};

// For convenience, allow default export = factory
export default createPrintifyRouter;
