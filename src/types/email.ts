export type OrderEmailItem = {
    title: string;
    variant_label: string;
    quantity: number;
    price: number; // cents per item
};

export type OrderEmailAddress = {
    first_name: string;
    last_name: string;
    phone?: string;
    country: string;
    region: string;
    city: string;
    address1: string;
    address2?: string;
    zip: string;
};

export type OrderConfirmationPayload = {
    address: OrderEmailAddress;
    items: OrderEmailItem[];
    shippingMethod: number | string; // allow strings if you ever pass labels
    totalPrice: number; // cents
    currency: string; // e.g., "USD"
};

export type EmailSendResult =
    | { success: true; messageId?: string }
    | { success: false; error: string };

export type StoreEmailConfig = {
    user: string;
    pass: string;
    storeName: string;
    frontendUrl: string;
    locale?: string; // optional: for currency formatting
};

export type StoreEmailConfigMap = Record<string, StoreEmailConfig>;
