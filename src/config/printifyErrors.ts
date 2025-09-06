// Centralized error messages for Printify-related controllers

export const PRINTIFY_ERRORS = {
    MISSING_STORE_ID: "Store ID is required.",
    MISSING_SHIPPING_FIELDS: "Missing required fields.",
    FAILED_FETCH_PRODUCTS: "Failed to fetch products from Printify.",
    FAILED_SHIPPING_OPTIONS: "Failed to retrieve shipping options.",
    MISSING_ORDER_FIELDS:
        "Missing storeId, order details, or stripe_payment_id.",
    FAILED_PROCESS_ORDER: "Failed to process order.",
    MISSING_ORDER_STATUS_FIELDS: "Missing orderId or email.",
    ORDER_NOT_FOUND: "Order not found.",
    FAILED_ORDER_STATUS: "Failed to retrieve order status.",
};
