export interface PrintifyOrderRequest {
    /** The items in the order. */
    line_items: PrintifyLineItem[];
    /** The customer placing the order. */
    customer: PrintifyCustomer;
    /** The total price of the order. */
    total_price: number;
    /** The currency code (e.g., 'USD'). */
    currency: string;
    /** The shipping method ID. */
    shipping_method: number;
    /** The shipping cost. */
    shipping_cost: number;
}

export interface PrintifyLineItemMetadata {
    /** Product title. */
    title: string;
    /** Price customer paid per item. */
    price: number;
    /** Variant name, e.g., "Solid Red / M". */
    variant_label: string;
    /** SKU. */
    sku: string;
    /** Shipping destination. */
    country?: string;
}

export interface PrintifyLineItem {
    /** Product ID. */
    product_id: string;
    /** Variant ID. */
    variant_id: number;
    /** Quantity ordered. */
    quantity: number;
    /** Print provider ID. */
    print_provider_id?: number;
    /** Cost you (merchant) paid for this item. */
    cost: number;
    /** Shipping cost per item. */
    shipping_cost?: number;
    /** Status (e.g., "fulfilled", "in-production"). */
    status: string;
    /** Metadata for the line item. */
    metadata: PrintifyLineItemMetadata;
    /** Timestamp when sent to production. */
    sent_to_production_at?: string;
    /** Timestamp when fulfilled. */
    fulfilled_at?: string;
}

export interface PrintifyCustomer {
    /** Customer email address. */
    email: string;
    /** Customer shipping address. */
    address: PrintifyCustomerAddress;
}

export interface PrintifyCustomerAddress {
    /** First name. */
    first_name: string;
    /** Last name. */
    last_name: string;
    /** Phone number. */
    phone?: string;
    /** Country. */
    country: string;
    /** Region or state. */
    region: string;
    /** City. */
    city: string;
    /** Address line 1. */
    address1: string;
    /** Address line 2. */
    address2?: string;
    /** Postal/ZIP code. */
    zip: string;
}

export interface PrintifyOrderMetadata {
    /** Order type (e.g., "external"). */
    order_type?: string;
    /** Printify's internal shop order ID. */
    shop_order_id?: number;
    /** Label identifier. */
    shop_order_label?: string;
    /** Fulfilled timestamp. */
    shop_fulfilled_at?: string;
}

export interface PrintifyShipment {
    /** Carrier name (e.g., "usps", "fedex"). */
    carrier: string;
    /** Tracking number. */
    number: string;
    /** Tracking URL. */
    url: string;
    /** Timestamp when delivered. */
    delivered_at?: string;
}

export interface PrintifyConnect {
    /** Printify Connect URL. */
    url: string;
    /** Printify Connect ID. */
    id: string;
}

export interface PrintifyOrderResponse {
    /** Printify's unique order ID. */
    id: string;
    /** Internal order ID from another system (if applicable). */
    app_order_id?: string;
    /** Possible values: "pending", "processed", "canceled", etc. */
    status: string;
    /** ISO timestamp. */
    created_at: string;
    /** ISO timestamp (when sent to production). */
    sent_to_production_at?: string;
    /** ISO timestamp (when fulfilled). */
    fulfilled_at?: string;

    /** The total price customer paid. */
    total_price: number;
    /** Shipping cost. */
    total_shipping: number;
    /** Tax applied. */
    total_tax?: number;
    /** Currency code (e.g., "USD", "EUR"). */
    currency: string;

    /** Printify's shipping method ID. */
    shipping_method: number;
    /** Indicates if Printify Express was used. */
    is_printify_express?: boolean;
    /** Indicates if economy shipping was used. */
    is_economy_shipping?: boolean;

    /** Customer's shipping address. */
    address_to: PrintifyCustomerAddress;

    /** Items in the order. */
    line_items: PrintifyLineItem[];
    /** Extra metadata related to the order. */
    metadata?: PrintifyOrderMetadata;
    /** Shipment tracking details. */
    shipments?: PrintifyShipment[];
    /** Printify Connect info (if applicable). */
    printify_connect?: PrintifyConnect;
}
