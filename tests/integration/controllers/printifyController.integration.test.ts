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
}));

const g = vi.hoisted(() => ({
    webcrypto: { randomUUID: vi.fn() },
}));

vi.mock("../../../src/services/printifyService", () => ({
    PrintifyService: vi.fn().mockImplementation(() => h.printify),
}));

vi.mock("../../../src/services/orderService", () => ({
    OrderService: vi.fn().mockImplementation(() => h.order),
}));

import * as EmailSvc from "../../../src/services/emailService";
const emailSvc = vi.mocked(EmailSvc);

vi.mock("../../../src/services/emailService", () => ({
    sendOrderConfirmation: vi.fn(),
}));

vi.stubGlobal("crypto", g.webcrypto as unknown as Crypto);

import {
    validateGetProducts,
    validateGetShippingOptions,
    validateSubmitOrder,
    validateGetOrderStatus,
} from "../../../src/validators/printifyValidators";
import { PRINTIFY_ERRORS } from "../../../src/config/printifyErrors";
import {
    getProducts,
    getShippingOptions,
    submitOrder,
    getOrderStatus,
} from "../../../src/controllers/printifyController";

function makeApp() {
    const app = express();
    app.use(express.json());
    app.get("/products/:id?", validateGetProducts, getProducts);
    app.post("/shipping/:id?", validateGetShippingOptions, getShippingOptions);
    app.post("/orders", validateSubmitOrder, submitOrder);
    app.post("/order-status", validateGetOrderStatus, getOrderStatus);
    return app;
}

describe("printifyController (integration)", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
        process.env.PRINTIFY_API_KEY = "test-key";
    });

    afterEach(() => {
        delete process.env.PRINTIFY_API_KEY;
    });

    describe("GET /products", () => {
        // Returns 400 if store id is not provided in the request
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

        // Returns 500 if the service throws an error when fetching products
        it("GET /products/:id -> 500 on service error", async () => {
            const errSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            h.printify.getProducts.mockRejectedValue(
                new Error("printify-down")
            );

            const res = await request(app).get("/products/123");
            expect(res.status).toBe(500);
            expect(res.body.error).toBe(
                "Failed to fetch products from Printify."
            );
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });

    describe("POST /shipping", () => {
        // Returns 400 if required shipping fields are missing
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
            h.printify.getShippingRates.mockResolvedValue([{ id: "s1" }]);

            const body = {
                address_to: { country: "US", zip: "10001" },
                line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
            };

            const res = await request(app).post("/shipping/777").send(body);
            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: "s1" }]);
            expect(h.printify.getShippingRates).toHaveBeenCalledWith(
                "777",
                body
            );
        });

        // Returns 500 if the service throws an error when fetching shipping options
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
            expect(res.body.error).toBe("Failed to retrieve shipping options.");
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });

    describe("POST /orders", () => {
        // Returns 400 if required order fields are missing
        it("POST /orders -> 400 when required fields missing", async () => {
            const res = await request(app).post("/orders").send({});
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(
                PRINTIFY_ERRORS.MISSING_ORDER_FIELDS
            );
            expect(h.order.saveOrder).not.toHaveBeenCalled();
        });

        // Returns 201 and order info when order is submitted successfully
        it("POST /orders -> 201 happy path", async () => {
            const UUID = "123e4567-e89b-12d3-a456-426614174000";
            g.webcrypto.randomUUID.mockReturnValue(UUID);

            h.order.saveOrder.mockResolvedValue({ id: 42 });
            h.printify.submitOrder.mockResolvedValue({ id: "po-99" });
            h.order.updatePrintifyOrderId.mockResolvedValue(undefined);
            emailSvc.sendOrderConfirmation.mockResolvedValue({
                success: true,
                messageId: "m-1",
            });

            const payload = {
                storeId: "store-1",
                stripe_payment_id: "pi_abc",
                order: {
                    total_price: 2000,
                    currency: "USD",
                    shipping_method: 1, // <-- number, not "STANDARD"
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
                            cost: 1200, // optional, but matches your interface
                            metadata: {
                                price: 2000,
                                title: "Shirt",
                                variant_label: "L",
                                sku: "SKU1",
                            },
                            status: "in_production", // optional; allowed by your interface
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

            expect(EmailSvc.sendOrderConfirmation).toHaveBeenCalledWith(
                "store-1",
                "a@b.com",
                UUID,
                expect.objectContaining({
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
                    shippingMethod: 1,
                    totalPrice: 2000,
                    currency: "USD",
                })
            );
        });

        // Returns 500 if saving the order throws an error
        it("POST /orders -> 500 when saveOrder throws", async () => {
            const UUID = "123e4567-e89b-12d3-a456-426614174000";
            g.webcrypto.randomUUID.mockReturnValue(UUID);

            const errSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            h.order.saveOrder.mockRejectedValue(new Error("db-fail"));

            const payload = {
                storeId: "s",
                stripe_payment_id: "pi_1",
                order: {
                    total_price: 1000,
                    shipping_method: "STANDARD",
                    shipping_cost: 400,
                    customer: { email: "x@y.com", address: {} as any },
                    line_items: [],
                },
            };

            const res = await request(app).post("/orders").send(payload);
            expect(res.status).toBe(500);
            expect(res.body.error).toBe("Failed to process order.");
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });

    describe("POST /order-status", () => {
        // Returns 400 if orderId or email is missing in the request
        it("POST /order-status -> 400 when missing orderId/email", async () => {
            const res = await request(app)
                .post("/order-status")
                .send({ orderId: "a" });
            expect(res.status).toBe(400);
            expect(res.body.errors).toContain(
                PRINTIFY_ERRORS.MISSING_ORDER_STATUS_FIELDS
            );
        });

        // Returns 404 if the order is not found for the given customer
        it("POST /order-status -> 404 when order not found", async () => {
            h.order.getOrderByCustomer.mockResolvedValue(null);

            const res = await request(app)
                .post("/order-status")
                .send({ orderId: "ord-1", email: "a@b.com" });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe("Order not found.");
        });

        // Returns 200 and mapped order status response when order is found
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

        // Returns 500 if the service throws an error when fetching order status
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
            expect(res.body.error).toBe("Failed to retrieve order status.");
            expect(errSpy).toHaveBeenCalled();
            errSpy.mockRestore();
        });
    });
});
