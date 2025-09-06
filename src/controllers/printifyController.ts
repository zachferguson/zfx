import { Request, Response } from "express";
import { PRINTIFY_ERRORS } from "../config/printifyErrors";
import { body, param, validationResult } from "express-validator";
import { PrintifyService } from "../services/printifyService";
import { ShippingRatesRequestBody } from "../types/printifyShipping";
import { PrintifyOrderRequest } from "../types/printifyOrder";
import { OrderService } from "../services/orderService";
import { sendOrderConfirmation } from "../services/emailService";

const printifyService = new PrintifyService(process.env.PRINTIFY_API_KEY || "");
const orderService = new OrderService();

/**
 * Gets all Printify products for a given store.
 *
 * @route GET /printify/:id/products
 * @param {Request} req - Express request object, expects store id in params
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return value; sends response via res)
 * @note On success, responds with 200 and an array of products. On error, responds with 400 (validation) or 500 (server error) and an error message.
 */
export const getProducts = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const { id } = req.params;
    try {
        const products = await printifyService.getProducts(id);
        res.status(200).json(products);
        return;
    } catch (err: any) {
        console.error("Error in printifyController.getProducts", err);
        res.status(500).json({
            error: PRINTIFY_ERRORS.FAILED_FETCH_PRODUCTS,
        });
        return;
    }
};

export const validateGetProducts = [
    param("id").notEmpty().withMessage(PRINTIFY_ERRORS.MISSING_STORE_ID),
];

/**
 * Gets Printify shipping options for a given store and order details.
 *
 * @route POST /printify/:id/shipping
 * @param {Request} req - Express request object, expects store id in params and ShippingRatesRequestBody in body
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return value; sends response via res)
 * @note On success, responds with 200 and shipping options. On error, responds with 400 (validation) or 500 (server error) and an error message.
 */
export const getShippingOptions = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const { id } = req.params;
    const requestBody: ShippingRatesRequestBody = req.body;
    try {
        const shippingOptions = await printifyService.getShippingRates(
            id,
            requestBody
        );
        res.status(200).json(shippingOptions);
        return;
    } catch (err: any) {
        console.error("Error fetching shipping rates:", err);
        res.status(500).json({
            error: PRINTIFY_ERRORS.FAILED_SHIPPING_OPTIONS,
        });
        return;
    }
};

export const validateGetShippingOptions = [
    param("id").notEmpty().withMessage(PRINTIFY_ERRORS.MISSING_STORE_ID),
    body("address_to")
        .notEmpty()
        .withMessage(PRINTIFY_ERRORS.MISSING_SHIPPING_FIELDS),
    body("line_items")
        .isArray({ min: 1 })
        .withMessage(PRINTIFY_ERRORS.MISSING_SHIPPING_FIELDS),
];

