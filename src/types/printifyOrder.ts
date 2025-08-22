export interface PrintifyOrderRequest {
    line_items: PrintifyLineItem[];
    customer: PrintifyCustomer;
    total_price: number;
    currency: string;
    shipping_method: number;
    shipping_cost: number;
}

export interface PrintifyLineItemMetadata {
    title: string; // Product title
    price: number; // Price customer paid per item
    variant_label: string; // Variant name, e.g., "Solid Red / M"
    sku: string; // SKU
    country?: string; // Shipping destination
}

export interface PrintifyLineItem {
    product_id: string;
    variant_id: number;
    quantity: number;
    print_provider_id?: number;
    cost: number; // Cost you (merchant) paid for this item
    shipping_cost?: number; // Shipping cost per item
    status: string; // e.g., "fulfilled", "in-production", etc.
    metadata: PrintifyLineItemMetadata;
    sent_to_production_at?: string; // Timestamp when sent to production
    fulfilled_at?: string; // Timestamp when fulfilled
}

export interface PrintifyCustomer {
    email: string;
    address: PrintifyCustomerAddress;
}

export interface PrintifyCustomerAddress {
    first_name: string;
    last_name: string;
    phone?: string;
    country: string;
    region: string;
    city: string;
    address1: string;
    address2?: string;
    zip: string;
}

export interface PrintifyOrderMetadata {
    order_type?: string; // e.g., "external"
    shop_order_id?: number; // Printify's internal shop order ID
    shop_order_label?: string; // Label identifier
    shop_fulfilled_at?: string; // Fulfilled timestamp
}

export interface PrintifyShipment {
    carrier: string; // Carrier name (e.g., "usps", "fedex")
    number: string; // Tracking number
    url: string; // Tracking URL
    delivered_at?: string; // Timestamp when delivered
}

export interface PrintifyConnect {
    url: string; // Printify Connect URL
    id: string; // Printify Connect ID
}

export interface PrintifyOrderResponse {
    id: string; // Printify's unique order ID
    app_order_id?: string; // Internal order ID from another system (if applicable)
    status: string; // Possible values: "pending", "processed", "canceled", etc.
    created_at: string; // ISO timestamp
    sent_to_production_at?: string; // ISO timestamp (when sent to production)
    fulfilled_at?: string; // ISO timestamp (when fulfilled)

    total_price: number; // The total price customer paid
    total_shipping: number; // Shipping cost
    total_tax?: number; // Tax applied
    currency: string; // "USD", "EUR", etc.

    shipping_method: number; // Printify's shipping method ID
    is_printify_express?: boolean; // Indicates if Printify Express was used
    is_economy_shipping?: boolean; // Indicates if economy shipping was used

    address_to: PrintifyCustomerAddress; // Customer's shipping address

    line_items: PrintifyLineItem[]; // Items in the order
    metadata?: PrintifyOrderMetadata; // Extra metadata related to the order
    shipments?: PrintifyShipment[]; // Shipment tracking details
    printify_connect?: PrintifyConnect; // Printify Connect info (if applicable)
}
