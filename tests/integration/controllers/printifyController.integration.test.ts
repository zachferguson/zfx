import request from "supertest";
import express from "express";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * @file Integration tests for the printifyController.
 *
 * Verifies Printify-related endpoints using a real Express app with mocked Printify, Order, and Email services.
 *
 * Scenarios covered:
 * - Fetching products with and without a store ID
 * - Fetching shipping options with valid and invalid data
 * - Submitting orders and handling errors
 * - Checking order status and error handling
 */

vi.mock("node:crypto", () => ({
    default: { randomUUID: vi.fn() },
}));
import cryptoModule from "node:crypto";
import type { Mock } from "vitest";

// Hoisted mocks and globals (from original test setup)
const h = vi.hoisted(() => ({
    printify: {
        getProducts: vi.fn(),
        getShippingRates: vi.fn(),
        submitOrder: vi.fn(),
        getOrder: vi.fn(),
    },
    order: {
        saveOrder: vi.fn(),
        updatePrintifyOrderId: vi.fn(),
        getOrderByCustomer: vi.fn(),
    },
    email: {
        sendOrderConfirmation: vi.fn(),
    },
}));

// Validators and constants
import {
    validateGetProducts,
    validateGetShippingOptions,
    validateSubmitOrder,
    validateGetOrderStatus,
} from "../../../src/validators/printifyValidators";
import { PRINTIFY_ERRORS } from "../../../src/config/printifyErrors";

// Controller factory (DI)
import { createPrintifyController } from "../../../src/controllers/printifyController";

/**
 * Builds a minimal Express app for integration-style tests,
 * wiring validators and controller handlers with injected mocks.
 */
function makeApp() {
    const app = express();
    app.use(express.json());

    // Inject mocks into the controller
    const controller = createPrintifyController(
        h.printify as any,
        h.order as any,
        h.email as any
    );

    app.get("/products/:id?", validateGetProducts, controller.getProducts);
    app.post(
        "/shipping/:id?",
        validateGetShippingOptions,
        controller.getShippingOptions
    );
    app.post("/orders", validateSubmitOrder, controller.submitOrder);
    app.post(
        "/order-status",
        validateGetOrderStatus,
        controller.getOrderStatus
    );
    return app;
}

