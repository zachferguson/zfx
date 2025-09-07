import axios from "axios";
import {
    ShippingRatesRequestBody,
    ShippingResponse,
} from "../types/printifyShipping";
import type {
    PrintifyOrderRequest,
    PrintifyOrderResponse,
} from "../types/printifyOrder";

const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

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
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                    },
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
                    err.response?.data?.message || "Unknown error"
                }`
            );
        }
    }

    /**
     * Retrieves shipping rates for an order from Printify.
     * @param {string} storeId - The Printify store ID.
     * @param {ShippingRatesRequestBody} requestBody - The shipping rates request body.
     * @returns {Promise<ShippingResponse>} The shipping rates response.
     * @throws {Error} If the request fails.
     */
    async getShippingRates(
        storeId: string,
        requestBody: ShippingRatesRequestBody
    ): Promise<ShippingResponse> {
        try {
            const response = await axios.post<ShippingResponse>(
                `${PRINTIFY_BASE_URL}/shops/${storeId}/orders/shipping.json`,
                requestBody,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (typeof response.data.standard === "number") {
                response.data.standard = [
                    {
                        id: response.data.standard,
                        name: "Standard Shipping",
                        price: 499,
                        countries: ["US"],
                    },
                ];
            }

            return response.data;
        } catch (err: any) {
            console.error("Error fetching shipping from Printify:", err);
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

            console.log("🚀 Order sent to production:", response.data);
        } catch (err: any) {
            console.error(
                "Error sending order to production:",
                err?.response?.data || err.message
            );
            throw new Error(
                `Failed to send order to production: ${
                    err.response?.data?.message || "Unknown error"
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
                `https://api.printify.com/v1/shops/${storeId}/orders/${printifyOrderId}.json`,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );
            return response.data;
        } catch (err: any) {
            console.error("Error fetching order from Printify:", err);
            throw new Error("Failed to fetch order details.");
        }
    }
}
