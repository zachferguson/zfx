import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PrintifyService } from "../../../src/services/printifyService";

/**
 * @file Unit tests for PrintifyService (axios.create-based).
 *
 * We hoist axios spies with vi.hoisted so the vi.mock factory can use them safely.
 * The service sets headers in axios.create(...), so we assert that in constructor,
 * and we do NOT assert per-request headers anymore.
 */

// Hoisted spies used by the mock factory (required by Vitest hoisting rules)
const { axGet, axPost, axCreate } = vi.hoisted(() => {
    return {
        axGet: vi.fn(),
        axPost: vi.fn(),
        axCreate: vi.fn(),
    };
});

// Mock axios to return an instance with get/post methods
vi.mock("axios", () => {
    axCreate.mockImplementation(() => ({ get: axGet, post: axPost }));
    return { default: { create: axCreate } };
});

describe("PrintifyService (unit)", () => {
    const API_KEY = "api-key-123";
    let svc: PrintifyService;

    beforeEach(() => {
        axGet.mockReset();
        axPost.mockReset();
        axCreate.mockClear();
        svc = new PrintifyService(API_KEY);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("constructor", () => {
        it("creates axios instance with Authorization header", () => {
            expect(axCreate).toHaveBeenCalledTimes(1);
            const [cfg] = axCreate.mock.calls[0];
            expect(cfg).toMatchObject({
                headers: { Authorization: `Bearer ${API_KEY}` },
            });
            expect(String(cfg.baseURL)).toContain("printify.com");
        });
    });

    describe("getProducts", () => {
        it("returns data", async () => {
            axGet.mockResolvedValue({ data: [{ id: "p1" }] });
            const data = await svc.getProducts("store-1");
            expect(data).toEqual([{ id: "p1" }]);
            expect(axGet).toHaveBeenCalledWith("/shops/store-1/products.json");
        });

        it("throws friendly error with server message", async () => {
            axGet.mockRejectedValue({
                response: { data: { message: "bad things" } },
            });
            await expect(svc.getProducts("store-1")).rejects.toThrow(
                "Failed to fetch products from Printify: bad things"
            );
        });

        it("throws friendly error with Unknown error fallback", async () => {
            axGet.mockRejectedValue({ message: "down" });
            await expect(svc.getProducts("store-1")).rejects.toThrow(
                "Failed to fetch products from Printify: Unknown error"
            );
        });
    });

    describe("getShippingRates", () => {
        it("normalizes response to sorted array", async () => {
            axPost.mockResolvedValue({ data: { economy: 399, standard: 499 } });
            const body = {
                address_to: { country: "US", zip: "10001" },
                line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
            };
            const out = await svc.getShippingRates("store-9", body as any);
            expect(out).toEqual([
                { code: "economy", price: 399 },
                { code: "standard", price: 499 },
            ]);
            expect(axPost).toHaveBeenCalledWith(
                "/shops/store-9/orders/shipping.json",
                body
            );
        });

        it("normalizes numeric 'standard' to array", async () => {
            axPost.mockResolvedValue({ data: { standard: 123 } });
            const out = await svc.getShippingRates("s", {
                address_to: { country: "US", zip: "10001" },
                line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
            } as any);
            expect(out).toEqual([{ code: "standard", price: 123 }]);
        });

        it("throws friendly error on axios failure", async () => {
            axPost.mockRejectedValue(new Error("nope"));
            await expect(
                svc.getShippingRates("s", {
                    address_to: { country: "US", zip: "10001" },
                    line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
                } as any)
            ).rejects.toThrow(
                "Failed to fetch shipping options from Printify."
            );
        });
    });

    describe("sendOrderToProduction", () => {
        it("POSTs with empty body", async () => {
            axPost.mockResolvedValue({ data: { ok: true } });
            await svc.sendOrderToProduction("store-1", "ord-9");
            expect(axPost).toHaveBeenCalledWith(
                "/shops/store-1/orders/ord-9/send_to_production.json",
                {}
            );
        });

        it("throws friendly error including server message when present", async () => {
            axPost.mockRejectedValue({
                response: { data: { message: "cannot send" } },
            });
            await expect(
                svc.sendOrderToProduction("store-1", "ord-9")
            ).rejects.toThrow(
                "Failed to send order to production: cannot send"
            );
        });

        it("throws Unknown error fallback", async () => {
            axPost.mockRejectedValue({ message: "bad" });
            await expect(
                svc.sendOrderToProduction("store-1", "ord-9")
            ).rejects.toThrow(
                "Failed to send order to production: Unknown error"
            );
        });
    });

    describe("submitOrder", () => {
        it("formats payload and returns response data", async () => {
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
            expect(axPost).toHaveBeenCalledWith(
                "/shops/store-1/orders.json",
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
                        city: "SF",
                        address1: "2 Pine",
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
            axPost.mockRejectedValue({
                response: { data: { message: "rate limited" } },
            });

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
            ).rejects.toThrow(
                "Failed to submit order to Printify: rate limited"
            );
        });

        it("throws Unknown error fallback", async () => {
            axPost.mockRejectedValue({ message: "boom" });
            await expect(
                svc.submitOrder("store-1", "ext-1", {} as any)
            ).rejects.toThrow(
                "Failed to submit order to Printify: Unknown error"
            );
        });
    });

    describe("getOrder", () => {
        it("returns order", async () => {
            axGet.mockResolvedValue({
                data: { id: "po-77", status: "in_production" },
            });
            const out = await svc.getOrder("store-1", "po-77");
            expect(out).toEqual({ id: "po-77", status: "in_production" });
            expect(axGet).toHaveBeenCalledWith(
                "/shops/store-1/orders/po-77.json"
            );
        });

        it("throws friendly error on failure", async () => {
            axGet.mockRejectedValue(new Error("down"));
            await expect(svc.getOrder("s", "po-x")).rejects.toThrow(
                "Failed to fetch order details."
            );
        });
    });
});
