/**
 * A single line item used in an order confirmation email.
 */
export type OrderEmailItem = {
    /** Product title. */
    title: string;
    /** Variant label, e.g., "Solid Red / M". */
    variant_label: string;
    /** Quantity purchased. */
    quantity: number;
    /** Price per item in cents. */
    price: number;
};

/**
 * Shipping/billing address details for email templates.
 */
export type OrderEmailAddress = {
    /** First name. */
    first_name: string;
    /** Last name. */
    last_name: string;
    /** Optional phone number. */
    phone?: string;
    /** Country code or name. */
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
};

/**
 * Payload used to compose the order confirmation email.
 */
export type OrderConfirmationPayload = {
    /** Customer address. */
    address: OrderEmailAddress;
    /** Purchased items. */
    items: OrderEmailItem[];
    /** Shipping method code or label. */
    shippingMethod: number | string;
    /** Total price in cents. */
    totalPrice: number;
    /** ISO currency code, e.g., "USD". */
    currency: string;
};

/**
 * Successful email send result.
 */
export type EmailSendSuccess = {
    /** Indicates the send operation succeeded. */
    success: true;
    /** Optional provider-generated message ID for tracking. */
    messageId?: string;
};

/**
 * Failed email send result.
 */
export type EmailSendFailure = {
    /** Indicates the send operation failed. */
    success: false;
    /** Human-readable error description. */
    error: string;
};

/**
 * Result of attempting to send an email.
 */
export type EmailSendResult = EmailSendSuccess | EmailSendFailure;

/**
 * SMTP and template configuration per store.
 */
export type StoreEmailConfig = {
    /** SMTP user. */
    user: string;
    /** SMTP password or app token. */
    pass: string;
    /** Human-readable store name. */
    storeName: string;
    /** Frontend base URL for links. */
    frontendUrl: string;
    /** Optional locale code for formatting. */
    locale?: string;
};

/**
 * Map of store IDs to email configuration.
 */
export type StoreEmailConfigMap = Record<string, StoreEmailConfig>;
