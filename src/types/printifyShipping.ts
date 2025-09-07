export interface LineItem {
    product_id: string;
    variant_id: number;
    quantity: number;
}

export interface ShippingRatesRequestBody {
    address_to: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        country: string;
        region: string;
        city: string;
        address1: string;
        address2?: string;
        zip: string;
    };
    line_items: LineItem[];
}

export interface ShippingOption {
    id: string;
    name: string;
    price: number; // Price in cents (e.g., 499 = $4.99)
    countries: string[];
}

export interface ShippingResponse {
    standard?: ShippingOption[];
    express?: ShippingOption[];
}
