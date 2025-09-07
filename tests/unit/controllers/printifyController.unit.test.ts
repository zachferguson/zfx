import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockGlobalCryptoRandomUUID } from "../../utils/testUtils";
import { Request, Response } from "express";
import * as controller from "../../../src/controllers/printifyController";
import { printifyService } from "../../../src/controllers/printifyController";
import * as orderServiceModule from "../../../src/services/orderService";

import * as emailService from "../../../src/services/emailService";
vi.mock("express-validator", () => ({
    validationResult: vi.fn(),
}));
import { validationResult } from "express-validator";

describe("printifyController (unit)", () => {
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

        // keep chaining behavior identical to Express
        return res as Response & { statusCode?: number; body?: unknown };
    }

    beforeEach(() => {
        vi.restoreAllMocks();
        (
            validationResult as unknown as ReturnType<typeof vi.fn>
        ).mockImplementation(() => ({
            isEmpty: () => true,
            array: () => [],
        }));
    });

    describe("getProducts", () => {
        it("returns 200 and products on success", async () => {
            const req = { params: { id: "store-1" } } as unknown as Request;
            const res = mockRes();
            const mockProducts = [{ id: "p1" }];
            const getProductsSpy = vi
                .spyOn(printifyService, "getProducts")
                .mockResolvedValue(mockProducts);
            await controller.getProducts(req, res);
            expect(getProductsSpy).toHaveBeenCalledWith("store-1");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockProducts);
            getProductsSpy.mockRestore();
        });
        it("returns 400 if validation fails", async () => {
            const req = { params: { id: "store-1" } } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await controller.getProducts(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ errors: ["Invalid"] });
        });
        it("returns 500 on service error", async () => {
            const req = { params: { id: "store-1" } } as unknown as Request;
            const res = mockRes();
            const getProductsSpy = vi
                .spyOn(printifyService, "getProducts")
                .mockRejectedValue(new Error("fail"));
            await controller.getProducts(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: expect.any(String),
            });
            getProductsSpy.mockRestore();
        });
    });

    describe("submitOrder", () => {
        it("returns 201 and order info on success", async () => {
            const req = {
                body: {
                    storeId: "store-1",
                    order: {
                        customer: { email: "a@b.com", address: {} },
                        total_price: 100,
                        currency: "USD",
                        shipping_method: "std",
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
            mockGlobalCryptoRandomUUID("uuid-1");
            const saveOrderSpy = vi
                .spyOn(orderServiceModule.OrderService.prototype, "saveOrder")
                .mockResolvedValue({ id: "123" });
            const submitOrderSpy = vi
                .spyOn(printifyService, "submitOrder")
                .mockResolvedValue({
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
                });
            const updatePrintifyOrderIdSpy = vi
                .spyOn(
                    orderServiceModule.OrderService.prototype,
                    "updatePrintifyOrderId"
                )
                .mockResolvedValue({ id: "123" } as any);
            const sendOrderConfirmationSpy = vi
                .spyOn(emailService, "sendOrderConfirmation")
                .mockResolvedValue({ success: true, messageId: "mock-id" });
            await controller.submitOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    orderId: "123",
                    printifyOrderId: "po-1",
                })
            );
            expect(updatePrintifyOrderIdSpy).toHaveBeenCalledWith(
                "uuid-1",
                "po-1"
            );
            expect(sendOrderConfirmationSpy).toHaveBeenCalledWith(
                "store-1",
                "a@b.com",
                "uuid-1",
                expect.objectContaining({
                    totalPrice: 100,
                    currency: "USD",
                    items: [
                        expect.objectContaining({
                            title: "T",
                            variant_label: "V",
                            price: 100,
                            quantity: 1,
                        }),
                    ],
                })
            );
            saveOrderSpy.mockRestore();
            submitOrderSpy.mockRestore();
            updatePrintifyOrderIdSpy.mockRestore();
            sendOrderConfirmationSpy.mockRestore();
        });
        it("returns 400 if validation fails", async () => {
            const req = { body: {} } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await controller.submitOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ errors: ["Invalid"] });
        });
        it("returns 500 on service error", async () => {
            const req = {
                body: {
                    storeId: "store-1",
                    order: {
                        customer: { email: "a@b.com", address: {} },
                        total_price: 100,
                        currency: "USD",
                        shipping_method: "std",
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
            mockGlobalCryptoRandomUUID("uuid-1");
            vi.spyOn(
                orderServiceModule.OrderService.prototype,
                "saveOrder"
            ).mockResolvedValue({ id: "123" });
            vi.spyOn(printifyService, "submitOrder").mockRejectedValue(
                new Error("fail")
            );
            await controller.submitOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: expect.any(String),
            });
        });
    });

    describe("getOrderStatus", () => {
        it("returns 422 when order exists but has no printify_order_id", async () => {
            const req = {
                body: { orderId: "o1", email: "a@b.com" },
            } as unknown as Request;
            const res = mockRes();

            const getOrderByCustomerSpy = vi
                .spyOn(
                    orderServiceModule.OrderService.prototype,
                    "getOrderByCustomer"
                )
                .mockResolvedValue({
                    store_id: "s1",
                    printify_order_id: null,
                    total_price: 100,
                    shipping_cost: 10,
                    currency: "USD",
                });

            const getOrderSpy = vi.spyOn(printifyService, "getOrder");

            await controller.getOrderStatus(req, res);

            expect(getOrderByCustomerSpy).toHaveBeenCalledWith("o1", "a@b.com");
            expect(getOrderSpy).not.toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(String), // ORDER_NOT_FOUND
                })
            );

            getOrderByCustomerSpy.mockRestore();
            getOrderSpy.mockRestore();
        });

        it("returns 200 and maps key fields on success", async () => {
            const req = {
                body: { orderId: "o1", email: "a@b.com" },
            } as unknown as Request;
            const res = mockRes();

            // DB lookup -> exact OrderLookup shape
            const getOrderByCustomerSpy = vi
                .spyOn(
                    orderServiceModule.OrderService.prototype,
                    "getOrderByCustomer"
                )
                .mockResolvedValue({
                    store_id: "s1",
                    printify_order_id: "po1",
                    total_price: 12345,
                    shipping_cost: 999,
                    currency: "USD",
                });

            // Printify order -> include shipments + address_to + line_items
            const printifyOrderMock = {
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
            };

            const getOrderSpy = vi
                .spyOn(printifyService, "getOrder")
                .mockResolvedValue(printifyOrderMock as any);

            await controller.getOrderStatus(req, res);

            // Sanity checks on calls
            expect(getOrderByCustomerSpy).toHaveBeenCalledWith("o1", "a@b.com");
            expect(getOrderSpy).toHaveBeenCalledWith("s1", "po1");

            // Response assertions
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

            getOrderByCustomerSpy.mockRestore();
            getOrderSpy.mockRestore();
        });
    });
});
