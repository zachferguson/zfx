export interface OrderLookup {
    /** The store identifier. */
    store_id: string;
    /** The Printify order ID, or null if not set. */
    printify_order_id: string | null;
    /** The total price of the order (in cents). */
    total_price: number;
    /** The shipping cost (in cents). */
    shipping_cost: number;
    /** The currency code (e.g., 'USD'). */
    currency: string;
}

/**
 * Represents the data required to create or update an order.
 */
export interface OrderData {
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
