// tests/unit/services/orderService.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PgOrderService } from "../../../src/services/orderService";

/**
 * @file Unit tests for OrderService.
 *
 * These tests verify the behavior of OrderService methods using a mocked database connection.
 *
 * Scenarios covered:
 * - saveOrder: inserts new order, throws on db error
 * - updatePrintifyOrderId: updates Printify order ID, throws on db error
 * - getOrderByCustomer: fetches order by order number and email, throws on db error
 */

// Minimal mocked pg-promise shape the service calls
const fakeDb = {
    one: vi.fn(),
    oneOrNone: vi.fn(),
};

let orderService: PgOrderService;

const sampleOrder = {
    orderNumber: "ORD123",
    storeId: "store1",
    email: "customer@example.com",
    totalPrice: 10000,
    currency: "USD",
    shippingMethod: 1,
    shippingCost: 500,
    shippingAddress: { street: "123 Main St" },
    items: [{ sku: "sku1", qty: 2 }],
    stripePaymentId: "pi_123",
    paymentStatus: "paid",
    orderStatus: "created",
};

describe("OrderService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        orderService = new PgOrderService(fakeDb as any);
    });

    describe("saveOrder", () => {
        it("inserts and returns id", async () => {
            (fakeDb.one as any).mockResolvedValue({ id: "abc123" });

            const result = await orderService.saveOrder(sampleOrder as any);

            expect(fakeDb.one).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ id: "abc123" });
        });

        it("throws on db error", async () => {
            (fakeDb.one as any).mockRejectedValue(new Error("fail"));

            await expect(
                orderService.saveOrder(sampleOrder as any)
            ).rejects.toThrow("Failed to save order.");
        });
    });

    describe("updatePrintifyOrderId", () => {
        it("updates and returns id", async () => {
            (fakeDb.one as any).mockResolvedValue({ id: "def456" });

            const result = await orderService.updatePrintifyOrderId(
                "ORD123",
                "P123"
            );

            expect(fakeDb.one).toHaveBeenCalledTimes(1);
            expect(result).toBe("def456");
        });

        it("throws on db error", async () => {
            (fakeDb.one as any).mockRejectedValue(new Error("fail"));

            await expect(
                orderService.updatePrintifyOrderId("ORD123", "P123")
            ).rejects.toThrow("Failed to update Printify order ID.");
        });
    });

    describe("getOrderByCustomer", () => {
        it("returns order", async () => {
            (fakeDb.oneOrNone as any).mockResolvedValue({
                store_id: "store1",
                printify_order_id: "P123",
            });

            const result = await orderService.getOrderByCustomer(
                "ORD123",
                "customer@example.com"
            );

            expect(fakeDb.oneOrNone).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                store_id: "store1",
                printify_order_id: "P123",
            });
        });

        it("throws on db error", async () => {
            (fakeDb.oneOrNone as any).mockRejectedValue(new Error("fail"));

            await expect(
                orderService.getOrderByCustomer(
                    "ORD123",
                    "customer@example.com"
                )
            ).rejects.toThrow("Failed to retrieve order.");
        });
    });
});