/**
 * Submits a new order to Printify and saves it in the database.
 *
 * @route POST /printify/order
 * @param {Request} req - Express request object, expects storeId, order, and stripe_payment_id in body
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return type; see note)
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const submitOrder = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const {
        storeId,
        order,
        stripe_payment_id,
    }: {
        storeId: string;
        order: PrintifyOrderRequest;
        stripe_payment_id: string;
    } = req.body;
    try {
        const order_number = crypto.randomUUID();

        const newOrder = await orderService.saveOrder({
            orderNumber: order_number,
            storeId: storeId,
            email: order.customer.email,
            totalPrice: order.total_price,
            currency: order.currency || "USD",
            shippingMethod: order.shipping_method,
            shippingCost: order.shipping_cost,
            shippingAddress: order.customer.address,
            items: order.line_items,
            stripePaymentId: stripe_payment_id,
            paymentStatus: "paid",
            orderStatus: "pending",
        });

        console.log("Order saved in DB:", newOrder);

        // submit order to printify
        const printifyResponse = await printifyService.submitOrder(
            storeId,
            order_number,
            order
        );
        console.log("Order submitted to Printify:", printifyResponse);

        // update database with printify order id
        await orderService.updatePrintifyOrderId(
            order_number,
            printifyResponse.id
        );

        await sendOrderConfirmation(
            storeId,
            order.customer.email,
            order_number,
            {
                address: order.customer.address,
                items: order.line_items.map((li) => ({
                    title: li.metadata.title,
                    variant_label: li.metadata.variant_label,
                    quantity: li.quantity,
                    price: li.metadata.price,
                })),
                shippingMethod: order.shipping_method,
                totalPrice: order.total_price,
                currency: order.currency || "USD",
            }
        );
        res.status(201).json({
            success: true,
            orderId: newOrder.id,
            printifyOrderId: printifyResponse.id,
        });
        return;
    } catch (err: any) {
        console.error("Error processing order:", err);
        res.status(500).json({ error: PRINTIFY_ERRORS.FAILED_PROCESS_ORDER });
        return;
    }
};

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
 * Gets the status and details of a Printify order for a customer.
 *
 * @route POST /printify/order-status
 * @param {Request} req - Express request object, expects orderId and email in body
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return type; see note)
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const getOrderStatus = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const { orderId, email } = req.body;
    try {
        const order = await orderService.getOrderByCustomer(
            orderId as string,
            email as string
        );
        if (!order) {
            res.status(404).json({ error: PRINTIFY_ERRORS.ORDER_NOT_FOUND });
            return;
        }

        const printifyOrder = await printifyService.getOrder(
            order.store_id,
            order.printify_order_id
        );

        res.json({
            success: true,
            order_status: printifyOrder.status || "unknown",
            tracking_number: printifyOrder.shipments?.[0]?.number || null,
            tracking_url: printifyOrder.shipments?.[0]?.url || null,
            total_price: order.total_price, // DB value (customer's total price)
            total_shipping: order.shipping_cost, // DB value (customer's shipping cost)
            currency: order.currency,
            created_at: printifyOrder.created_at ?? new Date().toISOString(),

            // Customer shipping details
            customer: {
                first_name: printifyOrder.address_to?.first_name || "",
                last_name: printifyOrder.address_to?.last_name || "",
                phone: printifyOrder.address_to?.phone || "",
                country: printifyOrder.address_to?.country || "",
                region: printifyOrder.address_to?.region || "",
                city: printifyOrder.address_to?.city || "",
                address1: printifyOrder.address_to?.address1 || "",
                address2: printifyOrder.address_to?.address2 || "",
                zip: printifyOrder.address_to?.zip || "",
            },

            // Ordered items
            items: printifyOrder.line_items.map((item) => ({
                product_id: item.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                print_provider_id: item.print_provider_id,
                price: item.metadata.price, // Price customer paid
                shipping_cost: item.shipping_cost || 0,
                status: item.status,
                title: item.metadata.title,
                variant_label: item.metadata.variant_label,
                sku: item.metadata.sku,
                country: item.metadata.country || "Unknown",
                sent_to_production_at: item.sent_to_production_at || null,
                fulfilled_at: item.fulfilled_at || null,
            })),

            // Order metadata
            metadata: {
                order_type: printifyOrder.metadata?.order_type || "N/A",
                shop_order_id: printifyOrder.metadata?.shop_order_id || "N/A",
                shop_order_label:
                    printifyOrder.metadata?.shop_order_label || "N/A",
                shop_fulfilled_at:
                    printifyOrder.metadata?.shop_fulfilled_at || null,
            },

            // Shipping details
            shipping_method: printifyOrder.shipping_method,
            is_printify_express: printifyOrder.is_printify_express || false,
            is_economy_shipping: printifyOrder.is_economy_shipping || false,

            // Tracking info
            shipments:
                printifyOrder.shipments?.map((shipment) => ({
                    carrier: shipment.carrier,
                    tracking_number: shipment.number,
                    tracking_url: shipment.url,
                    delivered_at: shipment.delivered_at || null,
                })) || [],

            // Printify Connect (if applicable)
            printify_connect: printifyOrder.printify_connect || null,
        });
        return;
    } catch (err: any) {
        console.error("Error fetching order status:", err);
        res.status(500).json({ error: PRINTIFY_ERRORS.FAILED_ORDER_STATUS });
        return;
    }
};

export const validateGetOrderStatus = [
    body("orderId")
        .notEmpty()
        .withMessage(PRINTIFY_ERRORS.MISSING_ORDER_STATUS_FIELDS),
    body("email")
        .notEmpty()
        .withMessage(PRINTIFY_ERRORS.MISSING_ORDER_STATUS_FIELDS),
];
