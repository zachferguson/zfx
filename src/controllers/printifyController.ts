import { Request, Response } from "express";
import { PRINTIFY_ERRORS } from "../config/printifyErrors";
import { validationResult, type ValidationError } from "express-validator";
import type { IPrintifyService } from "../services/printifyService";
import type { IOrderService } from "../services/orderService";
import type { IEmailService } from "../services/emailService";
import { ShippingRatesRequestBody } from "../types/printifyShipping";
import { PrintifyOrderRequest } from "../types/printifyOrder";
import crypto from "node:crypto";
import type { ParamsDictionary } from "express-serve-static-core";

type SubmitOrderBody = {
    storeId: string;
    order: PrintifyOrderRequest;
    stripe_payment_id: string;
};

type GetOrderStatusBody = {
    orderId: string;
    email: string;
};

export type PrintifyController = ReturnType<typeof createPrintifyController>;
export const createPrintifyController = (
    printifyService: IPrintifyService,
    orderService: IOrderService,
    emailService: IEmailService
) => {
    return {
        /**
         * Gets all Printify products for a given store.
         *
         * @route GET /printify/:id/products
         * @param {Request} req - Express request (expects store id in params)
         * @param {Response} res - Express response
         * @returns Sends response via res object.
         * @note On success: 200 with products. On error: 400 (validation) or 500 (server error).
         */
        getProducts: async (req: Request<{ id: string }>, res: Response) => {
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
                const { id: storeId } = req.params;
                if (!storeId) {
                    res.status(400).json({
                        error: "Missing store id in request parameters.",
                    });
                    return;
                }
                const products = await printifyService.getProducts(storeId);
                res.status(200).json(products);
                return;
            } catch (err) {
                console.error("Error in printifyController.getProducts", err);
                res.status(500).json({
                    error: PRINTIFY_ERRORS.FAILED_FETCH_PRODUCTS,
                });
                return;
            }
        },

        /**
         * Gets Printify shipping options for a given store and order details.
         *
         * @route POST /printify/:id/shipping-options
         * @param {Request} req - Express request (store id in params, ShippingRatesRequestBody in body)
         * @param {Response} res - Express response
         * @returns Sends response via res object.
         * @note On success: 200 with options. On error: 400 (validation) or 500 (server error).
         */
        getShippingOptions: async (
            req: Request<{ id: string }, unknown, ShippingRatesRequestBody>,
            res: Response
        ) => {
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
                const body = req.body;
                const { id: storeId } = req.params;
                if (!storeId) {
                    res.status(400).json({
                        error: "Missing store id in request parameters.",
                    });
                    return;
                }
                const options = await printifyService.getShippingRates(
                    storeId,
                    body
                );
                res.status(200).json(options);
                return;
            } catch (err) {
                console.error("Error fetching shipping rates:", err);
                res.status(500).json({
                    error: PRINTIFY_ERRORS.FAILED_SHIPPING_OPTIONS,
                });
                return;
            }
        },

        /**
         * Submits a new order to Printify and saves it in the database.
         *
         * @route POST /printify/submit-order
         * @param {Request} req - Express request (expects storeId, order, stripe_payment_id in body)
         * @param {Response} res - Express response
         * @returns Sends response via res object.
         * @note Common TS convention for Express handlers is to omit explicit return types.
         */
        submitOrder: async (
            req: Request<ParamsDictionary, unknown, SubmitOrderBody>,
            res: Response
        ) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    errors: errors
                        .array()
                        .map((e: ValidationError) => String(e.msg)),
                });
                return;
            }

            const { storeId, order, stripe_payment_id } = req.body;

            try {
                const order_number = crypto.randomUUID();

                const newOrder = await orderService.saveOrder({
                    orderNumber: order_number,
                    storeId,
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

                const emailResult = await emailService.sendOrderConfirmation({
                    storeId,
                    to: order.customer.email,
                    orderNumber: order_number,
                    payload: {
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
                    },
                });
                if (!emailResult.success) {
                    console.error("Order email failed:", emailResult.error);
                    // don’t throw; the order itself succeeded
                }

                res.status(201).json({
                    success: true,
                    orderId: newOrder.id,
                    printifyOrderId: printifyResponse.id,
                });
                return;
            } catch (err: unknown) {
                console.error("Error processing order:", err);
                res.status(500).json({
                    error: PRINTIFY_ERRORS.FAILED_PROCESS_ORDER,
                });
                return;
            }
        },

        /**
         * Gets the status and details of a Printify order for a customer.
         *
         * @route POST /printify/order-status
         * @param {Request} req - Express request (expects orderId and email in body)
         * @param {Response} res - Express response
         * @returns Sends response via res object.
         */
        getOrderStatus: async (
            req: Request<ParamsDictionary, unknown, GetOrderStatusBody>,
            res: Response
        ) => {
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
                const { orderId, email } = req.body;
                const order = await orderService.getOrderByCustomer(
                    orderId,
                    email
                );

                if (!order) {
                    res.status(404).json({
                        error: PRINTIFY_ERRORS.ORDER_NOT_FOUND,
                    });
                    return;
                }
                if (!order.printify_order_id) {
                    res.status(422).json({
                        error: PRINTIFY_ERRORS.ORDER_NOT_FOUND,
                    });
                    return;
                }

                const printifyOrder = await printifyService.getOrder(
                    order.store_id,
                    order.printify_order_id
                );

                res.status(200).json({
                    success: true,
                    order_status: printifyOrder.status || "unknown",
                    tracking_number:
                        printifyOrder.shipments?.[0]?.number || null,
                    tracking_url: printifyOrder.shipments?.[0]?.url || null,
                    total_price: order.total_price, // DB value (customer's total price)
                    total_shipping: order.shipping_cost, // DB value (customer's shipping cost)
                    currency: order.currency,
                    created_at:
                        printifyOrder.created_at ?? new Date().toISOString(),

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
                        price: item.metadata.price,
                        shipping_cost: item.shipping_cost ?? 0,
                        status: item.status,
                        title: item.metadata.title,
                        variant_label: item.metadata.variant_label,
                        sku: item.metadata.sku,
                        country: item.metadata.country ?? "Unknown",
                        sent_to_production_at:
                            item.sent_to_production_at ?? null,
                        fulfilled_at: item.fulfilled_at ?? null,
                    })),

                    // Order metadata
                    metadata: {
                        order_type: printifyOrder.metadata?.order_type || "N/A",
                        shop_order_id:
                            printifyOrder.metadata?.shop_order_id || "N/A",
                        shop_order_label:
                            printifyOrder.metadata?.shop_order_label || "N/A",
                        shop_fulfilled_at:
                            printifyOrder.metadata?.shop_fulfilled_at || null,
                    },

                    // Shipping details
                    shipping_method: printifyOrder.shipping_method,
                    is_printify_express:
                        printifyOrder.is_printify_express || false,
                    is_economy_shipping:
                        printifyOrder.is_economy_shipping || false,

                    // Tracking info
                    shipments:
                        printifyOrder.shipments?.map((shipment) => ({
                            carrier: shipment.carrier,
                            tracking_number: shipment.number,
                            tracking_url: shipment.url,
                            delivered_at: shipment.delivered_at ?? null,
                        })) ?? [],

                    // Printify Connect (if applicable)
                    printify_connect: printifyOrder.printify_connect || null,
                });
                return;
            } catch (err) {
                console.error("Error fetching order status:", err);
                res.status(500).json({
                    error: PRINTIFY_ERRORS.FAILED_ORDER_STATUS,
                });
                return;
            }
        },
    };
};
