// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("node:crypto", () => {
    const randomUUID = vi.fn();
    return { randomUUID, default: { randomUUID } };
});
import cryptoModule from "node:crypto";
let uuidMock: ReturnType<typeof vi.fn>;

// Controller under test is now a factory that takes injected services
import { createPrintifyController } from "../../../src/controllers/printifyController";

// Service interfaces for typed mocks
import type { IPrintifyService } from "../../../src/services/printifyService";
import type { IOrderService } from "../../../src/services/orderService";
import type { IEmailService } from "../../../src/services/emailService";

// Keep your validator mocking so we can force validation outcomes
vi.mock("express-validator", () => ({
    validationResult: vi.fn(),
}));
import { validationResult } from "express-validator";

/**
 * @file Unit tests for printifyController.
 *
 * Tests validate controller behavior only:
 * - Request validation driven via a mocked `validationResult`.
 * - Service layer calls are mocked to isolate controller logic.
 *
 * Organization:
 * - Outer "unit" describe for the controller
 * - Per-endpoint sub-describes
 * - Each test has a single-line, plain-language intent comment
 */

describe("printifyController (unit)", () => {
    // Helper to build a minimal Express-like response object with chaining
    function mockRes() {
        const res: Partial<Response> & { statusCode?: number; body?: unknown } =
            {};

        res.status = vi.fn().mockImplementation((code: number) => {
            res.statusCode = code;
            return res as Response;
        });

        res.json = vi.fn().mockImplementation((payload: unknown) => {
            res.body = payload;
            return res as Response;
        });

        return res as Response & { statusCode?: number; body?: unknown };
    }

    // Typed UUID string literal for TS’ template-literal return type on randomUUID
    type UUIDStr = `${string}-${string}-${string}-${string}-${string}`;

    // Fresh controller with fresh mocks per test for full isolation
    function makeController(m?: {
        printify?: Partial<IPrintifyService>;
        order?: Partial<IOrderService>;
        email?: Partial<IEmailService>;
    }) {
        const printify: IPrintifyService = {
            getProducts: vi.fn(),
            getShippingRates: vi.fn(),
            submitOrder: vi.fn(),
            sendOrderToProduction: vi.fn(),
            getOrder: vi.fn(),
            ...(m?.printify ?? {}),
        };

        const order: IOrderService = {
            saveOrder: vi.fn(),
            updatePrintifyOrderId: vi.fn(),
            getOrderByCustomer: vi.fn(),
            ...(m?.order ?? {}),
        };

        const email: IEmailService = {
            sendOrderConfirmation: vi.fn(),
            ...(m?.email ?? {}),
        };

        return {
            controller: createPrintifyController(printify, order, email),
            h: { printify, order, email },
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();
        uuidMock = cryptoModule.randomUUID as unknown as ReturnType<
            typeof vi.fn
        >;
        uuidMock.mockReset();
        // Default validation: success (override per test when needed)
        (
            validationResult as unknown as ReturnType<typeof vi.fn>
        ).mockImplementation(() => ({
            isEmpty: () => true,
            array: () => [],
        }));
    });

    describe("getProducts", () => {
        it("returns 200 and products on success", async () => {
            const { controller, h } = makeController({
                printify: {
                    getProducts: vi.fn().mockResolvedValue([{ id: "p1" }]),
                },
            });

            const req = { params: { id: "store-1" } } as unknown as Request;
            const res = mockRes();

            await controller.getProducts(req, res);

            expect(h.printify.getProducts).toHaveBeenCalledWith("store-1");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([{ id: "p1" }]);
        });

        it("returns 400 if validation fails", async () => {
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));

            const { controller, h } = makeController();

            const req = { params: { id: "store-1" } } as unknown as Request;
            const res = mockRes();

            await controller.getProducts(req, res);

            expect(h.printify.getProducts).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ errors: ["Invalid"] });
        });

        it("returns 500 on service error", async () => {
            const { controller, h } = makeController({
                printify: {
                    getProducts: vi.fn().mockRejectedValue(new Error("fail")),
                },
            });

            const req = { params: { id: "store-1" } } as unknown as Request;
            const res = mockRes();

            await controller.getProducts(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: expect.any(String),
            });
        });
    });

    describe("submitOrder", () => {
        it("returns 201 and order info on success", async () => {
            const UUID: UUIDStr = "123e4567-e89b-12d3-a456-426614174000";
            uuidMock.mockReturnValue(UUID);

            const { controller, h } = makeController({
                order: { saveOrder: vi.fn().mockResolvedValue({ id: "123" }) },
                printify: {
                    submitOrder: vi.fn().mockResolvedValue({
                        id: "po-1",
                        status: "pending",
                        created_at: new Date().toISOString(),
                        total_price: 100,
                        total_shipping: 10,
                        currency: "USD",
                        shipping_method: 1,
                        address_to: {
                            first_name: "John",
                            last_name: "Doe",
                            country: "US",
                            region: "CA",
                            city: "Los Angeles",
                            address1: "123 Main St",
                            zip: "90001",
                        },
                        line_items: [],
                    } as any),
                },
                email: {
                    sendOrderConfirmation: vi.fn().mockResolvedValue({
                        success: true,
                        messageId: "mock-id",
                    }),
                },
            });

            const req = {
                body: {
                    storeId: "store-1",
                    order: {
                        customer: { email: "a@b.com", address: {} },
                        total_price: 100,
                        currency: "USD",
                        shipping_method: 1, // number per current API
                        shipping_cost: 10,
                        line_items: [
                            {
                                metadata: {
                                    title: "T",
                                    variant_label: "V",
                                    price: 100,
                                },
                                quantity: 1,
                            },
                        ],
                    },
                    stripe_payment_id: "stripe-1",
                },
            } as unknown as Request;

            const res = mockRes();

            await controller.submitOrder(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    orderId: "123",
                    printifyOrderId: "po-1",
                })
            );

            // Email service now uses object-argument signature
            expect(h.email.sendOrderConfirmation).toHaveBeenCalledWith(
                expect.objectContaining({
                    storeId: "store-1",
                    to: "a@b.com",
                    orderNumber: UUID,
                    payload: expect.objectContaining({
                        totalPrice: 100,
                        currency: "USD",
                        shippingMethod: 1,
                        items: [
                            expect.objectContaining({
                                title: "T",
                                variant_label: "V",
                                price: 100,
                                quantity: 1,
                            }),
                        ],
                    }),
                })
            );
        });

        it("returns 400 if validation fails", async () => {
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));

            const { controller } = makeController();
            const req = { body: {} } as unknown as Request;
            const res = mockRes();

            await controller.submitOrder(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ errors: ["Invalid"] });
        });

        it("returns 500 on service error", async () => {
            const UUID: UUIDStr = "123e4567-e89b-12d3-a456-426614174000";
            uuidMock.mockReturnValue(UUID);

            const { controller, h } = makeController({
                order: { saveOrder: vi.fn().mockResolvedValue({ id: "123" }) },
                printify: {
                    submitOrder: vi.fn().mockRejectedValue(new Error("fail")),
                },
            });

            const req = {
                body: {
                    storeId: "store-1",
                    order: {
                        customer: { email: "a@b.com", address: {} },
                        total_price: 100,
                        currency: "USD",
                        shipping_method: 1,
                        shipping_cost: 10,
                        line_items: [
                            {
                                metadata: {
                                    title: "T",
                                    variant_label: "V",
                                    price: 100,
                                },
                                quantity: 1,
                            },
                        ],
                    },
                    stripe_payment_id: "stripe-1",
                },
            } as unknown as Request;

            const res = mockRes();

            await controller.submitOrder(req, res);

            expect(h.printify.submitOrder).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: expect.any(String),
            });
        });
    });

    describe("getOrderStatus", () => {
        it("returns 422 when order exists but has no printify_order_id", async () => {
            const { controller, h } = makeController({
                order: {
                    getOrderByCustomer: vi.fn().mockResolvedValue({
                        store_id: "s1",
                        printify_order_id: null,
                        total_price: 100,
                        shipping_cost: 10,
                        currency: "USD",
                    }),
                },
            });

            const req = {
                body: { orderId: "o1", email: "a@b.com" },
            } as unknown as Request;
            const res = mockRes();

            await controller.getOrderStatus(req, res);

            expect(h.order.getOrderByCustomer).toHaveBeenCalledWith(
                "o1",
                "a@b.com"
            );
            expect(h.printify.getOrder).not.toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(String), // ORDER_NOT_FOUND
                })
            );
        });

        it("returns 200 and maps key fields on success", async () => {
            const { controller, h } = makeController({
                order: {
                    getOrderByCustomer: vi.fn().mockResolvedValue({
                        store_id: "s1",
                        printify_order_id: "po1",
                        total_price: 12345,
                        shipping_cost: 999,
                        currency: "USD",
                    }),
                },
                printify: {
                    getOrder: vi.fn().mockResolvedValue({
                        id: "po1",
                        status: "shipped",
                        created_at: "2025-01-02T03:04:05Z",
                        total_price: 12345,
                        total_shipping: 999,
                        currency: "USD",
                        shipping_method: 1,
                        is_printify_express: false,
                        is_economy_shipping: true,
                        address_to: {
                            first_name: "John",
                            last_name: "Doe",
                            phone: "123",
                            country: "US",
                            region: "CA",
                            city: "Los Angeles",
                            address1: "123 Main St",
                            address2: "",
                            zip: "90001",
                        },
                        line_items: [
                            {
                                product_id: "prod1",
                                variant_id: 111,
                                quantity: 2,
                                print_provider_id: 999,
                                shipping_cost: 0,
                                status: "fulfilled",
                                metadata: {
                                    price: 1999,
                                    title: "Cool Tee",
                                    variant_label: "Black / L",
                                    sku: "SKU123",
                                    country: "US",
                                },
                                sent_to_production_at: "2025-01-02T03:05:00Z",
                                fulfilled_at: "2025-01-03T10:00:00Z",
                            },
                        ],
                        shipments: [
                            {
                                carrier: "usps",
                                number: "TRACK123",
                                url: "https://t.example",
                            },
                        ],
                        metadata: {
                            order_type: "manual",
                            shop_order_id: "so-1",
                            shop_order_label: "SO-1",
                            shop_fulfilled_at: null,
                        },
                        printify_connect: null,
                    }),
                },
            });

            const req = {
                body: { orderId: "o1", email: "a@b.com" },
            } as unknown as Request;
            const res = mockRes();

            await controller.getOrderStatus(req, res);

            expect(h.order.getOrderByCustomer).toHaveBeenCalledWith(
                "o1",
                "a@b.com"
            );
            expect(h.printify.getOrder).toHaveBeenCalledWith("s1", "po1");

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    order_status: "shipped",
                    tracking_number: "TRACK123",
                    tracking_url: "https://t.example",
                    total_price: 12345, // from DB
                    total_shipping: 999, // from DB
                    currency: "USD", // from DB
                    created_at: "2025-01-02T03:04:05Z",
                    customer: expect.objectContaining({
                        first_name: "John",
                        last_name: "Doe",
                        country: "US",
                        region: "CA",
                        city: "Los Angeles",
                        address1: "123 Main St",
                        address2: "",
                        zip: "90001",
                        phone: "123",
                    }),
                    items: [
                        expect.objectContaining({
                            product_id: "prod1",
                            variant_id: 111,
                            quantity: 2,
                            print_provider_id: 999,
                            price: 1999, // from metadata.price
                            shipping_cost: 0,
                            status: "fulfilled",
                            title: "Cool Tee",
                            variant_label: "Black / L",
                            sku: "SKU123",
                            country: "US",
                            sent_to_production_at: "2025-01-02T03:05:00Z",
                            fulfilled_at: "2025-01-03T10:00:00Z",
                        }),
                    ],
                })
            );
        });
    });
});
