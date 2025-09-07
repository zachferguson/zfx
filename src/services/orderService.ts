import db from "../db/connection";
import type { IDatabase, ITask } from "pg-promise";
import { OrderLookup, OrderData } from "../types/order";

// Any pg-promise connection-like object: the global db or a tx/task context.
type DbOrTx = IDatabase<unknown> | ITask<unknown>;
const useDb = (t?: DbOrTx) => t ?? db;

export class OrderService {
    /**
     * Saves a new order to the database.
     * Optionally runs inside a provided transaction/task context.
     *
     * @param order The order data to save.
     * @param cn Optional tx/db context (pg-promise task/tx). Defaults to shared db.
     * @returns The ID of the newly created order.
     */
    async saveOrder(order: OrderData, cn?: DbOrTx): Promise<{ id: string }> {
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
            return await useDb(cn).one(query, [
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
            // Keep logging minimal in services; tests can assert thrown errors.
            // eslint-disable-next-line no-console
            console.error("Error saving order:", err);
            throw new Error("Failed to save order.");
        }
    }

    /**
     * Updates the Printify order ID for a given order number.
     * Optionally runs inside a provided transaction/task context.
     *
     * @param orderNumber The order number to update.
     * @param printifyOrderId The Printify order ID to set.
     * @param cn Optional tx/db context (pg-promise task/tx). Defaults to shared db.
     * @returns The ID of the updated order.
     */
    async updatePrintifyOrderId(
        orderNumber: string,
        printifyOrderId: string,
        cn?: DbOrTx
    ): Promise<string> {
        const query = `
      UPDATE orders.printifyorders
      SET printify_order_id = $1
      WHERE order_number = $2
      RETURNING id;
    `;

        try {
            const { id } = await useDb(cn).one(query, [
                printifyOrderId,
                orderNumber,
            ]);
            return id;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Error updating Printify order ID:", err);
            throw new Error("Failed to update Printify order ID.");
        }
    }

    /**
     * Retrieves an order by order number and customer email.
     * Optionally runs inside a provided transaction/task context.
     *
     * @param orderId The order number to look up.
     * @param email The customer's email address.
     * @param cn Optional tx/db context (pg-promise task/tx). Defaults to shared db.
     * @returns curated order row (subset) data as OrderLookup or null if not found.
     */
    async getOrderByCustomer(
        orderId: string,
        email: string,
        cn?: DbOrTx
    ): Promise<OrderLookup | null> {
        const q = `
            SELECT store_id, printify_order_id, total_price, shipping_cost, currency
            FROM orders.printifyorders
            WHERE order_number = $1 AND email = $2
        `;
        try {
            return await useDb(cn).oneOrNone<OrderLookup>(q, [orderId, email]);
        } catch (err) {
            console.error("Error retrieving order:", err);
            throw new Error("Failed to retrieve order.");
        }
    }
}
