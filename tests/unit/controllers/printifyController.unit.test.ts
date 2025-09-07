import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockGlobalCryptoRandomUUID } from "../../testUtils";
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
        const res: Partial<Response> = {};
        res.status = vi.fn().mockReturnThis();
        res.json = vi.fn().mockReturnThis();
        return res as Response;
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
        it("returns 200 and order status on success", async () => {
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
                    orderId: "o1",
                    store_id: "s1",
                    printify_order_id: "po1",
                    total_price: 100,
                    shipping_cost: 10,
                    currency: "USD",
                });
            const getOrderSpy = vi
                .spyOn(printifyService, "getOrder")
                .mockResolvedValue({
                    id: "po1",
                    status: "shipped",
                    created_at: "now",
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
                    shipments: [
                        {
                            carrier: "usps",
                            number: "tn",
                            url: "url",
                        },
                    ],
                });
            await controller.getOrderStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    order_status: expect.any(String),
                })
            );
            getOrderByCustomerSpy.mockRestore();
            getOrderSpy.mockRestore();
        });
    });
});
