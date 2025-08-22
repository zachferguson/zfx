import axios from "axios";
import {
    ShippingRatesRequestBody,
    ShippingResponse,
} from "../types/printifyShipping";
import {
    PrintifyOrderRequest,
    PrintifyOrderResponse,
} from "../types/printifyOrder";

const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

export class PrintifyService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getProducts(storeId: string) {
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
                "❌ Error fetching products from Printify:",
                err?.response?.data || err.message
            );
            throw new Error(
                `Failed to fetch products from Printify: ${
                    err.response?.data?.message || "Unknown error"
                }`
            );
        }
    }

    async getShippingRates(
        storeId: string,
        requestBody: ShippingRatesRequestBody
    ) {
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
                "❌ Error sending order to production:",
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

            console.log("🚀 Sending formatted order:", formattedOrderData);

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
                "✅ Order successfully submitted to Printify:",
                response.data
            );

            return response.data;
        } catch (err: any) {
            console.error(
                "❌ Error submitting order to Printify:",
                err?.response?.data || err.message
            );
            throw new Error(
                `Failed to submit order to Printify: ${
                    err.response?.data?.message || "Unknown error"
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
            console.error("❌ Error fetching order from Printify:", err);
            throw new Error("Failed to fetch order details.");
        }
    }
}
