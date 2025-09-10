import axios from "axios";
import {
    ShippingRatesRequestBody,
    ShippingRates,
    // ShippingMethod, ShippingCode, // not strictly needed here, but available if you want
} from "../types/printifyShipping";
import type {
    PrintifyOrderRequest,
    PrintifyOrderResponse,
} from "../types/printifyOrder";

const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

// raw printify shipping responsetype file-local
type PrintifyShippingResponseRaw = {
    standard?: number;
    express?: number; // old express → priority
    priority?: number; // new name may already appear
    printify_express?: number; // transitional express
    economy?: number;
};

/**
 * Normalize the raw Printify shipping response to your canonical array:
 * - Dedupe collisions using "cheapest wins" (safer for customers).
 * - Stable display order when prices tie: economy → standard → express → priority.
 */
function normalizeShipping(raw: PrintifyShippingResponseRaw): ShippingRates {
    const best: Partial<
        Record<"economy" | "standard" | "express" | "priority", number>
    > = {};

    const setMin = (key: keyof typeof best, price?: number) => {
        if (typeof price !== "number") return;
        best[key] = best[key] == null ? price : Math.min(best[key]!, price);
    };

    setMin("standard", raw.standard);
    setMin("express", raw.printify_express); // transitional express
    setMin("priority", raw.express); // old express maps to priority
    setMin("priority", raw.priority); // new priority (if present)
    setMin("economy", raw.economy);

    const ORDER = ["economy", "standard", "express", "priority"] as const;

    // Convert to array, sort by price asc, then by canonical order for ties
    return (
        ORDER.flatMap((code) =>
            best[code] != null ? [{ code, price: best[code]! }] : []
        ) as ShippingRates
    ).sort(
        (a, b) =>
            a.price - b.price ||
            ORDER.indexOf(a.code as any) - ORDER.indexOf(b.code as any)
    );
}

/**
 * Service for interacting with the Printify API.
 */
export class PrintifyService {
    private apiKey: string;

    /**
     * Creates a new PrintifyService instance.
     * @param {string} apiKey - The Printify API key.
     */
    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Retrieves all products for a given store from Printify.
     * @param {string} storeId - The Printify store ID.
     * @returns {Promise<any>} The products data.
     * @throws {Error} If the request fails.
     */
    async getProducts(storeId: string): Promise<any> {
        try {
            const response = await axios.get(
                `${PRINTIFY_BASE_URL}/shops/${storeId}/products.json`,
                {
                    headers: { Authorization: `Bearer ${this.apiKey}` },
                }
            );
            return response.data;
        } catch (err: any) {
            console.error(
                "Error fetching products from Printify:",
                err?.response?.data || err.message
            );
            throw new Error(
                `Failed to fetch products from Printify: ${
                    err?.response?.data?.message || "Unknown error"
                }`
            );
        }
    }

    /**
     * Retrieves shipping rates for an order from Printify.
     * @param {string} storeId - The Printify store ID.
     * @param {ShippingRatesRequestBody} requestBody - The shipping rates request body.
     * @returns {Promise<ShippingRates>} An array of shipping methods with their codes and prices (in cents), sorted ascending by price.
     * @throws {Error} If the request fails.
     */
    async getShippingRates(
        storeId: string,
        requestBody: ShippingRatesRequestBody
    ): Promise<ShippingRates> {
        try {
            const { data } = await axios.post<PrintifyShippingResponseRaw>(
                `${PRINTIFY_BASE_URL}/shops/${storeId}/orders/shipping.json`,
                requestBody,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            return normalizeShipping(data);
        } catch (err: any) {
            if (axios.isAxiosError(err)) {
                console.error("Error fetching shipping from Printify:", {
                    status: err.response?.status,
                    data: err.response?.data,
                });
            } else {
                console.error("Error fetching shipping from Printify:", err);
            }
            throw new Error("Failed to fetch shipping options from Printify.");
        }
    }

    /**
     * Sends an order to production in Printify.
     * @param {string} storeId - The Printify store ID.
     * @param {string} orderId - The Printify order ID.
     * @returns {Promise<void>} Resolves when the order is sent to production.
     * @throws {Error} If the request fails.
     */
    async sendOrderToProduction(
        storeId: string,
        orderId: string
    ): Promise<void> {
        try {
            const response = await axios.post(
                `${PRINTIFY_BASE_URL}/shops/${storeId}/orders/${orderId}/send_to_production.json`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            console.log("Order sent to production:", response.data);
        } catch (err: any) {
            console.error(
                "Error sending order to production:",
                err?.response?.data || err.message
            );
            throw new Error(
                `Failed to send order to production: ${
                    err?.response?.data?.message || "Unknown error"
                }`
            );
        }
    }

    async submitOrder(
        storeId: string,
        orderNumber: string,
        orderData: PrintifyOrderRequest
    ): Promise<PrintifyOrderResponse> {
        try {
            const formattedOrderData = {
                external_id: orderNumber,
                line_items: orderData.line_items,
                total_price: orderData.total_price,
                currency: orderData.currency,
                shipping_method: orderData.shipping_method,
                shipping_cost: orderData.shipping_cost,
                send_shipping_notification: false,
                address_to: {
                    first_name: orderData.customer.address.first_name,
                    last_name: orderData.customer.address.last_name,
                    email: orderData.customer.email,
                    phone: orderData.customer.address.phone || "000-000-0000",
                    country: orderData.customer.address.country,
                    region: orderData.customer.address.region || "",
                    city: orderData.customer.address.city,
                    address1: orderData.customer.address.address1,
                    address2: orderData.customer.address.address2 || "",
                    zip: orderData.customer.address.zip,
                },
            };

            console.log("Sending formatted order:", formattedOrderData);

            const response = await axios.post<PrintifyOrderResponse>(
                `${PRINTIFY_BASE_URL}/shops/${storeId}/orders.json`,
                formattedOrderData,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            console.log(
                "Order successfully submitted to Printify:",
                response.data
            );
            return response.data;
        } catch (err: any) {
            console.error(
                "Error submitting order to Printify:",
                err?.response?.data || err.message
            );
            throw new Error(
                `Failed to submit order to Printify: ${
                    err?.response?.data?.message || "Unknown error"
                }`
            );
        }
    }

    async getOrder(storeId: string, printifyOrderId: string) {
        try {
            const response = await axios.get<PrintifyOrderResponse>(
                `${PRINTIFY_BASE_URL}/shops/${storeId}/orders/${printifyOrderId}.json`,
                {
                    headers: { Authorization: `Bearer ${this.apiKey}` },
                }
            );
            return response.data;
        } catch (err: any) {
            console.error("Error fetching order from Printify:", err);
            throw new Error("Failed to fetch order details.");
        }
    }
}
