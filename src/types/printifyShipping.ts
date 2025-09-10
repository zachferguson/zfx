/**
 * Represents a single item in a Printify shipping rate request.
 *
 * Used by: ShippingRatesRequestBody, printifyService, printifyRoutes
 */
export interface LineItem {
    product_id: string;
    variant_id: number;
    quantity: number;
}

/**
 * Request body for Printify shipping rates API.
 *
 * Used by: printifyService (getShippingRates), printifyRoutes, printifyService.unit.test.ts
 */
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

// Shipping codes we currently support (use a string-literal union for safety)
export type ShippingCode = "economy" | "standard" | "express" | "priority";

// Canonical shape your service returns
export interface ShippingMethod {
    code: ShippingCode;
    /** Price in cents (integer). */
    price: number;
}

// Convenience alias for arrays of shipping methods
export type ShippingRates = ShippingMethod[];
