import { Request, Response } from "express";
import { PrintifyService } from "../services/printifyService";
import { ShippingRatesRequestBody } from "../types/printifyShipping";
import { PrintifyOrderRequest } from "../types/printifyOrder";
import { OrderService } from "../services/orderService";
import { sendOrderConfirmation } from "../services/emailService";

const printifyService = new PrintifyService(process.env.PRINTIFY_API_KEY || "");
const orderService = new OrderService();

export const getProducts = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    // id is the store id for printify
    if (!id) {
        res.status(400).json({ error: "Store ID is required." });
        return;
    }

    try {
        const products = await printifyService.getProducts(id);
        res.status(200).json(products);
        return;
    } catch (err: any) {
        console.error("Error in printifyController.getProducts", err);
        res.status(500).json({
            error: "Failed to fetch products from Printify",
        });
        return;
    }
};

export const getShippingOptions = async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestBody: ShippingRatesRequestBody = req.body;

    if (!id || !requestBody.address_to || !requestBody.line_items?.length) {
        res.status(400).json({ error: "Missing required fields." });
        return;
    }

    try {
        const shippingOptions = await printifyService.getShippingRates(
            id,
            requestBody
        );
        res.status(200).json(shippingOptions);
        return;
    } catch (err: any) {
        console.error("Error fetching shipping rates:", err);
        res.status(500).json({ error: "Failed to retrieve shipping options." });
        return;
    }
};

export const submitOrder = async (req: Request, res: Response) => {
    const {
        storeId,
        order,
        stripe_payment_id,
    }: {
        storeId: string;
        order: PrintifyOrderRequest;
        stripe_payment_id: string;
    } = req.body;

    if (!storeId || !order || !stripe_payment_id) {
        res.status(400).json({
            error: "Missing storeId, order details, or stripe_payment_id.",
        });
        return;
    }

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

        console.log("✅ Order saved in DB:", newOrder);

        // submit order to printify
        const printifyResponse = await printifyService.submitOrder(
            storeId,
            order_number,
            order
        );
        console.log("✅ Order submitted to Printify:", printifyResponse);

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
                    // metadata.price = price the customer paid (your interface comment says so)
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
        res.status(500).json({ error: "Failed to process order." });
        return;
    }
};

export const getOrderStatus = async (req: Request, res: Response) => {
    const { orderId, email } = req.body;

    if (!orderId || !email) {
        res.status(400).json({ error: "Missing orderId or email." });
        return;
    }

    try {
        const order = await orderService.getOrderByCustomer(
            orderId as string,
            email as string
        );
        if (!order) {
            res.status(404).json({ error: "Order not found." });
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
                //email: printifyOrder.address_to?.email || email, // Default to provided email
                phone: printifyOrder.address_to?.phone || "",
                country: printifyOrder.address_to?.country || "",
                region: printifyOrder.address_to?.region || "",
                city: printifyOrder.address_to?.city || "",
                address1: printifyOrder.address_to?.address1 || "",
                address2: printifyOrder.address_to?.address2 || "",
                zip: printifyOrder.address_to?.zip || "",
                //company: printifyOrder.address_to?.company || null,
            },

            // Ordered items
            items: printifyOrder.line_items.map((item) => ({
                product_id: item.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                print_provider_id: item.print_provider_id,
                //cost: item.cost, // Merchant cost
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
        res.status(500).json({ error: "Failed to retrieve order status." });
        return;
    }
};
