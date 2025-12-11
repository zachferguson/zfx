/**
 * Represents a single item in a Printify shipping rate request.
 *
 * Used by: ShippingRatesRequestBody, printifyService, printifyRoutes
 */
export interface LineItem {
    /** Product ID. */
    product_id: string;
    /** Variant ID. */
    variant_id: number;
    /** Quantity being shipped. */
    quantity: number;
}

/**
 * Request body for Printify shipping rates API.
 *
 * Used by: printifyService (getShippingRates), printifyRoutes, printifyService.unit.test.ts
 */
export interface ShippingRatesRequestBody {
    /** Destination address for shipping calculation. */
    address_to: {
        /** Address payload used by Printify shipping calculation. */
        address_to: AddressTo;
    };
    /** Items to calculate shipping rates for. */
    line_items: LineItem[];
}

/**
 * Destination address for shipping calculation.
 */
export type AddressTo = {
    /** First name. */
    first_name: string;
    /** Last name. */
    last_name: string;
    /** Email address. */
    email: string;
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

// Shipping codes we currently support (use a string-literal union for safety)
/**
 * Supported shipping method codes.
 */
export type ShippingCode = "economy" | "standard" | "express" | "priority";

// Canonical shape your service returns
/**
 * Canonical shipping method shape returned by the service.
 */
export interface ShippingMethod {
    /** Shipping method code. */
    code: ShippingCode;
    /** Price in cents (integer). */
    price: number;
}

// Convenience alias for arrays of shipping methods
/**
 * Convenience alias for arrays of shipping methods.
 */
export type ShippingRates = ShippingMethod[];
