import axios, { AxiosInstance } from "axios";
import {
    ShippingRatesRequestBody,
    ShippingRates,
} from "../types/printifyShipping";
import type {
    PrintifyOrderRequest,
    PrintifyOrderResponse,
} from "../types/printifyOrder";

export interface IPrintifyService {
    /** Retrieves paginated products for a store. */
    getProducts(storeId: string): Promise<unknown>; // Keep loose unless you define ProductPage type
    /** Retrieves and normalizes shipping rates. */
    getShippingRates(
        storeId: string,
        requestBody: ShippingRatesRequestBody
    ): Promise<ShippingRates>;
    /** Sends an order to production. */
    sendOrderToProduction(storeId: string, orderId: string): Promise<void>;
    /** Submits a new order. */
    submitOrder(
        storeId: string,
        orderNumber: string,
        orderData: PrintifyOrderRequest
    ): Promise<PrintifyOrderResponse>;
    /** Retrieves a specific order by id. */
    getOrder(
        storeId: string,
        printifyOrderId: string
    ): Promise<PrintifyOrderResponse>;
}

/** Optional dependency overrides for tests and wiring. */
export type PrintifyDeps = {
    /** Preconfigured Axios instance (defaults to internal instance). */
    http?: AxiosInstance;
    /** Base URL override (defaults to Printify v1). */
    baseURL?: string;
    /** Logger (defaults to console). */
    logger?: Pick<Console, "error" | "log" | "warn">;
};

const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

// Printify’s raw shipping response is a bag of “maybe present” fields.
// We normalize it to your canonical array (economy/standard/express/priority).
type PrintifyShippingResponseRaw = {
    standard?: number;
    express?: number; // legacy express (maps to priority)
    priority?: number; // new name for the fast option
    printify_express?: number; // transitional express (maps to express)
    economy?: number;
};

/**
 * Normalize Printify shipping response to a stable, deduped array.
 * - If both legacy `express` and `priority` show up, keep the cheaper as `priority`.
 * - Stable display order for ties: economy → standard → express → priority.
 */
function normalizeShipping(raw: PrintifyShippingResponseRaw): ShippingRates {
    const best: Partial<
        Record<"economy" | "standard" | "express" | "priority", number>
    > = {};

    const setMin = (k: keyof typeof best, price?: number) => {
        if (typeof price !== "number") return;
        best[k] = best[k] == null ? price : Math.min(best[k], price);
    };

    setMin("standard", raw.standard);
    setMin("express", raw.printify_express); // transitional express → express
    setMin("priority", raw.express); // legacy express → priority
    setMin("priority", raw.priority); // new priority
    setMin("economy", raw.economy);

    const ORDER = ["economy", "standard", "express", "priority"] as const;

    return (
        ORDER.flatMap((code) =>
            best[code] != null ? [{ code, price: best[code] }] : []
        ) as ShippingRates
    ).sort(
        (a, b) =>
            a.price - b.price || ORDER.indexOf(a.code) - ORDER.indexOf(b.code)
    );
}

/**
 * Service for interacting with the Printify API.
 */
export class PrintifyService implements IPrintifyService {
    private readonly http: AxiosInstance;
    private readonly logger: Pick<Console, "error" | "log" | "warn">;

    // Helper to safely extract Axios error details without using `any`
    private static getAxiosErrorParts(error: unknown): {
        status?: number;
        data?: unknown;
        message: string;
    } {
        if (typeof error === "object" && error !== null) {
            const maybeMessage = (error as { message?: unknown }).message;
            const messageFromError =
                typeof maybeMessage === "string" ? maybeMessage : undefined;
            if ("response" in error) {
                const resp = (
                    error as {
                        response?: { status?: number; data?: unknown };
                    }
                ).response;
                const status = resp?.status;
                const data = resp?.data;
                let message = messageFromError || "Unknown error";
                if (data && typeof data === "object" && "message" in data) {
                    const m = (data as { message?: unknown }).message;
                    if (typeof m === "string") message = m;
                }
                const result: {
                    status?: number;
                    data?: unknown;
                    message: string;
                } = { message };
                if (typeof status === "number") result.status = status;
                if (data !== undefined) result.data = data;
                return result;
            }
        }
        const message =
            error instanceof Error && typeof error.message === "string"
                ? error.message
                : "Unknown error";
        return { message };
    }

