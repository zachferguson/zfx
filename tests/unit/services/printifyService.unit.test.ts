import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import axios from "axios";
import { PrintifyService } from "../../../src/services/printifyService";

vi.mock("axios", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

const ax = vi.mocked(axios);
const svc = new PrintifyService("api-key-123");
const axGet = ax.get as unknown as Mock;
const axPost = ax.post as unknown as Mock;

beforeEach(() => {
    vi.clearAllMocks();
});

describe("PrintifyService.getProducts", () => {
    // Should return product data and send the correct auth header
    it("returns data and sends auth header", async () => {
        axGet.mockResolvedValue({ data: [{ id: "p1" }] });
        const data = await svc.getProducts("store-1");
        expect(data).toEqual([{ id: "p1" }]);
        expect(axGet).toHaveBeenCalledTimes(1);
        const [url, cfg] = axGet.mock.calls[0];
        expect(url).toContain("/shops/store-1/products.json");
        expect(cfg?.headers?.Authorization).toBe("Bearer api-key-123");
    });

    // Should throw a friendly error with the server message when axios fails
    it("throws friendly error with server message when axios fails", async () => {
        axGet.mockRejectedValue({
            response: { data: { message: "bad things" } },
            message: "boom",
        });
        await expect(svc.getProducts("store-1")).rejects.toThrow(
            "Failed to fetch products from Printify: bad things"
        );
    });

    // Should throw a friendly error with 'Unknown error' when no server message is present
    it("throws friendly error with Unknown error when no server message", async () => {
        axGet.mockRejectedValue({ message: "network-down" });
        await expect(svc.getProducts("store-1")).rejects.toThrow(
            "Failed to fetch products from Printify: Unknown error"
        );
    });
});

describe("PrintifyService.getShippingRates", () => {
    // Should pass through the array response for shipping rates
    it("passes through array response", async () => {
        axPost.mockResolvedValue({
            data: {
                standard: [
                    { id: 1, name: "Std", price: 499, countries: ["US"] },
                ],
            },
        });
        const body = {
            address_to: { country: "US", zip: "10001" },
            line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
        };
        const res = await svc.getShippingRates("store-9", body as any);
        expect(res).toEqual({
            standard: [{ id: 1, name: "Std", price: 499, countries: ["US"] }],
        });
        const [url, payload, cfg] = axPost.mock.calls[0];
        expect(url).toContain("/shops/store-9/orders/shipping.json");
        expect(payload).toEqual(body);
        expect(cfg?.headers?.Authorization).toBe("Bearer api-key-123");
        expect(cfg?.headers?.["Content-Type"]).toBe("application/json");
    });

    // Should normalize a numeric 'standard' shipping rate to an array
    it("normalizes numeric 'standard' to array", async () => {
        axPost.mockResolvedValue({ data: { standard: 123 } });
        const res = await svc.getShippingRates("s", {
            address_to: { country: "US", zip: "10001" },
            line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
        } as any);
        expect(res.standard).toEqual([
            {
                id: 123,
                name: "Standard Shipping",
                price: 499,
                countries: ["US"],
            },
        ]);
    });

    // Should throw a friendly error on axios failure for shipping rates
    it("throws friendly error on axios failure", async () => {
        axPost.mockRejectedValue(new Error("nope"));
        await expect(
            svc.getShippingRates("s", {
                address_to: { country: "US", zip: "10001" },
                line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
            } as any)
        ).rejects.toThrow("Failed to fetch shipping options from Printify.");
    });
});

describe("PrintifyService.sendOrderToProduction", () => {
    // Should call axios.post with empty body and correct headers for sendOrderToProduction
    it("calls axios.post with empty body and headers", async () => {
        axPost.mockResolvedValue({ data: { ok: true } });
        await svc.sendOrderToProduction("store-1", "ord-9");
        const [url, payload, cfg] = axPost.mock.calls[0];
        expect(url).toContain(
            "/shops/store-1/orders/ord-9/send_to_production.json"
        );
        expect(payload).toEqual({});
        expect(cfg?.headers?.Authorization).toBe("Bearer api-key-123");
        expect(cfg?.headers?.["Content-Type"]).toBe("application/json");
    });

    // Should throw a friendly error including the server message when present
    it("throws friendly error including server message when present", async () => {
        axPost.mockRejectedValue({
            response: { data: { message: "cannot send" } },
            message: "boom",
        });
        await expect(
            svc.sendOrderToProduction("store-1", "ord-9")
        ).rejects.toThrow("Failed to send order to production: cannot send");
    });

    it("throws Unknown error fallback", async () => {
        axPost.mockRejectedValue({ message: "bad" });
        await expect(
            svc.sendOrderToProduction("store-1", "ord-9")
        ).rejects.toThrow("Failed to send order to production: Unknown error");
    });
});

describe("PrintifyService.submitOrder", () => {
    it("formats payload, sends headers, and returns data", async () => {
        axPost.mockResolvedValue({ data: { id: "po-1" } });
        const orderReq = {
            total_price: 2000,
            currency: "USD",
            shipping_method: "STANDARD",
            shipping_cost: 500,
            customer: {
                email: "a@b.com",
                address: {
                    first_name: "Ada",
                    last_name: "Lovelace",
                    phone: "123-456",
                    country: "US",
                    region: "NY",
                    city: "NYC",
                    address1: "1 Main",
                    address2: "",
                    zip: "10001",
                },
            },
            line_items: [
                {
                    product_id: 11,
                    variant_id: 22,
                    quantity: 1,
                    print_provider_id: 333,
                    metadata: {
                        title: "Shirt",
                        price: 2000,
                        variant_label: "L",
                        sku: "SKU1",
                    },
                },
            ],
        } as any;
        const out = await svc.submitOrder("store-1", "ext-123", orderReq);
        expect(out).toEqual({ id: "po-1" });
        const [url, payload, cfg] = axPost.mock.calls[0];
        expect(url).toContain("/shops/store-1/orders.json");
        expect(cfg?.headers?.Authorization).toBe("Bearer api-key-123");
        expect(cfg?.headers?.["Content-Type"]).toBe("application/json");
        expect(payload).toEqual(
            expect.objectContaining({
                external_id: "ext-123",
                total_price: 2000,
                currency: "USD",
                shipping_method: "STANDARD",
                shipping_cost: 500,
                line_items: orderReq.line_items,
                send_shipping_notification: false,
                address_to: expect.objectContaining({
                    first_name: "Ada",
                    last_name: "Lovelace",
                    email: "a@b.com",
                    phone: "123-456",
                    country: "US",
                    region: "NY",
                    city: "NYC",
                    address1: "1 Main",
                    address2: "",
                    zip: "10001",
                }),
            })
        );
    });

    it("fills default phone/region/address2 when missing", async () => {
        axPost.mockResolvedValue({ data: { id: "po-2" } });
        const orderReq = {
            total_price: 1234,
            currency: "USD",
            shipping_method: "ECONOMY",
            shipping_cost: 250,
            customer: {
                email: "x@y.com",
                address: {
                    first_name: "X",
                    last_name: "Y",
                    // phone missing
                    country: "US",
                    // region missing
                    city: "SF",
                    address1: "2 Pine",
                    // address2 missing
                    zip: "94102",
                },
            },
            line_items: [],
        } as any;
        await svc.submitOrder("store-2", "ext-9", orderReq);
        const [_url, payload] = axPost.mock.calls[0];
        expect(payload.address_to.phone).toBe("000-000-0000");
        expect(payload.address_to.region).toBe("");
        expect(payload.address_to.address2).toBe("");
    });

    it("throws friendly error with server message", async () => {
        const error = new Error("boom");
        Object.setPrototypeOf(error, {
            response: { data: { message: "rate limited" } },
        });
        axPost.mockRejectedValue(error);
        const orderData = {
            customer: {
                email: "test@example.com",
                address: {
                    first_name: "A",
                    last_name: "B",
                    phone: "123",
                    country: "US",
                    region: "NY",
                    city: "NYC",
                    address1: "1 Main",
                    address2: "",
                    zip: "10001",
                },
            },
            line_items: [],
            total_price: 1000,
            currency: "USD",
            shipping_method: "STANDARD",
            shipping_cost: 100,
        };
        await expect(
            svc.submitOrder("store-1", "ext-1", orderData as any)
        ).rejects.toThrow("Failed to submit order to Printify: rate limited");
    });

    it("throws Unknown error fallback", async () => {
        axPost.mockRejectedValue({ message: "boom" });
        await expect(
            svc.submitOrder("store-1", "ext-1", {} as any)
        ).rejects.toThrow("Failed to submit order to Printify: Unknown error");
    });
});

describe("PrintifyService.getOrder", () => {
    it("returns order and sets header", async () => {
        axGet.mockResolvedValue({
            data: { id: "po-77", status: "in_production" },
        });
        const out = await svc.getOrder("store-1", "po-77");
        expect(out).toEqual({ id: "po-77", status: "in_production" });
        const [url, cfg] = axGet.mock.calls[0];
        expect(url).toContain("/shops/store-1/orders/po-77.json");
        expect(cfg?.headers?.Authorization).toBe("Bearer api-key-123");
    });

    it("throws friendly error on failure", async () => {
        axGet.mockRejectedValue(new Error("down"));
        await expect(svc.getOrder("s", "po-x")).rejects.toThrow(
            "Failed to fetch order details."
        );
    });
});
