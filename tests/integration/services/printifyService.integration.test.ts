//import dotenv from "dotenv";
import "dotenv/config";
import { describe, it, expect } from "vitest";
import { PrintifyService } from "../../../src/services/printifyService";

/**
 * @file Integration tests for PrintifyService.
 *
 * This suite runs only when required env vars are present:
 *  - PRINTIFY_API_KEY (required)
 *  - PRINTIFY_STORE_ID (required)
 *  - PRINTIFY_ORDER_ID (optional; used by getOrder test if provided)
 *
 * Scenarios covered:
 * - getProducts: returns a list for the given store
 * - getOrder: fetches a real order (when PRINTIFY_ORDER_ID is set)
 * - getShippingRates: returns available shipping options for a payload
 */

// Load .env from project root
//dotenv.config({ path: require("path").resolve(__dirname, "../../../.env") });

const API_KEY = process.env.PRINTIFY_API_KEY || "";
const STORE_ID = process.env.PRINTIFY_STORE_ID || "20416540";
const ORDER_ID = process.env.PRINTIFY_ORDER_ID || "68b85ca26e250553050d5896"; // real order (optional)

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

const CAN_RUN = Boolean(API_KEY && STORE_ID);

describe.runIf(CAN_RUN)("PrintifyService (integration)", () => {
    const svc = new PrintifyService(API_KEY);

    describe("getProducts", () => {
        // Should return products array for the store
        it(
            "getProducts returns products for store",
            async () => {
                const products = await svc.getProducts(STORE_ID);
                expect(
                    Array.isArray(products?.data) || Array.isArray(products)
                ).toBe(true);
            },
            { retry: 2 }
        );
    });

    describe("getOrder", () => {
        // Should fetch a real order when PRINTIFY_ORDER_ID is provided
        it("getOrder fetches a real order", async () => {
            if (!ORDER_ID) {
                expect(ORDER_ID).toBeTruthy(); // explicit guard so the test is meaningful
                return;
            }
            const order = await svc.getOrder(STORE_ID, ORDER_ID);
            expect(order).toHaveProperty("id");
        });
    });

    describe("getShippingRates", () => {
        // Should return shipping options for a valid address + line_items payload
        it("getShippingRates returns shipping options", async () => {
            const rates = await svc.getShippingRates(
                STORE_ID,
                SHIPPING_ADDRESS as any
            );
            const std = rates.find((r) => r.code === "standard");
            expect(std).toBeDefined();
            expect(std!.price).toBeGreaterThan(0);
        });

        // it("getShippingRates returns shipping options", async () => {
        //     const rates = await svc.getShippingRates(
        //         STORE_ID,
        //         SHIPPING_ADDRESS as any
        //     );
        //     expect(Array.isArray(rates)).toBe(true);
        //     expect(rates.length).toBeGreaterThan(0);
        //     // optional: assert a specific code exists
        //     const hasKnown = rates.some(
        //         (r) =>
        //             r.code === "standard" ||
        //             r.code === "economy" ||
        //             r.code === "express" ||
        //             r.code === "priority"
        //     );
        //     expect(hasKnown).toBe(true);
        // });
    });
});

describe.runIf(!CAN_RUN)(
    "PrintifyService (integration) — skipped (missing env vars)",
    () => {
        // Should be skipped when API key or store id is not available
        it("skipped due to missing PRINTIFY_API_KEY or PRINTIFY_STORE_ID", () => {});
    }
);
