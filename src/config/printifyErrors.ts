/**
 * Centralized error messages for Printify-related controllers.
 *
 * Used by: `printifyValidators`, `printifyController`
 */

/**
 * Printify error messages keyed by code.
 */
export const PRINTIFY_ERRORS = {
    /** Missing store ID in path or body. */
    MISSING_STORE_ID: "Store ID is required.",
    /** Missing address or line_items for shipping rate request. */
    MISSING_SHIPPING_FIELDS: "Missing required fields.",
    /** Failed to fetch products from Printify. */
    FAILED_FETCH_PRODUCTS: "Failed to fetch products from Printify.",
    /** Failed to retrieve shipping options from Printify. */
    FAILED_SHIPPING_OPTIONS: "Failed to retrieve shipping options.",
    /** Missing storeId, order details, or stripe_payment_id. */
    MISSING_ORDER_FIELDS:
        "Missing storeId, order details, or stripe_payment_id.",
    /** Failed to process order submission. */
    FAILED_PROCESS_ORDER: "Failed to process order.",
    /** Missing orderId or email for order status. */
    MISSING_ORDER_STATUS_FIELDS: "Missing orderId or email.",
    /** Order lookup resulted in no match. */
    ORDER_NOT_FOUND: "Order not found.",
    /** Failed to retrieve order status from Printify. */
    FAILED_ORDER_STATUS: "Failed to retrieve order status.",
};
