import { describe, it, expect, vi, afterEach } from "vitest";
import { OrderService } from "../../../src/services/orderService";
import db from "../../../src/db/connection";

vi.mock("../../../src/db/connection");

const orderService = new OrderService();

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

describe("OrderService", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    // Should insert a new order and return its id
    it("saveOrder inserts and returns id", async () => {
        (db.one as any).mockResolvedValue({ id: "abc123" });
        const result = await orderService.saveOrder(sampleOrder as any);
        expect(db.one).toHaveBeenCalled();
        expect(result).toEqual({ id: "abc123" });
    });

    // Should throw a friendly error if db.one fails
    it("saveOrder throws on db error", async () => {
        (db.one as any).mockRejectedValue(new Error("fail"));
        await expect(
            orderService.saveOrder(sampleOrder as any)
        ).rejects.toThrow("Failed to save order.");
    });

    // Should update the Printify order ID and return the updated id
    it("updatePrintifyOrderId updates and returns id", async () => {
        (db.one as any).mockResolvedValue({ id: "def456" });
        const result = await orderService.updatePrintifyOrderId(
            "ORD123",
            "P123"
        );
        expect(db.one).toHaveBeenCalled();
        expect(result).toBe("def456");
    });

    // Should throw a friendly error if db.one fails during update
    it("updatePrintifyOrderId throws on db error", async () => {
        (db.one as any).mockRejectedValue(new Error("fail"));
        await expect(
            orderService.updatePrintifyOrderId("ORD123", "P123")
        ).rejects.toThrow("Failed to update Printify order ID.");
    });

    // Should return the order for a given order number and email
    it("getOrderByCustomer returns order", async () => {
        (db.oneOrNone as any).mockResolvedValue({
            store_id: "store1",
            printify_order_id: "P123",
        });
        const result = await orderService.getOrderByCustomer(
            "ORD123",
            "customer@example.com"
        );
        expect(db.oneOrNone).toHaveBeenCalled();
        expect(result).toEqual({
            store_id: "store1",
            printify_order_id: "P123",
        });
    });

    // Should throw a friendly error if db.oneOrNone fails
    it("getOrderByCustomer throws on db error", async () => {
        (db.oneOrNone as any).mockRejectedValue(new Error("fail"));
        await expect(
            orderService.getOrderByCustomer("ORD123", "customer@example.com")
        ).rejects.toThrow("Failed to retrieve order.");
    });
});