describe("printifyController (integration)", () => {
    let app: express.Express;

    type UUIDStr = `${string}-${string}-${string}-${string}-${string}`;
    let uuidMock: Mock;

    beforeEach(() => {
        uuidMock = cryptoModule.randomUUID as unknown as Mock;
        uuidMock.mockReset();
        app = makeApp();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("GET /products", () => {
        it("GET /products -> 400 when store id missing", async () => {
            const res = await request(app).get("/products");
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(PRINTIFY_ERRORS.MISSING_STORE_ID);
            expect(h.printify.getProducts).not.toHaveBeenCalled();
        });

        // Returns 200 and products when store id is provided
        it("GET /products/:id -> 200 with products", async () => {
            h.printify.getProducts.mockResolvedValue([{ id: "p1" }]);

            const res = await request(app).get("/products/123");
            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: "p1" }]);
            expect(h.printify.getProducts).toHaveBeenCalledWith("123");
        });

        it("GET /products/:id -> 500 on service error", async () => {
            const errSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            h.printify.getProducts.mockRejectedValue(
                new Error("printify-down")
            );

            const res = await request(app).get("/products/123");
            expect(res.status).toBe(500);
            expect(res.body.error).toBe(PRINTIFY_ERRORS.FAILED_FETCH_PRODUCTS);
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });

    describe("POST /shipping", () => {
        it("POST /shipping/:id -> 400 when required fields missing", async () => {
            const res = await request(app).post("/shipping/1").send({});
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(
                PRINTIFY_ERRORS.MISSING_SHIPPING_FIELDS
            );
            expect(h.printify.getShippingRates).not.toHaveBeenCalled();
        });

        // Returns 200 and shipping options when input is valid
        it("POST /shipping/:id -> 200 with options", async () => {
            // ShippingRates shape: [{ code: "standard" | "priority" | "express" | "economy", price: number }]
            h.printify.getShippingRates.mockResolvedValue([
                { code: "standard", price: 599 },
            ]);

            const body = {
                address_to: { country: "US", zip: "10001" },
                line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
            };

            const res = await request(app).post("/shipping/777").send(body);
            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ code: "standard", price: 599 }]);
            expect(h.printify.getShippingRates).toHaveBeenCalledWith(
                "777",
                body
            );
        });

        it("POST /shipping/:id -> 500 on service error", async () => {
            const errSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            h.printify.getShippingRates.mockRejectedValue(new Error("nope"));

            const body = {
                address_to: { country: "US", zip: "10001" },
                line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
            };
            const res = await request(app).post("/shipping/777").send(body);

            expect(res.status).toBe(500);
            expect(res.body.error).toBe(
                PRINTIFY_ERRORS.FAILED_SHIPPING_OPTIONS
            );
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });

    describe("POST /orders", () => {
        it("POST /orders -> 400 when required fields missing", async () => {
            const res = await request(app).post("/orders").send({});
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(
                PRINTIFY_ERRORS.MISSING_ORDER_FIELDS
            );
            expect(h.order.saveOrder).not.toHaveBeenCalled();
        });

        it("POST /orders -> 201 happy path", async () => {
            const UUID: `${string}-${string}-${string}-${string}-${string}` =
                "123e4567-e89b-12d3-a456-426614174000";
            uuidMock.mockReturnValue(UUID);
            //vi.spyOn(nodeCrypto, "randomUUID").mockReturnValue(UUID);

            h.order.saveOrder.mockResolvedValue({ id: 42 });
            h.printify.submitOrder.mockResolvedValue({ id: "po-99" });
            h.order.updatePrintifyOrderId.mockResolvedValue(undefined);
            h.email.sendOrderConfirmation.mockResolvedValue({
                success: true,
                messageId: "m-1",
            });

            const payload = {
                storeId: "store-1",
                stripe_payment_id: "pi_abc",
                order: {
                    total_price: 2000,
                    currency: "USD",
                    shipping_method: 1, // number per current API
                    shipping_cost: 500,
                    customer: {
                        email: "a@b.com",
                        address: {
                            first_name: "Ada",
                            last_name: "Lovelace",
                            address1: "1 Main",
                            city: "NY",
                            region: "NY",
                            zip: "10001",
                            country: "US",
                        },
                    },
                    line_items: [
                        {
                            product_id: 11,
                            variant_id: 22,
                            quantity: 1,
                            print_provider_id: 333,
                            cost: 1200,
                            metadata: {
                                price: 2000,
                                title: "Shirt",
                                variant_label: "L",
                                sku: "SKU1",
                            },
                            status: "in_production",
                        },
                    ],
                },
            };

            const res = await request(app).post("/orders").send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual({
                success: true,
                orderId: 42,
                printifyOrderId: "po-99",
            });

            expect(h.order.saveOrder).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderNumber: UUID,
                    storeId: "store-1",
                    email: "a@b.com",
                    totalPrice: 2000,
                    currency: "USD",
                    shippingMethod: 1,
                    shippingCost: 500,
                    shippingAddress: expect.any(Object),
                    items: expect.any(Array),
                    stripePaymentId: "pi_abc",
                    paymentStatus: "paid",
                    orderStatus: "pending",
                })
            );

            expect(h.printify.submitOrder).toHaveBeenCalledWith(
                "store-1",
                UUID,
                payload.order
            );

            expect(h.order.updatePrintifyOrderId).toHaveBeenCalledWith(
                UUID,
                "po-99"
            );

            // New object-argument signature for the email service
            expect(h.email.sendOrderConfirmation).toHaveBeenCalledWith(
                expect.objectContaining({
                    storeId: "store-1",
                    to: "a@b.com",
                    orderNumber: UUID,
                    payload: expect.objectContaining({
                        shippingMethod: 1,
                        totalPrice: 2000,
                        currency: "USD",
                        address: expect.objectContaining({
                            first_name: "Ada",
                            last_name: "Lovelace",
                            address1: "1 Main",
                            city: "NY",
                            region: "NY",
                            zip: "10001",
                            country: "US",
                        }),
                        items: expect.arrayContaining([
                            expect.objectContaining({
                                title: "Shirt",
                                variant_label: "L",
                                quantity: 1,
                                price: 2000,
                            }),
                        ]),
                    }),
                })
            );
        });

        it("POST /orders -> 500 when saveOrder throws", async () => {
            const UUID: UUIDStr = "123e4567-e89b-12d3-a456-426614174000";
            uuidMock.mockReturnValue(UUID);

            const errSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            h.order.saveOrder.mockRejectedValue(new Error("db-fail"));

            const payload = {
                storeId: "s",
                stripe_payment_id: "pi_1",
                order: {
                    total_price: 1000,
                    shipping_method: 1,
                    shipping_cost: 400,
                    customer: { email: "x@y.com", address: {} as any },
                    line_items: [],
                },
            };

            const res = await request(app).post("/orders").send(payload);
            expect(res.status).toBe(500);
            expect(res.body.error).toBe(PRINTIFY_ERRORS.FAILED_PROCESS_ORDER);
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });

    describe("POST /order-status", () => {
        it("POST /order-status -> 400 when missing orderId/email", async () => {
            const res = await request(app)
                .post("/order-status")
                .send({ orderId: "a" });
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(
                PRINTIFY_ERRORS.MISSING_ORDER_STATUS_FIELDS
            );
        });

        it("POST /order-status -> 404 when order not found", async () => {
            h.order.getOrderByCustomer.mockResolvedValue(null);

            const res = await request(app)
                .post("/order-status")
                .send({ orderId: "ord-1", email: "a@b.com" });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe(PRINTIFY_ERRORS.ORDER_NOT_FOUND);
        });

        it("POST /order-status -> 200 with mapped response", async () => {
            h.order.getOrderByCustomer.mockResolvedValue({
                id: 1,
                store_id: "store-1",
                printify_order_id: "po-123",
                total_price: 1999,
                shipping_cost: 499,
                currency: "USD",
            });

            h.printify.getOrder.mockResolvedValue({
                status: "in_production",
                created_at: "2025-08-31T12:00:00Z",
                address_to: {
                    first_name: "Ada",
                    last_name: "Lovelace",
                    phone: "123",
                    country: "US",
                    region: "NY",
                    city: "NYC",
                    address1: "1 Main",
                    address2: "",
                    zip: "10001",
                },
                line_items: [
                    {
                        product_id: 11,
                        variant_id: 22,
                        quantity: 1,
                        print_provider_id: 333,
                        shipping_cost: 499,
                        status: "in_production",
                        metadata: {
                            price: 1999,
                            title: "Shirt",
                            variant_label: "L",
                            sku: "SKU1",
                            country: "US",
                        },
                        sent_to_production_at: "2025-08-31T12:10:00Z",
                        fulfilled_at: null,
                    },
                ],
                shipments: [
                    {
                        carrier: "UPS",
                        number: "1ZTRACK",
                        url: "https://track.example/1ZTRACK",
                        delivered_at: null,
                    },
                ],
                metadata: {
                    order_type: "manual",
                    shop_order_id: "SO-1",
                    shop_order_label: "Order #1",
                    shop_fulfilled_at: null,
                },
                shipping_method: "STANDARD",
                is_printify_express: false,
                is_economy_shipping: false,
                printify_connect: null,
            });

            const res = await request(app)
                .post("/order-status")
                .send({ orderId: "ord-1", email: "a@b.com" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.order_status).toBe("in_production");
            expect(res.body.tracking_number).toBe("1ZTRACK");
            expect(res.body.tracking_url).toBe("https://track.example/1ZTRACK");
            expect(res.body.total_price).toBe(1999);
            expect(res.body.total_shipping).toBe(499);
            expect(res.body.currency).toBe("USD");
            expect(res.body.created_at).toBe("2025-08-31T12:00:00Z");

            // Customer fields
            expect(res.body.customer).toEqual({
                first_name: "Ada",
                last_name: "Lovelace",
                phone: "123",
                country: "US",
                region: "NY",
                city: "NYC",
                address1: "1 Main",
                address2: "",
                zip: "10001",
            });

            // Items array and all fields
            expect(res.body.items).toHaveLength(1);
            expect(res.body.items[0]).toEqual({
                product_id: 11,
                variant_id: 22,
                quantity: 1,
                print_provider_id: 333,
                price: 1999,
                shipping_cost: 499,
                status: "in_production",
                title: "Shirt",
                variant_label: "L",
                sku: "SKU1",
                country: "US",
                sent_to_production_at: "2025-08-31T12:10:00Z",
                fulfilled_at: null,
            });

            // Metadata
            expect(res.body.metadata).toEqual({
                order_type: "manual",
                shop_order_id: "SO-1",
                shop_order_label: "Order #1",
                shop_fulfilled_at: null,
            });

            // Shipping details
            expect(res.body.shipping_method).toBe("STANDARD");
            expect(res.body.is_printify_express).toBe(false);
            expect(res.body.is_economy_shipping).toBe(false);

            // Shipments array and all fields
            expect(res.body.shipments).toHaveLength(1);
            expect(res.body.shipments[0]).toEqual({
                carrier: "UPS",
                tracking_number: "1ZTRACK",
                tracking_url: "https://track.example/1ZTRACK",
                delivered_at: null,
            });

            // Printify connect
            expect(res.body.printify_connect).toBeNull();

            expect(h.order.getOrderByCustomer).toHaveBeenCalledWith(
                "ord-1",
                "a@b.com"
            );
            expect(h.printify.getOrder).toHaveBeenCalledWith(
                "store-1",
                "po-123"
            );
        });

        it("POST /order-status -> 500 when service throws", async () => {
            const errSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            h.order.getOrderByCustomer.mockResolvedValue({
                store_id: "store-1",
                printify_order_id: "po-err",
                total_price: 1000,
                shipping_cost: 100,
                currency: "USD",
            });
            h.printify.getOrder.mockRejectedValue(new Error("printify-broke"));

            const res = await request(app)
                .post("/order-status")
                .send({ orderId: "ord-1", email: "a@b.com" });

            expect(res.status).toBe(500);
            expect(res.body.error).toBe(PRINTIFY_ERRORS.FAILED_ORDER_STATUS);
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });
});
