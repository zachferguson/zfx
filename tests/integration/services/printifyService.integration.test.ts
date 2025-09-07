import dotenv from "dotenv";
import { describe, it, expect } from "vitest";
import { PrintifyService } from "../../../src/services/printifyService";

// Load .env from project root
dotenv.config({ path: require("path").resolve(__dirname, "../../../.env") });

const API_KEY = process.env.PRINTIFY_API_KEY || "";
const STORE_ID = process.env.PRINTIFY_STORE_ID || "20416540";
const ORDER_ID = process.env.PRINTIFY_ORDER_ID || "68b85ca26e250553050d5896"; // real order

const SHIPPING_ADDRESS = {
    address_to: {
        first_name: "Zach",
        last_name: "Ferguson",
        email: "your@email.com",
        phone: "000-000-0000",
        country: "US",
        region: "CA",
        city: "Los Angeles",
        address1: "123 Main St",
        address2: "",
        zip: "90001",
    },
    line_items: [
        {
            product_id: "67b473aeea938c15350ba07b",
            variant_id: 38172,
            quantity: 1,
        },
    ],
};

if (!API_KEY || !STORE_ID) {
    describe.skip("PrintifyService Integration (skipped: missing env vars)", () => {
        it("skipped", () => {});
    });
} else {
    describe("PrintifyService Integration", () => {
        const svc = new PrintifyService(API_KEY);

        it("getProducts returns products for store", async () => {
            const products = await svc.getProducts(STORE_ID);
            expect(
                Array.isArray(products.data) || Array.isArray(products)
            ).toBe(true);
        });

        it("getOrder fetches a real order", async () => {
            if (!ORDER_ID) {
                expect(ORDER_ID).toBeTruthy();
                return;
            }
            const order = await svc.getOrder(STORE_ID, ORDER_ID);
            expect(order).toHaveProperty("id");
        });

        it("getShippingRates returns shipping options", async () => {
            const rates = await svc.getShippingRates(
                STORE_ID,
                SHIPPING_ADDRESS as any
            );
            expect(rates).toHaveProperty("standard");
        });
    });
}