    /**
     * Creates a new PrintifyService.
     *
     * @param {string} apiKey - Printify API key.
     * @param {PrintifyDeps} [deps] - Optional dependency overrides.
     */
    constructor(apiKey: string, deps: PrintifyDeps = {}) {
        const baseURL = deps.baseURL ?? PRINTIFY_BASE_URL;
        this.http =
            deps.http ??
            axios.create({
                baseURL,
                headers: { Authorization: `Bearer ${apiKey}` },
            });
        this.logger = deps.logger ?? console;
    }

    /**
     * Retrieves all products for a given store.
     */
    /** @inheritdoc */
    async getProducts(storeId: string): Promise<unknown> {
        try {
            const { data } = await this.http.get<unknown>(
                `/shops/${storeId}/products.json`
            );
            return data;
        } catch (error: unknown) {
            const { data, message } = PrintifyService.getAxiosErrorParts(error);
            this.logger.error(
                "Error fetching products from Printify:",
                data ?? message
            );
            throw new Error(
                `Failed to fetch products from Printify: ${message}`
            );
        }
    }

    /**
     * Retrieves shipping rates for an order and normalizes them.
     * Returns array of { code, price } in cents, ascending by price.
     */
    /** @inheritdoc */
    async getShippingRates(
        storeId: string,
        requestBody: ShippingRatesRequestBody
    ): Promise<ShippingRates> {
        try {
            const { data } = await this.http.post<PrintifyShippingResponseRaw>(
                `/shops/${storeId}/orders/shipping.json`,
                requestBody
            );
            return normalizeShipping(data);
        } catch (error: unknown) {
            const { status, data } = PrintifyService.getAxiosErrorParts(error);
            this.logger.error("Error fetching shipping from Printify:", {
                status,
                data,
            });
            throw new Error("Failed to fetch shipping options from Printify.");
        }
    }

    /**
     * Sends an order to production.
     */
    /** @inheritdoc */
    async sendOrderToProduction(
        storeId: string,
        orderId: string
    ): Promise<void> {
        try {
            const { data } = await this.http.post<unknown>(
                `/shops/${storeId}/orders/${orderId}/send_to_production.json`,
                {}
            );
            this.logger.log("Order sent to production:", data);
        } catch (error: unknown) {
            const { data, message } = PrintifyService.getAxiosErrorParts(error);
            this.logger.error(
                "Error sending order to production:",
                data ?? message
            );
            throw new Error(`Failed to send order to production: ${message}`);
        }
    }

    /**
     * Submits a new order tp printify.
     */
    /** @inheritdoc */
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

            this.logger.log("Sending formatted order:", formattedOrderData);

            const { data } = await this.http.post<PrintifyOrderResponse>(
                `/shops/${storeId}/orders.json`,
                formattedOrderData
            );

            this.logger.log("Order successfully submitted to Printify:", data);
            return data;
        } catch (error: unknown) {
            const parts = PrintifyService.getAxiosErrorParts(error);
            const isAxiosLike =
                typeof error === "object" &&
                error !== null &&
                "response" in error;
            const message = isAxiosLike ? parts.message : "Unknown error";
            this.logger.error(
                "Error submitting order to Printify:",
                isAxiosLike ? (parts.data ?? message) : message
            );
            throw new Error(`Failed to submit order to Printify: ${message}`);
        }
    }

    /**
     * Retrieves a specific order.
     */
    /** @inheritdoc */
    async getOrder(
        storeId: string,
        printifyOrderId: string
    ): Promise<PrintifyOrderResponse> {
        try {
            const { data } = await this.http.get<PrintifyOrderResponse>(
                `/shops/${storeId}/orders/${printifyOrderId}.json`
            );
            return data;
        } catch (error: unknown) {
            const { data, message } = PrintifyService.getAxiosErrorParts(error);
            this.logger.error(
                "Error fetching order from Printify:",
                data ?? message
            );
            throw new Error("Failed to fetch order details.");
        }
    }
}
