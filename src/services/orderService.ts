import db from "../db/connection";

interface OrderData {
    orderNumber: string;
    storeId: string;
    email: string;
    totalPrice: number;
    currency: string;
    shippingMethod: number;
    shippingCost: number;
    shippingAddress: object;
    items: object;
    stripePaymentId: string;
    paymentStatus: string;
    orderStatus: string;
}

export class OrderService {
    async saveOrder(order: OrderData): Promise<{ id: string }> {
        // ✅ Return object
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

    async updatePrintifyOrderId(orderNumber: string, printifyOrderId: string) {
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

    async getOrderByCustomer(orderId: string, email: string) {
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
