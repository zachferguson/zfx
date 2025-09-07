import db from "../db/connection";

/**
 * Represents the data required to create or update an order.
 */
interface OrderData {
    /** The order number. */
    orderNumber: string;
    /** The store identifier. */
    storeId: string;
    /** The customer's email address. */
    email: string;
    /** The total price of the order (in cents). */
    totalPrice: number;
    /** The currency code (e.g., 'USD'). */
    currency: string;
    /** The shipping method ID. */
    shippingMethod: number;
    /** The shipping cost (in cents). */
    shippingCost: number;
    /** The shipping address object. */
    shippingAddress: object;
    /** The items in the order. */
    items: object;
    /** The Stripe payment ID. */
    stripePaymentId: string;
    /** The payment status. */
    paymentStatus: string;
    /** The order status. */
    orderStatus: string;
}

export class OrderService {
    /**
     * Saves a new order to the database.
     * @param {OrderData} order - The order data to save.
     * @returns {Promise<{ id: string }>} The ID of the newly created order.
     * @throws {Error} If the order could not be saved.
     */
    async saveOrder(order: OrderData): Promise<{ id: string }> {
        const query = `
            INSERT INTO orders.printifyorders (
                order_number, store_id, email, total_price, currency, 
                shipping_method, shipping_cost, shipping_address, items, 
                stripe_payment_id, payment_status, order_status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            ) RETURNING id;
        `;
        try {
            return await db.one(query, [
                order.orderNumber,
                order.storeId,
                order.email,
                order.totalPrice,
                order.currency,
                order.shippingMethod,
                order.shippingCost,
                JSON.stringify(order.shippingAddress),
                JSON.stringify(order.items),
                order.stripePaymentId,
                order.paymentStatus,
                order.orderStatus,
            ]);
        } catch (err) {
            console.error("Error saving order:", err);
            throw new Error("Failed to save order.");
        }
    }

    /**
     * Updates the Printify order ID for a given order number.
     * @param {string} orderNumber - The order number to update.
     * @param {string} printifyOrderId - The Printify order ID to set.
     * @returns {Promise<string>} The ID of the updated order.
     * @throws {Error} If the update fails.
     */
    async updatePrintifyOrderId(
        orderNumber: string,
        printifyOrderId: string
    ): Promise<string> {
        const query = `
            UPDATE orders.printifyorders 
            SET printify_order_id = $1 
            WHERE order_number = $2
            RETURNING id;
        `;
        try {
            const { id } = await db.one(query, [printifyOrderId, orderNumber]);
            return id;
        } catch (err) {
            console.error("Error updating Printify order ID:", err);
            throw new Error("Failed to update Printify order ID.");
        }
    }

    /**
     * Retrieves an order by order number and customer email.
     * @param {string} orderId - The order number to look up.
     * @param {string} email - The customer's email address.
     * @returns {Promise<any>} The order data, or null if not found.
     * @throws {Error} If the retrieval fails.
     */
    async getOrderByCustomer(orderId: string, email: string): Promise<any> {
        const query = `
            SELECT store_id, printify_order_id 
            FROM orders.printifyorders 
            WHERE order_number = $1 AND email = $2;
        `;
        try {
            return await db.oneOrNone(query, [orderId, email]);
        } catch (err) {
            console.error("Error retrieving order:", err);
            throw new Error("Failed to retrieve order.");
        }
    }
}
