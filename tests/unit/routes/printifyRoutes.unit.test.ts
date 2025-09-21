// tests/unit/routes/printifyRoutes.unit.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Unit tests for the Printify router.
 *
 * Goal: prove that each HTTP route invokes the matching controller handler
 * with the right params/body, without involving validators or real services.
 */

// Make all validators no-ops for unit scope
vi.mock("../../../src/validators/printifyValidators", () => ({
    validateGetProducts: [],
    validateGetShippingOptions: [],
    validateSubmitOrder: [],
    validateGetOrderStatus: [],
}));

// If the router needs to import auth middleware, it can be kept inert like this:
// vi.mock("../../../src/middleware/authenticationMiddleware", () => ({
//   verifyToken: vi.fn((_req: any, _res: any, next: any) => next()),
// }));

// Import the *pure* router factory (not the wired/router that constructs services)
import buildPrintifyRouter from "../../../src/routes/printifyRoutes";

// Minimal mock controller with observable handlers
const handlers = {
    getProducts: vi.fn((_req, res) => res.status(200).json([{ id: "mock" }])),
    getShippingOptions: vi.fn((_req, res) =>
        res.status(200).json([{ id: "mock-ship" }])
    ),
    submitOrder: vi.fn((_req, res) => res.status(201).json({ ok: true })),
    getOrderStatus: vi.fn((_req, res) =>
        res.status(200).json({ status: "mock-status" })
    ),
};

function makeApp() {
    const app = express();
    app.use(express.json());
    // Build a fresh router per test to avoid cross-test state
    const router = buildPrintifyRouter(handlers);
    app.use("/printify", router);
    return app;
}

describe("printifyRoutes (unit)", () => {
    let app: express.Express;

    beforeEach(() => {
        // reset spies’ call counts; keep the same function references
        handlers.getProducts.mockClear();
        handlers.getShippingOptions.mockClear();
        handlers.submitOrder.mockClear();
        handlers.getOrderStatus.mockClear();

        app = makeApp();
    });

    describe("GET /printify/:id/products", () => {
        it("invokes getProducts with the store id", async () => {
            const res = await request(app).get("/printify/store-123/products");

            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: "mock" }]);
            expect(handlers.getProducts).toHaveBeenCalledTimes(1);

            const [reqArg] = handlers.getProducts.mock.calls[0];
            expect(reqArg.params.id).toBe("store-123");
        });
    });

    describe("POST /printify/:id/shipping-options", () => {
        it("invokes getShippingOptions with route param and body", async () => {
            const payload = {
                address_to: { city: "LA" },
                line_items: [{ product_id: 1, variant_id: 2, quantity: 1 }],
            };

            const res = await request(app)
                .post("/printify/store-9/shipping-options")
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: "mock-ship" }]);
            expect(handlers.getShippingOptions).toHaveBeenCalledTimes(1);

            const [reqArg] = handlers.getShippingOptions.mock.calls[0];
            expect(reqArg.params.id).toBe("store-9");
            expect(reqArg.body).toEqual(payload);
        });
    });

    describe("POST /printify/submit-order", () => {
        it("invokes submitOrder with the provided body", async () => {
            const payload = {
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
            };

            const res = await request(app)
                .post("/printify/submit-order")
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body).toEqual({ ok: true });
            expect(handlers.submitOrder).toHaveBeenCalledTimes(1);

            const [reqArg] = handlers.submitOrder.mock.calls[0];
            expect(reqArg.body).toEqual(payload);
        });
    });

    describe("POST /printify/order-status", () => {
        it("invokes getOrderStatus with the provided body", async () => {
            const payload = { orderId: "o1", email: "a@b.com" };

            const res = await request(app)
                .post("/printify/order-status")
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: "mock-status" });
            expect(handlers.getOrderStatus).toHaveBeenCalledTimes(1);

            const [reqArg] = handlers.getOrderStatus.mock.calls[0];
            expect(reqArg.body).toEqual(payload);
        });
    });
});
