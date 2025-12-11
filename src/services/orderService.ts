import type { IDatabase, ITask } from "pg-promise";
import type { OrderLookup, OrderData } from "../types/order";

// A connection can be the app-wide db or a transaction/task context
/**
 * pg-promise database or transactional context.
 */
export type DbOrTx = IDatabase<unknown> | ITask<unknown>;

/**
 * Result shape when creating a new order.
 */
export type SaveOrderResult = {
    /** Newly created order record ID. */
    id: string;
};

/**
 * Contract for saving and retrieving orders.
 */
export interface IOrderService {
    /**
     * Saves a new order.
     *
     * @param {OrderData} order - Order payload to persist.
     * @param {DbOrTx} [cn] - Optional pg-promise context.
     * @returns {Promise<{ id: string }>} Newly created order ID.
     */
    saveOrder(order: OrderData, cn?: DbOrTx): Promise<SaveOrderResult>;
    /** Updates Printify order id for an existing order. */
    updatePrintifyOrderId(
        orderNumber: string,
        printifyOrderId: string,
        cn?: DbOrTx
    ): Promise<string>;
    /** Retrieves order data by order number and customer email. */
    getOrderByCustomer(
        orderId: string,
        email: string,
        cn?: DbOrTx
    ): Promise<OrderLookup | null>;
}

/**
 * PostgreSQL-backed implementation of `IOrderService`.
 */
export class PgOrderService implements IOrderService {
    /**
     * PostgreSQL-backed order service.
     *
     * @param {IDatabase<unknown>} db - pg-promise database instance.
     */
    constructor(private readonly db: IDatabase<unknown>) {}

    /**
     * Saves a new order to the database.
     *
     * @param {OrderData} order - Order payload to persist.
     * @param {DbOrTx} [cn] - Optional pg-promise context.
     * @returns {Promise<{ id: string }>} Newly created order ID.
     */
    async saveOrder(order: OrderData, cn?: DbOrTx): Promise<SaveOrderResult> {
        const q = `
      INSERT INTO orders.printifyorders (
        order_number, store_id, email, total_price, currency,
        shipping_method, shipping_cost, shipping_address, items,
        stripe_payment_id, payment_status, order_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING id;
    `;
        try {
            const db = cn ?? this.db;
            return await db.one<SaveOrderResult>(q, [
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

            console.error("Error saving order:", err);
            throw new Error("Failed to save order.");
        }
    }

    /**
     * Updates the Printify order ID for a given order number.
     *
     * @param {string} orderNumber - Order number to update.
     * @param {string} printifyOrderId - Printify order ID to set.
     * @param {DbOrTx} [cn] - Optional pg-promise context.
     * @returns {Promise<string>} Updated order ID.
     */
    async updatePrintifyOrderId(
        orderNumber: string,
        printifyOrderId: string,
        cn?: DbOrTx
    ): Promise<string> {
        const q = `
      UPDATE orders.printifyorders
      SET printify_order_id = $1
      WHERE order_number = $2
      RETURNING id;
    `;
        try {
            const db = cn ?? this.db;
            const rec = await db.one<{ id: string }>(q, [
                printifyOrderId,
                orderNumber,
            ]);
            return rec.id;
        } catch (err) {
            console.error("Error updating Printify order ID:", err);
            throw new Error("Failed to update Printify order ID.");
        }
    }

    /**
     * Retrieves an order by order number and customer email.
     *
     * @param {string} orderId - Order number to look up.
     * @param {string} email - Customer email.
     * @param {DbOrTx} [cn] - Optional pg-promise context.
     * @returns {Promise<OrderLookup | null>} Curated order subset or `null` if not found.
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
            const db = cn ?? this.db;
            return await db.oneOrNone<OrderLookup>(q, [orderId, email]);
        } catch (err) {
            console.error("Error retrieving order:", err);
            throw new Error("Failed to retrieve order.");
        }
    }
}
