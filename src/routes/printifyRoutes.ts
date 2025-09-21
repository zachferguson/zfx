import express from "express";
import {
    validateGetProducts,
    validateGetShippingOptions,
    validateSubmitOrder,
    validateGetOrderStatus,
} from "../validators/printifyValidators";

/**
 * Shape of controller handlers used by the router.
 * They’re the functions returned by createPrintifyController.
 */
export type PrintifyControllerHandlers = {
    getProducts(req: express.Request, res: express.Response): Promise<void>;
    getShippingOptions(
        req: express.Request,
        res: express.Response
    ): Promise<void>;
    submitOrder(req: express.Request, res: express.Response): Promise<void>;
    getOrderStatus(req: express.Request, res: express.Response): Promise<void>;
};

/**
 * Printify routes for product, shipping, and order operations.
 *
 * @module routes/printifyRoutes
 */
export function createPrintifyRouter(controller: PrintifyControllerHandlers) {
    const router = express.Router();

    /**
     * Gets all Printify products for a given store.
     *
     * @route GET /printify/:id/products
     * @returns {Promise<void>} Sends response via res object.
     * @note On success, responds with 200 and an array of products. On error, responds with 400 (validation) or 500 (server error).
     */
    router.get("/:id/products", validateGetProducts, controller.getProducts);

    /**
     * Gets Printify shipping options for a given store and order details.
     *
     * @route POST /printify/:id/shipping-options
     * @returns {Promise<void>} Sends response via res object.
     * @note On success, responds with 200 and shipping options. On error, responds with 400 (validation) or 500 (server error).
     */
    router.post(
        "/:id/shipping-options",
        validateGetShippingOptions,
        controller.getShippingOptions
    );

    /**
     * Submits a new order to Printify and saves it in the database.
     *
     * @route POST /printify/submit-order
     * @returns {Promise<void>} Sends response via res object.
     * @note On success, responds with 201 and order info. On error, responds with 400 (validation) or 500 (server error).
     */
    router.post("/submit-order", validateSubmitOrder, controller.submitOrder);

    /**
     * Gets the status and details of a Printify order for a customer.
     *
     * @route POST /printify/order-status
     * @returns {Promise<void>} Sends response via res object.
     * @note On success, responds with 200 and order status. On error, responds with 400 (validation), 404 (not found), or 500 (server error).
     */
    router.post(
        "/order-status",
        validateGetOrderStatus,
        controller.getOrderStatus
    );

    return router;
}

// For convenience, allow default export = factory
export default createPrintifyRouter;
